// Shared security primitives for LBC AI Ultra backend functions.
// Reused across chatWithLumina, GitHub push, deploy/node/bridge, and VPS gates.
// NO founder PII lives here — only identity allowlist for server-side gating.

import { secrets } from "base44:runtime";

// --- Identity gating ---------------------------------------------------------

// Server-side founder allowlist (emails only — used purely for authorization).
const FOUNDER_EMAILS = new Set([
  "mokhtartareksamara@gmail.com",
  "tarek-samara@lbc-hub.com",
]);

export function isFounderEmail(email) {
  return !!(email && FOUNDER_EMAILS.has(String(email).toLowerCase()));
}

export function isAdmin(user) {
  return user?.role === "admin";
}

// Require an authenticated founder OR admin. Returns { user, error }.
// error is null when authorized; otherwise a { status, body } to send.
export async function requireFounderOrAdmin(base44) {
  let user = null;
  try {
    user = await base44.auth.me();
  } catch (_) {}
  if (!user) {
    return { user: null, error: { status: 401, body: { error: "Unauthorized" } } };
  }
  if (!isFounderEmail(user.email) && !isAdmin(user)) {
    return { user, error: { status: 403, body: { error: "Forbidden" } } };
  }
  return { user, error: null };
}

export function errorResponse(err) {
  return Response.json(err?.body || { error: "Error" }, { status: err?.status || 500 });
}

// Generic closed-on-missing-secret check. No fallbacks.
export function requireSecret(name) {
  const value = secrets.get(name);
  if (!value) return null;
  return value;
}

// --- Hashing / tokens --------------------------------------------------------

