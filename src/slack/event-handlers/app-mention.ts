import { type App } from '@slack/bolt';
import SlackTable from '../../utils/slacktable.js';
import type DataQuestionAgent from '../../agent/data-question-agent.js';
import getLogger from '../../utils/logger.js';
import { getAssumptionBlocks, getEditQueryBlocks, getErrorBlock, getQueryBlocks, getQuestionBlock, getResultBlocks } from '../view/blocks.js';

const logger = getLogger('Event Handler');

export default async function handleAppMention(app: App, agent: DataQuestionAgent): Promise<void> {
  const func = async ({ event, say }: { event: any, say: any }): Promise<void> => {
    logger.debug(`Received app_mention event: ${JSON.stringify(event)}`);
    try {
      const answer = await agent.answer(event.text, event.thread_ts ?? event.ts);

      if (!answer.hasResult) {
        if (answer.err != null) {
          await say({
            blocks: [
              getQuestionBlock(event.text),
              ...getErrorBlock(answer.err),
              ...getQueryBlocks(answer.query, false),
              ...getEditQueryBlocks()
            ],
            metadata: {
              event_type: 'original_response',
              event_payload: {
                previous_query: answer.query,
                previous_result: [],
                question: event.text
              }
            },
            thread_ts: event.thread_ts ?? event.ts
          });
        } else {
          await say({
            text: "I'm sorry, I'm not sure how to answer that, can you add more details?",
            thread_ts: event.thread_ts ?? event.ts
          });
        }
        return;
      }

      const result = SlackTable.buildFromRows(answer.rows!);
      await say({
        blocks: [
          getQuestionBlock(event.text),
          ...getResultBlocks(result, false),
          ...getAssumptionBlocks(answer.assumptions!),
          ...getQueryBlocks(answer.query, false),
          ...getEditQueryBlocks()
        ],
        metadata: {
          event_type: 'original_response',
          event_payload: {
            previous_query: answer.query,
            previous_result: result,
            question: event.text
          }
        },
        thread_ts: event.thread_ts ?? event.ts
      });
    } catch (error) {
      await say({
        text: 'An error occurred while processing your request, please try again later.',
        thread_ts: event.thread_ts ?? event.ts
      });
      console.error(error);
    }
  };

  app.event('app_mention', func);
  app.event('message', func);
}
