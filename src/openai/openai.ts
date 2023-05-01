import { ChatGPTAPI, type ChatMessage } from 'chatgpt';

class OpenAI {
  private api: ChatGPTAPI | undefined = undefined;

  public init(): void {
    this.api = new ChatGPTAPI({
      apiKey: process.env.OPENAI_API_KEY!,
      completionParams: {
        temperature: 0
        // model: 'gpt-4'
      }
    });
  }

  async sendMessage(message: string, parentMessageId: string | undefined = undefined): Promise<ChatMessage> {
    const response = await this.api!.sendMessage(message, { parentMessageId });
    return response;
  }
}

const openAI = new OpenAI();
export default openAI;
