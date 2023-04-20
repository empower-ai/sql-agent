import { type App, type BlockAction } from '@slack/bolt';
import { Action } from '../types.js';
import { getEditQueryBlocks, getQueryBlocks, getQuestionBlock, getResultBlocks } from '../view/blocks.js';

export default async function handleCancelQueryEditing(app: App): Promise<void> {
  app.action(Action.CancelQueryEditing, async ({ ack, client, body }) => {
    const actionBody = body as BlockAction;
    const isQueryUpdated = Boolean(actionBody.message?.metadata.event_payload.edited);
    await client.chat.update({
      channel: actionBody.channel?.id!,
      ts: actionBody.message?.ts!,
      blocks: [
        getQuestionBlock(actionBody.message?.metadata.event_payload.question!),
        ...getResultBlocks(
          actionBody.message?.metadata.event_payload.previous_result!,
          isQueryUpdated
        ),
        ...getQueryBlocks(
          actionBody.message?.metadata.event_payload.previous_query!,
          isQueryUpdated
        ),
        ...getEditQueryBlocks()
      ]
    });

    await ack();
  });
}