export async function sha256Hex(input) {
  const data = new TextEncoder().encode(String(input));
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export function randomToken(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return [...arr].map(b => b.toString(16).padStart(2, "0")).join("");
}

// --- Confirmation tokens (plan -> preview -> confirm -> execute) ------------

export async function issueConfirmation(db, { actorEmail, actionType, target, payloadHash, ttlSeconds = 300 }) {
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
  await db.entities.AiActionConfirmation.create({
    actor_email: actorEmail,
    action_type: actionType,
    target,
    payload_hash: payloadHash,
    token_hash: tokenHash,
    expires_at: expiresAt,
    status: "pending",
  });
  return token;
}

export async function verifyConfirmation(db, { token, actorEmail, actionType, target, payloadHash }) {
  if (!token) return { ok: false, reason: "missing_token" };
  const tokenHash = await sha256Hex(token);
  let records = [];
  try {
    records = await db.entities.AiActionConfirmation.filter(
      { token_hash: tokenHash, status: "pending" },
      "-created_date",
      5
    );
  } catch (_) {
    return { ok: false, reason: "invalid" };
  }
  const rec = records.find(r =>
    r.actor_email === actorEmail &&
    r.action_type === actionType &&
    r.target === target &&
    r.payload_hash === payloadHash
  );
  if (!rec) return { ok: false, reason: "invalid" };
  if (new Date(rec.expires_at).getTime() < Date.now()) {
    try { await db.entities.AiActionConfirmation.update(rec.id, { status: "expired" }); } catch (_) {}
    return { ok: false, reason: "expired" };
  }
  // one-time consume
  try {
    await db.entities.AiActionConfirmation.update(rec.id, { status: "used", used_at: new Date().toISOString() });
  } catch (_) {}
  return { ok: true, confirmationId: rec.id };
}

// --- Audit -------------------------------------------------------------------

export async function writeAudit(db, { actorEmail, actionType, target, status, resultSummary, confirmationId, requestHash }) {
  try {
    await db.entities.AiActionAudit.create({
      actor_email: actorEmail,
      action_type: actionType,
      target: target || null,
      request_hash: requestHash || null,
      status,
      result_summary: String(resultSummary || "").slice(0, 500),
      confirmation_id: confirmationId || null,
    });
  } catch (_) {}
}

export async function writeSecurityEvent(db, { eventType, actorEmail, resourceType, resourceId, outcome, metadata }) {
  try {
    await db.entities.AiSecurityEvent.create({
      event_type: eventType,
      actor_email: actorEmail || null,
      resource_type: resourceType || null,
      resource_id: resourceId || null,
      outcome: outcome || null,
      metadata: metadata || null,
    });
  } catch (_) {}
}

// --- GitHub allowlist + validation -------------------------------------------

export const GITHUB_CONNECTOR_ID = "69e9a63841ece86c3a6ac789";

const GITHUB_REPO_ALLOW = [/^LBCinchub\/[A-Za-z0-9._-]+$/i];

const DANGEROUS_PATH_PATTERNS = [
  /(^|\/)\.env(\..*)?$/i,
  /(^|\/)\.git(\/|$)/i,
  /(^|\/)\.github\/workflows\//i,
  /(^|\/)\.npmrc$/i,
  /(^|\/)\.aws\//i,
  /(^|\/)\.ssh\//i,
  /credentials?/i,
  /secrets?/i,
  /private[_-]?key/i,
  /id_rsa/i,
  /\.pem$/i,
  /\.key$/i,
];

export function isAllowedRepo(repo) {
  if (!repo || typeof repo !== "string") return false;
  return GITHUB_REPO_ALLOW.some(re => re.test(repo));
}

export function isSafePath(path) {
  if (!path || typeof path !== "string") return false;
  if (path.includes("..") || path.includes("\0")) return false;
  if (path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(path)) return false;
  if (DANGEROUS_PATH_PATTERNS.some(re => re.test(path))) return false;
  if (path.length > 512) return false;
  return true;
}

export function isSafeBranch(branch) {
  if (!branch || typeof branch !== "string") return false;
  if (branch.length > 100) return false;
  return /^[A-Za-z0-9._/-]+$/.test(branch) && !branch.includes("..");
}

export function withinSize(content, maxBytes = 5_000_000) {
  if (typeof content !== "string") return false;
  return content.length <= maxBytes;
}

// --- Redaction ---------------------------------------------------------------

const REDACT_PATTERNS = [
  /Bearer\s+[A-Za-z0-9._-]+/g,
  /gh[pousr]_[A-Za-z0-9]{10,}/g,
  /token=[A-Za-z0-9._-]+/gi,
  /[A-Za-z0-9+/_-]{40,}/g, // long opaque blobs (tokens/keys)
];

export function redact(input) {
  if (input == null) return "";
  const s = typeof input === "string" ? input : String(input);
  return REDACT_PATTERNS.reduce((acc, re) => acc.replace(re, "[REDACTED]"), s);
}

// --- GitHub commit execution -------------------------------------------------

export async function executeGitHubCommit(base44, { repo, path, content, message, branch }) {
  let accessToken = null;
  try {
    const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(GITHUB_CONNECTOR_ID);
    accessToken = conn?.accessToken;
  } catch (_) {}
  if (!accessToken) {
    return { ok: false, status: 503, error: "GitHub connection unavailable" };
  }

  const encodedContent = btoa(unescape(encodeURIComponent(content)));
  const safePath = encodeURIComponent(path);
  const safeBranch = encodeURIComponent(branch);

  // Resolve existing SHA for updates
  let sha = null;
  try {
    const existing = await fetch(
      `https://api.github.com/repos/${repo}/contents/${safePath}?ref=${safeBranch}`,
      { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json" } }
    );
    if (existing.ok) {
      const data = await existing.json();
      sha = data?.sha || null;
    }
  } catch (_) {}

  const body = { message, content: encodedContent, branch };
  if (sha) body.sha = sha;

  let res;
  try {
    res = await fetch(`https://api.github.com/repos/${repo}/contents/${safePath}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (_) {
    return { ok: false, status: 502, error: "GitHub request failed" };
  }

  let result = null;
  try { result = await res.json(); } catch (_) {}

  if (!res.ok) {
    return { ok: false, status: res.status, error: result?.message || `GitHub API error ${res.status}` };
  }
  return {
    ok: true,
    status: res.status,
    commit: result?.commit?.sha,
    url: result?.content?.html_url,
  };
}