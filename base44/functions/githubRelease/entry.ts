import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { requireFounderOrAdmin, errorResponse, issueConfirmation, verifyConfirmation, writeAudit, redact } from '../../shared/security.ts';
import { validateRelease, releaseHash, getGitHubToken, openReleasePullRequest } from '../../shared/githubRelease.ts';

const ACTION_TYPE = 'github_release_pr';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { user, error } = await requireFounderOrAdmin(base44);
    if (error) return errorResponse(error);
    const db = base44.asServiceRole;

    const body = await req.json();
    const input = {
      repo: body.repo, base: body.base || 'main', title: String(body.title || '').trim(),
      description: String(body.description || '').slice(0, 4000), files: body.files,
    };
    const invalid = validateRelease(input);
    const target = `${input.repo}:${input.base}`;
    if (invalid) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target: String(target).slice(0, 200), status: 'denied', resultSummary: invalid, requestHash: null });
      return Response.json({ error: invalid }, { status: 400 });
    }

    const hash = await releaseHash(input);
    const requestHash = hash.slice(0, 12);

    // Phase 1: preview + single-use, expiring token bound to this exact payload.
    if (!body.confirmation_token) {
      const token = await issueConfirmation(db, { actorEmail: user.email, actionType: ACTION_TYPE, target, payloadHash: hash });
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target, status: 'pending', resultSummary: 'release preview issued', requestHash });
      return Response.json({
        requires_confirmation: true, confirmation_token: token,
        preview: { repo: input.repo, base: input.base, title: input.title, files: input.files.map(f => ({ path: f.path, size_bytes: f.content.length })), content_hash: requestHash },
      });
    }

    // Phase 2: verify binding, then open the PR (base branch is never written).
    const verified = await verifyConfirmation(db, { token: body.confirmation_token, actorEmail: user.email, actionType: ACTION_TYPE, target, payloadHash: hash });
    if (!verified.ok) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target, status: 'denied', resultSummary: `confirmation ${verified.reason}`, requestHash });
      return Response.json({ error: 'Confirmation invalid or expired. Preview again.' }, { status: 403 });
    }

    const ghToken = await getGitHubToken(base44);
    if (!ghToken) return Response.json({ error: 'Connect GitHub first.' }, { status: 503 });

    const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
    try {
      const pr = await openReleasePullRequest(ghToken, { ...input, branchName: `lbc-release/${stamp}-${requestHash.slice(0, 6)}` });
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target, status: 'success', resultSummary: `PR #${pr.number} from ${pr.branch}`, confirmationId: verified.confirmationId || null, requestHash });
      return Response.json({ success: true, pull_request: pr });
    } catch (e) {
      await writeAudit(db, { actorEmail: user.email, actionType: ACTION_TYPE, target, status: 'failed', resultSummary: redact(e?.message), confirmationId: verified.confirmationId || null, requestHash });
      return Response.json({ error: `GitHub refused the release: ${redact(e?.message).slice(0, 200)}` }, { status: e?.status && e.status < 500 ? 400 : 502 });
    }
  } catch (_) {
    return Response.json({ error: 'Release failed' }, { status: 500 });
  }
}