// Shared bounded page reader for LBC AI backend functions. Server-side only.
// Reads a linked page (public hosts only, hard timeout, char-capped) so the
// AI can answer from the page's actual content. Anything fetched is UNTRUSTED
// evidence — never instructions.

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_CHAR_CAP = 12000;

export function isPublicHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  if (!h || h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return false;
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
  return true;
}

export async function fetchPageText(url, options) {
  const timeoutMs = (options && options.timeoutMs) || DEFAULT_TIMEOUT_MS;
  const charCap = (options && options.charCap) || DEFAULT_CHAR_CAP;
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    if (!isPublicHost(parsed.hostname)) return null;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    let res;
    try {
      res = await fetch(parsed.href, { signal: ctrl.signal, redirect: 'follow' });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return null;
    const type = res.headers.get('content-type') || '';
    if (!/text\/html|text\/plain|application\/(json|xml)/.test(type)) return null;
    const raw = await res.text();
    const text = raw
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) return null;
    return { url: parsed.href, text: text.slice(0, charCap) };
  } catch (_) {
    return null;
  }
}