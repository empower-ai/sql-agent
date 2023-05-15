import { type NextApiRequest, type NextApiResponse } from 'next';
import dataSource from '@/../datasource';

const handler = async (req: NextApiRequest, res: NextApiResponse): Promise<void> => {
  const tables = dataSource.getTables();
  res.json(tables);
};

export default handler;
