import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import { type DataSource } from '../datasource/datasource.js';
import getLogger from '../utils/logger.js';
import { type Document } from 'langchain/document';
import type DataSourceContextIndex from './types.js';

const logger = getLogger('DataSourceContextIndex');

export default class EmbeddingVectorIndex implements DataSourceContextIndex {
  private store!: MemoryVectorStore;

  constructor(source: DataSource) {
    void source.getInitializationPromise().then(async () => {
      const tableSchemas = source.getTables();

      logger.info('Building embedding vector index.');
      this.store = await MemoryVectorStore.fromTexts(
        tableSchemas.map(schema => JSON.stringify(schema.getColumnNames())),
        tableSchemas.map(schema => ({ id: schema.getUniqueID() })),
        new OpenAIEmbeddings()
      );

      logger.info(`Finished loading embedding vector index for ${this.store.memoryVectors.length} tables.`);
    });
  }

  async search(query: string): Promise<string[]> {
    const results = await this.store.similaritySearchWithScore(query, 10);
    logger.debug(`Data source context index search result: ${JSON.stringify(results)}`);
    return results.map(([result, score]) => (result as Document).metadata.id);
  }
}
