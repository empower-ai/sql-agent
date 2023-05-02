import { type DataSource } from '../datasource/datasource.js';
import type DataSourceContextIndex from '../indexes/types.js';
import openAI from '../openai/openai.js';
import getLogger from '../utils/logger.js';
import { type Answer } from './types.js';

const logger = getLogger('DataQuestionAgent');

export default class DataQuestionAgent {
  private readonly lastMessageIds = new Map<string, string>();

  public constructor(
    private readonly dataSource: DataSource,
    private readonly dataSourceContextIndex: DataSourceContextIndex
  ) { }

  public async answer(question: string, conversationId: string, providedAssumptions: string | null = null): Promise<Answer> {
    await this.dataSource.getInitializationPromise();

    const relatedTableIds = await this.dataSourceContextIndex.search(question);

    if (!this.lastMessageIds.has(conversationId)) {
      const contextPrompt = this.dataSource.getContextPrompt(relatedTableIds, providedAssumptions);
      logger.debug(`Context prompt:\n${contextPrompt}`);
      const contextResponse = await openAI.sendMessage(contextPrompt);
      logger.debug(`Context prompt response:\n${contextResponse.text}`);

      this.lastMessageIds.set(conversationId, contextResponse.id);
    }

    const questionPrompt = this.dataSource.getQuestionPrompt(question);
    logger.debug(`Question prompt:\n${questionPrompt}`);
    let response = await openAI.sendMessage(questionPrompt, this.lastMessageIds.get(conversationId));

    let counter = 0;
    let query = '';
    let lastErr: any;
    while (counter++ < 3) {
      logger.debug(`Response: ${response.text}`);
      this.lastMessageIds.set(conversationId, response.id);

      const code = this.getCodeBlock(response.text);
      const assumptions = this.extractAssumptions(response.text);

      if (code == null || (!code.trim().startsWith('SELECT') && !code.trim().startsWith('WITH'))) {
        break;
      }

      query = code.trim();
      try {
        logger.info(`Fetched query to execute for question: ${question}. Query: \n${query}`);
        const result = await this.dataSource.runQuery(query);
        return {
          ...result,
          assumptions
        };
      } catch (err) {
        const rerunResult = await this.dataSource.tryFixAndRun(query);
        if (rerunResult.hasResult) {
          return rerunResult;
        }

        logger.debug(`Error running query: ${err}`);
        lastErr = err;
        const errorPrompt = `There was an error running using the query: \n${query} \n` +
          `The error message is:${err}\n` + 'Please correct it.\nIf the error is related with date/time, try a different way.\nAvoid using any field not listed in the schema.\n\nSend the corrected query with all the assumption following the format:\n' +
          'Assumptions: (bullet)\n' +
          'Query: (query)';
        logger.debug(`Error prompt: ${errorPrompt}`);
        response = await openAI.sendMessage(errorPrompt, this.lastMessageIds.get(conversationId));
      }
    }

    logger.info(`Not able to generate query for question: ${question}. Last response: ${response.text}, last error: ${lastErr?.message}`);

    return {
      query: query ?? 'Could not extract query',
      hasResult: false,
      err: lastErr?.message
    };
  }

  private getCodeBlock(text: string): string | null {
    if (!text.includes('```')) {
      if (text.includes('SELECT')) {
        const start = text.indexOf('SELECT');
        return text.substring(start);
      }

      return null;
    }

    const regex = /```(\w+)?\s([\s\S]+?)```/;
    const match = text.match(regex);
    if (match != null) {
      return match[2];
    } else {
      return null;
    }
  }

  private extractAssumptions(text: string): string | undefined {
    const match = /Assumptions:(.*)Query:/s.exec(text);
    if (match != null) {
      return match[1].trim();
    } else {
      return undefined;
    }
  }
}
