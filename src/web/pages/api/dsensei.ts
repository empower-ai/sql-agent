import dataQuestionAgent from '../../../agent/data-question-agent';
import { type ChatBody } from '@/types/chat';
import SlackTable from '../../../utils/slacktable';

import { type NextApiRequest, type NextApiResponse } from 'next';

const handler = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  const { messages, conversationId } = req.body as ChatBody;

  const answer = await dataQuestionAgent.answer(messages[messages.length - 1].content, conversationId);
  res.json({
    question: messages[messages.length - 1].content,
    query: answer.query,
    assumption: answer.assumptions,
    answer: answer.rows ? SlackTable.buildFromRows(answer.rows).content : '',
    hasResult: answer.hasResult,
    err: answer.err
  })
};

export default handler;
