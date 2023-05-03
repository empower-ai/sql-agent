import * as bolt from '@slack/bolt';
import { createServer } from 'http'
// eslint-disable-next-line n/no-deprecated-api
import { parse } from 'url'

import getLogger from './utils/logger';
import openAI from './openai/openai';
import handleAppMention from './slack/event-handlers/app-mention';
import handleEditQuery from './slack/event-handlers/edit-query';
import handleCancelQueryEditing from './slack/event-handlers/cancel-query-editing';
import handleCommand from './slack/command';
import handleRunEditedQuery from './slack/event-handlers/run-edited-query';
import dataQuestionAgent from './agent/data-question-agent';
import dataSource from './datasource/index';
import { createSSHTunnelIfNecessary } from './utils/ssh-tunnel';
import handleEditAssumptions from './slack/event-handlers/edit-assumptions';
import handleCancelAssumptionsEditing from './slack/event-handlers/cancel-assumptions-editing';
import handleUpdateAssumptions from './slack/event-handlers/update-assumptions';
import next from 'next';

const NODE_MAJOR_VERSION = parseInt(process.versions.node.split('.')[0]);
if (NODE_MAJOR_VERSION < 18) {
  throw new Error('DSensei requires Node version 18 or higher, please upgrade your node version.');
}

const logger = getLogger('SlackApp');
logger.info(
  '\n' +
  '    ____    _____                                _  \n' +
  '   / __ \\  / ___/  ___    ____    _____  ___    (_)\n' +
  '  / / / /  \\__ \\  / _ \\  / __ \\  / ___/ / _ \\  / /\n' +
  ' / /_/ /  ___/ / /  __/ / / / / (__  ) /  __/ / /\n' +
  '/_____/  /____/  \\___/ /_/ /_/ /____/  \\___/ /_/\n'
);

void createSSHTunnelIfNecessary().then(async () => {
  const { App } = bolt;

  async function startSlackApp(): Promise<void> {
    const slackApp = new App({
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      token: process.env.SLACK_BOT_TOKEN,
      appToken: process.env.SLACK_APP_TOKEN,
      socketMode: true
    });
    await Promise.all([
      handleAppMention(slackApp, dataQuestionAgent),
      handleEditQuery(slackApp),
      handleCancelQueryEditing(slackApp),
      handleRunEditedQuery(slackApp, dataSource),
      handleCommand(slackApp, dataSource),
      handleEditAssumptions(slackApp),
      handleCancelAssumptionsEditing(slackApp),
      handleUpdateAssumptions(slackApp, dataQuestionAgent)
    ]);

    await slackApp.start();
    logger.info('⚡️ Bolt app started');
  }

  async function startWebApp(): Promise<void> {
    logger.info('Preparing Next.js app');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dev = process.env.NODE_ENV !== 'production';
    const hostname = 'localhost';
    const port = 3000;

    const webApp = next({ dev, hostname, port });
    const handle = webApp.getRequestHandler();

    await webApp.prepare();
    createServer((req, res) => {
      const parsedUrl = parse(req.url!, true);
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      handle(req, res, parsedUrl);
    }).listen(port);

    logger.info(`⚡️ Next.js app started on http://${hostname}:${port}`);
  }

  await startSlackApp();
  if (process.env.ENABLE_WEB_APP === 'true') {
    await startWebApp();
  }
});
