// Strict GitHub repository normalizer. Canonical source; the browser copy in
// src/lib/githubRepo.js mirrors it (tests assert both behave identically).
// Accepts "owner/repo" or "https://github.com/owner/repo" (optional trailing
// slash / .git). Never infers or creates a repository. Case is preserved.
export const ORG_PAGE_ERROR = 'Choose A Repository, Not An Organization Page. Enter Owner/Repository Or Its Full GitHub URL.';
export const FORMAT_ERROR = 'Invalid Repository. Enter Owner/Repository Or Its Full GitHub URL.';
export const MISSING_ERROR = 'Repository Is Required. Enter Owner/Repository Or Its Full GitHub URL.';

const OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;
const NAME = /^[A-Za-z0-9._-]{1,100}$/;
const RESERVED = ['orgs', 'users', 'settings', 'organizations', 'enterprises', 'marketplace', 'topics', 'explore'];

export function normalizeRepo(input: unknown) {
  const s = String(input ?? '').trim();
  if (!s) return { ok: false, code: 'missing', error: MISSING_ERROR };
  // Credentials, encoding, query/fragment, backslashes and whitespace are never ambiguous-tolerated.
  if (/[\s%\\?#@\u0000-\u001f]/.test(s)) return { ok: false, code: 'invalid_format', error: FORMAT_ERROR };
  let p = s;
  const url = /^https:\/\/([^/]+)(\/.*)?$/i.exec(s);
  if (url) {
    const host = url[1].toLowerCase();
    if (host !== 'github.com' && host !== 'www.github.com') return { ok: false, code: 'invalid_format', error: FORMAT_ERROR };
    p = (url[2] || '').slice(1);
  } else if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(s) || s.startsWith('/')) {
    return { ok: false, code: 'invalid_format', error: FORMAT_ERROR };
  }
  p = p.replace(/\/$/, '').replace(/\.git$/i, '');
  const parts = p.split('/');
  if (parts.length === 1 && OWNER.test(parts[0])) return { ok: false, code: 'organization', error: ORG_PAGE_ERROR };
  if (parts.length === 2 && RESERVED.includes(parts[0].toLowerCase())) return { ok: false, code: 'organization', error: ORG_PAGE_ERROR };
  if (parts.length !== 2) return { ok: false, code: 'invalid_format', error: FORMAT_ERROR };
  const [owner, name] = parts;
  if (!OWNER.test(owner) || !NAME.test(name) || name === '.' || name === '..') {
    return { ok: false, code: 'invalid_format', error: FORMAT_ERROR };
  }
  return { ok: true, repo: `${owner}/${name}` };
}