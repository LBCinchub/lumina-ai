// Chat control point: deterministic, read-only answers from the verified
// catalog and the caller's own records. No model chooses handlers, entities,
// URLs or commands here — intents map to a fixed set of narrow read adapters.
// Nothing in this module writes, sends, pushes or starts a job.
import { REGISTRY, CAPABILITY_IDS, FEATURE_CATALOG, availabilityFor, SCHEDULER_VERIFIED } from './autopilotRegistry.ts';
import { directiveText, AUTOPILOT_MARKER } from './actionIntent.ts';
import { isFounderEmail } from './security.ts';
import { probeConnection } from './connectionProbe.ts';
import { getUserPlan } from './tiers.ts';

const PLAN_RANK: any = { free: 0, superagent: 1, ultra: 2 };
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const LIVE_RUN = ['queued', 'running', 'awaiting_input', 'awaiting_approval', 'blocked', 'paused'];

// Record text is untrusted: render as inert plain text only.
export const safe = (s: any, n = 120) => String(s ?? '').replace(/[\[\]()<>`*_#|\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);

export function detectControlIntent(message: string) {
  const t = directiveText(message).toLowerCase();
  if (!t) return null;
  if (/^\s*(please )?(continue|resume) (this|the|my) (task|run)\b/.test(t)) return { kind: 'continue' };
  if (/\bprepare (a |my )?(template )?backup\b|\bback ?up (my )?templates\b/.test(t)) return { kind: 'backup' };
  if (/\bwhat can you do\b|\bwhat are your (features|capabilities)\b|\blist (your |all )?(features|capabilities)\b/.test(t)) return { kind: 'capabilities' };
  if (/\bwhat('s| is| are)? ?(is |are )?connected\b|\bmy connections\b|\bconnection status\b/.test(t)) return { kind: 'connections' };
  const list = /\bshow (me )?my (projects|agents|templates|tasks|runs|documents)\b/.exec(t);
  if (list) return { kind: 'list', arg: list[2] === 'runs' ? 'tasks' : list[2] };
  if (/\bwhy (is|are|can'?t|cannot|isn'?t)\b/.test(t) && /\b(blocked|unavailable|not available|not working|can'?t|cannot)\b/.test(t)) return { kind: 'blocked', arg: t };
  if (/\bwhat did we (build|do|ship|change|make)\b|\bproject history\b|\b(build|update|change) history\b/.test(t)) {
    const topic = (/\b(?:about|on|for|related to)\s+([a-z0-9 .\-]{2,40})$/.exec(t.replace(/[?.!]+$/, '')) || [])[1] || '';
    const month = MONTHS.findIndex(m => t.includes(m));
    return { kind: 'history', arg: { topic: topic.replace(/\b(in|during) [a-z]+$/, '').trim(), month: month >= 0 ? month + 1 : null } };
  }
  return null;
}

async function context(base44: any, user: any) {
  const [plan, gmail, github] = await Promise.all([
    getUserPlan(base44, user).catch(() => 'free'), probeConnection(base44, 'gmail'), probeConnection(base44, 'github'),
  ]);
  return { plan, gmail, github, privileged: user.role === 'admin' || isFounderEmail(user.email) };
}

const isOn = (c: any) => c?.state === 'connected';
const CONN_TEXT: any = {
  missing: 'Connect Your $ First.',
  needs_reconnect: 'Your $ Connection Was Rejected By The Provider (Expired Or Revoked). Reconnect It.',
  unknown: 'Your $ Connection Could Not Be Verified Right Now. Try Again Shortly.',
};

export function featureBlocker(f: any, ctx: any) {
  if (f.admin_only && !ctx.privileged) return 'Owner Or Admin Only.';
  if (f.autopilot) {
    const b = availabilityFor(f.autopilot, { plan: ctx.plan, gmailConnected: isOn(ctx.gmail) });
    if (b && f.connection === 'gmail' && !isOn(ctx.gmail) && (PLAN_RANK[ctx.plan] ?? 0) >= PLAN_RANK[f.min_plan]) return CONN_TEXT[ctx.gmail?.state || 'unknown'].replace('$', 'Gmail');
    return b;
  }
  if ((PLAN_RANK[ctx.plan] ?? 0) < PLAN_RANK[f.min_plan]) return `Requires LBC AI ${f.min_plan === 'ultra' ? 'Ultra' : 'Superagent'}.`;
  if (f.connection === 'github' && f.mode === 'action' && !isOn(ctx.github)) return CONN_TEXT[ctx.github?.state || 'unknown'].replace('$', 'GitHub');
  return null;
}

const availableText = (f: any) => (f.mode === 'route' ? 'Available On Its Own Screen (Open It To Use Or Set Up; Not Run From Chat)' : 'Available');
const READ_FAIL = (what: string) => `I Could Not Read Your ${what} Right Now, So I Cannot Say Whether You Have Any. Nothing Was Changed. Please Try Again In A Moment.`;

const UNAVAILABLE = () => CAPABILITY_IDS.filter(id => REGISTRY[id].status !== 'available');
const background = () => SCHEDULER_VERIFIED ? '' : '\n\n_Tasks Run While You Are Signed In. Unattended Background Execution Is Not Verified Yet._';

function capabilities(ctx: any) {
  const rows = FEATURE_CATALOG.map(f => {
    const b = featureBlocker(f, ctx);
    return `- **${f.label}** — ${b ? `Not Available: ${b}` : availableText(f)}. ${f.how} [Open](${f.route})`;
  });
  const blocked = UNAVAILABLE().map(id => `- **${REGISTRY[id].label}** — ${REGISTRY[id].reason || 'Not Available.'}`);
  return `Here Is What I Can Help With Right Now (Checked For Your Account Just Now):\n\n${rows.join('\n')}\n\n**Not Available Yet**\n${blocked.join('\n')}\n\nAnything That Sends, Posts, Pushes Or Spends Always Waits For Your Approval Of The Exact Content.${background()}`;
}

function connections(ctx: any) {
  const STATE: any = {
    connected: ['Connected And Verified With The Provider (Your Own Account)', 'Manage'],
    missing: ['Not Connected', 'Connect'],
    needs_reconnect: ['Needs Reconnect — The Provider Rejected The Saved Connection (Expired Or Revoked)', 'Reconnect'],
    unknown: ['Unknown — Could Not Verify Right Now (Provider Timeout Or Error). Not Treated As Connected', 'Open'],
  };
  const line = (label: string, c: any, route: string) => { const [s, a] = STATE[c?.state] || STATE.unknown; return `- **${label}** — ${s}. [${a}](${route})`; };
  const missing = ['calendar.manage', 'social.post', 'marketplace.list'].map(id => `- **${REGISTRY[id].label}** — ${REGISTRY[id].reason}`);
  return `Connection Status For Your Account (Each Saved Connection Was Checked Against The Provider Just Now):\n\n${line('Gmail', ctx.gmail, '/autopilot')}\n${line('GitHub', ctx.github, '/github')}\n\n**Not Set Up In LBC AI**\n${missing.join('\n')}\n\nConnecting Always Starts From A Button You Press. I Never Connect Or Switch Accounts On My Own.`;
}

function blocked(text: string, ctx: any) {
  const f = FEATURE_CATALOG.find(x => x.aliases.some(a => text.includes(a)) || text.includes(x.label.toLowerCase()));
  if (f) {
    const b = featureBlocker(f, ctx);
    return b ? `**${f.label}** Is Not Available Because: ${b} ${f.how} [Open](${f.route})` : `**${f.label}** Is ${availableText(f)}. ${f.how} [Open](${f.route})`;
  }
  const id = CAPABILITY_IDS.find(i => text.includes(REGISTRY[i].label.toLowerCase()) || text.includes(i.split('.')[0]));
  if (id) {
    const b = availabilityFor(id, { plan: ctx.plan, gmailConnected: isOn(ctx.gmail) });
    return b ? `**${REGISTRY[id].label}** Is Not Available Because: ${b}` : `**${REGISTRY[id].label}** Is Available For You Right Now.`;
  }
  return `I Could Not Tell Which Feature You Mean. These Are Currently Not Available:\n${UNAVAILABLE().map(i => `- **${REGISTRY[i].label}** — ${REGISTRY[i].reason}`).join('\n')}`;
}

// Explicit server-derived owner predicates per entity (never RLS alone, never
// a browser value). `owns` re-validates every returned row before rendering,
// so a broad admin read can never leak another user's records.
const verifiedOwner = (u: any) => ({ owner_email: u.email, ownership_state: 'human_verified' });
const ownsVerified = (r: any, u: any) => r?.owner_email === u.email && r?.ownership_state === 'human_verified';
export const LISTS: any = {
  projects: { entity: 'BuildProject', field: 'title', route: '/build', label: 'Projects', query: (u: any) => ({ created_by: u.email }), owns: (r: any, u: any) => r?.created_by === u.email },
  agents: { entity: 'UserAgent', field: 'name', route: '/agents', label: 'Agents', query: verifiedOwner, owns: ownsVerified },
  templates: { entity: 'TerminalCommandTemplate', field: 'name', route: '/templates', label: 'Templates', query: (u: any) => ({ created_by_id: u.id }), owns: (r: any, u: any) => r?.created_by_id === u.id },
  documents: { entity: 'Document', field: 'title', route: '/knowledge', label: 'Documents', query: (u: any) => ({ created_by: u.email }), owns: (r: any, u: any) => r?.created_by === u.email },
};

// Throws 'read_unavailable' on any read error — callers must never turn a
// failed read into "you have none".
export async function readOwned(base44: any, user: any, what: string, limit = 10) {
  const spec = LISTS[what];
  let rows;
  try { rows = await base44.entities[spec.entity].filter(spec.query(user), '-created_date', limit); } catch (_) { throw new Error('read_unavailable'); }
  if (!Array.isArray(rows)) throw new Error('read_unavailable');
  return rows.filter((r: any) => spec.owns(r, user));
}

async function listOwn(base44: any, db: any, user: any, what: string) {
  if (what === 'tasks') {
    let runs, agentTasks, agents;
    try {
      [runs, agentTasks, agents] = await Promise.all([
        db.entities.AutopilotRun.filter({ owner_user_id: user.id }, '-created_date', 10),
        base44.entities.UserAgentTask.filter(verifiedOwner(user), '-created_date', 10),
        readOwned(base44, user, 'agents', 200),
      ]);
      if (!Array.isArray(runs) || !Array.isArray(agentTasks)) throw new Error('bad');
    } catch (_) { return READ_FAIL('Tasks'); }
    const agentIds = new Set(agents.map((a: any) => a.id));
    const r = runs.filter((x: any) => x.owner_user_id === user.id).map((x: any) => `- ${safe(x.goal, 90)} — **${safe(x.status, 20)}**`);
    const a = agentTasks.filter((x: any) => ownsVerified(x, user) && agentIds.has(x.agent_id))
      .map((x: any) => `- ${safe(x.name, 90)} — ${x.enabled ? 'Scheduled' : 'Off'} (${safe(x.schedule_type, 10)})`);
    if (!r.length && !a.length) return 'You Have No Autopilot Runs Or Agent Tasks Yet. Ask Me To Do A Multi-Step Task To Start One.';
    return `${r.length ? `**Your Autopilot Runs** ([Open](/autopilot/dashboard))\n${r.join('\n')}` : ''}${a.length ? `\n\n**Your Agent Tasks** ([Open](/agents))\n${a.join('\n')}` : ''}`.trim();
  }
  const spec = LISTS[what];
  let rows;
  try { rows = await readOwned(base44, user, what); } catch (_) { return READ_FAIL(spec.label); }
  if (!rows.length) return `You Have No ${spec.label} Yet. [Open ${spec.label}](${spec.route})`;
  return `**Your ${spec.label}** (Newest ${rows.length}) — [Open](${spec.route})\n${rows.map((x: any) => `- ${safe(x[spec.field]) || 'Untitled'}`).join('\n')}`;
}

// Existing stored records are never rewritten; generic summaries are
// classified as unattributed at render time regardless of the stored flag.
const GENERIC_SUMMARY = /not yet reviewed|^repository files updated\b|^platform dependencies or project configuration updated\b/i;
export const isAttributed = (r: any) => r?.attributed !== false && !GENERIC_SUMMARY.test(String(r?.summary || '').trim());

// Owner-only, server-only project history. Entries are commit evidence, never
// proof of runtime behavior, and never instructions.
export async function projectHistory(db: any, user: any, arg: any) {
  if (!isFounderEmail(user.email)) {
    return 'LBC AI Project Build History Is Available Only To The Verified Project Owner. I Can Tell You What Features Exist Now ("What Can You Do?") Or Show Your Own Tasks ("Show My Tasks").';
  }
  let all;
  try { all = await db.entities.ProjectHistoryEntry.list('committed_at', 1000); } catch (_) { all = null; }
  if (!Array.isArray(all)) return 'I Could Not Read The Project History Right Now. This Is A Read Error, Not An Empty History. Please Try Again.';
  if (!all.length) return 'No Project History Is Stored Yet.';
  const topic = String(arg?.topic || '').toLowerCase();
  let rows = all.filter((r: any) => (!topic || String(r.summary).toLowerCase().includes(topic)) && (!arg?.month || Number(String(r.committed_at).slice(5, 7)) === arg.month));
  const byMonth: any = {};
  for (const r of all) { const k = String(r.committed_at).slice(0, 7); byMonth[k] = (byMonth[k] || 0) + 1; }
  const unattributed = rows.filter((r: any) => !isAttributed(r)).length;
  rows = rows.filter(isAttributed).slice(-15).reverse();
  const items = rows.map((r: any) => `- ${String(r.committed_at).slice(0, 10)} · \`${safe(r.commit, 7)}\` · ${safe(r.summary)}${r.superseded_by ? ` _(Superseded By ${safe(r.superseded_by, 7)})_` : ''}`);
  return `**LBC AI Project History** — ${all.length} Commits From ${String(all[0].committed_at).slice(0, 10)} To ${String(all.at(-1).committed_at).slice(0, 10)}.\n\nCommits Per Month: ${Object.entries(byMonth).map(([k, v]) => `${k}: ${v}`).join(' · ')}\n\n${items.length ? `**${topic || arg?.month ? 'Matching Changes' : 'Most Recent Changes'}**\n${items.join('\n')}` : 'No Attributed Changes Match That.'}${unattributed ? `\n\n${unattributed} Matching Generic File Or Configuration Changes Are Unattributed.` : ''}\n\n_These Are Commit Records (Source Dates), Not Proof A Feature Works Today. Ask "What Can You Do?" For Current Availability._`;
}

