import { type App } from '@slack/bolt';
import { type DataQuestionAgent } from '../../agent/data-question-agent';
import getLogger from '../../utils/logger';
import { getAssumptionBlocks, getErrorBlock, getQueryBlocks, getQuestionBlock, getResultBlocks } from '../view/blocks';
import ResultBuilder from '../../utils/result-builder';

const logger = getLogger('Event Handler');

export default async function handleAppMention(app: App, agent: DataQuestionAgent): Promise<void> {
  const func = async ({ event, say }: { event: any, say: any }): Promise<void> => {
    if (event.subtype === 'message_changed') {
      return;
    }

    logger.debug(`Received ${event.type} event: ${JSON.stringify(event)}`);
    try {
      const answer = await agent.answer(event.text, event.thread_ts ?? event.ts);

      if (!answer.hasResult) {
        if (answer.err != null) {
          await say({
            blocks: [
              getQuestionBlock(event.text),
              ...getErrorBlock(answer.err),
              ...getAssumptionBlocks(answer.assumptions!, false, false),
              ...getQueryBlocks(answer.query, false, false)
            ],
            metadata: {
              event_type: 'original_response',
              event_payload: {
                previous_query: answer.query,
                previous_assumptions: answer.assumptions,
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

      const result = ResultBuilder.buildFromRows(answer.rows!);
      await say({
        blocks: [
          getQuestionBlock(event.text),
          ...getResultBlocks(result, false),
          ...getAssumptionBlocks(answer.assumptions!, false, false),
          ...getQueryBlocks(answer.query, false, false)
        ],
        metadata: {
          event_type: 'original_response',
          event_payload: {
            previous_query: answer.query,
            previous_assumptions: answer.assumptions,
            previous_result: result.toSlackMessageDisplayResult(),
            question: event.text
          }
        },
        thread_ts: event.thread_ts ?? event.ts
      });

      if (result.numRowsTruncated > 0) {
        await app.client.files.uploadV2({
          initial_comment: 'Full result with updated assumptions:',
          filename: 'result.csv',
          content: result.fullCsvContent,
          thread_ts: event.thread_ts ?? event.ts,
          channel_id: event.channel
        });
      }
    } catch (error) {
      await say({
        text: 'An error occurred while processing your request, please try again later.',
        thread_ts: event.thread_ts ?? event.ts
      });
      logger.error(error);
    }
  };

  app.event('app_mention', func);
  app.event('message', func);
}
