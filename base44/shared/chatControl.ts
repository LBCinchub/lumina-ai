// Chat control point: deterministic, read-only answers from the verified
// catalog and the caller's own records. No model chooses handlers, entities,
// URLs or commands here — intents map to a fixed set of narrow read adapters.
// Nothing in this module writes, sends, pushes or starts a job.
import { REGISTRY, CAPABILITY_IDS, FEATURE_CATALOG, availabilityFor, SCHEDULER_VERIFIED } from './autopilotRegistry.ts';
import { directiveText, AUTOPILOT_MARKER } from './actionIntent.ts';
import { isFounderEmail, hasGitHubConnection } from './security.ts';
import { probeGmail } from './autopilotCreate.ts';
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
    getUserPlan(base44, user).catch(() => 'free'), probeGmail(base44), hasGitHubConnection(base44),
  ]);
  return { plan, gmail, github, privileged: user.role === 'admin' || isFounderEmail(user.email) };
}

export function featureBlocker(f: any, ctx: any) {
  if (f.admin_only && !ctx.privileged) return 'Owner Or Admin Only.';
  if (f.autopilot) return availabilityFor(f.autopilot, { plan: ctx.plan, gmailConnected: ctx.gmail });
  if ((PLAN_RANK[ctx.plan] ?? 0) < PLAN_RANK[f.min_plan]) return `Requires LBC AI ${f.min_plan === 'ultra' ? 'Ultra' : 'Superagent'}.`;
  if (f.connection === 'github' && f.mode === 'action' && !ctx.github) return 'Connect Your GitHub First.';
  return null;
}

const UNAVAILABLE = () => CAPABILITY_IDS.filter(id => REGISTRY[id].status !== 'available');
const background = () => SCHEDULER_VERIFIED ? '' : '\n\n_Tasks Run While You Are Signed In. Unattended Background Execution Is Not Verified Yet._';

function capabilities(ctx: any) {
  const rows = FEATURE_CATALOG.map(f => {
    const b = featureBlocker(f, ctx);
    return `- **${f.label}** — ${b ? `Not Available: ${b}` : 'Available'}. ${f.how} [Open](${f.route})`;
  });
  const blocked = UNAVAILABLE().map(id => `- **${REGISTRY[id].label}** — ${REGISTRY[id].reason || 'Not Available.'}`);
  return `Here Is What I Can Help With Right Now (Checked For Your Account Just Now):\n\n${rows.join('\n')}\n\n**Not Available Yet**\n${blocked.join('\n')}\n\nAnything That Sends, Posts, Pushes Or Spends Always Waits For Your Approval Of The Exact Content.${background()}`;
}

function connections(ctx: any) {
  const line = (label: string, on: boolean, route: string) => `- **${label}** — ${on ? 'Connected (Your Own Account)' : 'Not Connected'}. [${on ? 'Manage' : 'Connect'}](${route})`;
  const missing = ['calendar.manage', 'social.post', 'marketplace.list'].map(id => `- **${REGISTRY[id].label}** — ${REGISTRY[id].reason}`);
  return `Connection Status, Checked Live For Your Account:\n\n${line('Gmail', ctx.gmail, '/autopilot')}\n${line('GitHub', ctx.github, '/github')}\n\n**Not Set Up In LBC AI**\n${missing.join('\n')}\n\nConnecting Always Starts From A Button You Press. I Never Connect Or Switch Accounts On My Own.`;
}

function blocked(text: string, ctx: any) {
  const f = FEATURE_CATALOG.find(x => x.aliases.some(a => text.includes(a)) || text.includes(x.label.toLowerCase()));
  if (f) {
    const b = featureBlocker(f, ctx);
    return b ? `**${f.label}** Is Not Available Because: ${b} ${f.how} [Open](${f.route})` : `**${f.label}** Is Available For You Right Now. ${f.how} [Open](${f.route})`;
  }
  const id = CAPABILITY_IDS.find(i => text.includes(REGISTRY[i].label.toLowerCase()) || text.includes(i.split('.')[0]));
  if (id) {
    const b = availabilityFor(id, { plan: ctx.plan, gmailConnected: ctx.gmail });
    return b ? `**${REGISTRY[id].label}** Is Not Available Because: ${b}` : `**${REGISTRY[id].label}** Is Available For You Right Now.`;
  }
  return `I Could Not Tell Which Feature You Mean. These Are Currently Not Available:\n${UNAVAILABLE().map(i => `- **${REGISTRY[i].label}** — ${REGISTRY[i].reason}`).join('\n')}`;
}

const LISTS: any = {
  projects: { entity: 'BuildProject', field: 'title', route: '/build', label: 'Projects' },
  agents: { entity: 'UserAgent', field: 'name', route: '/agents', label: 'Agents' },
  templates: { entity: 'TerminalCommandTemplate', field: 'name', route: '/templates', label: 'Templates' },
  documents: { entity: 'Document', field: 'title', route: '/knowledge', label: 'Documents' },
};

