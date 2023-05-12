import { type App, type BlockAction } from '@slack/bolt';
import ResultBuilder from '../../utils/result-builder';
import getLogger from '../../utils/logger';
import {
  getAssumptionBlocks,
  getQueryBlocks,
  getQuestionBlock,
  getResultBlocks
} from '../view/blocks';
import { type DataSource } from '../../datasource/datasource';
import { Action } from '../types';

const logger = getLogger('Event Handler');

export default async function handleRunEditedQuery(app: App, bqLoader: DataSource): Promise<void> {
  app.action(Action.RunEditedQuery, async ({ ack, client, say, respond, body }) => {
    const actionBody = body as BlockAction;

    const query = actionBody.state?.values?.query_input?.update_query?.value;
    if (query == null) {
      await ack();
      return;
    }
    const isQueryEdited = Boolean(actionBody.message?.metadata.event_payload.edited);
    try {
      const rawResult = await bqLoader.runQuery(query);
      const result = ResultBuilder.buildFromRows(rawResult.rows!);

      await client.chat.update({
        channel: actionBody.channel?.id!,
        ts: actionBody.message?.ts!,
        blocks: [
          getQuestionBlock(actionBody.message?.metadata.event_payload.question!),
          ...getResultBlocks(result, true),
          ...getQueryBlocks(query, true, false)
        ],
        metadata: {
          event_type: 'original_response',
          event_payload: {
            ...actionBody.message?.metadata.event_payload,
            previous_query: query,
            previous_result: result.toSlackMessageDisplayResult(),
            edited: true,
            is_editing_query: false
          }
        }
      });

      if (result.numRowsTruncated > 0) {
        await app.client.files.uploadV2({
          initial_comment: 'Full result of the updated query:',
          filename: 'result.csv',
          content: result.fullCsvContent,
          thread_ts: actionBody.message?.thread_ts,
          channel_id: actionBody.channel?.id
        });
      }
    } catch (error) {
      await client.chat.update({
        channel: actionBody.channel?.id!,
        ts: actionBody.message?.ts!,
        blocks: [
          getQuestionBlock(actionBody.message?.metadata.event_payload.question!),
          ...getResultBlocks(
            actionBody.message?.metadata.event_payload.previous_result!,
            Boolean(actionBody.message?.metadata.event_payload.edited)
          ),
          ...getAssumptionBlocks(
            actionBody.message?.metadata.event_payload.previous_assumptions!,
            isQueryEdited,
            Boolean(actionBody.message?.metadata.event_payload.is_editing_assumptions)
          ),
          ...getQueryBlocks(query, true, true),
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
