import knex, { type Knex } from 'knex';
import { DataSource } from '../datasource';
import { DataSourceType, type TableInfo, TableSchema } from '../types';
import { type Row } from '../../utils/result-builder';
import { type Answer } from '../../agent/types';

export default class MysqlSource extends DataSource {
  private connection!: Knex;

  public readonly dataSourceType = DataSourceType.Mysql;

  constructor(connectionString: string, allowedDatabases: string[], allowedTables: string[]) {
    super('MySQL', connectionString, allowedDatabases, allowedTables);
  }

  protected init(connectionString: string): void {
    this.connection = knex({
      client: 'mysql',
      connection: connectionString
    });
  }

  public async runQuery(query: string): Promise<Answer> {
    const queryResult = await this.connection.raw(query);

    return {
      query,
      hasResult: true,
      rows: queryResult[0]
    };
  }

  protected async loadDatabaseNames(): Promise<string[]> {
    const result = await this.connection.raw('SHOW DATABASES');
    return result[0]
      .map((row: { Database: string }) => row.Database)
      .filter(
        (database: string) =>
          database !== 'information_schema' &&
          database !== 'mysql' &&
          database !== 'performance_schema' &&
          database !== 'sys'
      );
  }

  protected async loadTableNames(database: string): Promise<string[]> {
    const result = await this.connection.raw(`SHOW TABLES FROM ${database}`);
    const key = `Tables_in_${database}`;
    return result[0].map((row: any) => row[key]);
  }

  protected async loadTableSchema(database: string, table: TableInfo): Promise<TableSchema> {
    const rows = await this.connection.raw(`DESCRIBE ${database}.${table.name}`);

    const fields = rows[0].map((row: any) => ({
      name: row.Field,
      description: '',
      type: row.Type,
      required: row.Null === 'NO'
    }));

    return new TableSchema(
      table.name,
      database,
      '',
      fields,
      DataSourceType.Mysql,
      ''
    );
  }

  public async getRawSchema(database: string, table: string): Promise<Row[]> {
    const rows = await this.connection.raw(`DESCRIBE ${database}.${table}`);
    return rows[0].map((row: any) => {
      return {
        Name: row.Field,
        'Data Type': row.Type,
        Default: row.Default
      };
    });
  }
}
