import React, { FC } from 'react';
import ReactMarkdown from 'react-markdown';

interface Props {
  query: string;
  onEdit: (query: string) => void;
}

export const Query: FC<Props> = ({ query, onEdit }) => {
  if (!query) {
    return <></>;
  }

  return (
    <>
      <h4>Query:</h4>
      <ReactMarkdown>
        {query}
      </ReactMarkdown>
    </>
  )
};
