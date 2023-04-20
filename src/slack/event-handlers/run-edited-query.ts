import { type App, type BlockAction } from '@slack/bolt';
import SlackTable from '../../utils/slacktable.js';
import getLogger from '../../utils/logger.js';
import {
  getEditQueryBlocks,
  getEditQueryInputBlocks,
  getQueryBlocks,
  getQuestionBlock,
  getResultBlocks
} from '../view/blocks.js';
import { type DataSource } from '../../datasource/datasource.js';

const logger = getLogger('Event Handler');

export default async function handleRunEditedQuery(app: App, bqLoader: DataSource): Promise<void> {
  app.action('run_edited_query', async ({ ack, client, say, respond, body }) => {
    const actionBody = body as BlockAction;

    const query = actionBody.state?.values?.query_input?.update_query?.value;
    if (query == null) {
      await ack();
      return;
    }
    try {
      const rawResult = await bqLoader.runQuery(query);
      const result = SlackTable.buildFromRows(rawResult.rows!);

      await client.chat.update({
        channel: (body as BlockAction).channel?.id!,
        ts: (body as BlockAction).message?.ts!,
        blocks: [
          getQuestionBlock(actionBody.message?.metadata.event_payload.question!),
          ...getResultBlocks(result, true),
          ...getQueryBlocks(query, true),
          ...getEditQueryBlocks()
        ],
        metadata: {
          event_type: 'original_response',
          event_payload: {
            previous_query: query,
            previous_result: result.content,
            question: actionBody.message?.metadata.event_payload.question!,
            edited: true
          }
        }
      });
    } catch (error) {
      await client.chat.update({
        channel: (body as BlockAction).channel?.id!,
        ts: (body as BlockAction).message?.ts!,
        blocks: [
          getQuestionBlock(actionBody.message?.metadata.event_payload.question!),
          ...getResultBlocks(
            actionBody.message?.metadata.event_payload.previous_result!,
            Boolean(actionBody.message?.metadata.event_payload.edited)
          ),
          ...getEditQueryInputBlocks(query),
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `*Error happened when running the query:*\n${error}`
            }
          }
        ]
      });
      logger.error(error);
    }
    await ack();
  });
}
