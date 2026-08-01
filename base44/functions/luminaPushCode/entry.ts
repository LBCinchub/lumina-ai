import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  requireFounderOrAdmin, errorResponse, sha256Hex,
  isAllowedRepo, isSafePath, isSafeBranch, withinSize, redact,
  issueConfirmation, verifyConfirmation, writeAudit, executeGitHubCommit,
} from '../../shared/security.ts';

const ACTION_TYPE = 'github_push';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { user, error } = await requireFounderOrAdmin(base44);
    if (error) return errorResponse(error);

    const { repo, path, content, message, branch = 'main', confirmation_token } = await req.json();

    if (!repo || !path || !content || !message) {
      return Response.json({ error: 'Missing required fields: repo, path, content, message' }, { status: 400 });
    }

    const db = base44.asServiceRole;

    if (!isAllowedRepo(repo)) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: String(repo), status: 'denied', resultSummary: 'repo not in allowlist', requestHash: null });
      return Response.json({ error: 'Repository not allowed' }, { status: 403 });
    }
    if (!isSafePath(path)) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: `${repo}:${branch}:${path}`, status: 'denied', resultSummary: 'path rejected', requestHash: null });
      return Response.json({ error: 'Path not allowed' }, { status: 403 });
    }
    if (!isSafeBranch(branch)) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: `${repo}:${branch}:${path}`, status: 'denied', resultSummary: 'branch rejected', requestHash: null });
      return Response.json({ error: 'Branch not allowed' }, { status: 400 });
    }
    if (!withinSize(content)) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: `${repo}:${branch}:${path}`, status: 'denied', resultSummary: 'content too large', requestHash: null });
      return Response.json({ error: 'Content too large' }, { status: 413 });
    }

    const contentHash = await sha256Hex(content);
    const target = `${repo}:${branch}:${path}`;
    const requestHash = contentHash.slice(0, 12);

    if (!confirmation_token) {
      const preview = {
        repo, branch, path,
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

    const verified = await verifyConfirmation(db, {
      token: confirmation_token, actorEmail: user.email, actionType: ACTION_TYPE, target, payloadHash: contentHash,
    });
    if (!verified.ok) {
      await writeAudit(db, {
        actorEmail: user.email, actionType: ACTION_TYPE, target, status: 'denied',
        resultSummary: `confirmation ${verified.reason}`, requestHash,
      });
      return Response.json({ error: 'Confirmation invalid or expired' }, { status: 403 });
    }

    const result = await executeGitHubCommit(base44, { repo, path, content, message, branch });

    await writeAudit(db, {
      actorEmail: user.email, actionType: ACTION_TYPE, target,
      status: result.ok ? 'success' : 'failed',
      resultSummary: result.ok ? `commit ${(result.commit || '').slice(0, 12)}` : redact(result.error),
      confirmationId: verified.confirmationId || null, requestHash,
    });

    if (!result.ok) {
      return Response.json({ error: 'GitHub push failed' }, { status: result.status });
    }
    return Response.json({ success: true, commit: result.commit, url: result.url });
  } catch (error) {
    return Response.json({ error: 'GitHub push failed' }, { status: 500 });
  }
}