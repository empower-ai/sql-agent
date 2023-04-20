import * as fs from 'fs';

class ConfigLoader {
  private bqkey: string | null = null;

  public load(): void {
    this.bqkey = null;
    const envBqKey = process.env.BQ_KEY;
    if (envBqKey != null) {
      if (!fs.existsSync(envBqKey)) {
        throw new Error(`Bigquery key file "${envBqKey}" not found`);
      }

      this.bqkey = fs.readFileSync(envBqKey, { encoding: 'utf-8' });
    }
  }

  public getBqKey(): string | null {
    return this.bqkey;
  }
}

const configLoader = new ConfigLoader();
export default configLoader;
