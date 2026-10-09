// Gmail MIME construction + the single dispatch adapter for the owner's
// connected Gmail account. Server-side only. Access tokens are used
// transiently in the request that obtained them — never stored, logged, or
// returned. This build sends/saves ONLY what a verified owner explicitly
// approved in the typed approval pipeline.
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function utf8Bytes(str) {
  return new TextEncoder().encode(str);
}

export function base64Url(bytes) {
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// RFC 2047 encoded-word for subjects containing non-ASCII characters.
export function encodeSubjectHeader(subject) {
  if (/^[\x20-\x7E]*$/.test(subject)) return subject;
  return `=?UTF-8?B?${btoa(String.fromCharCode(...utf8Bytes(subject)))}?=`;
}

// Lower-cased header map for a Gmail API message resource.
export function headersOf(message) {
  const out = {};
  for (const h of message?.payload?.headers || []) {
    out[String(h.name || '').toLowerCase()] = h.value || '';
  }
  return out;
}

// Builds a well-formed RFC 2822 MIME message (UTF-8, base64 body). Optional
// threading headers come only from server-validated fields.
export function buildMimeMessage({ to, cc, subject, body, in_reply_to, references }) {
  const lines = [];
  if (to) lines.push(`To: ${to}`);
  if (cc) lines.push(`Cc: ${cc}`);
  lines.push(`Subject: ${encodeSubjectHeader(subject)}`);
  if (in_reply_to) lines.push(`In-Reply-To: ${in_reply_to}`);
  if (references) lines.push(`References: ${references}`);
  lines.push(
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
  );
  const bodyB64 = base64Url(utf8Bytes(body || '')).replace(/(.{76})/g, '$1\r\n');
  return [...lines, bodyB64].join('\r\n');
}

// Dispatches one approved Gmail action. mode: 'send' | 'drafts'.
// A network timeout or a provider 5xx is AMBIGUOUS (the message may still have
// been delivered) — throws 'outcome_unknown' so the caller can consume the
// single-use approval and block duplicates instead of retrying blind.
export async function gmailDispatch(fields, mode, token) {
  const raw = base64Url(utf8Bytes(buildMimeMessage(fields)));
  const payload = { raw };
  if (fields.thread_id) payload.threadId = fields.thread_id;
  const path = mode === 'drafts' ? 'drafts' : 'messages/send';
  let res;
  try {
    res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(mode === 'drafts' ? { message: payload } : payload),
      signal: AbortSignal.timeout(20000),
    });
  } catch (_) {
    throw new Error('outcome_unknown');
  }
  if (!res.ok) {
    if (res.status >= 500) throw new Error('outcome_unknown');
    let detail = '';
    try { detail = (await res.json())?.error?.message || ''; } catch (_) {}
    throw new Error(`gmail_rejected_${res.status}${detail ? ': ' + detail.slice(0, 120) : ''}`);
  }
  const data = await res.json();
  if (mode === 'drafts') {
    return {
      provider: 'gmail', mock: false, verified: true,
      external_id: data?.id || '', thread_id: data?.message?.threadId || null,
      url: null, at: new Date().toISOString(),
      note: 'Draft Saved To Your Gmail Drafts Folder. Nothing Was Sent.',
    };
  }
  return {
    provider: 'gmail', mock: false, verified: true,
    external_id: data?.id || '', thread_id: data?.threadId || null,
    url: null, at: new Date().toISOString(),
    note: 'Sent From Your Own Gmail Account.',
  };
}