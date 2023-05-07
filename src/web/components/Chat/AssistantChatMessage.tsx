import { type FC, memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Assumption } from './Assumption';
import { Query } from './Query';
import { type Answer } from '@/../agent/types';
import { AssistantMessage, RunQueryResult, type Message, type SenseiResponse } from '@/types/chat';

export interface Props {
  messageContent: string
  onUpdateAssistantMessage: (editedMessage: Message) => void
}

export const AssistantChatMessage: FC<Props> = memo(({ messageContent, onUpdateAssistantMessage }) => {
  const parsedMessage = JSON.parse(messageContent) as AssistantMessage;
  const response = parsedMessage.senseiResponse;

  const [query, setQuery] = useState(parsedMessage.updatedQuery ?? response.query);
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
    setQuery(result.query);
    setHasEdited(true);

    onUpdateAssistantMessage({
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

  const questionBlock = (
    <>
      <h4>Question:</h4>
      <ReactMarkdown>
        {'> ' + response.question}
      </ReactMarkdown>
    </>
  );

  const getAssumptionBlock = () => {
    if (hasEdited) {
      return null;
    }

    return <>
      <h4>These are assumptions I made in order to answer the question:</h4>
      <Assumption assumption={response.assumption} onEdit={() => { }} />
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
        {'> ' + response.err}
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
      <Query query={query} onRunEditedQuery={onRunEditedQuery} />
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
