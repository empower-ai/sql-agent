import dataQuestionAgent from '@/agent/data-question-agent';
import SlackTable from '@/utils/slacktable';
import { type NextApiRequest, type NextApiResponse } from 'next';

const handler = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  console.log(req.body);

  const { messages } = req.body as { messages: Array<{ content: string }> };

  const answer = await dataQuestionAgent.answer(messages[messages.length - 1].content, 'test');
  res.json({
    query: answer.query,
    assumption: answer.assumptions,
    answer: answer.rows ? SlackTable.buildFromRows(answer.rows).content : '',
    hasResult: answer.hasResult,
    err: answer.err
  })
};

export default handler;
