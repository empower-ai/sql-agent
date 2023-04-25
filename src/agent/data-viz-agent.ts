import openAI from '../openai/openai.js';
import { compile } from 'vega-lite';
import vega from 'vega';
import { type Viz } from './types.js';
import getLogger from '../utils/logger.js';
import sharp from 'sharp';

export default class DataVizAgent {
  private readonly PROMPT = 'select the right chart type to visualize following data, ' +
      'and write a vega spec. You should only use one of ' +
      '"bar chart", "line chart", or "pie chart \n';

  private readonly logger = getLogger('DataVizAgent');

  public async viz(data: string): Promise<Viz> {
    let count = 0;
    const prompt = this.PROMPT + data;
    this.logger.debug(`Prompt: ${prompt}`);
    let response = await openAI.sendMessage(prompt);

    while (count++ < 5) {
      const spec = this.getSpecBlock(response.text);

      if (spec == null) {
        this.logger.debug(`No spec found in response: ${response.text}`)
        return {
          hasResult: false
        };
      }

      const specObject = JSON.parse(spec);

      this.logger.debug(`Vega spec: ${spec}`);

      try {
        const view = new vega.View(vega.parse(compile(specObject).spec))
          .renderer('none');

        await view.runAsync();
        const svg = await view.toSVG();
        const buffer = await sharp(Buffer.from(svg), { density: 300 }).toFormat('png').toBuffer();

        return {
          hasResult: true,
          image: buffer
        }
      } catch (err) {
        this.logger.debug(`Error running query: ${err}`);
        const errorPrompt = `There was an error visualizing this spec \n${spec}, The error message is:${err}\nPlease fix the error and send the correct spec`;
        this.logger.debug(`Error prompt: ${errorPrompt}`);
        response = await openAI.sendMessage(errorPrompt);
      }
    }
    return {
      hasResult: false
    }
  }

  private getSpecBlock(text: string): string | null {
    if (!text.includes('```')) {
      if (text.includes('$schema')) {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}') + 1;
        return text.substring(start, end);
      }

      return null;
    }

    const regex = /```(\w+)?\s([\s\S]+?)```/;
    const match = text.match(regex);
    if (match != null) {
      return match[2];
    } else {
      return null;
    }
  }
}
