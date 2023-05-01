import { type Logger } from 'winston';
import getLogger from '../utils/logger.js';
import { type Row } from '../utils/slacktable.js';
import { type TableInfo, type DataSourceType, type DatabaseSchema, type TableSchema } from './types.js';
import { type Answer } from '../agent/types.js';
import configLoader from '../config/loader.js';

export abstract class DataSource {
  protected readonly allowedDatabases: string[];
  protected readonly allowedTables: string[];
  protected databases: DatabaseSchema[] = [];
  protected initializationPromise: Promise<void>;
  protected readonly logger: Logger;

  constructor(public name: string, key: string, allowedDatabases: string[], allowedTables: string[]) {
    this.logger = getLogger(name);
    this.init(key);
    this.initializationPromise = this.loadSchemas();
    void this.initializationPromise.then(
      async _ => { await this.enrichTableSchema(); }
    );
    this.allowedDatabases = allowedDatabases;
    this.allowedTables = allowedTables;
  }

  public getTables(): TableSchema[] {
    return this.databases.flatMap(
      databaseSchema => databaseSchema.schemas
    );
  }

  public getTable(uniqueId: string): TableSchema | undefined {
    return this.getTables().find(
      tableSchema => tableSchema.getUniqueID() === uniqueId
    );
  }

  public getDatabases(): DatabaseSchema[] {
    return this.databases;
  }

  public async getInitializationPromise(): Promise<void> {
    await this.initializationPromise;
  }

  public getQuestionPrompt(question: string): string {
    return `Question: ${question}`;
  }

  public getContextPrompt(tableIds: string[], providedAssumptions: string | null): string {
    const shouldUseProvidedAssumptions = providedAssumptions != null && providedAssumptions.length > 0;
    let basePrompt =
      (shouldUseProvidedAssumptions
        ? `I will give you a list of ${this.dataSourceType} tables schemas in JSON, context for clarification, a set of example of question and assumptions in JSON, and instructions to follow.\n`
        : `I will give you a list of ${this.dataSourceType} tables schemas in JSON, a paragraph of assumptions to use, and instructions to follow.\n`) +
      'Then I will ask you questions about these tables like Question: {question}. You might need to join tables to answer the questions.\n\n' +
      'Below is the format:\n' +
      'Table Schema: (JSON array)\n' +
      (shouldUseProvidedAssumptions
        ? 'Assumptions: (sentences)\n'
        : 'Context: (sentences)\nExample Question with Assumptions: IN JSON\n') +
      'Instructions: (sentences)\n\n' +
      'Table Schema:\n' +
      JSON.stringify(this.getTables()
        .filter(table => tableIds.includes(table.getUniqueID()))
        .map(table => table.convertForContextPrompt())
      ) + '\n\n';

    if (shouldUseProvidedAssumptions) {
      basePrompt = basePrompt + `Assumptions: \n${providedAssumptions}`;
    } else {
      if (configLoader.getAdditionalContext() != null) {
        basePrompt = basePrompt + `Context: \n${configLoader.getAdditionalContext()}\n\n`;
      }
      basePrompt = basePrompt + 'Example Questions with Assumptions\n' + JSON.stringify([]);
    }

    basePrompt = basePrompt + '\n\nInstructions:\n' +
      '* The table in the where clause appear in the tables or temp tables you selected from.\n' +
      '* Use FORMAT_DATE(), DO NOT use DATE_TRUNC(), DO NOT use DATE_TRUNC(), DO NOT use DATE_TRUNC().\n' +
      '* Convert TIMESTAMP to DATE using DATE().\n' +
      '* Use full column name including the table name.\n' +
      '* You can ONLY read, cannot UPDATE or DELETE or MAKE ANY CHANGES to the data.\n' +
      (shouldUseProvidedAssumptions
        ? '* Use the assumptions I provided.\n'
        : '* It is Okay to make assumptions to answer the question.\n'
      ) +
      '* DO NOT use any field not included in schemas.\n' +
      '* If you are not sure about the answer even with assumptions, just say I don\'t know, or ask clarify questions.\n' +
      `* You should return assumptions and PLAIN TEXT ${this.dataSourceType} query for the question ONLY, NO explanation, NO markdown.\n` +
      '* Use UNNEST() for ARRAY field.\n' +
      '* Wrap table name with `` \n' +
      '* NO content after the query.\n' +
      (this.includeDatabaseNameInQuery() ? '* Table name in the query should be database_name.table_name.\n\n' : '\n\n') +
      'Use the following format for response: \n' +
      ' Assumptions: (bullets) \n' +
      ' Query: (query) ';

    return basePrompt + '\n\nRespond I understand to start the conversation.';
  }

