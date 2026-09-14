import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  requireFounderOrAdmin, errorResponse, sha256Hex,
  isAllowedRepo, isSafePath, isSafeBranch, withinSize, redact,
  issueConfirmation, verifyConfirmation, writeAudit, executeGitHubCommit,
} from '../../shared/security.ts';

const ACTION_TYPE = 'templates_backup_push';
const DEFAULT_PATH = 'backups/terminal-templates.json';
const DEFAULT_MESSAGE = 'Backup Terminal Command Templates';

// Pushes the actor's own saved Terminal Command Templates to an allowlisted
// GitHub repository as a versioned JSON backup. Same two-phase confirmation,
// allowlist, size, and audit flow as every other GitHub write.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const { user, error } = await requireFounderOrAdmin(base44);
    if (error) return errorResponse(error);

    const body = await req.json().catch(() => ({}));
    const repo = String(body.repo || '').trim();
    const branch = String(body.branch || 'main').trim() || 'main';
    const path = String(body.path || DEFAULT_PATH).trim() || DEFAULT_PATH;
    const message = String(body.message || DEFAULT_MESSAGE).trim() || DEFAULT_MESSAGE;
    const confirmation_token = body.confirmation_token;

    if (!repo) {
      return Response.json({ error: 'Repository Is Required — Use owner/repo.' }, { status: 400 });
    }

    const db = base44.asServiceRole;

    if (!isAllowedRepo(repo)) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: repo, status: 'denied', resultSummary: 'repo not in allowlist', requestHash: null });
      return Response.json({ error: 'Repository Not Allowed' }, { status: 403 });
    }
    if (!isSafePath(path)) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: `${repo}:${branch}:${path}`, status: 'denied', resultSummary: 'path rejected', requestHash: null });
      return Response.json({ error: 'Path Not Allowed' }, { status: 403 });
    }
    if (!isSafeBranch(branch)) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: `${repo}:${branch}:${path}`, status: 'denied', resultSummary: 'branch rejected', requestHash: null });
      return Response.json({ error: 'Branch Not Allowed' }, { status: 400 });
    }

    // Load the actor's own templates — RLS scopes this to the requesting user's
    // records only, so the backup always contains their private data alone.
    let templates = [];
    try {
      templates = await base44.entities.TerminalCommandTemplate.list('-created_date', 500);
    } catch (_) {
      return Response.json({ error: 'Could Not Load Your Templates — Please Try Again.' }, { status: 500 });
    }
    if (!templates.length) {
      return Response.json({ error: 'No Templates To Back Up Yet — Save One First.' }, { status: 400 });
    }

    const content = JSON.stringify({
      exported_at: new Date().toISOString(),
      exported_by: user.email,
      template_count: templates.length,
      templates: templates.map(t => ({
        name: t.name,
        command: t.command,
        created_date: t.created_date,
        updated_date: t.updated_date,
      })),
    }, null, 2);

    if (!withinSize(content)) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: `${repo}:${branch}:${path}`, status: 'denied', resultSummary: 'backup too large', requestHash: null });
      return Response.json({ error: 'Backup Too Large' }, { status: 413 });
    }

    const contentHash = await sha256Hex(content);
    const target = `${repo}:${branch}:${path}`;
    const requestHash = contentHash.slice(0, 12);

    // --- Two-phase: plan/preview -> issue token.
    if (!confirmation_token) {
      const preview = {
        repo, branch, path,
        template_count: templates.length,
        size_bytes: content.length,
        content_hash: requestHash,
        message,
      };
      const token = await issueConfirmation(db, {
        actorEmail: user.email, actionType: ACTION_TYPE, target, payloadHash: contentHash,
      });
      await writeAudit(db, {
        actorEmail: user.email, actionType: ACTION_TYPE, target, status: 'pending',
        resultSummary: 'confirmation issued', requestHash,
      });
      return Response.json({ requires_confirmation: true, preview, confirmation_token: token });
    }

    // --- Execute: verify confirmation binding, then commit.
    const verified = await verifyConfirmation(db, {
      token: confirmation_token, actorEmail: user.email, actionType: ACTION_TYPE, target, payloadHash: contentHash,
    });
    if (!verified.ok) {
      await writeAudit(db, {
        actorEmail: user.email, actionType: ACTION_TYPE, target, status: 'denied',
        resultSummary: `confirmation ${verified.reason}`, requestHash,
      });
      return Response.json({ error: 'Confirmation Invalid Or Expired' }, { status: 403 });
    }

    const result = await executeGitHubCommit(base44, { repo, path, content, message, branch });

    await writeAudit(db, {
      actorEmail: user.email, actionType: ACTION_TYPE, target,
      status: result.ok ? 'success' : 'failed',
      resultSummary: result.ok
        ? `commit ${(result.commit || '').slice(0, 12)} · ${templates.length} templates`
        : redact(result.error),
      confirmationId: verified.confirmationId || null, requestHash,
    });

    if (!result.ok) {
      return Response.json({ error: 'GitHub Push Failed' }, { status: result.status });
    }
    return Response.json({ success: true, commit: result.commit, url: result.url, template_count: templates.length });
  } catch (error) {
    return Response.json({ error: 'GitHub Push Failed' }, { status: 500 });
  }
}