import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';
import getLogger from '../utils/logger.js';
import { Document } from 'langchain/document';

const logger = getLogger('QuestionAssumptionIndex');

export default class QuestionAssumptionIndex {
  private readonly store: MemoryVectorStore;

  constructor() {
    this.store = new MemoryVectorStore(new OpenAIEmbeddings());
  }

  async add(question: string, assumptions: string): Promise<void> {
    await this.store.addDocuments([
      new Document({
        pageContent:
          JSON.stringify({
            question,
            assumptions
          }),
        metadata: {
          id: question
        }
      })
    ]);
  }

  async search(query: string): Promise<string[]> {
    const results = await this.store.similaritySearchWithScore(query, 5);
    logger.debug(`Data source context index search result: ${JSON.stringify(results)}`);
    return results.map(([result, score]) => (result as Document).pageContent);
  }
}
