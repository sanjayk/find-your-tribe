import fs from 'fs';
import path from 'path';
import os from 'os';

export interface FytConfig {
  api_token: string;
  api_url: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.fyt');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

export function readConfig(): Partial<FytConfig> {
  try {
    const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(content) as Partial<FytConfig>;
  } catch {
    return {};
  }
}

export function writeConfig(updates: Partial<FytConfig>): void {
  const existing = readConfig();
  const merged = { ...existing, ...updates };
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), 'utf-8');
  fs.chmodSync(CONFIG_PATH, 0o600);
}
