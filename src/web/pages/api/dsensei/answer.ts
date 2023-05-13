import { QuestionBody, type ChatBody } from '@/types/chat';

import { type NextApiRequest, type NextApiResponse } from 'next';
import dataQuestionAgent from '@/../agent/data-question-agent';
import ResultBuilder from '@/../utils/result-builder';

const handler = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  const { question, conversationId, providedAssumptions } = req.body as QuestionBody;

  const answer = await dataQuestionAgent.answer(question, conversationId, providedAssumptions);
  res.json({
    question,
    query: answer.query,
    assumption: answer.assumptions,
    answer: answer.rows ? ResultBuilder.buildFromRows(answer.rows).fullCsvContent : '',
    hasResult: answer.hasResult,
    err: answer.err
  })
};

export default handler;
