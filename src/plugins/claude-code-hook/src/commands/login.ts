import readline from 'readline';
import { readConfig, writeConfig } from '../config.js';
import { verifyToken } from '../api-client.js';

export async function loginCommand(): Promise<void> {
  const config = readConfig();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      'Paste your API token from findyourtribe.dev/settings/integrations: ',
      async (token: string) => {
        rl.close();

        try {
          const response = await verifyToken(token);

          if (response.ok) {
            const data = (await response.json()) as { username: string };
            writeConfig({ api_token: token });
            console.log(
              `Authenticated as ${data.username}. Token stored in ~/.fyt/config.json`,
            );
            resolve();
          } else {
            console.error(
              'Invalid token. Check your token at findyourtribe.dev/settings/integrations',
            );
            resolve();
            process.exit(1);
          }
        } catch {
          console.error(
            'Could not connect to Find Your Tribe API. Check your internet connection.',
          );
          resolve();
          process.exit(1);
        }
      },
    );
  });
}
