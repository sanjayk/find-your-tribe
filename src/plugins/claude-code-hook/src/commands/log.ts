import { readConfig } from '../config.js';
import { ingestBurn } from '../api-client.js';

export interface LogOptions {
  source?: string;
  project?: string;
  tool?: string;
  date?: string;
}

export async function logCommand(
  tokens: number,
  options: LogOptions,
): Promise<void> {
  // Validate tokens is a positive integer
  if (!Number.isInteger(tokens) || tokens <= 0) {
    console.error('Error: tokens must be a positive integer');
    process.exit(1);
    return;
  }

  // Read config and check for api_token
  const config = readConfig();
  const api_token = config.api_token;
  if (!api_token) {
    console.error('Not logged in. Run: fyt-burn login');
    process.exit(1);
    return;
  }

  // Build ingest payload
  const payload = {
    tokens_burned: tokens,
    source: options.source || 'other',
    tool: options.tool || null,
    verification: 'self_reported' as const,
    project_hint: options.project || null,
    activity_date: options.date || new Date().toISOString().split('T')[0],
    token_precision: 'approximate' as const,
  };

  // Call ingestBurn
  let response: Response;
  try {
    response = await ingestBurn(api_token, payload as Parameters<typeof ingestBurn>[1]);
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    process.exit(1);
    return;
  }

  // Handle response
  if (response.ok) {
    const formattedTokens = tokens.toLocaleString();
    const forProject = options.project ? ` for ${options.project}` : '';
    const date = options.date || new Date().toISOString().split('T')[0];
    console.log(
      `Logged ${formattedTokens} tokens (self-reported)${forProject} on ${date}`,
    );
  } else {
    console.error(`Failed to log burn: ${response.statusText}`);
    process.exit(1);
    return;
  }
}
