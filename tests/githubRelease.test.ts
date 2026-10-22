import { test, expect, vi, afterEach } from 'vitest';
import { validateRelease, releaseHash, openReleasePullRequest } from '../base44/shared/githubRelease.ts';

const ok = { repo: 'LBCinchub/lumina-ai', base: 'main', title: 'Update config', files: [{ path: 'src/a.js', content: 'x' }] };
afterEach(() => vi.unstubAllGlobals());
vi.mock('base44:runtime', () => ({ secrets: { get: () => '' }, waitUntil: () => {} }));

test('rejects disallowed repos, secret paths, traversal and duplicates', () => {
  expect(validateRelease(ok)).toBeNull();
  expect(validateRelease({ ...ok, repo: 'evil/repo' })).toMatch(/Repository/);
  expect(validateRelease({ ...ok, files: [{ path: '.env', content: 'x' }] })).toMatch(/Path/);
  expect(validateRelease({ ...ok, files: [{ path: '../x', content: 'x' }] })).toMatch(/Path/);
  expect(validateRelease({ ...ok, files: [{ path: '.github/workflows/a.yml', content: 'x' }] })).toMatch(/Path/);
  expect(validateRelease({ ...ok, files: [ok.files[0], ok.files[0]] })).toMatch(/Duplicate/);
});

test('any edit after preview changes the approval hash', async () => {
  const h = await releaseHash(ok);
  expect(await releaseHash({ ...ok, files: [{ path: 'src/a.js', content: 'y' }] })).not.toBe(h);
  expect(await releaseHash({ ...ok, base: 'dev' })).not.toBe(h);
});

test('opens a PR from a new branch and never updates the base ref', async () => {
  const calls: any[] = [];
  vi.stubGlobal('fetch', vi.fn(async (url: string, opts: any) => {
    calls.push([opts.method, url]);
    const r: any = url.includes('/git/ref/') ? { object: { sha: 'base' } } : url.includes('/git/commits/base') ? { tree: { sha: 't0' } }
      : url.endsWith('/pulls') ? { number: 7, html_url: 'https://github.com/pr/7' } : { sha: 's1' };
    return { ok: true, json: async () => r };
  }));
  const pr = await openReleasePullRequest('tok', { ...ok, branchName: 'lbc-release/x' });
  expect(pr.number).toBe(7);
  expect(calls.some(([m, u]) => m === 'PATCH' || u.includes('/contents/'))).toBe(false);
  expect(calls.filter(([m, u]) => m === 'POST' && u.endsWith('/git/refs')).length).toBe(1);
});