import { type Dispatch, createContext } from 'react';

import { type ActionType } from '@/hooks/useCreateReducer';

import { type Conversation } from '@/types/chat';
import { type SupportedExportFormats } from '@/types/export';
import { type PluginKey } from '@/types/plugin';

import { type ChatbarInitialState } from './Chatbar.state';

export interface ChatbarContextProps {
  state: ChatbarInitialState
  dispatch: Dispatch<ActionType<ChatbarInitialState>>
  handleDeleteConversation: (conversation: Conversation) => void
  handleClearConversations: () => void
  handleExportData: () => void
  handleImportConversations: (data: SupportedExportFormats) => void
  handlePluginKeyChange: (pluginKey: PluginKey) => void
  handleClearPluginKey: (pluginKey: PluginKey) => void
  handleApiKeyChange: (apiKey: string) => void
}

const ChatbarContext = createContext<ChatbarContextProps>(undefined!);

export default ChatbarContext;
