import { type App, type BlockAction } from '@slack/bolt';
import { Action } from '../types.js';
import { getAssumptionBlocks, getQueryBlocks, getQuestionBlock, getResultBlocks } from '../view/blocks.js';

export default async function handleEditQuery(app: App): Promise<void> {
  app.action(Action.EditQuery, async ({ ack, client, body }) => {
    const actionBody = body as BlockAction;
    const isQueryEdited = Boolean(actionBody.message?.metadata.event_payload.edited);

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
        ...getQueryBlocks(actionBody.message?.metadata.event_payload.previous_query, false, true)
      ],
      metadata: {
        event_type: 'original_response',
        event_payload: {
          ...actionBody.message?.metadata.event_payload,
          is_editing_query: true
        }
      }
    })
    await ack();
  });
}
