import { type FC, memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Assumption } from './Assumption';
import { Query } from './Query';
import { type AssistantMessage, type RunQueryResult, type Message } from '@/types/chat';
import { CSVLink } from 'react-csv';
import { DataGrid } from '@mui/x-data-grid';
import Box from '@mui/material/Box';

export interface Props {
  messageContent: string
  onUpdateAssistantMessage: (editedMessage: Message) => Promise<void>
  onUpdateAssumptions: (message: Message, updatedAssumptions: string) => Promise<void>
}

export const AssistantChatMessage: FC<Props> = memo(({ messageContent, onUpdateAssistantMessage, onUpdateAssumptions }) => {
  const parsedMessage = JSON.parse(messageContent) as AssistantMessage;
  const response = parsedMessage.senseiResponse;

  const query = parsedMessage.updatedQuery ?? response.query;
  const [hasEdited, setHasEdited] = useState(parsedMessage.updatedQuery != null);

  const onRunEditedQuery = async (editedQuery: string) => {
    const response = await fetch('api/dsensei/run-query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: editedQuery
      })
    });

    const result: RunQueryResult = await response.json();
    if (result.err != null) {
      throw new Error(result.err);
    }
    setHasEdited(true);

    await onUpdateAssistantMessage({
      role: 'assistant',
      content: JSON.stringify(
        {
          senseiResponse: {
            ...parsedMessage.senseiResponse,
            answer: result.answer,
            hasResult: result.hasResult,
            err: result.err
          },
          updatedQuery: result.query,
          updatedAnswer: result.answer
        }
      )
    });
  };

  const getAssumptionBlock = () => {
    if (hasEdited) {
      return null;
    }

    return <>
      <h4>These are assumptions I made in order to answer the question:</h4>
      <Assumption
        assumptions={response.assumption}
        onUpdate={async (updatedAssumptions: string) => {
          await onUpdateAssumptions(
            {
              role: 'assistant',
              content: response.question
            },
            updatedAssumptions
          );
        }
        } />
    </>;
  }

  const getAnswerBlock = () => {
    if (!response.hasResult || !response.answer) {
      return null;
    }

    let header = <h4>Please see the result below:</h4>;
    if (hasEdited) {
      header = <h4>Result from the updated query:</h4>
    }

    const rows = response.answer.split('\n');
    const headers = rows[0].split(',');
    const data = rows.slice(1).map((row, index) => {
      const values = row.split(',');
      const obj: any = {};
      obj.id = index;
      headers.forEach((header, index) => {
        obj[header] = values[index];
      });
      return obj;
    });

    return (<>
      {header}
      <Box sx={{ maxHeight: 800, width: '100%' }}>
        <DataGrid
          rows={data}
          columns={headers.map((header, index) => {
            return {
              field: header,
              headerName: header,
              flex: 150,
              minWidth: 150,
              resizable: true
            };
          })}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 5
              }
            }
          }}
          hideFooter={data.length <= 5}
          pageSizeOptions={[5, 10]}
          checkboxSelection={false}
        />
      </Box>
      <CSVLink data={response.answer} filename="result.csv">
        <p>Export Result to CSV</p>
      </CSVLink>
    </>
    );
  }

  const errorBlock = response.err
    ? (
      <ReactMarkdown>
        {`> ${response.err}`}
      </ReactMarkdown>
      )
    : null;

  const getQueryBlock = () => {
    let header = <h4>This is the query used to generate the result:</h4>
    if (hasEdited) {
      header = <h4>Updated query:</h4>;
    }

    return <>
      {header}
      <Query key={query} query={query} onRunEditedQuery={onRunEditedQuery} />
    </>
  };

  return (
    <>
      {getAnswerBlock()}
      {getAssumptionBlock()}
      {getQueryBlock()}
      {errorBlock}
    </>
  );
});
