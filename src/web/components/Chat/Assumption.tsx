import React, { type FC } from 'react';
import ReactMarkdown from 'react-markdown';

interface Props {
  assumption: string
  onEdit: (assumption: string) => void
}

export const Assumption: FC<Props> = ({ assumption, onEdit }) => {
  if (!assumption) {
    return <></>;
  }

  return (
    <>
      <ReactMarkdown>
        {assumption}
      </ReactMarkdown>
    </>
  )
};