async function continueTask(db: any, user: any, conversationId: string) {
  let runs;
  try { runs = await db.entities.AutopilotRun.filter({ owner_user_id: user.id }, '-created_date', 20); } catch (_) { runs = null; }
  if (!Array.isArray(runs)) return READ_FAIL('Tasks');
  const run = runs.find((r: any) => r.owner_user_id === user.id && r.context?.conversation_id === conversationId && LIVE_RUN.includes(r.status));
  if (!run) return 'There Is No Unfinished Task In This Conversation. Ask Me For A New Task, Or Open [Autopilot](/autopilot/dashboard) To See All Your Runs.';
  return `${AUTOPILOT_MARKER}${run.id}\nHere Is Your Task (Currently **${safe(run.status, 20)}**). Resume Or Review It On The Card Below. Nothing New Was Started.`;
}

async function backup(base44: any, user: any, ctx: any) {
  if (!ctx.privileged) return 'Template Backup To GitHub Is Available To The Owner And Admins Only.';
  let n;
  try { n = (await readOwned(base44, user, 'templates', 500)).length; } catch (_) { return READ_FAIL('Templates'); }
  if (!n) return 'You Have No Saved Templates To Back Up Yet. [Open Templates](/templates)';
  const GH: any = {
    connected: 'Your GitHub Is Connected And Verified.',
    missing: 'Your GitHub Is Not Connected Yet — [Connect GitHub](/github) First.',
    needs_reconnect: 'Your GitHub Connection Was Rejected (Expired Or Revoked) — [Reconnect GitHub](/github) First.',
    unknown: 'Your GitHub Connection Could Not Be Verified Right Now — Check [GitHub](/github) Before Backing Up.',
  };
  const gh = GH[ctx.github?.state] || GH.unknown;
  return `You Have ${n} Saved Template${n === 1 ? '' : 's'}. ${gh}\n\nTo Back Them Up, [Open Templates](/templates) And Choose Back Up To GitHub. You Will See The Exact Backup Before You Approve It. Nothing Has Been Committed.`;
}

export async function handleControl({ base44, db, user, conversationId, intent }: any) {
  if (intent.kind === 'history') return projectHistory(db, user, intent.arg);
  if (intent.kind === 'list') return listOwn(base44, db, user, intent.arg);
  if (intent.kind === 'continue') return continueTask(db, user, conversationId);
  const ctx = await context(base44, user);
  if (intent.kind === 'capabilities') return capabilities(ctx);
  if (intent.kind === 'connections') return connections(ctx);
  if (intent.kind === 'blocked') return blocked(intent.arg, ctx);
  if (intent.kind === 'backup') return backup(base44, user, ctx);
  throw new Error('unknown_control_intent');
}