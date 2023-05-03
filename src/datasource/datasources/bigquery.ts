import { BigQuery, type FormattedMetadata, type TableField } from '@google-cloud/bigquery';
import { DataSource } from '../datasource';
import { DataSourceType, type FieldDefinition, TableSchema, type TableInfo } from '../types';
import { type Row } from '../../utils/slacktable';
import openAI from '../../openai/openai';
import { type Answer } from '../../agent/types';

const dateParts: string[] = [
  'DAY',
  'WEEK',
  'MONTH',
  'QUARTER',
  'YEAR',
  'ISOYEAR',
  'WEEK(SUNDAY)',
  'WEEK(MONDAY)',
  'WEEK(TUESDAY)',
  'WEEK(WEDNESDAY)',
  'WEEK(THURSDAY)',
  'WEEK(FRIDAY)',
  'WEEK(SATURDAY)'
];

// This class currently does a lot of things, but it's a good start.
// * Loads the BigQuery client, and the tables and schemas.
// * Holds the prompts for openAI
// * Runs the queries
export default class BigQuerySource extends DataSource {
  private bigquery!: BigQuery;

  public readonly dataSourceType = DataSourceType.BigQuery;

  constructor(bqKey: string, allowedDatabases: string[], allowedTables: string[]) {
    super('BigQuery', bqKey, allowedDatabases, allowedTables);
  }

  protected init(key: string): void {
    const credentials = JSON.parse(key);

    this.bigquery = new BigQuery({
      projectId: credentials.project_id,
      credentials
    });

    if (this.bigquery == null) {
      throw new Error('Failed to initialize bigquery client');
    }
  }

  protected async loadDatabaseNames(): Promise<string[]> {
    const [datasets] = await this.bigquery.getDatasets();
    return datasets.map((dataset) => dataset.id!);
  }

  protected async loadTableNames(database: string): Promise<string[]> {
    const [tables] = await this.bigquery.dataset(database).getTables();
    return tables.map((table) => table.id!);
  }

  private loadFieldDefinition(field: TableField): FieldDefinition {
    const baseFieldDefinition: FieldDefinition = {
      name: field.name!,
      description: field.description ?? '',
      type: '',
      required: false
    };

    if (field.type === 'RECORD') {
      baseFieldDefinition.nestedFields = field.fields!.map(nestedField => this.loadFieldDefinition(nestedField));
    }

    switch (field.mode) {
      case 'REPEATED':
        return {
          ...baseFieldDefinition,
          type: `Array<${field.type!}>`,
          required: true
        };
      default:
        return {
          ...baseFieldDefinition,
          type: field.type!,
          required: field.mode === 'REQUIRED'
        };
    }
  }

  protected async loadTableSchema(database: string, table: TableInfo): Promise<TableSchema> {
    const [{ schema, description }] =
      (await this.bigquery.dataset(database).table(table.name).getMetadata()) as FormattedMetadata[];

    const tableNameToPullRawSchema = table.isSuffixPartitionTable ? `${table.name.substring(0, table.name.length - 1)}${table.suffixes![0]}` : table.name;
    const query = `SELECT table_name, ddl as result FROM \`${database}\`.INFORMATION_SCHEMA.TABLES WHERE table_name = '${tableNameToPullRawSchema}';`;
    const result = await this.runQuery(query);

    let rawSchemaDefinition = '';
    if (result.hasResult && result.rows![0].result != null) {
      rawSchemaDefinition = `${result.rows![0].result}`.replace(tableNameToPullRawSchema, table.name);
    }

    if (schema?.fields == null) {
      throw new Error(`${database}, ${table.name} has no fields.`);
    }

    const fieldDefinitions: FieldDefinition[] = schema.fields.map(field =>
      this.loadFieldDefinition(field)
    );
    return new TableSchema(
      table.name,
      database,
      description ?? '',
      fieldDefinitions,
      DataSourceType.BigQuery,
      rawSchemaDefinition,
      table.isSuffixPartitionTable,
      table.suffixes
    );
  }

  private getStringFields(
    table: TableSchema,
    field: FieldDefinition,
    parentFields: string[] = []
  ): string[] {
    if (field.type === 'STRING') {
      if (parentFields.length > 0) {
        return [`${table.getUniqueID()}|${parentFields.join('.')}.${field.name}`];
      }
      return [`${table.getUniqueID()}|${field.name}`];
    } else if (field.type === 'RECORD' || field.type === 'Array<RECORD>') {
      return field.nestedFields!.flatMap(nestedField => this.getStringFields(table, nestedField, parentFields.concat([field.name])));
    } else {
      return [];
    }
  }

