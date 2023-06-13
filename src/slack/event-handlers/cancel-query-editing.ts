import { type App, type BlockAction } from '@slack/bolt';
import { Action } from '../types';
import { getAssumptionBlocks, getQueryBlocks, getQuestionBlock, getResultBlocks } from '../view/blocks';

export default async function handleCancelQueryEditing(app: App): Promise<void> {
  app.action(Action.CancelQueryEditing, async ({ ack, client, body }) => {
    const actionBody = body as BlockAction;
    const isQueryEdited = Boolean(actionBody.message?.metadata.event_payload.edited);
    await client.chat.update({
      channel: actionBody.channel?.id!,
      ts: actionBody.message?.ts!,
      blocks: [
        getQuestionBlock(actionBody.message?.metadata.event_payload.question!),
        ...getResultBlocks(
          actionBody.message?.metadata.event_payload.previous_result!,
          isQueryEdited
        ),
        ...getAssumptionBlocks(
          actionBody.message?.metadata.event_payload.previous_assumptions!,
          isQueryEdited,
          Boolean(actionBody.message?.metadata.event_payload.is_editing_assumptions)
        ),
        ...getQueryBlocks(
          actionBody.message?.metadata.event_payload.previous_query!,
          isQueryEdited,
          false
        )
      ],
      metadata: {
        event_type: 'original_response',
        event_payload: {
          ...actionBody.message?.metadata.event_payload,
          is_editing_query: false
        }
      }
    });

    await ack();
  });
}
