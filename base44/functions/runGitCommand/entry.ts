import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import {
  requireFounderOrAdmin, errorResponse, isAllowedRepo,
  redact, writeAudit, GITHUB_CONNECTOR_ID, createNotification,
} from '../../shared/security.ts';

// External Git commands for the LBC private Terminal. Executes a safe,
// read-only subset against the caller's connected GitHub account
// (app-user connector) — repo allowlist and founder/admin gating are
// enforced server-side. Write operations (push/commit) intentionally stay
// in the Build workspace with explicit confirmation.

const ACTION_TYPE = 'git_command';
const SUPPORTED = ['status', 'log', 'branch', 'remote', 'help'];

async function gitApi(accessToken, path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' },
  });
  let data = null;
  try { data = await res.json(); } catch (_) {}
  return { ok: res.ok, status: res.status, data };
}

function shortSha(sha) {
  return String(sha || '').slice(0, 7);
}

function firstLine(text) {
  return String(text || '').split('\n')[0].trim();
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { user, error } = await requireFounderOrAdmin(base44);
    if (error) return errorResponse(error);

    const { command } = await req.json();
    if (!command || typeof command !== 'string') {
      return Response.json({ error: 'Missing Git Command' }, { status: 400 });
    }

    const db = base44.asServiceRole;
    const tokens = command.trim().split(/\s+/);
    const sub = (tokens[1] || '').toLowerCase();

    if (!SUPPORTED.includes(sub)) {
      await writeAudit(db, {
        actorEmail: user.email, actionType: ACTION_TYPE,
        target: redact(sub || 'unknown'), status: 'denied',
        resultSummary: 'unsupported git command', requestHash: null,
      });
      return Response.json({
        error: `Unsupported Git Command '${sub || ''}'. Supported: status · log · branch · remote — e.g. 'git log LBCinchub/repo -n 10'. Code Pushes Stay In The Build Workspace With Confirmation.`,
      }, { status: 400 });
    }

    if (sub === 'help') {
      return Response.json({
        output: [
          'git help                     Show This Help',
          'git status <owner/repo>      Default Branch And Latest Commit',
          'git log <owner/repo> [-n N]  Recent Commits (Default 10, Max 50)',
          'git branch <owner/repo>      List Branches',
          'git remote <owner/repo>      Repository Remote URL',
          'Repos Are Limited To Your Allowlisted Organization.',
        ],
      });
    }

    const repoToken = tokens.find(t => t.includes('/'));
    if (!repoToken) {
      return Response.json({ error: 'Include A Repository — e.g. git log LBCinchub/repo' }, { status: 400 });
    }
    if (!isAllowedRepo(repoToken)) {
      await writeAudit(db, {
        actorEmail: user.email, actionType: ACTION_TYPE,
        target: String(repoToken), status: 'denied',
        resultSummary: 'repo not in allowlist', requestHash: null,
      });
      return Response.json({ error: 'Repository Not Allowed' }, { status: 403 });
    }

    // Caller's connected GitHub (app-user connector).
    let accessToken = null;
    try {
      const conn = await base44.asServiceRole.connectors.getCurrentAppUserConnection(GITHUB_CONNECTOR_ID);
      accessToken = conn?.accessToken;
    } catch (_) {}
    if (!accessToken) {
      return Response.json({ error: 'GitHub Connection Unavailable — Connect Your GitHub Account And Try Again.' }, { status: 503 });
    }

    const nIdx = tokens.indexOf('-n');
    const count = nIdx !== -1 && /^\d+$/.test(tokens[nIdx + 1] || '')
      ? Math.min(parseInt(tokens[nIdx + 1], 10), 50)
      : 10;

    const repo = repoToken;
    let output = [];

    if (sub === 'remote') {
      output = [`origin  https://github.com/${repo}.git`];
    } else if (sub === 'status') {
      const repoRes = await gitApi(accessToken, `/repos/${repo}`);
      if (!repoRes.ok) {
        return Response.json({ error: redact(repoRes.data?.message || `GitHub API Error ${repoRes.status}`) }, { status: repoRes.status });
      }
      const defaultBranch = repoRes.data?.default_branch || 'main';
      const commitRes = await gitApi(accessToken, `/repos/${repo}/commits/${encodeURIComponent(defaultBranch)}`);
      const c = commitRes.data;
      output = [
        `On Branch ${defaultBranch}`,
        c
          ? `Latest Commit ${shortSha(c.sha)} — ${firstLine(c.commit?.message)} (${c.commit?.author?.name || 'Unknown'})`
          : 'No Commits Yet',
      ];
    } else if (sub === 'log') {
      const logRes = await gitApi(accessToken, `/repos/${repo}/commits?per_page=${count}`);
      if (!logRes.ok) {
        return Response.json({ error: redact(logRes.data?.message || `GitHub API Error ${logRes.status}`) }, { status: logRes.status });
      }
      const commits = Array.isArray(logRes.data) ? logRes.data : [];
      output = commits.map(c =>
        `${shortSha(c.sha)}  ${firstLine(c.commit?.message)} — ${c.commit?.author?.name || 'Unknown'}`
      );
      if (!output.length) output = ['No Commits Yet'];
    } else if (sub === 'branch') {
      const branchRes = await gitApi(accessToken, `/repos/${repo}/branches?per_page=30`);
      if (!branchRes.ok) {
        return Response.json({ error: redact(branchRes.data?.message || `GitHub API Error ${branchRes.status}`) }, { status: branchRes.status });
      }
      const branches = Array.isArray(branchRes.data) ? branchRes.data : [];
      output = branches.map(b => `— ${b.name} (${shortSha(b.commit?.sha)})`);
      if (!output.length) output = ['No Branches Yet'];
    }

    await writeAudit(db, {
      actorEmail: user.email, actionType: ACTION_TYPE,
      target: `${repo}:${sub}`, status: 'success',
      resultSummary: `git ${sub} ok`, requestHash: null,
    });

    // Dashboard alert — owner-only, server-stamped, never fatal to the command.
    await createNotification(db, {
      ownerEmail: user.email,
      kind: 'terminal_task',
      title: 'Terminal Git Task Completed',
      body: `git ${sub} On ${repo} Completed Successfully.`,
      link: '/terminal',
    });

    return Response.json({ output });
  } catch (error) {
    return Response.json({ error: 'Git Command Failed' }, { status: 500 });
  }
}