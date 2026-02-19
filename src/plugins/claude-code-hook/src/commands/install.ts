import fs from 'fs/promises';
import path from 'path';
import os from 'os';

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

export async function installCommand(): Promise<void> {
  const targetPath = path.join(os.homedir(), '.claude', 'settings.json');
  let settings: Settings = {};

  // Read existing settings
  try {
    const content = await fs.readFile(targetPath, 'utf-8');
    settings = JSON.parse(content);
  } catch {
    // File doesn't exist or can't be parsed, start with empty object
    settings = {};
  }

  // Ensure hooks structure exists
  if (!settings.hooks) {
    settings.hooks = {};
  }
  if (!settings.hooks.SessionEnd) {
    settings.hooks.SessionEnd = [];
  }

  // Check if fyt-burn hook is already installed
  const alreadyInstalled = settings.hooks.SessionEnd.some((entry: HookEntry) =>
    entry.hooks?.some(
      (hook: HookCommand) =>
        hook.type === 'command' && hook.command.includes('fyt-burn'),
    ),
  );

  if (alreadyInstalled) {
    console.log('fyt-burn hook is already installed.');
    return;
  }

  // Construct new hook entry
  const newHookEntry: HookEntry = {
    matcher: '*',
    hooks: [
      {
        type: 'command',
        command: 'fyt-burn report',
        timeout: 15,
      },
    ],
  };

  // Add to SessionEnd array
  settings.hooks.SessionEnd.push(newHookEntry);

  // Create parent directory if needed
  const dir = path.dirname(targetPath);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // Directory creation failed or directory already exists
  }

  // Write updated settings
  try {
    await fs.writeFile(targetPath, JSON.stringify(settings, null, 2));
    console.log(`Hook installed in ${targetPath}`);
    console.log(
      'Your Claude Code sessions will now report to Find Your Tribe.',
    );
  } catch (error) {
    throw new Error(`Failed to write settings file: ${error}`);
  }
}
