import { type App, type BlockAction } from '@slack/bolt';
import { Action } from '../types';
import { type DataQuestionAgent } from '../../agent/data-question-agent';
import { getAssumptionBlocks, getErrorBlock, getQueryBlocks, getQuestionBlock, getResultBlocks } from '../view/blocks';
import ResultBuilder from '../../utils/result-builder';
import getLogger from '../../utils/logger';

const logger = getLogger('Event Handler');

export default async function handleUpdateAssumptions(app: App, agent: DataQuestionAgent): Promise<void> {
  app.action(Action.UpdateAssumptions, async ({ ack, client, say, respond, body }) => {
    const actionBody = body as BlockAction;

    await ack();
    const assumptions = actionBody.state?.values?.assumptions_input?.edited_assumptions?.value;

    try {
      const question = actionBody.message?.metadata.event_payload.question!;
      // Create a new id to not mess up the thread for now
      const id = `${actionBody.container.channel_id}|${actionBody.container.thread_ts}|${actionBody.container.message_ts}|${Date.now()}`;

      const answer = await agent.answer(question, id.toString(), assumptions);
      if (!answer.hasResult) {
        if (answer.err != null) {
          await client.chat.update({
            channel: actionBody.channel?.id!,
            ts: actionBody.message?.ts!,
            blocks: [
              getQuestionBlock(question),
              ...getErrorBlock(answer.err),
              ...getAssumptionBlocks(answer.assumptions!, false, false),
              ...getQueryBlocks(answer.query, false, false)
            ],
            metadata: {
              event_type: 'original_response',
              event_payload: {
                ...actionBody.message?.metadata.event_payload,
                previous_query: answer.query,
                previous_assumptions: answer.assumptions,
                question
              }
            }
          });
        } else {
          await client.chat.update({
            channel: actionBody.channel?.id!,
            ts: actionBody.message?.ts!,
            text: 'I\'m sorry, I\'m not sure how to answer that, can you add more details?'
          });
        }
        return;
      }

      const result = ResultBuilder.buildFromRows(answer.rows!);
      await client.chat.update({
        channel: actionBody.channel?.id!,
        ts: actionBody.message?.ts!,
        blocks: [
          getQuestionBlock(question),
          ...getResultBlocks(result, false),
          ...getAssumptionBlocks(answer.assumptions!, false, false),
          ...getQueryBlocks(answer.query, false, false)
        ],
        metadata: {
          event_type: 'original_response',
          event_payload: {
            ...actionBody.message?.metadata.event_payload,
            previous_query: answer.query,
            previous_assumptions: answer.assumptions,
            previous_result: result.toSlackMessageDisplayResult(),
            question
          }
        }
      });
    } catch (error) {
      await client.chat.update({
        channel: actionBody.channel?.id!,
        ts: actionBody.message?.ts!,
        text: 'An error occurred while processing your request, please try again later.'
      });
      logger.error(error);
    }
  });
}
