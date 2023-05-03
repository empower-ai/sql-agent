import * as ChatGPT from '@logunify/chatgpt';

class OpenAI {
  private api: ChatGPT.ChatGPTAPI | undefined = undefined;

  public init(): void {
    this.api = new ChatGPT.ChatGPTAPI({
      apiKey: process.env.OPENAI_API_KEY!,
      completionParams: {
        temperature: 0
        // model: 'gpt4'
      }
    });
  }

  async sendMessage(message: string, parentMessageId: string | undefined = undefined): Promise<ChatGPT.ChatMessage> {
    const response = await this.api!.sendMessage(message, { parentMessageId });
    return response;
  }
}

const openAI = new OpenAI();
export default openAI;
