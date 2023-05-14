import { type FC, memo } from 'react';
import { ChatMessage, type Props } from './ChatMessage';

export const MemoizedChatMessage: FC<Props> = memo(
  ChatMessage,
  (prevProps, nextProps) => (
    prevProps.message.content === nextProps.message.content
  )
);
