import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readConfig, writeConfig } from '../config.js';
import { verifyToken } from '../api-client.js';
import readline from 'readline';

vi.mock('../config.js', () => ({
  readConfig: vi.fn(() => ({})),
  writeConfig: vi.fn(),
}));

vi.mock('../api-client.js', () => ({
  verifyToken: vi.fn(),
}));

describe('loginCommand', () => {
  let mockQuestion: ReturnType<typeof vi.fn>;
  let mockClose: ReturnType<typeof vi.fn>;
  let mockCreateInterface: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readConfig).mockReturnValue({});
    vi.mocked(writeConfig).mockReturnValue(undefined);

    mockQuestion = vi.fn();
    mockClose = vi.fn();

    mockCreateInterface = vi.fn().mockReturnValue({
      question: mockQuestion,
      close: mockClose,
    });

    vi.spyOn(readline, 'createInterface').mockImplementation(
      mockCreateInterface as any,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('prompts user for API token', async () => {
    mockQuestion.mockImplementation(
      (_: string, callback: (token: string) => void) => {
        callback('test_token_123');
      },
    );

    vi.mocked(verifyToken).mockResolvedValue(
      new Response(JSON.stringify({ username: 'testuser' }), { status: 200 }),
    );

    const { loginCommand } = await import('./login.js');
    await loginCommand();

    expect(mockQuestion).toHaveBeenCalledWith(
      'Paste your API token from findyourtribe.dev/settings/integrations: ',
      expect.any(Function),
    );
  });

  it('calls verifyToken with the provided token', async () => {
    mockQuestion.mockImplementation(
      (_: string, callback: (token: string) => void) => {
        callback('test_token_123');
      },
    );

    vi.mocked(verifyToken).mockResolvedValue(
      new Response(JSON.stringify({ username: 'alice' }), { status: 200 }),
    );

    const { loginCommand } = await import('./login.js');
    await loginCommand();

    expect(vi.mocked(verifyToken)).toHaveBeenCalledWith('test_token_123');
  });

  it('writes api_token to config on successful verification', async () => {
    mockQuestion.mockImplementation(
      (_: string, callback: (token: string) => void) => {
        callback('test_token_123');
      },
    );

    vi.mocked(verifyToken).mockResolvedValue(
      new Response(JSON.stringify({ username: 'bob' }), { status: 200 }),
    );

    const { loginCommand } = await import('./login.js');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await loginCommand();

    expect(vi.mocked(writeConfig)).toHaveBeenCalledWith({
      api_token: 'test_token_123',
    });
    logSpy.mockRestore();
  });

  it('prints username on successful authentication', async () => {
    mockQuestion.mockImplementation(
      (_: string, callback: (token: string) => void) => {
        callback('test_token_123');
      },
    );

    vi.mocked(verifyToken).mockResolvedValue(
      new Response(JSON.stringify({ username: 'charlie' }), { status: 200 }),
    );

    const { loginCommand } = await import('./login.js');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await loginCommand();

    expect(logSpy).toHaveBeenCalledWith(
      'Authenticated as charlie. Token stored in ~/.fyt/config.json',
    );
    logSpy.mockRestore();
  });

  it('exits with code 1 on non-200 response', async () => {
    mockQuestion.mockImplementation(
      (_: string, callback: (token: string) => void) => {
        callback('test_token_123');
      },
    );

    vi.mocked(verifyToken).mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    );

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      // Mock exit without throwing to prevent test timeout
      return undefined as never;
    }) as any);
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const { loginCommand } = await import('./login.js');
    await loginCommand();

    expect(errorSpy).toHaveBeenCalledWith(
      'Invalid token. Check your token at findyourtribe.dev/settings/integrations',
    );
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('exits with code 1 on network error', async () => {
    mockQuestion.mockImplementation(
      (_: string, callback: (token: string) => void) => {
        callback('test_token_123');
      },
    );

    vi.mocked(verifyToken).mockRejectedValue(new Error('Network error'));

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      // Mock exit without throwing to prevent test timeout
      return undefined as never;
    }) as any);
    const errorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    const { loginCommand } = await import('./login.js');
    await loginCommand();

    expect(errorSpy).toHaveBeenCalledWith(
      'Could not connect to Find Your Tribe API. Check your internet connection.',
    );
    expect(exitSpy).toHaveBeenCalledWith(1);

    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
