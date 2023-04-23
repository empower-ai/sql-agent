import { type App } from '@slack/bolt';
import SlackTable from '../../utils/slacktable.js';
import type DataQuestionAgent from '../../agent/data-question-agent.js';
import getLogger from '../../utils/logger.js';
import { getEditQueryBlocks, getErrorBlock, getQueryBlocks, getQuestionBlock, getResultBlocks } from '../view/blocks.js';
import DataVizAgent from '../../agent/data-viz-agent.js';
import { WebClient } from '@slack/web-api';

const logger = getLogger('Event Handler');

export default async function handleAppMention(app: App, agent: DataQuestionAgent): Promise<void> {
  const func = async ({ event, say }: { event: any, say: any }): Promise<void> => {
    const vizAgent = new DataVizAgent();
    const webClient = new WebClient(process.env.SLACK_BOT_TOKEN);

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

      const viz = await vizAgent.viz(result.content);
      if (viz.image != null) {
        await webClient.files.upload({
          channels: event.channel,
          thread_ts: event.thread_ts ?? event.ts,
          file: viz.image,
          filename: 'viz.svg',
          title: 'Visualization',
          initial_comment: 'Here is the visualization of the result.'
        });
      } else {
        await say({
          text: 'Unfortunately I am unable to visualize the result.',
          thread_ts: event.thread_ts ?? event.ts
        });
      }
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
