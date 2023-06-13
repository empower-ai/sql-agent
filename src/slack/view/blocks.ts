import { type KnownBlock } from '@slack/web-api';
import { Action } from '../types';
import { type Result } from '../../utils/result-builder';

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

export function getResultBlocks(result: Result, isQueryEdited: boolean): KnownBlock[] {
  const resultBlocks: KnownBlock[] = [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: isQueryEdited ? '*Result from the updated query:*' : '*Please see the result below:*'
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `\`\`\`${result.slackTableContent}\`\`\``
      }
    }
  ];

  if (result.numRowsTruncated > 0) {
    resultBlocks.push(
      {
        type: 'section',
        text: {
          type: 'plain_text',
          text: `(${result.numRowsTruncated} rows are truncated, see the full result below)`
        }
      }
    )
  }

  return resultBlocks;
}

export function getAssumptionBlocks(assumptions: string, isQueryEdited: boolean, isEditing: boolean): KnownBlock[] {
  if (isQueryEdited) {
    // Hide assumptions if query's updated
    return [];
  }
  if (isEditing) {
    return [{
      type: 'input',
      block_id: 'assumptions_input',
      element: {
        type: 'plain_text_input',
        multiline: true,
        initial_value: assumptions,
        action_id: 'edited_assumptions'
      },
      label: {
        type: 'plain_text',
        text: 'Edit assumptions and tap update to rerun.'
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
        action_id: Action.UpdateAssumptions
      },
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Cancel'
        },
        action_id: Action.CancelAssumptionsEditing
      }]
    }];
  }
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*Below are assumptions I made in order to answer the question:*'
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '```' + assumptions + '```'
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '> Notice any problems with the assumption? Click "Edit" to update and rerun.'
      },
      accessory: {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'Edit'
        },
        action_id: Action.EditAssumptions
      }
    }
  ];
}

export function getQueryBlocks(query: string, isQueryEdited: boolean, isEditing: boolean): KnownBlock[] {
  if (isEditing) {
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

  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: isQueryEdited ? '*Query:*' : '*This is the query used to generate the result:*'
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '```' + query + '```'
      }
    },
    {
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
    }
  ];
}
