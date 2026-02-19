import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PassThrough } from 'stream';

vi.mock('../transcript-parser.js', () => ({
  parseTranscript: vi.fn(),
}));

vi.mock('../project-resolver.js', () => ({
  resolveProjectHint: vi.fn(),
}));

vi.mock('../config.js', () => ({
  readConfig: vi.fn(),
}));

vi.mock('../api-client.js', () => ({
  ingestBurn: vi.fn(),
}));

import { parseTranscript } from '../transcript-parser.js';
import { resolveProjectHint } from '../project-resolver.js';
import { readConfig } from '../config.js';
import { ingestBurn } from '../api-client.js';
import type { TranscriptUsage } from '../transcript-parser.js';
import { reportCommand } from './report.js';

const MOCK_USAGE: TranscriptUsage = {
  total_tokens: 5000,
  input_tokens: 3000,
  output_tokens: 2000,
  cache_creation_tokens: 0,
  cache_read_tokens: 0,
  model: 'claude-opus-4-6',
  message_count: 10,
  duration_s: 120,
  version: '1.0.0',
};

const VALID_PAYLOAD = JSON.stringify({
  session_id: 'sess_123',
  transcript_path: '/path/to/transcript.jsonl',
  cwd: '/home/user/project',
  hook_event_name: 'SessionEnd',
});

