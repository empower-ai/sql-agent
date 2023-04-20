import { type App } from '@slack/bolt';
import getLogger from '../utils/logger.js';
import { type DataSource } from '../datasource/datasource.js';
import SlackTable from '../utils/slacktable.js';

const logger = getLogger('Command Handler');

export default async function handlCommand(app: App, source: DataSource): Promise<void> {
  app.command('/info', async ({ command, ack, say }) => {
    try {
      logger.info('Received app_mention event');

      if (command.text.startsWith('dbs')) {
        logger.info('dbs command');
        const dbs = source.getDatabases().map((db) => db.name);
        logger.info(`dbs: ${dbs.join('\n')}`);
        await say({
          text: '```' + 'Your databases: \n--------------------\n' + dbs.join('\n') + '```'
        });
      } else if (command.text.startsWith('tables')) {
        const db = command.text.split(' ')[1];
        logger.info(`tables command for ${db}`);
        const tables = source
          .getDatabases()
          .find((d) => d.name === db)
          ?.schemas.map((schema) => schema.name);
        if (tables == null) {
          void say({
            text: `Database ${db} not found or there are no tables in it`
          });
          return;
        } else {
          await say({
            text: '```' + `Your tables in ${db}: \n--------------------\n` + tables.join('\n') + '```'
          });
        }
      } else if (command.text.startsWith('schema')) {
        const db = command.text.split(' ')[1];
        const table = command.text.split(' ')[2];
        logger.info(`schema command for ${db}.${table}`);
        try {
          const schema = await source.getRawSchema(db, table);
          if (schema === null) {
            await say({
              text: `Table ${db}.${table} not found or there is no schema for it`
            });
            return;
          } else {
            const result = SlackTable.buildFromRows(schema);
            await say({
              text: `Table ${db}.${table} schema:\n` + '```' + result.content + '```'
            });
          }
        } catch (e: any) {
          logger.error(e);
          await say({
            text: `Error while getting schema for ${db}.${table}, ${e.message}}`
          });
        }
      }
      await ack();
    } catch (e: any) {
      logger.error(e);
      await say({
        text: `Error while executing command, ${e.message}}`
      });
    }
  });
}
