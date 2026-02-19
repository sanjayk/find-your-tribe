import { parseTranscript } from '../transcript-parser.js';
import { resolveProjectHint } from '../project-resolver.js';
import { readConfig } from '../config.js';
import { ingestBurn } from '../api-client.js';

const STDIN_TIMEOUT_MS = 10_000;

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    const timer = setTimeout(() => resolve(''), STDIN_TIMEOUT_MS);

    process.stdin.on('data', (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on('end', () => {
      clearTimeout(timer);
      resolve(Buffer.concat(chunks).toString('utf-8'));
    });
    process.stdin.on('error', () => {
      clearTimeout(timer);
      resolve('');
    });
  });
}

async function doReport(): Promise<void> {
  const raw = await readStdin();

  if (!raw.trim()) return;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return;
  }

  const session_id =
    typeof parsed.session_id === 'string' ? parsed.session_id : undefined;
  const transcript_path =
    typeof parsed.transcript_path === 'string'
      ? parsed.transcript_path
      : undefined;
  const cwd = typeof parsed.cwd === 'string' ? parsed.cwd : '';

  if (!transcript_path) return;

  const usage = await parseTranscript(transcript_path);
  if (!usage) return;

  let project_hint: string | null = null;
  try {
    project_hint = resolveProjectHint(cwd);
  } catch {
    project_hint = null;
  }

  const config = readConfig();
  const api_token = config.api_token;
  if (!api_token) {
    process.stderr.write(
      'fyt-burn: no API token configured, run fyt-burn login\n',
    );
    return;
  }

  const activity_date = new Date().toISOString().slice(0, 10);

  let response: Response;
  try {
    response = await ingestBurn(api_token, {
      session_id,
      tokens_burned: usage.total_tokens,
      source: 'anthropic',
      tool: 'claude_code',
      verification: 'extension_tracked',
      project_hint: project_hint ?? undefined,
      activity_date,
      token_precision: 'exact',
      metadata: {
        model: usage.model,
        messages: usage.message_count,
        duration_s: usage.duration_s,
        claude_code_version: usage.version,
      },
    });
  } catch (err) {
    process.stderr.write(`fyt-burn: failed to report: ${err}\n`);
    return;
  }

  if (!response.ok) {
    process.stderr.write(`fyt-burn: API error ${response.status}\n`);
    return;
  }
}

export async function reportCommand(): Promise<void> {
  try {
    await doReport();
  } catch {
    // silently swallow unexpected errors to never block Claude Code
  }
  process.exit(0);
}
