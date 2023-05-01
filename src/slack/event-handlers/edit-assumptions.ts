import { type App, type BlockAction } from '@slack/bolt';
import { Action } from '../types.js';
import { getAssumptionBlocks, getQueryBlocks, getQuestionBlock, getResultBlocks } from '../view/blocks.js';

export default async function handleEditAssumptions(app: App): Promise<void> {
  app.action(Action.EditAssumptions, async ({ ack, client, body }) => {
    const actionBody = body as BlockAction;

    await client.chat.update({
      channel: actionBody.channel?.id!,
      ts: actionBody.message?.ts!,
      blocks: [
        getQuestionBlock(actionBody.message?.metadata.event_payload.question!),
        ...getResultBlocks(
          actionBody.message?.metadata.event_payload.previous_result!,
          Boolean(actionBody.message?.metadata.event_payload.edited)
        ),
        ...getAssumptionBlocks(actionBody.message?.metadata.event_payload.previous_assumptions, false, true),
        ...getQueryBlocks(
          actionBody.message?.metadata.event_payload.previous_query!,
          Boolean(actionBody.message?.metadata.event_payload.edited),
          Boolean(actionBody.message?.metadata.event_payload.is_editing_query!)
        )
      ],
      metadata: {
        event_type: 'original_response',
        event_payload: {
          ...actionBody.message?.metadata.event_payload,
          is_editing_assumptions: true
        }
      }
    });

    await ack();
  });
}
