import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import {
  sha256Hex, isSafePath, isSafeBranch, withinSize, redact,
  issueConfirmation, verifyConfirmation, peekConfirmation, hasGitHubConnection,
  writeAudit, executeGitHubCommit,
} from '../../shared/security.ts';
import { normalizeRepo } from '../../shared/githubRepo.ts';
import { githubFailure } from '../../shared/githubFailure.ts';

const ACTION_TYPE = 'build_project_sync';
const NO_CONNECTION = 'GitHub Is Not Connected. Connect GitHub, Then Review The Sync Again.';
const FAILURE_LABELS = { noConnection: NO_CONNECTION, review: 'Review The Sync Again.', nothing: 'Nothing Was Synced.' };
const INVALID = 'Confirmation Invalid Or Expired. Review The Sync Again.';

// Hash binds the project, its exact HTML bytes and the commit message.
const bindHash = (projectId: string, content: string, message: string) =>
  sha256Hex(`${projectId}\n${content}\n--message--\n${message}`);

// Syncs the signed-in user's own Build project to a GitHub repository through
// THEIR OWN GitHub connection (GitHub enforces write access), behind a
// two-phase, single-use, actor/target/payload-bound confirmation. The HTML is
// always read from the stored project, never taken from the request.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch (_) {}
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const db = base44.asServiceRole;
    const branch = String(body.branch || 'main').trim() || 'main';
    const path = String(body.path || 'index.html').trim() || 'index.html';

    const norm = normalizeRepo(body.repo);
    if (!norm.ok) return Response.json({ error: norm.error, code: norm.code }, { status: 400 });
    const repo = norm.repo;
    if (!isSafeBranch(branch)) return Response.json({ error: 'Invalid Branch Name.', code: 'invalid_branch' }, { status: 400 });
    if (!isSafePath(path)) return Response.json({ error: 'File Path Not Allowed.', code: 'invalid_path' }, { status: 400 });

    // Explicit owner predicate on top of RLS.
    const projectId = typeof body.project_id === 'string' ? body.project_id : '';
    const rows = /^[a-f0-9]{24}$/i.test(projectId)
      ? await base44.entities.BuildProject.filter({ id: projectId, created_by: user.email })
      : [];
    const project = rows[0];
    if (!project) return Response.json({ error: 'Project Not Found.', code: 'not_found' }, { status: 404 });
    const content = typeof project.html === 'string' ? project.html : '';
    if (!content.trim()) return Response.json({ error: 'This Project Has No Generated Page Yet. Build It First.', code: 'empty' }, { status: 400 });
    if (!withinSize(content)) return Response.json({ error: 'This Project Is Too Large To Sync.', code: 'too_large' }, { status: 413 });
    if (!(await hasGitHubConnection(base44))) return Response.json({ error: NO_CONNECTION, code: 'no_connection' }, { status: 503 });

    const message = `Sync ${String(project.title || 'Build Project').slice(0, 80)} From LBC AI Build`;
    const target = `${repo}:${branch}:${path}`;
    const payloadHash = await bindHash(project.id, content, message);
    const requestHash = payloadHash.slice(0, 12);

    // --- Phase 1: preview exactly what will be committed.
    if (!body.confirmation_token) {
      const token = await issueConfirmation(db, { actorEmail: user.email, actionType: ACTION_TYPE, target, payloadHash });
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target, status: 'pending', resultSummary: 'confirmation issued', requestHash });
      return Response.json({
        requires_confirmation: true, confirmation_token: token,
        preview: { repo, branch, path, message, size_bytes: content.length, content_hash: requestHash },
      });
    }

    // --- Phase 2: a project changed since the review never reuses it.
    const rec = await peekConfirmation(db, { token: body.confirmation_token, actorEmail: user.email, actionType: ACTION_TYPE });
    if (!rec) return Response.json({ error: INVALID, code: 'confirmation_invalid' }, { status: 403 });
    if (rec.target === target && rec.payload_hash !== payloadHash) {
      await db.entities.AiActionConfirmation.update(rec.id, { status: 'invalid' }).catch(() => null);
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target, status: 'denied', resultSummary: 'payload changed since preview', requestHash });
      return Response.json({ error: 'Your Project Changed Since The Review. Review The Sync Again.', code: 'changed' }, { status: 409 });
    }
    // Consumes the single-use token (binds actor, action, target, hash, expiry).
    const verified = await verifyConfirmation(db, { token: body.confirmation_token, actorEmail: user.email, actionType: ACTION_TYPE, target, payloadHash });
    if (!verified.ok) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target, status: 'denied', resultSummary: `confirmation ${verified.reason}`, requestHash });
      return Response.json({ error: INVALID, code: 'confirmation_invalid' }, { status: 403 });
    }

    const result = await executeGitHubCommit(base44, { repo, path, content, message, branch });
    const ok = result.ok && !!result.commit;
    await writeAudit(db, {
      actorEmail: user.email, actionType: ACTION_TYPE, target, status: ok ? 'success' : 'failed',
      resultSummary: ok ? `commit ${result.commit.slice(0, 12)}` : redact(result.error || 'no commit sha'),
      confirmationId: verified.confirmationId || null, requestHash,
    });
    if (!ok) {
      const f = githubFailure(result.ok ? 502 : result.status, FAILURE_LABELS);
      return Response.json({ error: f.error, code: f.code }, { status: f.status });
    }

    // Remember the target so the next sync starts from it.
    await base44.entities.BuildProject.update(project.id, { github_repo: repo, github_path: path }).catch(() => null);
    return Response.json({ success: true, commit: result.commit, url: result.url || null, repo, branch, path });
  } catch (_) {
    return Response.json({ error: 'GitHub Sync Failed. Nothing Was Synced.' }, { status: 500 });
  }
}