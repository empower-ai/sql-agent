import dataQuestionAgent from '../../../../agent/data-question-agent';
import { type ChatBody } from '@/types/chat';
import SlackTable from '../../../../utils/slacktable';

import { type NextApiRequest, type NextApiResponse } from 'next';
import dataSource from '@/../datasource';
import { type Query } from '@/types/query';

const handler = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  const { query } = req.body as Query;

  try {
    const result = await dataSource.runQuery(query);
    res.json({
      query,
      answer: result.rows ? SlackTable.buildFromRows(result.rows).content : '',
      hasResult: result.hasResult
    });
  } catch (e) {
    res.json({
      query,
      hasResult: false,
      err: `${e}`
    });
  }
};

export default handler;
