import { type FC, memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Assumption } from './Assumption';
import { Query } from './Query';
import { type AssistantMessage, type RunQueryResult, type Message } from '@/types/chat';

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
          ...parsedMessage,
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
    if (!response.hasResult) {
      return null;
    }

    let header = <h4>Please see the result below:</h4>;
    if (hasEdited) {
      header = <h4>Result from the updated query:</h4>
    }
    return (<>
      {header}
      <ReactMarkdown>
        {/* {response.answer} */}
        WIP
      </ReactMarkdown>
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
    console.log(query);
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
