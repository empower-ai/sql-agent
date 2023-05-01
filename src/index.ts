import dotenv from 'dotenv';

import bolt from '@slack/bolt';
import configLoader from './config/loader.js';

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
import handleEditAssumptions from './slack/event-handlers/edit-assumptions.js';
import handleCancelAssumptionsEditing from './slack/event-handlers/cancel-assumptions-editing.js';
import handleUpdateAssumptions from './slack/event-handlers/update-assumptions.js';

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
const dataQuestionAgent = new DataQuestionAgent(dataSource, dataSourceContextIndex);

const app = new App({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  socketMode: true
});

await Promise.all([
  handleAppMention(app, dataQuestionAgent),
  handleEditQuery(app),
  handleCancelQueryEditing(app),
  handleRunEditedQuery(app, dataSource),
  handleCommand(app, dataSource),
  handleEditAssumptions(app),
  handleCancelAssumptionsEditing(app),
  handleUpdateAssumptions(app, dataQuestionAgent)
]);

const port = process.env.PORT ?? 3000;
await app.start();

logger.info(`Sensei is up running, listening on port ${port}`);
