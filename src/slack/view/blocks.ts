import { type KnownBlock } from '@slack/web-api';
import { Action } from '../types.js';
import { type Result } from '../../utils/slacktable.js';

export function getQuestionBlock(question: string): KnownBlock {
  return {
    block_id: 'question',
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: `> ${question}`
    }
  };
}

export function getErrorBlock(err: string): KnownBlock[] {
  return [{
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '*Error:* ' + '```' + err + '```'
    }
  }];
}

export function getResultBlocks(result: Result, isQueryUpdated: boolean): KnownBlock[] {
  const resultBlocks: KnownBlock[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: isQueryUpdated ? '*Result from the updated query:*' : '*Please see the result below:*'
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '```' + result.content + '```'
      }
    }
  ];

  if (result.numRowsTruncated > 0) {
    resultBlocks.push(
      {
        type: 'section',
        text: {
          type: 'plain_text',
          text: `(${result.numRowsTruncated} rows are truncated to fit slack's max message length)`
        }
      }
    )
  }

  return resultBlocks;
}

export function getQueryBlocks(query: string, isQueryUpdated: boolean): KnownBlock[] {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: isQueryUpdated ? '*Query:*' : '*This is the query used to generate the result:*'
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '```' + query + '```'
      }
    }
  ];
}

export function getEditQueryBlocks(): KnownBlock[] {
  return [{
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: '> See any issue in the query? Click "Edit" to update the query.'
    },
    accessory: {
      type: 'button',
      text: {
        type: 'plain_text',
        text: 'Edit'
      },
      action_id: Action.EditQuery
    }
  }];
}

export function getEditQueryInputBlocks(query: string): KnownBlock[] {
  return [{
    type: 'input',
    block_id: 'query_input',
    element: {
      type: 'plain_text_input',
      multiline: true,
      initial_value: query,
      action_id: 'update_query'
    },
    label: {
      type: 'plain_text',
      text: 'Edit query and tap run to update the result.'
    }
  },
  {
    type: 'actions',
    elements: [{
      type: 'button',
      text: {
        type: 'plain_text',
        text: 'Run'
      },
      style: 'primary',
      action_id: Action.RunEditedQuery
    },
    {
      type: 'button',
      text: {
        type: 'plain_text',
        text: 'Cancel'
      },
      action_id: Action.CancelQueryEditing
    }]
  }];
}
