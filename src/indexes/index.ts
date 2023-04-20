import { type DataSource } from '../datasource/datasource.js'
import DummyIndex from './dummy-index.js';
import EmbeddingVectorIndex from './embedding-vector-index.js'
import type DataSourceContextIndex from './types.js';

export function buildDataSourceContextIndex(useEmbeddingVectorIndex: boolean, dataSource: DataSource): DataSourceContextIndex {
  if (useEmbeddingVectorIndex) {
    return new EmbeddingVectorIndex(dataSource);
  }

  return new DummyIndex(dataSource);
}
