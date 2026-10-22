import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  requireFounderOrAdmin, errorResponse, sha256Hex,
  isAllowedRepo, isSafePath, isSafeBranch, withinSize, redact,
  issueConfirmation, verifyConfirmation, peekConfirmation, hasGitHubConnection,
  writeAudit, executeGitHubCommit, createNotification,
} from '../../shared/security.ts';
import { normalizeRepo } from '../../shared/githubRepo.ts';

const ACTION_TYPE = 'templates_backup_push';
const DEFAULT_PATH = 'backups/terminal-templates.json';
const DEFAULT_MESSAGE = 'Backup Terminal Command Templates';
const EMPTY_ERROR = 'No Saved Templates To Back Up. Save A Template First.';
const NO_CONNECTION = 'GitHub Is Not Connected. Connect GitHub, Then Review The Backup Again.';

// Canonical backup bytes. exported_at is fixed at preview time and stored
// server-side, so preview and confirm hash IDENTICAL bytes.
export function buildBackupContent(templates: any[], exportedBy: string, exportedAt: string) {
  return JSON.stringify({
    exported_at: exportedAt,
    exported_by: exportedBy,
    template_count: templates.length,
    templates: templates.map(t => ({ name: t.name, command: t.command, created_date: t.created_date, updated_date: t.updated_date })),
  }, null, 2);
}

// Hash binds the exact bytes AND the commit message.
const bindHash = (content: string, message: string) => sha256Hex(`${content}\n--message--\n${message}`);

function githubFailure(status: number) {
  if (status === 503) return { error: NO_CONNECTION, code: 'no_connection', status: 503 };
  if (status === 404) return { error: 'Repository Or Branch Not Found, Or Not Visible To Your GitHub Connection. Check Owner/Repository And Branch.', code: 'not_found', status: 404 };
  if (status === 401 || status === 403) return { error: 'Your GitHub Connection Does Not Have Write Permission For This Repository.', code: 'no_write_permission', status: 403 };
  if (status === 409 || status === 422) return { error: 'GitHub Rejected The Commit (The File Changed Or The Branch Is Protected). Review The Backup Again.', code: 'rejected', status: 409 };
  return { error: 'GitHub Push Failed. Nothing Was Backed Up.', code: 'github_failed', status: 502 };
}

