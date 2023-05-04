import React, { FC } from 'react';
import ReactMarkdown from 'react-markdown';

interface Props {
  assumption: string;
  onEdit: (assumption: string) => void;
}

export const Assumption: FC<Props> = ({ assumption, onEdit }) => {
  if (!assumption) {
    return <></>;
  }

  return (
    <>
      <h4>Assumptions:</h4>
      <ReactMarkdown>
        {assumption}
      </ReactMarkdown>
    </>
  )
};
