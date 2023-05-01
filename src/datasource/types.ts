export interface FieldDefinition {
  name: string
  description: string
  type: string
  required: boolean
  nestedFields?: FieldDefinition[]
}

export interface TableInfo {
  name: string
  isSuffixPartitionTable: boolean
  suffixes?: string[]
}

export interface TableSchemaForContext {
  name: string
  database: string
  description?: string
  fields: FieldDefinition[]
  isSuffixPartitionTable: boolean
  minSuffix?: string
  maxSuffix?: string
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
    public readonly dataSource: DataSourceType,
    public readonly isSuffixPartitionTable: boolean = false,
    public readonly suffixes: string[] = []
  ) { }

  public getUniqueID(): string {
    return `${this.database}.${this.name}`;
  }

  public getColumnNames(includeNested = false): string[] {
    if (!includeNested) {
      return this.fields.map(field => field.name);
    }

    return this.fields.flatMap(field => TableSchema.getNestedColumnNames(field));
  }

  public findFieldByName(name: string): FieldDefinition | undefined {
    let fields: FieldDefinition[] | undefined = this.fields;
    let field: FieldDefinition | undefined;
    for (const namePart of name.split('.')) {
      field = fields?.find(field => field.name === namePart);
      if (field == null) {
        return field;
      }

      fields = field.nestedFields;
    }

    return field;
  }

  public getTopSuffixes(n: number = 2): string[] {
    if (n > this.suffixes.length) {
      return this.suffixes;
    }
    return this.suffixes.sort().slice(this.suffixes.length - n);
  }

  public convertForContextPrompt(): TableSchemaForContext {
    const result: TableSchemaForContext = {
      name: this.name,
      database: this.database,
      fields: this.fields,
      isSuffixPartitionTable: this.isSuffixPartitionTable
    };

    if (this.description != null && this.description.length > 0) {
      result.description = this.description;
    }

    if (this.isSuffixPartitionTable) {
      const sortedSuffixes = this.suffixes.sort();
      result.minSuffix = sortedSuffixes[0];
      result.maxSuffix = sortedSuffixes[sortedSuffixes.length - 1];
    }

    return result;
  }

  private static getNestedColumnNames(field: FieldDefinition, parentFields: string[] = []): string[] {
    if (!field.nestedFields) {
      if (parentFields.length > 0) {
        return [`${parentFields.join('.')}.${field.name}}`];
      }
      return [`${parentFields.join('.')}.${field.name}}`];
    }

    return field.nestedFields.flatMap(
      nestedField => this.getNestedColumnNames(nestedField, parentFields.concat([field.name]))
    );
  }
}

export interface DatabaseSchema {
  name: string
  schemas: TableSchema[]
}