  protected async enrichTableSchema(): Promise<void> {
    if (process.env.DISABLE_SCHEMA_ENRICHMENT) {
      return;
    }
    const candidateTablesAndColumns = this.getTables().flatMap(table =>
      table.fields.flatMap(field => {
        return this.getStringFields(table, field);
      })
    );

    const candidateColumns = candidateTablesAndColumns.map(field => {
      const column = field.split('|')[1];
      return column.split('.')[column.split('.').length - 1];
    });

    const prompt =
      'I will give you a list of comma separated column names below.\n' +
      'List: "' + candidateColumns.join(', ') + '"\n' +
      'Give me all the elements IN THE LIST that contain values that are limited to a LIMITED set of options.\n' +
      'EXCLUDE all the elements that might be an ID column.\n' +
      'You should return PLAIN TEXT comma separated list ONLY, NO explanation, NO markdown.\n' +
      'If you think there is no such column, just say "No such column".';

    let result = (await openAI.sendMessage(prompt)).text;
    if (result[result.length - 1] === '.') {
      // remove trailing period, just in case
      result = result.slice(0, -1);
    }

    if (result.toLocaleLowerCase().includes('no such column')) {
      this.logger.info('Skip enrichment, no possible enum column.');
      return;
    }

    const sanitizedResult = result.split(',')
      .map(column => column.trim())
      .flatMap(column =>
        candidateTablesAndColumns.filter(
          candidateTableAndColumn => new RegExp(`.*\\.${column}$|.*\\|${column}$`).test(candidateTableAndColumn)
        )
      )
      .filter(tableAndColumn => !tableAndColumn.endsWith('_id') && !tableAndColumn.endsWith('ID'));
    if (sanitizedResult.length === 0) {
      this.logger.info('Skip enrichment, no possible enum column.');
      return;
    }

    this.logger.info(`Converting string columns: ${sanitizedResult} into enums.`);
    await Promise.all(
      sanitizedResult.map(async tableAndColumn => {
        const [uniqueId, column] = tableAndColumn.split('|');
        const tableSchema = this.getTable(uniqueId)!;
        const rootField = column.split('.')[0];

        let additionalFromClause = '';
        if (tableSchema.findFieldByName(rootField)?.type === 'Array<RECORD>') {
          additionalFromClause = `,unnest(${rootField}) as ${rootField}`;
        }

        // Only use latest two partitions for efficiency concern
        const additionalWhereClause = tableSchema.isSuffixPartitionTable
          ? `AND _TABLE_SUFFIX IN (${tableSchema.getTopSuffixes().map(suffix => `'${suffix}'`).join(',')})`
          : '';
        const query = `SELECT ${column} as result, COUNT(1) as result FROM \`${uniqueId}\` ${additionalFromClause} WHERE ${column} IS NOT NULL ${additionalWhereClause} GROUP BY ${column} ORDER BY COUNT(1) DESC LIMIT 10 ;`;
        try {
          await this.runQuery(query)
            .then(({ rows }) => {
              const table = this.getTables().find(table => table.getUniqueID() === uniqueId);
              const columnField = table?.findFieldByName(column);
              if (columnField === undefined) {
                this.logger.warn(`Could not find associated table ${uniqueId} and column ${column} when enriching the table schema.`);
              }

              columnField!.type = `ENUM[${rows!.map(row => row.result).join(',')}]`
            });
        } catch (error) {
          this.logger.warn(`Error happened when trying to enrich ${uniqueId} and column ${column}, skip this column. Error: ${error}.`);
        }
      }));

    this.logger.info('Enrichment finished.');
  }

  protected tryExtractPartitionTable(tableName: string): string | [string, string] {
    const suffixTableRegex = /(.*)_(\d{8}|\d{10})$/;

    const extracted = suffixTableRegex.exec(tableName);

    if (extracted == null) {
      return tableName;
    }

    return [`${extracted[1]}_*`, extracted[2]];
  }

  public async runQuery(query: string): Promise<Answer> {
    const [job] = await this.bigquery.createQueryJob({ query });
    const [rows] = await job.getQueryResults();

    return {
      query,
      hasResult: true,
      rows
    };
  }

  public async getRawSchema(database: string, table: string): Promise<Row[]> {
    const [metadata] = (await this.bigquery.dataset(database).table(table).getMetadata()) as FormattedMetadata[];
    if (metadata.schema?.fields == null) {
      return [];
    };
    return metadata.schema?.fields?.map((field) => {
      return {
        name: field.name!,
        type: field.type!,
        description: field.description ?? ''
      };
    });
  }

  protected useFormattedSchema(): boolean {
    return false;
  }

  public async tryFixAndRun(query: string): Promise<Answer> {
    // Try fix common mistake with date like: DATE_TRUNC('week', CURRENT_DATE())
    const regex = /DATE_TRUNC\((.*),(.*)\)/g;

    let res: RegExpExecArray | null;
    let fixedQuery = query;
    while ((res = regex.exec(query)) != null) {
      const datePart = dateParts.find(datePart => `'${datePart.toLowerCase()}'` === res![1].toLowerCase());
      if (datePart != null) {
        const fixedExpression = `DATE_TRUNC(${res[2].trim()}, ${datePart})`;

        fixedQuery = fixedQuery.substring(0, res.index) + fixedExpression + fixedQuery.substring(res.index + res[0].length);
      }
    }
    if (fixedQuery === query) {
      return {
        query,
        hasResult: false
      };
    }

    this.logger.debug(`Fixed query: ${fixedQuery}`);
    try {
      return await this.runQuery(fixedQuery);
    } catch (err) {
      return {
        query,
        hasResult: false,
        err: `${err}`
      };
    }
  };
}