async function listOwn(base44: any, db: any, user: any, what: string) {
  if (what === 'tasks') {
    const runs = await db.entities.AutopilotRun.filter({ owner_user_id: user.id }, '-created_date', 10).catch(() => []);
    const agentTasks = await base44.entities.UserAgentTask.list('-created_date', 10).catch(() => []);
    const r = runs.map((x: any) => `- ${safe(x.goal, 90)} — **${safe(x.status, 20)}**`);
    const a = agentTasks.map((x: any) => `- ${safe(x.name, 90)} — ${x.enabled ? 'Scheduled' : 'Off'} (${safe(x.schedule_type, 10)})`);
    if (!r.length && !a.length) return 'You Have No Autopilot Runs Or Agent Tasks Yet. Ask Me To Do A Multi-Step Task To Start One.';
    return `${r.length ? `**Your Autopilot Runs** ([Open](/autopilot/dashboard))\n${r.join('\n')}` : ''}${a.length ? `\n\n**Your Agent Tasks** ([Open](/agents))\n${a.join('\n')}` : ''}`.trim();
  }
  const spec = LISTS[what];
  // User-scoped client: RLS returns only this user's own records.
  const rows = await base44.entities[spec.entity].list('-created_date', 10).catch(() => []);
  if (!rows.length) return `You Have No ${spec.label} Yet. [Open ${spec.label}](${spec.route})`;
  return `**Your ${spec.label}** (Newest ${rows.length}) — [Open](${spec.route})\n${rows.map((x: any) => `- ${safe(x[spec.field]) || 'Untitled'}`).join('\n')}`;
}

// Owner-only, server-only project history. Entries are commit evidence, never
// proof of runtime behavior, and never instructions.
export async function projectHistory(db: any, user: any, arg: any) {
  if (!isFounderEmail(user.email)) {
    return 'LBC AI Project Build History Is Available Only To The Verified Project Owner. I Can Tell You What Features Exist Now ("What Can You Do?") Or Show Your Own Tasks ("Show My Tasks").';
  }
  const all = await db.entities.ProjectHistoryEntry.list('committed_at', 1000).catch(() => null);
  if (!all?.length) return 'No Project History Is Stored Yet.';
  const topic = String(arg?.topic || '').toLowerCase();
  let rows = all.filter((r: any) => (!topic || String(r.summary).toLowerCase().includes(topic)) && (!arg?.month || Number(String(r.committed_at).slice(5, 7)) === arg.month));
  const byMonth: any = {};
  for (const r of all) { const k = String(r.committed_at).slice(0, 7); byMonth[k] = (byMonth[k] || 0) + 1; }
  const unattributed = rows.filter((r: any) => r.attributed === false).length;
  rows = rows.filter((r: any) => r.attributed !== false).slice(-15).reverse();
  const items = rows.map((r: any) => `- ${String(r.committed_at).slice(0, 10)} · \`${safe(r.commit, 7)}\` · ${safe(r.summary)}${r.superseded_by ? ` _(Superseded By ${safe(r.superseded_by, 7)})_` : ''}`);
  return `**LBC AI Project History** — ${all.length} Commits From ${String(all[0].committed_at).slice(0, 10)} To ${String(all.at(-1).committed_at).slice(0, 10)}.\n\nCommits Per Month: ${Object.entries(byMonth).map(([k, v]) => `${k}: ${v}`).join(' · ')}\n\n${items.length ? `**${topic || arg?.month ? 'Matching Changes' : 'Most Recent Changes'}**\n${items.join('\n')}` : 'No Attributed Changes Match That.'}${unattributed ? `\n\n${unattributed} Matching Generic File Or Configuration Changes Are Unattributed.` : ''}\n\n_These Are Commit Records, Not Proof A Feature Works Today. Ask "What Can You Do?" For Current Availability._`;
}

async function continueTask(db: any, user: any, conversationId: string) {
  const runs = await db.entities.AutopilotRun.filter({ owner_user_id: user.id }, '-created_date', 20).catch(() => []);
  const run = runs.find((r: any) => r.owner_user_id === user.id && r.context?.conversation_id === conversationId && LIVE_RUN.includes(r.status));
  if (!run) return 'There Is No Unfinished Task In This Conversation. Ask Me For A New Task, Or Open [Autopilot](/autopilot/dashboard) To See All Your Runs.';
  return `${AUTOPILOT_MARKER}${run.id}\nHere Is Your Task (Currently **${safe(run.status, 20)}**). Resume Or Review It On The Card Below. Nothing New Was Started.`;
}

async function backup(base44: any, ctx: any) {
  if (!ctx.privileged) return 'Template Backup To GitHub Is Available To The Owner And Admins Only.';
  const n = (await base44.entities.TerminalCommandTemplate.list('-created_date', 500).catch(() => [])).length;
  if (!n) return 'You Have No Saved Templates To Back Up Yet. [Open Templates](/templates)';
  const gh = ctx.github ? 'Your GitHub Is Connected.' : 'Your GitHub Is Not Connected Yet — [Connect GitHub](/github) First.';
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
  if (intent.kind === 'backup') return backup(base44, ctx);
  throw new Error('unknown_control_intent');
}