import React, { type FC } from 'react';
import ReactMarkdown from 'react-markdown';
import {Prism as SyntaxHighlighter} from 'react-syntax-highlighter';
import {vscDarkPlus} from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { format } from 'sql-formatter';

interface Props {
  query: string,
  onEdit: (query: string) => void
}

export const Query: FC<Props> = ({ query, onEdit }) => {
  if (!query) {
    return <></>;
  }

  return (
    <>
      <h4>Query:</h4>
        <SyntaxHighlighter language="sql" style={vscDarkPlus}>
          {format(query, { language:  'bigquery' }) }
        </SyntaxHighlighter>
    </>
  )
};