describe('reportCommand', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let originalStdin: NodeJS.ReadStream;

  beforeEach(() => {
    vi.clearAllMocks();
    exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);
    stderrSpy = vi
      .spyOn(process.stderr, 'write')
      .mockImplementation(() => true);
    stdoutSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);
    originalStdin = process.stdin;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(process, 'stdin', {
      value: originalStdin,
      configurable: true,
    });
  });

  function setStdin(content: string): void {
    const stream = new PassThrough();
    Object.defineProperty(process, 'stdin', {
      value: stream,
      configurable: true,
    });
    stream.end(content);
  }

  function setupSuccessCase(): void {
    vi.mocked(parseTranscript).mockResolvedValue(MOCK_USAGE);
    vi.mocked(resolveProjectHint).mockReturnValue('user/project');
    vi.mocked(readConfig).mockReturnValue({
      api_token: 'test_token',
      api_url: 'https://api.example.com',
    });
    vi.mocked(ingestBurn).mockResolvedValue(
      new Response('{}', { status: 200 }),
    );
    setStdin(VALID_PAYLOAD);
  }

  it('exits 0 when stdin is empty', async () => {
    setStdin('');

    await reportCommand();

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(vi.mocked(parseTranscript)).not.toHaveBeenCalled();
  });

  it('exits 0 when stdin is whitespace only', async () => {
    setStdin('   \n  ');

    await reportCommand();

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(vi.mocked(parseTranscript)).not.toHaveBeenCalled();
  });

  it('exits 0 when stdin has invalid JSON', async () => {
    setStdin('not json {]');

    await reportCommand();

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(vi.mocked(parseTranscript)).not.toHaveBeenCalled();
  });

  it('exits 0 when transcript_path is missing from payload', async () => {
    setStdin(JSON.stringify({ session_id: 'sess_123', cwd: '/home/user' }));

    await reportCommand();

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(vi.mocked(parseTranscript)).not.toHaveBeenCalled();
  });

  it('exits 0 when parseTranscript returns null', async () => {
    vi.mocked(parseTranscript).mockResolvedValue(null);
    setStdin(VALID_PAYLOAD);

    await reportCommand();

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(vi.mocked(ingestBurn)).not.toHaveBeenCalled();
  });

  it('exits 0 and prints message to stderr when no api_token configured', async () => {
    vi.mocked(parseTranscript).mockResolvedValue(MOCK_USAGE);
    vi.mocked(resolveProjectHint).mockReturnValue(null);
    vi.mocked(readConfig).mockReturnValue({});
    setStdin(VALID_PAYLOAD);

    await reportCommand();

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(stderrSpy).toHaveBeenCalledWith(
      'fyt-burn: no API token configured, run fyt-burn login\n',
    );
    expect(vi.mocked(ingestBurn)).not.toHaveBeenCalled();
  });

  it('sets verification to extension_tracked', async () => {
    setupSuccessCase();

    await reportCommand();

    expect(vi.mocked(ingestBurn)).toHaveBeenCalledWith(
      'test_token',
      expect.objectContaining({ verification: 'extension_tracked' }),
    );
  });

  it('sets tool to claude_code', async () => {
    setupSuccessCase();

    await reportCommand();

    expect(vi.mocked(ingestBurn)).toHaveBeenCalledWith(
      'test_token',
      expect.objectContaining({ tool: 'claude_code' }),
    );
  });

  it('sets token_precision to exact', async () => {
    setupSuccessCase();

    await reportCommand();

    expect(vi.mocked(ingestBurn)).toHaveBeenCalledWith(
      'test_token',
      expect.objectContaining({ token_precision: 'exact' }),
    );
  });

  it('includes model, messages, duration_s, claude_code_version in metadata', async () => {
    setupSuccessCase();

    await reportCommand();

    expect(vi.mocked(ingestBurn)).toHaveBeenCalledWith(
      'test_token',
      expect.objectContaining({
        metadata: {
          model: 'claude-opus-4-6',
          messages: 10,
          duration_s: 120,
          claude_code_version: '1.0.0',
        },
      }),
    );
  });

  it('sends session_id and tokens_burned from transcript', async () => {
    setupSuccessCase();

    await reportCommand();

    expect(vi.mocked(ingestBurn)).toHaveBeenCalledWith(
      'test_token',
      expect.objectContaining({
        session_id: 'sess_123',
        tokens_burned: 5000,
        source: 'anthropic',
      }),
    );
  });

  it('sets activity_date to today in YYYY-MM-DD format', async () => {
    setupSuccessCase();
    const today = new Date().toISOString().slice(0, 10);

    await reportCommand();

    expect(vi.mocked(ingestBurn)).toHaveBeenCalledWith(
      'test_token',
      expect.objectContaining({ activity_date: today }),
    );
  });

  it('exits 0 on successful ingest with no stdout output', async () => {
    setupSuccessCase();
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await reportCommand();

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(stdoutSpy).not.toHaveBeenCalled();
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('exits 0 and prints to stderr when ingestBurn throws', async () => {
    vi.mocked(parseTranscript).mockResolvedValue(MOCK_USAGE);
    vi.mocked(resolveProjectHint).mockReturnValue(null);
    vi.mocked(readConfig).mockReturnValue({
      api_token: 'test_token',
      api_url: 'https://api.example.com',
    });
    vi.mocked(ingestBurn).mockRejectedValue(new Error('Network error'));
    setStdin(VALID_PAYLOAD);

    await reportCommand();

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(stderrSpy).toHaveBeenCalled();
    expect(vi.mocked(ingestBurn)).toHaveBeenCalled();
  });

  it('exits 0 and prints to stderr when ingestBurn returns non-ok response', async () => {
    vi.mocked(parseTranscript).mockResolvedValue(MOCK_USAGE);
    vi.mocked(resolveProjectHint).mockReturnValue(null);
    vi.mocked(readConfig).mockReturnValue({
      api_token: 'test_token',
      api_url: 'https://api.example.com',
    });
    vi.mocked(ingestBurn).mockResolvedValue(
      new Response('error', { status: 500 }),
    );
    setStdin(VALID_PAYLOAD);

    await reportCommand();

    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('fyt-burn: API error 500'),
    );
  });

  it('uses null project_hint when resolveProjectHint throws', async () => {
    vi.mocked(parseTranscript).mockResolvedValue(MOCK_USAGE);
    vi.mocked(resolveProjectHint).mockImplementation(() => {
      throw new Error('Not a git repo');
    });
    vi.mocked(readConfig).mockReturnValue({
      api_token: 'test_token',
      api_url: 'https://api.example.com',
    });
    vi.mocked(ingestBurn).mockResolvedValue(
      new Response('{}', { status: 200 }),
    );
    setStdin(VALID_PAYLOAD);

    await reportCommand();

    expect(vi.mocked(ingestBurn)).toHaveBeenCalledWith(
      'test_token',
      expect.objectContaining({ project_hint: undefined }),
    );
    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('exits 0 on any unexpected error', async () => {
    vi.mocked(parseTranscript).mockRejectedValue(new Error('Unexpected'));
    vi.mocked(readConfig).mockReturnValue({
      api_token: 'test_token',
      api_url: 'https://api.example.com',
    });
    setStdin(VALID_PAYLOAD);

    await reportCommand();

    expect(exitSpy).toHaveBeenCalledWith(0);
  });

  it('never exits with a non-zero code', async () => {
    setupSuccessCase();

    await reportCommand();

    const calls = exitSpy.mock.calls;
    for (const [code] of calls) {
      expect(code).toBe(0);
    }
  });
});
