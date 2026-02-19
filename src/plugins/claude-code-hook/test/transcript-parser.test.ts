import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseTranscript } from '../src/transcript-parser.js';

const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

function makeLine(fields: Record<string, unknown>): string {
  return JSON.stringify(fields);
}

function makeAssistantLine(usage: Record<string, number>, extra: Record<string, unknown> = {}): string {
  return makeLine({
    type: 'assistant',
    message: { content: 'response', usage, model: 'claude-test' },
    timestamp: '2024-01-01T00:00:00.000Z',
    version: '1.0.0',
    ...extra,
  });
}

describe('parseTranscript', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('v2.1 fixture — realistic multi-turn transcript', () => {
    it('sums tokens across all non-sidechain assistant messages', async () => {
      const result = await parseTranscript(path.join(FIXTURES_DIR, 'transcript-v2.1.jsonl'));
      expect(result).not.toBeNull();
      expect(result!.input_tokens).toBe(1000);
      expect(result!.output_tokens).toBe(500);
      expect(result!.cache_creation_tokens).toBe(300);
      expect(result!.cache_read_tokens).toBe(2800);
      expect(result!.total_tokens).toBe(4600);
      expect(result!.message_count).toBe(5);
    });

    it('skips sidechain messages — sidechain tokens not counted in total', async () => {
      const result = await parseTranscript(path.join(FIXTURES_DIR, 'transcript-v2.1.jsonl'));
      // Sidechain entry has 90 input + 40 output = 130 tokens. If counted, total would be 4730.
      expect(result!.total_tokens).toBe(4600);
      expect(result!.message_count).toBe(5);
    });

    it('extracts model name from first assistant message', async () => {
      const result = await parseTranscript(path.join(FIXTURES_DIR, 'transcript-v2.1.jsonl'));
      expect(result!.model).toBe('claude-opus-4-6');
    });

    it('calculates duration from first to last assistant timestamp', async () => {
      const result = await parseTranscript(path.join(FIXTURES_DIR, 'transcript-v2.1.jsonl'));
      // First: 2024-01-15T10:00:00.000Z, Last: 2024-01-15T10:01:00.000Z → 60s
      expect(result!.duration_s).toBe(60);
    });
  });

  describe('v1.0 fixture — older schema without cache fields', () => {
    it('handles missing cache fields — cache tokens default to 0', async () => {
      const result = await parseTranscript(path.join(FIXTURES_DIR, 'transcript-v1.0.jsonl'));
      expect(result).not.toBeNull();
      expect(result!.cache_creation_tokens).toBe(0);
      expect(result!.cache_read_tokens).toBe(0);
      expect(result!.input_tokens).toBe(295);
      expect(result!.output_tokens).toBe(160);
      expect(result!.total_tokens).toBe(455);
      expect(result!.message_count).toBe(3);
    });
  });

  describe('edge cases', () => {
    it('returns null for empty file', async () => {
      vi.spyOn(fs, 'readFileSync').mockImplementation((() => '') as typeof fs.readFileSync);
      const result = await parseTranscript('/fake/empty.jsonl');
      expect(result).toBeNull();
    });

    it('returns null when file does not exist', async () => {
      vi.spyOn(fs, 'readFileSync').mockImplementation((() => {
        throw Object.assign(new Error('ENOENT: no such file'), { code: 'ENOENT' });
      }) as typeof fs.readFileSync);
      const result = await parseTranscript('/nonexistent/path.jsonl');
      expect(result).toBeNull();
    });

    it('handles missing usage field — entry counts 0 tokens without crashing', async () => {
      const lines = [
        makeLine({
          type: 'assistant',
          message: { content: 'No usage here', model: 'claude-test' },
          timestamp: '2024-01-01T00:00:00.000Z',
          version: '1.0.0',
        }),
        makeAssistantLine(
          { input_tokens: 100, output_tokens: 50 },
          { timestamp: '2024-01-01T00:00:01.000Z' },
        ),
      ].join('\n');
      vi.spyOn(fs, 'readFileSync').mockImplementation((() => lines) as typeof fs.readFileSync);
      const result = await parseTranscript('/fake/no-usage.jsonl');
      expect(result).not.toBeNull();
      expect(result!.input_tokens).toBe(100);
      expect(result!.output_tokens).toBe(50);
      expect(result!.cache_creation_tokens).toBe(0);
      expect(result!.cache_read_tokens).toBe(0);
      expect(result!.message_count).toBe(2);
    });

    it('returns null when total_tokens is 0 after processing', async () => {
      const line = makeLine({
        type: 'assistant',
        message: { content: 'No usage', model: 'claude-test' },
        timestamp: '2024-01-01T00:00:00.000Z',
        version: '1.0.0',
      });
      vi.spyOn(fs, 'readFileSync').mockImplementation((() => line) as typeof fs.readFileSync);
      const result = await parseTranscript('/fake/zero-tokens.jsonl');
      expect(result).toBeNull();
    });

    it('handles path with ~ by expanding to home directory', async () => {
      const line = makeAssistantLine({ input_tokens: 50, output_tokens: 25 });
      const spy = vi
        .spyOn(fs, 'readFileSync')
        .mockImplementation((() => line) as typeof fs.readFileSync);

      await parseTranscript('~/transcripts/session.jsonl');

      const calledPath = spy.mock.calls[0]?.[0] as string;
      expect(calledPath).toBe(path.join(os.homedir(), '/transcripts/session.jsonl'));
    });
  });
});
