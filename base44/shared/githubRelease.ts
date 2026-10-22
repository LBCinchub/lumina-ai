// Governed release path: changes land on a fresh release branch and open a
// pull request. The base branch is never written; merging happens in GitHub
// under its own review / branch-protection rules.
import { GITHUB_CONNECTOR_ID, isAllowedRepo, isSafePath, isSafeBranch, withinSize, sha256Hex } from './security.ts';

export const MAX_RELEASE_FILES = 20;

export function validateRelease({ repo, base, title, files }: any) {
  if (!isAllowedRepo(repo)) return 'Repository not allowed';
  if (!isSafeBranch(base)) return 'Base branch not allowed';
  if (typeof title !== 'string' || title.trim().length < 3 || title.length > 200) return 'Title must be 3-200 characters';
  if (!Array.isArray(files) || files.length === 0 || files.length > MAX_RELEASE_FILES) return `Provide 1-${MAX_RELEASE_FILES} files`;
  const seen = new Set();
  for (const f of files) {
    if (!f || !isSafePath(f.path)) return `Path not allowed: ${String(f?.path || '').slice(0, 80)}`;
    if (seen.has(f.path)) return `Duplicate path: ${f.path}`;
    seen.add(f.path);
    if (!withinSize(f.content, 1_000_000)) return `File too large or invalid: ${f.path}`;
  }
  return null;
}

export async function releaseHash({ repo, base, title, description, files }: any) {
  return sha256Hex(JSON.stringify({ repo, base, title, description: description || '', files: files.map((f: any) => [f.path, f.content]) }));
}

export async function getGitHubToken(base44: any) {
  try {
    const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(GITHUB_CONNECTOR_ID);
    return conn?.accessToken || null;
  } catch (_) { return null; }
}

async function gh(token: string, path: string, method = 'GET', body?: any) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(data?.message || `GitHub ${res.status}`), { status: res.status });
  return data;
}

// One commit on a new branch, then a PR into base. Returns PR details.
export async function openReleasePullRequest(token: string, { repo, base, title, description, files, branchName }: any) {
  const ref = await gh(token, `/repos/${repo}/git/ref/heads/${base.split('/').map(encodeURIComponent).join('/')}`);
  const baseSha = ref.object.sha;
  const baseCommit = await gh(token, `/repos/${repo}/git/commits/${baseSha}`);
  const blobs = await Promise.all(files.map((f: any) =>
    gh(token, `/repos/${repo}/git/blobs`, 'POST', { content: f.content, encoding: 'utf-8' })));
  const tree = await gh(token, `/repos/${repo}/git/trees`, 'POST', {
    base_tree: baseCommit.tree.sha,
    tree: files.map((f: any, i: number) => ({ path: f.path, mode: '100644', type: 'blob', sha: blobs[i].sha })),
  });
  const commit = await gh(token, `/repos/${repo}/git/commits`, 'POST', { message: title, tree: tree.sha, parents: [baseSha] });
  await gh(token, `/repos/${repo}/git/refs`, 'POST', { ref: `refs/heads/${branchName}`, sha: commit.sha });
  const pr = await gh(token, `/repos/${repo}/pulls`, 'POST', {
    title, head: branchName, base,
    body: `${description || ''}\n\n---\nOpened by the LBC AI governed release path. Review and merge in GitHub; nothing was pushed to \`${base}\`.`.trim(),
  });
  return { number: pr.number, url: pr.html_url, branch: branchName, commit: commit.sha };
}