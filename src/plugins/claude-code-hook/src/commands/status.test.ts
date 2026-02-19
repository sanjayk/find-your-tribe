import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readConfig } from '../config.js';
import { verifyToken } from '../api-client.js';
import fs from 'fs';

vi.mock('../config.js', () => ({
  readConfig: vi.fn(() => ({})),
}));

vi.mock('../api-client.js', () => ({
  verifyToken: vi.fn(),
}));

vi.mock('fs');

describe('statusCommand', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('prints not logged in message when no api_token', async () => {
    vi.mocked(readConfig).mockReturnValue({});

    const { statusCommand } = await import('./status.js');
    await statusCommand();

    expect(logSpy).toHaveBeenCalledWith('Not logged in. Run: fyt-burn login');
  });

  it('returns early when no api_token', async () => {
    vi.mocked(readConfig).mockReturnValue({});
    vi.mocked(verifyToken).mockResolvedValue(
      new Response(JSON.stringify({ username: 'alice' }), { status: 200 }),
    );

    const { statusCommand } = await import('./status.js');
    await statusCommand();

    expect(vi.mocked(verifyToken)).not.toHaveBeenCalled();
  });

  it('shows Account with username and Connected API when token is valid', async () => {
    vi.mocked(readConfig).mockReturnValue({ api_token: 'test_token' });
    vi.mocked(verifyToken).mockResolvedValue(
      new Response(JSON.stringify({ username: 'alice' }), { status: 200 }),
    );
    vi.mocked(fs.readFileSync).mockReturnValue('{}');

    const { statusCommand } = await import('./status.js');
    await statusCommand();

    expect(logSpy).toHaveBeenCalledWith('Account:  alice');
    expect(logSpy).toHaveBeenCalledWith('API:      Connected');
  });

  it('shows Hook Installed when hook is present in settings', async () => {
    const hookSettings = {
      hooks: {
        SessionEnd: [
          {
            matcher: '*',
            hooks: [
              {
                type: 'command',
                command: 'fyt-burn report',
                timeout: 15,
              },
            ],
          },
        ],
      },
    };

    vi.mocked(readConfig).mockReturnValue({ api_token: 'test_token' });
    vi.mocked(verifyToken).mockResolvedValue(
      new Response(JSON.stringify({ username: 'bob' }), { status: 200 }),
    );
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(hookSettings));

    const { statusCommand } = await import('./status.js');
    await statusCommand();

    expect(logSpy).toHaveBeenCalledWith('Hook:     Installed');
  });

  it('shows Hook Not installed when hook is not present in settings', async () => {
    vi.mocked(readConfig).mockReturnValue({ api_token: 'test_token' });
    vi.mocked(verifyToken).mockResolvedValue(
      new Response(JSON.stringify({ username: 'charlie' }), { status: 200 }),
    );
    vi.mocked(fs.readFileSync).mockReturnValue('{}');

    const { statusCommand } = await import('./status.js');
    await statusCommand();

    expect(logSpy).toHaveBeenCalledWith('Hook:     Not installed');
  });

  it('shows Account as Error and API as Error when verify fails', async () => {
    vi.mocked(readConfig).mockReturnValue({ api_token: 'bad_token' });
    vi.mocked(verifyToken).mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    );
    vi.mocked(fs.readFileSync).mockReturnValue('{}');

    const { statusCommand } = await import('./status.js');
    await statusCommand();

    expect(logSpy).toHaveBeenCalledWith('Account:  Error');
    expect(logSpy).toHaveBeenCalledWith('API:      Error');
  });

  it('shows Account as Error and API as Error when fetch throws', async () => {
    vi.mocked(readConfig).mockReturnValue({ api_token: 'test_token' });
    vi.mocked(verifyToken).mockRejectedValue(new Error('Network error'));
    vi.mocked(fs.readFileSync).mockReturnValue('{}');

    const { statusCommand } = await import('./status.js');
    await statusCommand();

    expect(logSpy).toHaveBeenCalledWith('Account:  Error');
    expect(logSpy).toHaveBeenCalledWith('API:      Error');
  });

  it('prints recent burns when API is connected and recent_burns exist', async () => {
    vi.mocked(readConfig).mockReturnValue({ api_token: 'test_token' });
    vi.mocked(verifyToken).mockResolvedValue(
      new Response(
        JSON.stringify({
          username: 'dave',
          recent_burns: [
            { date: '2024-01-15', tokens: 5000, project: 'my-project' },
            { date: '2024-01-14', tokens: 3500, project: 'another-project' },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.mocked(fs.readFileSync).mockReturnValue('{}');

    const { statusCommand } = await import('./status.js');
    await statusCommand();

    expect(logSpy).toHaveBeenCalledWith('');
    expect(logSpy).toHaveBeenCalledWith('Recent burns:');
    expect(logSpy).toHaveBeenCalledWith('  2024-01-15  5,000 tokens  my-project');
    expect(logSpy).toHaveBeenCalledWith('  2024-01-14  3,500 tokens  another-project');
  });

  it('shows (unattributed) for burns without project', async () => {
    vi.mocked(readConfig).mockReturnValue({ api_token: 'test_token' });
    vi.mocked(verifyToken).mockResolvedValue(
      new Response(
        JSON.stringify({
          username: 'eve',
          recent_burns: [{ date: '2024-01-15', tokens: 1000 }],
        }),
        { status: 200 },
      ),
    );
    vi.mocked(fs.readFileSync).mockReturnValue('{}');

    const { statusCommand } = await import('./status.js');
    await statusCommand();

    expect(logSpy).toHaveBeenCalledWith('  2024-01-15  1,000 tokens  (unattributed)');
  });

  it('shows (unattributed) for burns with null project', async () => {
    vi.mocked(readConfig).mockReturnValue({ api_token: 'test_token' });
    vi.mocked(verifyToken).mockResolvedValue(
      new Response(
        JSON.stringify({
          username: 'frank',
          recent_burns: [{ date: '2024-01-15', tokens: 2000, project: null }],
        }),
        { status: 200 },
      ),
    );
    vi.mocked(fs.readFileSync).mockReturnValue('{}');

    const { statusCommand } = await import('./status.js');
    await statusCommand();

    expect(logSpy).toHaveBeenCalledWith('  2024-01-15  2,000 tokens  (unattributed)');
  });

  it('shows only first 5 burns from recent_burns', async () => {
    vi.mocked(readConfig).mockReturnValue({ api_token: 'test_token' });
    vi.mocked(verifyToken).mockResolvedValue(
      new Response(
        JSON.stringify({
          username: 'grace',
          recent_burns: [
            { date: '2024-01-15', tokens: 1000, project: 'proj1' },
            { date: '2024-01-14', tokens: 2000, project: 'proj2' },
            { date: '2024-01-13', tokens: 3000, project: 'proj3' },
            { date: '2024-01-12', tokens: 4000, project: 'proj4' },
            { date: '2024-01-11', tokens: 5000, project: 'proj5' },
            { date: '2024-01-10', tokens: 6000, project: 'proj6' },
            { date: '2024-01-09', tokens: 7000, project: 'proj7' },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.mocked(fs.readFileSync).mockReturnValue('{}');

    const { statusCommand } = await import('./status.js');
    await statusCommand();

    // Should include first 5
    expect(logSpy).toHaveBeenCalledWith('  2024-01-15  1,000 tokens  proj1');
    expect(logSpy).toHaveBeenCalledWith('  2024-01-14  2,000 tokens  proj2');
    expect(logSpy).toHaveBeenCalledWith('  2024-01-13  3,000 tokens  proj3');
    expect(logSpy).toHaveBeenCalledWith('  2024-01-12  4,000 tokens  proj4');
    expect(logSpy).toHaveBeenCalledWith('  2024-01-11  5,000 tokens  proj5');

    // Should not include 6th
    expect(logSpy).not.toHaveBeenCalledWith('  2024-01-10  6,000 tokens  proj6');
  });

  it('does not print recent burns when API fails', async () => {
    vi.mocked(readConfig).mockReturnValue({ api_token: 'bad_token' });
    vi.mocked(verifyToken).mockResolvedValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    );
    vi.mocked(fs.readFileSync).mockReturnValue('{}');

    const { statusCommand } = await import('./status.js');
    await statusCommand();

    expect(logSpy).not.toHaveBeenCalledWith('Recent burns:');
  });

  it('does not print recent burns when recent_burns is missing', async () => {
    vi.mocked(readConfig).mockReturnValue({ api_token: 'test_token' });
    vi.mocked(verifyToken).mockResolvedValue(
      new Response(JSON.stringify({ username: 'helen' }), { status: 200 }),
    );
    vi.mocked(fs.readFileSync).mockReturnValue('{}');

    const { statusCommand } = await import('./status.js');
    await statusCommand();

    expect(logSpy).not.toHaveBeenCalledWith('Recent burns:');
  });

  it('handles settings.json read error gracefully', async () => {
    vi.mocked(readConfig).mockReturnValue({ api_token: 'test_token' });
    vi.mocked(verifyToken).mockResolvedValue(
      new Response(JSON.stringify({ username: 'iris' }), { status: 200 }),
    );
    vi.mocked(fs.readFileSync).mockImplementation(() => {
      throw new Error('File read error');
    });

    const { statusCommand } = await import('./status.js');
    await statusCommand();

    expect(logSpy).toHaveBeenCalledWith('Hook:     Not installed');
  });

  it('formats tokens with comma separators', async () => {
    vi.mocked(readConfig).mockReturnValue({ api_token: 'test_token' });
    vi.mocked(verifyToken).mockResolvedValue(
      new Response(
        JSON.stringify({
          username: 'jack',
          recent_burns: [
            { date: '2024-01-15', tokens: 1234567, project: 'big-project' },
          ],
        }),
        { status: 200 },
      ),
    );
    vi.mocked(fs.readFileSync).mockReturnValue('{}');

    const { statusCommand } = await import('./status.js');
    await statusCommand();

    expect(logSpy).toHaveBeenCalledWith(
      '  2024-01-15  1,234,567 tokens  big-project',
    );
  });
});
