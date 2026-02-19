import { loginCommand } from './commands/login.js';
import { installCommand } from './commands/install.js';
import { reportCommand } from './commands/report.js';
import { logCommand } from './commands/log.js';
import { statusCommand } from './commands/status.js';
import type { LogOptions } from './commands/log.js';

const USAGE = `Usage: fyt-burn <command>

Commands:
  login     Authenticate with your FYT API token
  install   Add Claude Code SessionEnd hook
  report    Report burn from hook (reads stdin)
  log       Manually log a burn session
  status    Show connection status

Run fyt-burn log --help for log command options`;

function parseLogArgs(args: string[]): [number, LogOptions] {
  const [tokensStr, ...rest] = args;
  const tokens = parseInt(tokensStr, 10);
  const options: LogOptions = {};

  let i = 0;
  while (i < rest.length) {
    const arg = rest[i];

    // --key=value format
    const eqMatch = arg.match(/^--(\w+)=(.+)$/);
    if (eqMatch) {
      const key = eqMatch[1];
      const value = eqMatch[2];
      if (key === 'source') options.source = value;
      else if (key === 'project') options.project = value;
      else if (key === 'tool') options.tool = value;
      else if (key === 'date') options.date = value;
      i++;
      continue;
    }

    // --key value format
    const flagMatch = arg.match(/^--(\w+)$/);
    if (flagMatch && i + 1 < rest.length && !rest[i + 1].startsWith('--')) {
      const key = flagMatch[1];
      const value = rest[i + 1];
      if (key === 'source') options.source = value;
      else if (key === 'project') options.project = value;
      else if (key === 'tool') options.tool = value;
      else if (key === 'date') options.date = value;
      i += 2;
      continue;
    }

    i++;
  }

  return [tokens, options];
}

async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);

  switch (command) {
    case 'login':
      await loginCommand();
      break;
    case 'install':
      await installCommand();
      break;
    case 'report':
      await reportCommand();
      break;
    case 'log': {
      const [tokens, options] = parseLogArgs(args);
      await logCommand(tokens, options);
      break;
    }
    case 'status':
      await statusCommand();
      break;
    default:
      console.log(USAGE);
      break;
  }
}

main().catch((err: Error) => {
  console.error(err.message);
  process.exit(1);
});
