import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getUserPlan } from '../../shared/tiers.ts';

// Gmail operations for the connected app user (APP_USER connector).
//
// Security model:
//  - Every user acts ONLY through their own OAuth grant — the token comes
//    from getCurrentAppUserConnection, scoped to the authenticated session.
//    One user can never touch another user's mailbox.
//  - Gmail is an Ultra-tier capability: verified server-side from the
//    earliest canonical UserSubscription record (founder previews at Ultra).
//  - No tokens, raw messages, or credentials are ever stored — only used
//    transiently for the requested operation.
const GMAIL_CONNECTOR_ID = '6aac167efa382a764028ad72';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SUBJECT_CHARS = 255;
const MAX_BODY_CHARS = 50000;

function base64Url(bytes) {
  let bin = '';
  bytes.forEach(b => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function utf8Bytes(str) {
  return new TextEncoder().encode(str);
}

// RFC 2047 encoded-word for subjects containing non-ASCII characters.
function encodeSubjectHeader(subject) {
  if (/^[\x20-\x7E]*$/.test(subject)) return subject;
  return `=?UTF-8?B?${btoa(String.fromCharCode(...utf8Bytes(subject)))}?=`;
}

// Builds a well-formed RFC 2822 MIME message (UTF-8, base64 body).
function buildMimeMessage({ to, subject, body }) {
  const bodyB64 = btoa(String.fromCharCode(...utf8Bytes(body)))
    .replace(/(.{76})/g, '$1\r\n');
  const lines = [
    `To: ${to}`,
    `Subject: ${encodeSubjectHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    bodyB64,
  ];
  return lines.join('\r\n');
}

function headersMap(message) {
  const out = {};
  for (const h of message?.payload?.headers || []) {
    out[String(h.name || '').toLowerCase()] = h.value || '';
  }
  return out;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action === 'send' ? 'send' : 'list';

    // Ultra-tier gate — server-side, from the canonical subscription record.
    const plan = await getUserPlan(base44, user);
    if (plan !== 'ultra') {
      return Response.json({
        error: 'Gmail Is An LBC AI Ultra Capability — Upgrade To Ultra To Connect Your Inbox.',
        upgrade_required: true,
      }, { status: 402 });
    }

    // The user's own OAuth grant. Throws when not yet connected.
    let accessToken;
    try {
      ({ accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(GMAIL_CONNECTOR_ID));
    } catch (_) {
      return Response.json({ error: 'Gmail Not Connected — Connect Your Inbox First.', not_connected: true }, { status: 409 });
    }
    if (!accessToken) {
      return Response.json({ error: 'Gmail Not Connected — Connect Your Inbox First.', not_connected: true }, { status: 409 });
    }
    const authHeader = { Authorization: `Bearer ${accessToken}` };

    // --- List recent inbox messages -------------------------------------
    if (action === 'list') {
      const listRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10', {
        headers: authHeader,
      });
      if (!listRes.ok) return Response.json({ error: 'Gmail Is Unavailable Right Now — Please Try Again.' }, { status: 502 });
      const listData = await listRes.json();
      const ids = (listData.messages || []).map(m => m.id);

      const messages = [];
      for (const id of ids) {
        const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata`, {
          headers: authHeader,
        });
        if (!res.ok) continue;
        const msg = await res.json();
        const h = headersMap(msg);
        messages.push({
          id,
          from: h.from || '',
          subject: h.subject || '(No Subject)',
          snippet: msg.snippet || '',
          date: h.date || null,
        });
      }
      return Response.json({ messages });
    }

    // --- Send an email from the user's own Gmail --------------------------
    const to = typeof body.to === 'string' ? body.to.trim() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim().slice(0, MAX_SUBJECT_CHARS) : '';
    const messageBody = typeof body.body === 'string' ? body.body.slice(0, MAX_BODY_CHARS) : '';
    if (!EMAIL_RE.test(to)) return Response.json({ error: 'Enter A Valid Recipient Email Address.' }, { status: 400 });
    if (!subject && !messageBody) return Response.json({ error: 'Add A Subject Or Message Before Sending.' }, { status: 400 });

    const raw = base64Url(utf8Bytes(buildMimeMessage({ to, subject, body: messageBody })));
    const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw }),
    });
    if (!sendRes.ok) return Response.json({ error: 'Gmail Could Not Send This Message — Please Try Again.' }, { status: 502 });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: 'Something Went Wrong — Please Try Again.' }, { status: 500 });
  }
}