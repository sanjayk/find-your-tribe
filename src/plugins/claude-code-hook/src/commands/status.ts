import fs from 'fs';
import path from 'path';
import os from 'os';
import { readConfig } from '../config.js';
import { verifyToken } from '../api-client.js';

interface HookCommand {
  type: 'command';
  command: string;
  timeout: number;
}

interface HookEntry {
  matcher: string;
  hooks: HookCommand[];
}

interface HookSettings {
  [key: string]: HookEntry[];
}

interface Settings {
  hooks?: HookSettings;
  [key: string]: any;
}

interface VerifyTokenResponse {
  username: string;
  recent_burns?: Array<{
    date: string;
    tokens: number;
    project?: string | null;
  }>;
}

function checkHookInstalled(): boolean {
  const settingsPath = path.join(os.homedir(), '.claude', 'settings.json');

  try {
    const content = fs.readFileSync(settingsPath, 'utf-8');
    const settings = JSON.parse(content) as Settings;

    if (!settings.hooks || !settings.hooks.SessionEnd) {
      return false;
    }

    return settings.hooks.SessionEnd.some((entry: HookEntry) =>
      entry.hooks?.some(
        (hook: HookCommand) =>
          hook.type === 'command' && hook.command.includes('fyt-burn'),
      ),
    );
  } catch {
    return false;
  }
}

export async function statusCommand(): Promise<void> {
  const config = readConfig();
  const apiToken = config.api_token;

  if (!apiToken) {
    console.log('Not logged in. Run: fyt-burn login');
    return;
  }

  const hookInstalled = checkHookInstalled();

  let accountStatus = 'Error';
  let apiStatus = 'Error';
  let verifyResponse: VerifyTokenResponse | null = null;

  try {
    const response = await verifyToken(apiToken);

    if (response.ok) {
      apiStatus = 'Connected';
      const data = (await response.json()) as VerifyTokenResponse;
      accountStatus = data.username;
      verifyResponse = data;
    }
  } catch {
    // Fetch threw, or JSON parsing failed
  }

  const hookStatus = hookInstalled ? 'Installed' : 'Not installed';

  // Print status table with consistent column spacing
  console.log(`Account:  ${accountStatus}`);
  console.log(`API:      ${apiStatus}`);
  console.log(`Hook:     ${hookStatus}`);

  // Print recent burns if API is connected and data is available
  if (apiStatus === 'Connected' && verifyResponse?.recent_burns) {
    console.log('');
    console.log('Recent burns:');

    const recentBurns = verifyResponse.recent_burns.slice(0, 5);
    for (const burn of recentBurns) {
      const project = burn.project || '(unattributed)';
      const formattedTokens = burn.tokens.toLocaleString();
      console.log(`  ${burn.date}  ${formattedTokens} tokens  ${project}`);
    }
  }
}
