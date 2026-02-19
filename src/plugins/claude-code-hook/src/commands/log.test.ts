import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../config.js', () => ({
  readConfig: vi.fn(),
}));

vi.mock('../api-client.js', () => ({
  ingestBurn: vi.fn(),
}));

import { readConfig } from '../config.js';
import { ingestBurn } from '../api-client.js';
import { logCommand } from './log.js';

describe('logCommand', () => {
  let exitSpy: ReturnType<typeof vi.spyOn>;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    exitSpy = vi
      .spyOn(process, 'exit')
      .mockImplementation(() => undefined as never);
    consoleSpy = vi
      .spyOn(console, 'log')
      .mockImplementation(() => {});
    consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    vi.mocked(readConfig).mockReturnValue({
      api_token: 'test_token',
      api_url: 'https://api.example.com',
    });
    vi.mocked(ingestBurn).mockResolvedValue(
      new Response('{}', { status: 200 }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('tokens validation', () => {
    it('rejects non-integer tokens with exit code 1', async () => {
      await logCommand(5.5, {});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error: tokens must be a positive integer',
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('rejects zero tokens with exit code 1', async () => {
      await logCommand(0, {});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error: tokens must be a positive integer',
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('rejects negative tokens with exit code 1', async () => {
      await logCommand(-100, {});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error: tokens must be a positive integer',
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('authentication', () => {
    it('rejects when not logged in with exit code 1', async () => {
      vi.mocked(readConfig).mockReturnValue({});

      await logCommand(1000, {});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Not logged in. Run: fyt-burn login',
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(vi.mocked(ingestBurn)).not.toHaveBeenCalled();
    });
  });

  describe('payload construction', () => {
    it('sets verification to self_reported', async () => {
      await logCommand(1000, {});

      expect(vi.mocked(ingestBurn)).toHaveBeenCalledWith(
        'test_token',
        expect.objectContaining({ verification: 'self_reported' }),
      );
    });

    it('sets token_precision to approximate', async () => {
      await logCommand(1000, {});

      expect(vi.mocked(ingestBurn)).toHaveBeenCalledWith(
        'test_token',
        expect.objectContaining({ token_precision: 'approximate' }),
      );
    });

    it('uses provided source option', async () => {
      await logCommand(1000, { source: 'manual_entry' });

      expect(vi.mocked(ingestBurn)).toHaveBeenCalledWith(
        'test_token',
        expect.objectContaining({ source: 'manual_entry' }),
      );
    });

    it('defaults source to other when not provided', async () => {
      await logCommand(1000, {});

      expect(vi.mocked(ingestBurn)).toHaveBeenCalledWith(
        'test_token',
        expect.objectContaining({ source: 'other' }),
      );
    });

    it('uses provided tool option', async () => {
      await logCommand(1000, { tool: 'custom_cli' });

      expect(vi.mocked(ingestBurn)).toHaveBeenCalledWith(
        'test_token',
        expect.objectContaining({ tool: 'custom_cli' }),
      );
    });

    it('sets tool to null when not provided', async () => {
      await logCommand(1000, {});

      expect(vi.mocked(ingestBurn)).toHaveBeenCalledWith(
        'test_token',
        expect.objectContaining({ tool: null }),
      );
    });

    it('uses provided project option as project_hint', async () => {
      await logCommand(1000, { project: 'my-tribe' });

      expect(vi.mocked(ingestBurn)).toHaveBeenCalledWith(
        'test_token',
        expect.objectContaining({ project_hint: 'my-tribe' }),
      );
    });

    it('sets project_hint to null when not provided', async () => {
      await logCommand(1000, {});

      expect(vi.mocked(ingestBurn)).toHaveBeenCalledWith(
        'test_token',
        expect.objectContaining({ project_hint: null }),
      );
    });

    it('uses provided date option', async () => {
      await logCommand(1000, { date: '2025-06-15' });

      expect(vi.mocked(ingestBurn)).toHaveBeenCalledWith(
        'test_token',
        expect.objectContaining({ activity_date: '2025-06-15' }),
      );
    });

    it('defaults activity_date to today in YYYY-MM-DD format', async () => {
      const today = new Date().toISOString().split('T')[0];

      await logCommand(1000, {});

      expect(vi.mocked(ingestBurn)).toHaveBeenCalledWith(
        'test_token',
        expect.objectContaining({ activity_date: today }),
      );
    });

    it('sends correct tokens_burned value', async () => {
      await logCommand(5000, {});

      expect(vi.mocked(ingestBurn)).toHaveBeenCalledWith(
        'test_token',
        expect.objectContaining({ tokens_burned: 5000 }),
      );
    });
  });

  describe('success response', () => {
    it('prints confirmation message with formatted token count', async () => {
      await logCommand(1500, {});

      expect(consoleSpy).toHaveBeenCalledWith(
        'Logged 1,500 tokens (self-reported) on ' +
          new Date().toISOString().split('T')[0],
      );
    });

    it('includes project in confirmation message when provided', async () => {
      const today = new Date().toISOString().split('T')[0];

      await logCommand(1000, { project: 'find-your-tribe' });

      expect(consoleSpy).toHaveBeenCalledWith(
        `Logged 1,000 tokens (self-reported) for find-your-tribe on ${today}`,
      );
    });

    it('uses provided date in confirmation message', async () => {
      await logCommand(1000, { date: '2025-06-15' });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Logged 1,000 tokens (self-reported) on 2025-06-15',
      );
    });

    it('does not exit on success', async () => {
      await logCommand(1000, {});

      expect(exitSpy).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('exits 1 when ingestBurn throws', async () => {
      vi.mocked(ingestBurn).mockRejectedValue(new Error('Network error'));

      await logCommand(1000, {});

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('exits 1 when response is not ok', async () => {
      vi.mocked(ingestBurn).mockResolvedValue(
        new Response('error', { status: 500, statusText: 'Internal Server Error' }),
      );

      await logCommand(1000, {});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to log burn: Internal Server Error',
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it('prints statusText from response on error', async () => {
      vi.mocked(ingestBurn).mockResolvedValue(
        new Response('error', { status: 401, statusText: 'Unauthorized' }),
      );

      await logCommand(1000, {});

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to log burn: Unauthorized',
      );
    });
  });

  describe('locale formatting', () => {
    it('formats 1000 tokens as 1,000', async () => {
      await logCommand(1000, {});

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('1,000 tokens'),
      );
    });

    it('formats 1000000 tokens as 1,000,000', async () => {
      await logCommand(1000000, {});

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('1,000,000 tokens'),
      );
    });
  });

  describe('all options together', () => {
    it('handles all options provided', async () => {
      await logCommand(5000, {
        source: 'api_call',
        project: 'tribe-backend',
        tool: 'python_script',
        date: '2025-05-10',
      });

      expect(vi.mocked(ingestBurn)).toHaveBeenCalledWith('test_token', {
        tokens_burned: 5000,
        source: 'api_call',
        tool: 'python_script',
        verification: 'self_reported',
        project_hint: 'tribe-backend',
        activity_date: '2025-05-10',
        token_precision: 'approximate',
      });
      expect(consoleSpy).toHaveBeenCalledWith(
        'Logged 5,000 tokens (self-reported) for tribe-backend on 2025-05-10',
      );
    });
  });
});
