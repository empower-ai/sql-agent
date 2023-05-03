import * as fs from 'fs';

class ConfigLoader {
  private readonly bqkey: string | null = null;
  private readonly additionalContext: string | null = null;

  constructor() {
    this.bqkey = null;
    const envBqKey = process.env.BQ_KEY;
    if (envBqKey != null) {
      if (!fs.existsSync(envBqKey)) {
        throw new Error(`Bigquery key file "${envBqKey}" not found`);
      }

      this.bqkey = fs.readFileSync(envBqKey, { encoding: 'utf-8' });
    }

    const contextFilePath = process.env.CONTEXT_FILE_PATH;
    if (contextFilePath != null) {
      if (!fs.existsSync(contextFilePath)) {
        throw new Error(`Context file "${contextFilePath}" not found`);
      }

      this.additionalContext = fs.readFileSync(contextFilePath, { encoding: 'utf-8' });
    }
  }

  public getBqKey(): string | null {
    return this.bqkey;
  }

  public getAdditionalContext(): string | null {
    return this.additionalContext;
  }
}

const configLoader = new ConfigLoader();
export default configLoader;
