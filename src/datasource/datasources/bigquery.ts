import { BigQuery, type FormattedMetadata } from '@google-cloud/bigquery';
import { DataSource } from '../datasource.js';
import { DataSourceType, type FieldDefinition, TableSchema, type TableInfo } from '../types.js';
import { type Row } from '../../utils/slacktable.js';
import openAI from '../../openai/openai.js';
import { type Answer } from '../../agent/types.js';

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

  protected async loadTableSchema(database: string, table: TableInfo): Promise<TableSchema> {
    const [{ schema, description }] =
      (await this.bigquery.dataset(database).table(table.name).getMetadata()) as FormattedMetadata[];

    if ((schema?.fields) == null) {
      throw new Error(`${database}, ${table.name} has no fields.`);
    }

    const fieldDefinitions: FieldDefinition[] = schema.fields.map((field) => {
      const baseFieldDefinition = {
        name: field.name!,
        description: field.description ?? ''
      };

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
    });
    return new TableSchema(
      table.name,
      database,
      description ?? '',
      fieldDefinitions,
      DataSourceType.BigQuery,
      table.isSuffixPartitionTable,
      table.suffixes
    );
  }

  protected async enrichTableSchema(): Promise<void> {
    const candidateTablesAndColumns = this.getTables().flatMap(table =>
      table.fields.filter(field => field.type === 'STRING')
        .map(field => {
          return `${table.getUniqueID()}|${field.name}`
        })
    );

    const prompt =
      'I will give you a list of comma separated table and columns the format of "table_name|column_name".\n' +
      'List: "' + candidateTablesAndColumns.join(',') + '"\n' +
      'Give me all the elements IN THE LIST that contain values that are limited to a LIMITED set of options.\n' +
      'EXCLUDE all the elements that might be an ID column.\n' +
      'You should return PLAIN TEXT comma separated list ONLY with format of table_name|column_name, NO explanation, NO markdown.\n' +
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
      .map(tableAndColumn => tableAndColumn.trim())
      .filter(tableAndColumn => candidateTablesAndColumns.includes(tableAndColumn))
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

        // Only use latest two partitions for efficiency concern
        const additionalWhereClause = tableSchema.isSuffixPartitionTable
          ? `AND _TABLE_SUFFIX IN (${tableSchema.getTopSuffixes().map(suffix => `'${suffix}'`).join(',')})`
          : '';
        const query = `SELECT DISTINCT(${column}) as result FROM \`${uniqueId}\` where ${column} IS NOT NULL ${additionalWhereClause} LIMIT 26;`;
        try {
          await this.runQuery(query)
            .then(({ rows }) => {
              if (rows!.length > 25) {
                // should not have more than 25 values for an enum
                return;
              }
              const table = this.getTables().find(table => table.getUniqueID() === uniqueId);
              const columnField = table?.fields.find(field => field.name === column);

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
}
