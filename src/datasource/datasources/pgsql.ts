import knex from 'knex';
import { DataSource } from '../datasource.js';
import { DataSourceType, type TableInfo, TableSchema } from '../types.js';
import { type Answer } from '../../agent/types.js';
import { type Row } from '../../utils/slacktable.js';

export class PgsqlSource extends DataSource {
  private connection!: knex.Knex;

  public readonly dataSourceType = DataSourceType.PostgresSQL;

  constructor(connectionString: string, allowedDatabases: string[], allowedTables: string[]) {
    super('PostgresSQL', connectionString, allowedDatabases, allowedTables);
  }

  protected init(connectionString: string): void {
    this.logger.info(`Connecting to ${connectionString}...`);
    this.connection = knex.knex({
      client: 'postgresql',
      connection: connectionString
    });
  }

  public async runQuery(query: string): Promise<Answer> {
    const queryResult = await this.connection.raw(query);

    return {
      query,
      hasResult: true,
      rows: queryResult.rows
    };
  }

  protected async loadDatabaseNames(): Promise<string[]> {
    return [this.connection.client.database()];
  }

  protected async loadTableNames(_: string): Promise<string[]> {
    const result = await this.connection.raw(
      'SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\' AND table_type = \'BASE TABLE\';'
    );
    return result.rows.map((row: any) => row.table_name);
  }

  protected async loadTableSchema(database: string, table: TableInfo): Promise<TableSchema> {
    const rows = await this.connection.raw(
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '${table.name}'`
    );

    const fields = rows.rows.map((row: any) => ({
      name: row.column_name,
      description: '',
      type: row.data_type,
      required: row.is_nullable === 'NO'
    }));

    return new TableSchema(
      table.name,
      database,
      '',
      fields,
      DataSourceType.PostgresSQL
    );
  }

  protected includeDatabaseNameInQuery(): boolean {
    return false;
  }

  public async getRawSchema(database: string, table: string): Promise<Row[]> {
    const rows = await this.connection.raw(
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '${table}'`
    );

    return rows.rows.map((row: any) => {
      return {
        column_name: row.column_name,
        data_type: row.data_type,
        is_nullable: row.is_nullable
      };
    });
  }
}
