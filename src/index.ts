import dotenv from 'dotenv';

import bolt from '@slack/bolt';
import configLoader from './config/loader.js';
import { createServer } from 'http'
// eslint-disable-next-line n/no-deprecated-api
import { parse } from 'url'

import getLogger from './utils/logger.js';
import openAI from './openai/openai.js';
import handleAppMention from './slack/event-handlers/app-mention.js';
import handleEditQuery from './slack/event-handlers/edit-query.js';
import handleCancelQueryEditing from './slack/event-handlers/cancel-query-editing.js';
import handleCommand from './slack/command.js';
import handleRunEditedQuery from './slack/event-handlers/run-edited-query.js';
import DataQuestionAgent from './agent/data-question-agent.js';
import loadDataSource from './datasource/index.js';
import { buildDataSourceContextIndex } from './indexes/index.js';
import { createSSHTunnelIfNecessary } from './utils/ssh-tunnel.js';
import QuestionAssumptionIndex from './indexes/question-assumption-index.js';
import next from 'next';

const NODE_MAJOR_VERSION = parseInt(process.versions.node.split('.')[0]);
if (NODE_MAJOR_VERSION < 18) {
  throw new Error('DSensei requires Node version 18 or higher, please upgrade your node version.');
}

dotenv.config();

const logger = getLogger('SlackApp');
logger.info(
  '\n' +
  '    ____    _____                                _  \n' +
  '   / __ \\  / ___/  ___    ____    _____  ___    (_)\n' +
  '  / / / /  \\__ \\  / _ \\  / __ \\  / ___/ / _ \\  / /\n' +
  ' / /_/ /  ___/ / /  __/ / / / / (__  ) /  __/ / /\n' +
  '/_____/  /____/  \\___/ /_/ /_/ /____/  \\___/ /_/\n'
);

await createSSHTunnelIfNecessary();
const { App } = bolt;
configLoader.load();
openAI.init();

const dataSource = loadDataSource();
const dataSourceContextIndex = buildDataSourceContextIndex(Boolean(process.env.ENABLE_EMBEDDING_INDEX), dataSource);
const questionAssumptionIndex = new QuestionAssumptionIndex();
const dataQuestionAgent = new DataQuestionAgent(dataSource, dataSourceContextIndex, questionAssumptionIndex);

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
    handleCommand(slackApp, dataSource)
  ]);

  await slackApp.start();
  logger.info('⚡️ Bolt app started');
}

async function startWebApp(): Promise<void> {
  logger.info('Preparing Next.js app')
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dev = process.env.NODE_ENV !== 'production'
  const hostname = 'localhost'
  const port = 3000

  const webApp = next({ dev, hostname, port });
  const handle = webApp.getRequestHandler()

  await webApp.prepare();
  createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  }).listen(port)

  logger.info(`⚡️ Next.js app started on http://${hostname}:${port}`);
}

await startSlackApp();
if (process.env.ENABLE_WEB_APP === 'true') {
  await startWebApp();
}
