import { type OpenAIModel } from './openai';

export interface Message {
  role: Role
  content: string
}

export type Role = 'assistant' | 'user';

export interface ChatBody {
  model: OpenAIModel
  messages: Message[]
  key: string
  prompt: string
  temperature: number
  conversationId: string
}

export interface Conversation {
  id: string
  name: string
  messages: Message[]
  model: OpenAIModel
  prompt: string
  temperature: number
  folderId: string | null
}
