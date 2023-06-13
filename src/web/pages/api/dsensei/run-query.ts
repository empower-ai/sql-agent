import { type NextApiRequest, type NextApiResponse } from 'next';
import dataSource from '@/../datasource';
import { type Query } from '@/types/query';
import ResultBuilder from '@/../utils/result-builder';

const handler = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  const { query } = req.body as Query;

  try {
    const result = await dataSource.runQuery(query);
    res.json({
      query,
      resultData: result.rows ? ResultBuilder.buildFromRows(result.rows).fullCsvContent : '',
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
