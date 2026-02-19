import { execSync } from 'child_process';

const HTTPS_GITHUB_RE = /github\.com\/([^/]+\/[^/.]+)/;
const SSH_GITHUB_RE = /github\.com:([^/]+\/[^/.]+)/;

export function resolveProjectHint(cwd: string): string | null {
  let url: string;
  try {
    url = execSync('git remote get-url origin', {
      cwd,
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();
  } catch {
    return null;
  }

  if (!url) return null;

  const httpsMatch = HTTPS_GITHUB_RE.exec(url);
  if (httpsMatch) return httpsMatch[1].replace(/\.git$/, '');

  const sshMatch = SSH_GITHUB_RE.exec(url);
  if (sshMatch) return sshMatch[1].replace(/\.git$/, '');

  return url;
}
