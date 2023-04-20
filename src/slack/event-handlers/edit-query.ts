import { type App, type BlockAction } from '@slack/bolt';
import { Action } from '../types.js';
import { getEditQueryInputBlocks, getQuestionBlock, getResultBlocks } from '../view/blocks.js';

export default async function handleEditQuery(app: App): Promise<void> {
  app.action(Action.EditQuery, async ({ ack, client, body }) => {
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
        ...getEditQueryInputBlocks(actionBody.message?.metadata.event_payload.previous_query)
      ]
    })
    await ack();
  });
}
