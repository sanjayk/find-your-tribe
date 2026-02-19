import { describe, it, expect, vi, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { resolveProjectHint } from '../src/project-resolver.js';

vi.mock('child_process');

const mockExecSync = vi.mocked(execSync);

afterEach(() => {
  vi.resetAllMocks();
});

describe('resolveProjectHint', () => {
  it('returns owner/repo for HTTPS GitHub URL', () => {
    mockExecSync.mockReturnValue('https://github.com/owner/repo.git\n' as never);
    expect(resolveProjectHint('/some/dir')).toBe('owner/repo');
  });

  it('returns owner/repo for SSH GitHub URL', () => {
    mockExecSync.mockReturnValue('git@github.com:owner/repo.git\n' as never);
    expect(resolveProjectHint('/some/dir')).toBe('owner/repo');
  });

  it('returns full URL for non-GitHub remote', () => {
    mockExecSync.mockReturnValue('https://gitlab.com/owner/repo.git\n' as never);
    expect(resolveProjectHint('/some/dir')).toBe('https://gitlab.com/owner/repo.git');
  });

  it('returns null when execSync throws (not a git repo)', () => {
    mockExecSync.mockImplementation(() => {
      throw new Error('not a git repository');
    });
    expect(resolveProjectHint('/not/a/repo')).toBeNull();
  });

  it('returns null when execSync returns empty string', () => {
    mockExecSync.mockReturnValue('' as never);
    expect(resolveProjectHint('/some/dir')).toBeNull();
  });

  it('strips .git suffix from SSH URL with .git', () => {
    mockExecSync.mockReturnValue('git@github.com:myorg/myproject.git\n' as never);
    expect(resolveProjectHint('/some/dir')).toBe('myorg/myproject');
  });
});
