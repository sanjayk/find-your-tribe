import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import { readConfig, writeConfig } from './config.js';

vi.mock('fs');

function mockReadReturn(value: string): void {
  vi.mocked(fs.readFileSync).mockImplementation(() => value);
}

function mockReadThrow(message = 'ENOENT'): void {
  vi.mocked(fs.readFileSync).mockImplementation(() => {
    throw Object.assign(new Error(message), { code: 'ENOENT' });
  });
}

describe('readConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty object when config file does not exist', () => {
    mockReadThrow();
    expect(readConfig()).toEqual({});
  });

  it('returns empty object on JSON parse error', () => {
    mockReadReturn('not-valid-json');
    expect(readConfig()).toEqual({});
  });

  it('returns parsed config when file exists', () => {
    const stored = { api_token: 'tok_abc123', api_url: 'https://api.example.com' };
    mockReadReturn(JSON.stringify(stored));
    expect(readConfig()).toEqual(stored);
  });

  it('returns partial config when only some fields are present', () => {
    const stored = { api_token: 'tok_only' };
    mockReadReturn(JSON.stringify(stored));
    expect(readConfig()).toEqual({ api_token: 'tok_only' });
  });
});

describe('writeConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
    vi.mocked(fs.writeFileSync).mockReturnValue(undefined);
    vi.mocked(fs.chmodSync).mockReturnValue(undefined);
  });

  it('creates the .fyt directory with recursive option', () => {
    mockReadThrow();

    writeConfig({ api_token: 'tok_new' });

    expect(fs.mkdirSync).toHaveBeenCalledWith(expect.stringContaining('.fyt'), {
      recursive: true,
    });
  });

  it('writes merged config as 2-space-indented JSON', () => {
    const existing = { api_token: 'tok_old', api_url: 'https://old.example.com' };
    mockReadReturn(JSON.stringify(existing));

    writeConfig({ api_url: 'https://new.example.com' });

    const writtenContent = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
    expect(writtenContent).toContain('  "api_url"');
    const parsed = JSON.parse(writtenContent);
    expect(parsed).toEqual({ api_token: 'tok_old', api_url: 'https://new.example.com' });
  });

  it('overwrites specific keys while preserving others', () => {
    const existing = { api_token: 'tok_keep', api_url: 'https://keep.example.com' };
    mockReadReturn(JSON.stringify(existing));

    writeConfig({ api_token: 'tok_new' });

    const writtenContent = vi.mocked(fs.writeFileSync).mock.calls[0][1] as string;
    const parsed = JSON.parse(writtenContent);
    expect(parsed).toEqual({ api_token: 'tok_new', api_url: 'https://keep.example.com' });
  });

  it('sets file permissions to 0o600', () => {
    mockReadThrow();

    writeConfig({ api_token: 'tok_secure' });

    expect(fs.chmodSync).toHaveBeenCalledWith(expect.any(String), 0o600);
  });

  it('writes config to .fyt/config.json path', () => {
    mockReadThrow();

    writeConfig({ api_token: 'tok_path' });

    const writtenPath = vi.mocked(fs.writeFileSync).mock.calls[0][0] as string;
    expect(writtenPath).toMatch(/\.fyt[/\\]config\.json$/);
  });
});
