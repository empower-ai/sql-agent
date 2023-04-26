# <img valign="middle" src="https://github.com/logunify/dsensei/blob/main/docs/images/logo.png" width="65" height="65"/>   DSensei

[![slack](https://img.shields.io/badge/SlackDemo-@DSensei-brightgreen.svg?logo=slack)](https://join.slack.com/t/dsensei-demo/shared_invite/zt-1tt55ia3p-jMlofj8YHGnCMjuu30vJeg)
[![Discord](https://img.shields.io/badge/discord-@DSensei-blue.svg?logo=discord)](https://discord.gg/fRzNUEugRU)


Revolutionize the way you access data using DSensei, the open source Slack bot that makes querying your databases effortless with natural language. DSensei can easily retrieve data from databases like BigQuery, MySQL, and PostgreSQL with the power of ChatGPT, eliminating the need for complex SQL queries.

Try a live demo in our [Slack Channel](https://join.slack.com/t/dsensei-demo/shared_invite/zt-1tt55ia3p-jMlofj8YHGnCMjuu30vJeg)

## Table of Contents

- [Demo Videos](#Demo-videos)
- [Installation](#Installation)
- [Usage](#Usage)
- [More Demos](#More-Demos)
- [Known Issues](#Known-Issues)

## Demo Videos

![](https://github.com/logunify/dsensei/blob/main/docs/images/follow-up.gif)
Complex query, get number of movies, most popular movie and most popular actor.

## Installation

### Prerequisites

Before installing DSensei, ensure that you have the following:

- Node version >= 18
- A Slack workspace
- Admin access to the Slack workspace
- OpenAI API key for GPT-3 authentication
- Database credentials for MySQL, PostgreSQL, or BigQuery

### Set Up the Slack App

1. Navigate to the [Slack API website](https://api.slack.com/) and sign in to your Slack workspace.
2. Click on the "Create an app" button to create a new app, and select "From an app manifest".
3. Select the workspace you want to install the app into.
4. Copy and paste the following manifest as YAML format.

```
display_information:
  name: sensei
features:
  app_home:
    home_tab_enabled: false
    messages_tab_enabled: true
    messages_tab_read_only_enabled: false
  bot_user:
    display_name: sensei
    always_online: true
  slash_commands:
    - command: /info
      description: Get information about DB
      usage_hint: /info [dbs] | [tables db] | [schema db.table]
      should_escape: false
oauth_config:
  scopes:
    bot:
      - app_mentions:read
      - chat:write
      - commands
      - im:history
      - files:write
      - files:read
settings:
  event_subscriptions:
    bot_events:
      - app_mention
      - message.im
  interactivity:
    is_enabled: true
  org_deploy_enabled: false
  socket_mode_enabled: true
  token_rotation_enabled: false
```

5. Click "Create", then click "Install the App to Your Workspace".
6. Verify the app has been installed by checking the "Apps" section in the sidebar of your Slack workspace.

### Setup OpenAI API

- Follow the instructions on [OpenAI website](https://beta.openai.com/docs/authentication/overview) to get your API key.

### Setup the App

- Run `npm install`
- Rename `.env.example` to `.env`
- Setup Slack credentials:
  - Goto https://api.slack.com/apps and select the app you just created.
  - Slack bot token (`SLACK_BOT_TOKEN`) can be found in the "OAuth & Permissions" tab, it should start with `xoxb-` ([screenshot](https://github.com/logunify/dsensei/blob/main/docs/images/slack-bot-token-screenshot.png)).
  - Slack signing secret (`SLACK_SIGNING_SECRET`) can be found under the "Basic Information" tab, as "Signing Secret" ([screenshot](https://github.com/logunify/dsensei/blob/main/docs/images/signing-secret-screenshot.png)).
  - You need to generate a Slack app token (`SLACK_APP_TOKEN`) in the "Basic Information" tab, by clicking the "Generate Token and Scopes" button, and choose the `connections:write` scope. The Slack App Token should start with `xapp-` ([screenshot](https://github.com/logunify/dsensei/blob/main/docs/images/app-token-screenshot.png)).
- Setup the OpenAI API key:
  - You can find your OpenAI API key on this [page](https://platform.openai.com/account/api-keys).
- Setup the DB Access. **Currently only BigQuery, MySQL and pgSQL are supported, and the system only allows for one single type of DB connection.**
  - For BigQuery, a gcp access key is needed. Please follow this [gcp doc](https://cloud.google.com/iam/docs/keys-create-delete) to generate an service account key, and set the BQ_KEY field to the path to your key file.
    - If you use the default roles, please grant the following two roles to the acocunt:
      - `BigQuery Data Viewer`
      - `BigQuery Job User`
    - Or if you prefer to use a custom role, please make user the following permissions are granted to the role:
      - `bigquery.datasets.get`
      - `bigquery.jobs.create`
      - `bigquery.tables.get`
      - `bigquery.tables.getData`
      - `bigquery.tables.list`
  - For MySQL and PgSQL, a standard db connection string should be used (see the example in the `.env.example`).
- [Optional] Whitelist databases and tables.
  - You might want to limit the databases / tables this tool can access, you can do so by list the databases in a comma separated string in the `DATABASES` field, and / or comma separated `dbname.tablename` list in the `TABLES` field.
- [Optional] You can enable result visualization by setting `ENABLE_VIZ=True`
  - **Notice: This is still an experimental feature, may subject to chagnes**
- [Optional] Provide addiitonal context by setting `CONTEXT_FILE_PATH`to the path to a file containing content of additioanl context for Dsensei. Content in the file should be plain text senetense. Make a new line for each sentense. Eg:
  ```
  Revenue is defined by product sales.
  Popularity is defined by number of user checkout.
  ```

### Start the App

Run `npm run prod`

#### In addition to the environment variables mentioned above, here are some additional variables:
* `ENABLE_EMBEDDING_INDEX` (boolean): Toggle the embedding index for tables. By default it is disabled, enable this if you have more than 10 tables.
* `PORT` (int): Port to listen on for the app.
* `ENABLE_DEBUG_LOGGING` (boolean): Toggle the debug logging (this needs be set outside the `.env` file).
## Usage

### Accessing Database Metadata

You can list all databases / tables and check table schema by using the `/info` slach command.

- `/info dbs` command lists all databases accessible via DSensei.
- `/info tables dbname` command lists all tables in the database `dbname`.
- `/info schema dbname.tablename` command shows the schema of table `dbname.tablename`.

### Querying Database

To interact with DSensei in your Slack workspace, type @dsensei in any channel where you want to run a query and enter your query request, for example: "@dsensei, show me the number of daily active users in the past 7 days".

DSensei will translate your request to an SQL statement, run the SQL, and reply with the result in a thread.
If you think the query is incorrect, you can directly edit the query in Slack, and make it re-run the query.
You can also ask follow-up questions in the same thread if you want to dive deeper.
DSensei includes the SQL statement being used to get the result, which allows you to understand how the query was constructed, and make changes or improvements as needed. This feature helps you to build upon previous queries, without starting from scratch every time.

With DSensei, you can easily access data insights through natural language processing, without the need for complex coding skills or extensive knowledge of SQL syntax. DSensei makes it easy to fetch the data you require and focus on analyzing it to drive business value.

## More Demos
Show databases, tables and table schema:
![](https://github.com/logunify/dsensei/blob/main/docs/images/schema.gif)
Edit queries in place if there are errors in the query:
![](https://github.com/logunify/dsensei/blob/main/docs/images/edit.gif)
Simple query to pull data from db:
![](https://github.com/logunify/dsensei/blob/main/docs/images/query.gif)

## Known Issues

- No high availability support. Multiple instances will not work because this is a stateful service.
- Multiple people chatting in the same thread may confuse ChatGPT. Please keep only one active questions in one thread.
- Restarting the service will cause the server lose track of all states, so you will not be able to follow up in threads created before the restart.

For any issues not covered here and feature request, please submit via the Github issue or join our [Discord](https://discord.gg/fRzNUEugRU).