// Pushes the actor's own saved Terminal Command Templates to an allowlisted
// GitHub repository as a versioned JSON backup, behind a two-phase,
// single-use, actor/target/payload-bound confirmation.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const { user, error } = await requireFounderOrAdmin(base44);
    if (error) return errorResponse(error);

    const body = await req.json().catch(() => ({}));
    const branch = String(body.branch || 'main').trim() || 'main';
    const path = String(body.path || DEFAULT_PATH).trim() || DEFAULT_PATH;
    const message = String(body.message || DEFAULT_MESSAGE).trim().slice(0, 200) || DEFAULT_MESSAGE;
    const confirmation_token = body.confirmation_token;
    const db = base44.asServiceRole;

    const norm = normalizeRepo(body.repo);
    if (!norm.ok) return Response.json({ error: norm.error, code: norm.code }, { status: 400 });
    const repo = norm.repo;
    const target = `${repo}:${branch}:${path}`;

    if (!isAllowedRepo(repo)) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: repo, status: 'denied', resultSummary: 'repo not in allowlist', requestHash: null });
      return Response.json({ error: 'Repository Not Allowed. Backups Can Only Go To An Approved LBC Repository.', code: 'not_allowed' }, { status: 403 });
    }
    if (!isSafeBranch(branch)) {
      return Response.json({ error: 'Invalid Branch Name.', code: 'invalid_branch' }, { status: 400 });
    }
    if (!isSafePath(path)) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target, status: 'denied', resultSummary: 'path rejected', requestHash: null });
      return Response.json({ error: 'File Path Not Allowed.', code: 'invalid_path' }, { status: 400 });
    }
    if (!(await hasGitHubConnection(base44))) {
      return Response.json({ error: NO_CONNECTION, code: 'no_connection' }, { status: 503 });
    }

    const loadTemplates = () => base44.entities.TerminalCommandTemplate.list('-created_date', 500);
    let templates: any[];
    try { templates = await loadTemplates(); } catch (_) {
      return Response.json({ error: 'Could Not Load Your Templates. Please Try Again.' }, { status: 500 });
    }

    // --- Phase 1: preview. Fix the snapshot timestamp server-side.
    if (!confirmation_token) {
      if (!templates.length) return Response.json({ error: EMPTY_ERROR, code: 'empty' }, { status: 400 });
      const exportedAt = new Date().toISOString();
      const content = buildBackupContent(templates, user.email, exportedAt);
      if (!withinSize(content)) return Response.json({ error: 'Backup Too Large.', code: 'too_large' }, { status: 413 });
      const payloadHash = await bindHash(content, message);
      const token = await issueConfirmation(db, {
        actorEmail: user.email, actionType: ACTION_TYPE, target, payloadHash, meta: { exported_at: exportedAt },
      });
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target, status: 'pending', resultSummary: 'confirmation issued', requestHash: payloadHash.slice(0, 12) });
      return Response.json({
        requires_confirmation: true, confirmation_token: token,
        preview: { repo, branch, path, message, template_count: templates.length, size_bytes: content.length, content_hash: payloadHash.slice(0, 12), exported_at: exportedAt },
      });
    }

    // --- Phase 2: rebuild the exact previewed bytes from the server-stored snapshot.
    const rec = await peekConfirmation(db, { token: confirmation_token, actorEmail: user.email, actionType: ACTION_TYPE });
    let exportedAt = '';
    try { exportedAt = JSON.parse(rec?.payload_meta || '{}').exported_at || ''; } catch (_) {}
    if (!rec || !exportedAt) return Response.json({ error: 'Confirmation Invalid Or Expired. Review The Backup Again.', code: 'confirmation_invalid' }, { status: 403 });

    const content = buildBackupContent(templates, user.email, exportedAt);
    const payloadHash = await bindHash(content, message);
    if (rec.target === target && (rec.payload_hash !== payloadHash || !templates.length)) {
      await db.entities.AiActionConfirmation.update(rec.id, { status: 'invalid' }).catch(() => null);
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target, status: 'denied', resultSummary: 'payload changed since preview', requestHash: payloadHash.slice(0, 12) });
      return Response.json({ error: 'Your Templates Or Backup Details Changed Since The Preview. Review The Backup Again.', code: 'changed' }, { status: 409 });
    }
    // Consumes the single-use token (binds actor, action, target, hash, expiry).
    const verified = await verifyConfirmation(db, { token: confirmation_token, actorEmail: user.email, actionType: ACTION_TYPE, target, payloadHash });
    if (!verified.ok) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target, status: 'denied', resultSummary: `confirmation ${verified.reason}`, requestHash: payloadHash.slice(0, 12) });
      return Response.json({ error: 'Confirmation Invalid Or Expired. Review The Backup Again.', code: 'confirmation_invalid' }, { status: 403 });
    }

    const result = await executeGitHubCommit(base44, { repo, path, content, message, branch });
    const ok = result.ok && !!result.commit;
    await writeAudit(db, {
      actorEmail: user.email, actionType: ACTION_TYPE, target, status: ok ? 'success' : 'failed',
      resultSummary: ok ? `commit ${result.commit.slice(0, 12)} · ${templates.length} templates` : redact(result.error || 'no commit sha'),
      confirmationId: verified.confirmationId || null, requestHash: payloadHash.slice(0, 12),
    });
    if (!ok) {
      const f = githubFailure(result.ok ? 502 : result.status);
      return Response.json({ error: f.error, code: f.code }, { status: f.status });
    }

    await createNotification(db, {
      ownerEmail: user.email, kind: 'template_push', title: 'Template Backup Pushed To GitHub',
      body: `${templates.length} Templates Committed To ${repo} On ${branch}. Commit ${result.commit.slice(0, 7)}.`,
      link: '/templates',
    });
    return Response.json({ success: true, commit: result.commit, url: result.url || null, template_count: templates.length, repo, branch, path });
  } catch (_) {
    return Response.json({ error: 'GitHub Push Failed. Nothing Was Backed Up.' }, { status: 500 });
  }
}