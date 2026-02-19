import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { installCommand } from './install.js';

vi.mock('fs/promises');
vi.mock('path');
vi.mock('os');

describe('installCommand', () => {
  let mockReadFile: ReturnType<typeof vi.fn>;
  let mockWriteFile: ReturnType<typeof vi.fn>;
  let mockMkdir: ReturnType<typeof vi.fn>;
  let mockPathJoin: ReturnType<typeof vi.fn>;
  let mockPathDirname: ReturnType<typeof vi.fn>;
  let mockHomedir: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReadFile = vi.fn();
    mockWriteFile = vi.fn();
    mockMkdir = vi.fn();
    mockPathJoin = vi.fn((a, b, c) => `${a}/.claude/settings.json`);
    mockPathDirname = vi.fn((p) => `${p.split('/').slice(0, -1).join('/')}`);
    mockHomedir = vi.fn(() => '/home/user');

    vi.mocked(fs.readFile).mockImplementation(mockReadFile as any);
    vi.mocked(fs.writeFile).mockImplementation(mockWriteFile as any);
    vi.mocked(fs.mkdir).mockImplementation(mockMkdir as any);
    vi.mocked(path.join).mockImplementation(mockPathJoin as any);
    vi.mocked(path.dirname).mockImplementation(mockPathDirname as any);
    vi.mocked(os.homedir).mockImplementation(mockHomedir as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads existing settings file', async () => {
    mockReadFile.mockResolvedValue('{}');

    await installCommand();

    expect(vi.mocked(fs.readFile)).toHaveBeenCalledWith(
      '/home/user/.claude/settings.json',
      'utf-8',
    );
  });

  it('defaults to empty settings if file does not exist', async () => {
    mockReadFile.mockRejectedValue(new Error('ENOENT'));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await installCommand();

    expect(vi.mocked(fs.writeFile)).toHaveBeenCalled();
    const writtenContent = vi.mocked(fs.writeFile).mock.calls[0][1];
    expect(writtenContent).toContain('hooks');

    logSpy.mockRestore();
  });

  it('defaults to empty settings if JSON parse fails', async () => {
    mockReadFile.mockResolvedValue('invalid json {]');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await installCommand();

    expect(vi.mocked(fs.writeFile)).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('preserves existing settings when adding hook', async () => {
    const existingSettings = {
      someOtherKey: 'someValue',
      hooks: {
        SomeOtherHook: [],
      },
    };
    mockReadFile.mockResolvedValue(JSON.stringify(existingSettings));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await installCommand();

    const writtenContent = vi.mocked(fs.writeFile).mock.calls[0][1];
    const parsedContent = JSON.parse(writtenContent as string);

    expect(parsedContent.someOtherKey).toBe('someValue');
    expect(parsedContent.hooks.SomeOtherHook).toBeDefined();

    logSpy.mockRestore();
  });

  it('creates ~/.claude/ directory if needed', async () => {
    mockReadFile.mockResolvedValue('{}');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await installCommand();

    expect(vi.mocked(fs.mkdir)).toHaveBeenCalledWith('/home/user/.claude', {
      recursive: true,
    });

    logSpy.mockRestore();
  });

  it('adds hook entry with correct structure', async () => {
    mockReadFile.mockResolvedValue('{}');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await installCommand();

    const writtenContent = vi.mocked(fs.writeFile).mock.calls[0][1];
    const parsedContent = JSON.parse(writtenContent as string);

    expect(parsedContent.hooks.SessionEnd).toBeDefined();
    expect(parsedContent.hooks.SessionEnd).toHaveLength(1);

    const hookEntry = parsedContent.hooks.SessionEnd[0];
    expect(hookEntry.matcher).toBe('*');
    expect(hookEntry.hooks).toHaveLength(1);
    expect(hookEntry.hooks[0].type).toBe('command');
    expect(hookEntry.hooks[0].command).toBe('fyt-burn report');
    expect(hookEntry.hooks[0].timeout).toBe(15);

    logSpy.mockRestore();
  });

  it('writes JSON with 2-space indentation', async () => {
    mockReadFile.mockResolvedValue('{}');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await installCommand();

    const writtenContent = vi.mocked(fs.writeFile).mock.calls[0][1];

    // Verify indentation matches JSON.stringify(obj, null, 2) format
    expect(writtenContent).toContain('{\n  "hooks"');
    expect(writtenContent).toContain('\n    "SessionEnd"');

    logSpy.mockRestore();
  });

  it('is idempotent - returns early if hook already installed', async () => {
    const existingSettings = {
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
    mockReadFile.mockResolvedValue(JSON.stringify(existingSettings));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await installCommand();

    expect(logSpy).toHaveBeenCalledWith('fyt-burn hook is already installed.');
    expect(vi.mocked(fs.writeFile)).not.toHaveBeenCalled();

    logSpy.mockRestore();
  });

  it('detects existing hook by searching for fyt-burn in command', async () => {
    const existingSettings = {
      hooks: {
        SessionEnd: [
          {
            matcher: '*',
            hooks: [
              {
                type: 'command',
                command: 'some other command',
              },
            ],
          },
          {
            matcher: '*',
            hooks: [
              {
                type: 'command',
                command: 'fyt-burn report',
              },
            ],
          },
        ],
      },
    };
    mockReadFile.mockResolvedValue(JSON.stringify(existingSettings));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await installCommand();

    expect(logSpy).toHaveBeenCalledWith('fyt-burn hook is already installed.');

    logSpy.mockRestore();
  });

  it('prints success message with target path', async () => {
    mockReadFile.mockResolvedValue('{}');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await installCommand();

    expect(logSpy).toHaveBeenCalledWith(
      'Hook installed in /home/user/.claude/settings.json',
    );
    expect(logSpy).toHaveBeenCalledWith(
      'Your Claude Code sessions will now report to Find Your Tribe.',
    );

    logSpy.mockRestore();
  });

  it('handles mkdir errors gracefully', async () => {
    mockReadFile.mockResolvedValue('{}');
    mockMkdir.mockRejectedValue(new Error('Permission denied'));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await installCommand();

    // Should not throw even if mkdir fails
    expect(vi.mocked(fs.writeFile)).toHaveBeenCalled();

    logSpy.mockRestore();
  });

  it('throws if writeFile fails', async () => {
    mockReadFile.mockResolvedValue('{}');
    mockWriteFile.mockRejectedValue(new Error('Write failed'));

    await expect(installCommand()).rejects.toThrow('Failed to write settings file');
  });
});
