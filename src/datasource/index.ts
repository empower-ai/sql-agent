import configLoader from '../config/loader';
import getLogger from '../utils/logger';
import { type DataSource } from './datasource';
import BigQuerySource from './datasources/bigquery';
import MysqlSource from './datasources/mysql';
import { PgsqlSource } from './datasources/pgsql';

const logger = getLogger('DataSourceLoader');
export default function loadDataSource(): DataSource {
  if (configLoader.getBqKey() == null && process.env.DB_CONNECTION == null) {
    throw new Error('Both BQ_KEY and DB_CONNECTION are set. Please set only one of them.');
  }

  const databases = process.env.DATABASES != null ? process.env.DATABASES.split(',') : [];
  const tables = process.env.TABLES != null ? process.env.TABLES.split(',') : [];

  const invalidTables = tables.filter(table => !table.includes('.'));
  if (invalidTables.length > 0) {
    throw new Error(`Invalid whitelist table: ${invalidTables.join(', ')}. Please make sure the whitelisted table names include the database name with format {database_name|dataset_name}.{table_name}.`);
  }

  let dataSource: DataSource;
  if (process.env.DB_CONNECTION != null) {
    if (process.env.DB_CONNECTION.startsWith('mysql')) {
      dataSource = new MysqlSource(process.env.DB_CONNECTION!, databases, tables);
    } else if (process.env.DB_CONNECTION.startsWith('pgsql') || process.env.DB_CONNECTION.startsWith('postgres')) {
      dataSource = new PgsqlSource(process.env.DB_CONNECTION!, databases, tables);
    } else {
      throw new Error('Unsupported DB_CONNECTION: ' + process.env.DB_CONNECTION);
    }
  } else {
    dataSource = new BigQuerySource(configLoader.getBqKey()!, databases, tables);
  }

  logger.info(`Use data source from ${dataSource.dataSourceType}`);
  return dataSource;
}
