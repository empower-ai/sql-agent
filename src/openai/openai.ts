import { Configuration, OpenAIApi } from 'openai';

class OpenAI {
  private openai: OpenAIApi | undefined;

  public init(): void {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.openai = new OpenAIApi(configuration);
    // this.api = new ChatGPTAPI({
    //   apiKey: process.env.OPENAI_API_KEY!,
    //   completionParams: {
    //     temperature: 0
    //     // model: 'gpt4'
    //   }
    // });
  }

  async sendMessage(message: string, parentMessageId: string | undefined = undefined): Promise<{
    id: string
    text: string
  }> {
    // const response = await this.api!.sendMessage(message, { parentMessageId });

    // const res = await this.openai?.createCompletion({
    //   model: 'gpt3.5',
    //   prompt: message
    // });

    // console.log(res);
    // return response;
    return {
      id: 'foo',
      text: 'bar'
    };
  }
}

const openAI = new OpenAI();
export default openAI;
