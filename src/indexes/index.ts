import { type DataSource } from '../datasource/datasource'
import DummyIndex from './dummy-index';
import EmbeddingVectorIndex from './embedding-vector-index'
import type DataSourceContextIndex from './types';

export function buildDataSourceContextIndex(useEmbeddingVectorIndex: boolean, dataSource: DataSource): DataSourceContextIndex {
  if (useEmbeddingVectorIndex) {
    return new EmbeddingVectorIndex(dataSource);
  }

  return new DummyIndex(dataSource);
}
