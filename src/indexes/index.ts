import dataSource from '../datasource';
import { type DataSource } from '../datasource/datasource'
import DummyIndex from './dummy-index';
import EmbeddingVectorIndex from './embedding-vector-index'
import type DataSourceContextIndex from './types';

function buildDataSourceContextIndex(useEmbeddingVectorIndex: boolean, dataSource: DataSource): DataSourceContextIndex {
  if (useEmbeddingVectorIndex) {
    return new EmbeddingVectorIndex(dataSource);
  }

  return new DummyIndex(dataSource);
}

const dataSourceContextIndex = buildDataSourceContextIndex(Boolean(process.env.ENABLE_EMBEDDING_INDEX), dataSource);

export default dataSourceContextIndex;
