import { type FC, memo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Assumption } from './Assumption';
import { Query } from './Query';
import { type Answer } from '@/../agent/types';
import { type SenseiResponse } from '@/types/chat';

export interface Props {
  messageContent: string
}

export const AssistantChatMessage: FC<Props> = memo(({ messageContent }) => {
  const response = JSON.parse(messageContent) as SenseiResponse;

  const [query, setQuery] = useState(response.query);
  const [hasEdited, setHasEdited] = useState(false);

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

    const result: Answer = await response.json();
    if (result.err != null) {
      throw new Error(result.err);
    }
    setQuery(result.query);
    setHasEdited(true);
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
