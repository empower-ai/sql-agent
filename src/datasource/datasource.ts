import { type Logger } from 'winston';
import getLogger from '../utils/logger.js';
import { type Row } from '../utils/slacktable.js';
import { type DataSourceType, type DatabaseSchema, type TableSchema } from './types.js';
import { type Answer } from '../agent/types.js';

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

  public getDatabases(): DatabaseSchema[] {
    return this.databases;
  }

  public async getInitializationPromise(): Promise<void> {
    await this.initializationPromise;
  }

  public getQuestionPrompt(question: string): string {
    return `Question: ${question}`;
  }

  public getContextPrompt(tableIds: string[]): string {
    const basePrompt = `I will give you a list of ${this.dataSourceType} tables schemas, and ask you questions about these tables like Question: {question}.\n` +
      'You might need to join tables to answer the questions. \n' +
      'Make sure the table in the where clause appear in the tables or temp tables you selected from.\n' +
      'Make sure in the where clause do not compare date with timestamp.\n' +
      'You can ONLY read, cannot UPDATE or DELETE or MAKE ANY CHANGES to the data.\n' +
      'It is Okay to make assumptions to answer the question but DO NOT include the assumptions into the response.\n' +
      "If you are not sure about the answer even with assumptions, just say I don't know, or ask clarify questions.\n" +
      `You should return PLAIN TEXT ${this.dataSourceType} query for the question ONLY, NO explanation, NO markdown.\n` +
      'Make sure there is no content after the query.\n' +
      (this.includeDatabaseNameInQuery() ? 'Table name in the query should be database_name.table_name\n' : '') +
      'The table schema is a list of JSON objects of {} are below:'

    return (
      basePrompt +
      '\n' +
      JSON.stringify(this.getTables()
        .filter((table) => tableIds.includes(table.getUniqueID()))
      ) +
      '\n' +
      'Respond I understand to start the conversation.'
    );
  }

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

  protected async loadDatabase(database: string): Promise<DatabaseSchema> {
    const tables = (await this.loadTableNames(database)).filter(
      (table: string) => this.allowedTables.length === 0 || this.allowedTables.includes(`${database}.${table}`)
    );

    return await Promise.all(
      tables.map(async table => await this.loadTableSchema(database, table)
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
  protected abstract loadTableSchema(database: string, table: string): Promise<TableSchema>;
  protected async enrichTableSchema(): Promise<void> { }

  public abstract runQuery(query: string): Promise<Answer>;
  public abstract getRawSchema(database: string, table: string): Promise<Row[]>;
}
