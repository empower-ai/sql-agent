export interface FieldDefinition {
  name: string
  description: string
  type: string
  required: boolean
}

export enum DataSourceType {
  Mysql = 'Mysql',
  BigQuery = 'BigQuery',
  PostgresSQL = 'PostgresSQL'
}

export class TableSchema {
  constructor(
    public readonly name: string,
    public readonly database: string,
    public readonly description: string | null,
    public readonly fields: FieldDefinition[],
    public readonly dataSource: DataSourceType
  ) { }

  public getUniqueID(): string {
    return `${this.database}.${this.name}`;
  }

  public getColumnNames(): string[] {
    return this.fields.map(field => field.name);
  }
}

export interface DatabaseSchema {
  name: string
  schemas: TableSchema[]
}