  public async tryFixAndRun(query: string): Promise<Answer> {
    return {
      query,
      hasResult: false
    }
  };

  protected async loadSchemas(): Promise<void> {
    const databases = (await this.loadDatabaseNames()).filter(
      (database: string) => this.allowedDatabases.length === 0 || this.allowedDatabases.includes(database)
    );

    this.logger.info(`Loaded databases: ${databases.join(',')}`);
    this.databases = await Promise.all(
      databases.map(async database => await this.loadDatabase(database))
    );

    if (this.databases.flatMap(database => database.schemas).length === 0) {
      throw new Error('No table loaded, please double check your data source and whitelist tables.');
    }
    this.logger.info(`All ${databases.length} databases are loaded.`);
  }

  protected tryExtractPartitionTable(table: string): string | [string, string] {
    return table;
  }

  protected isTableAllowed(table: string, database: string): boolean {
    if (this.allowedTables.length === 0) {
      return true;
    }

    const fullTableName = `${database}.${table}`;
    const matchRegex = this.allowedTables.find(allowedTable => {
      const regexStr = '^' + allowedTable.split('*')
        .map((str: string) => str.replace(/([.*+?^=!:${}()|\\[\\]\/\\])/g, '\\$1'))
        .join('.*') + '$';
      return new RegExp(regexStr).test(fullTableName);
    }) != null;
    return matchRegex ||
      this.allowedTables.includes(fullTableName);
  }

  protected async loadDatabase(database: string): Promise<DatabaseSchema> {
    const tables = (await this.loadTableNames(database))
      .filter(table => this.isTableAllowed(table, database));

    const extractTables = new Map<string, TableInfo>();
    for (const table of tables) {
      const extracted = this.tryExtractPartitionTable(table);

      if (typeof extracted === 'string') {
        extractTables.set(table, {
          name: table,
          isSuffixPartitionTable: false
        });
        continue;
      }

      const [tableName, partitionSuffix] = extracted;
      if (extractTables.has(tableName)) {
        extractTables.get(tableName)?.suffixes!.push(partitionSuffix);
        continue;
      }
      extractTables.set(tableName, {
        name: tableName,
        isSuffixPartitionTable: true,
        suffixes: [partitionSuffix]
      });
    }

    return await Promise.all(
      Array.from(extractTables.values())
        .map(async table => await this.loadTableSchema(database, table)
          .then(schema => {
            this.logger.info(`Loaded table: ${schema.getUniqueID()}`);
            return schema;
          }))
    ).then(schemas => ({
      name: database,
      schemas
    }));
  }

  protected includeDatabaseNameInQuery(): boolean {
    return true;
  }

  protected abstract init(key: string): void;
  public abstract readonly dataSourceType: DataSourceType;
  protected abstract loadDatabaseNames(): Promise<string[]>;
  protected abstract loadTableNames(database: string): Promise<string[]>;
  protected abstract loadTableSchema(database: string, table: TableInfo): Promise<TableSchema>;
  protected async enrichTableSchema(): Promise<void> { }

  public abstract runQuery(query: string): Promise<Answer>;
  public abstract getRawSchema(database: string, table: string): Promise<Row[]>;
}
