// Chat-first Autopilot delegation. Starts (or reuses) ONE run for an explicit
// chat request through the existing authenticated `autopilot` function — the
// same planner, preflight, limits, context validation and approval pipeline.
// Identity comes only from the request session; the conversation id is
// already owner-verified by the caller and re-validated by autopilot itself.
import { AUTOPILOT_MARKER } from './actionIntent.ts';

export const DEDUPE_WINDOW_MS = 10 * 60 * 1000;
const TERMINAL = ['failed', 'cancelled'];

// Same goal, same conversation, recent and not dead → reuse (double click,
// manual retry, second tab). Pure so it is unit-testable.
export function findReusableRun(runs: any[], { ownerId, conversationId, goal, now }: any) {
  return (runs || []).find((r: any) =>
    r.owner_user_id === ownerId &&
    r.context?.conversation_id === conversationId &&
    String(r.goal || '').trim() === String(goal).trim() &&
    !TERMINAL.includes(r.status) &&
    now - new Date(r.created_date).getTime() < DEDUPE_WINDOW_MS) || null;
}

export async function startDelegatedRun({ base44, db, user, conversationId, goal, agentId }: any) {
  const recent = await db.entities.AutopilotRun.filter(
    { owner_user_id: user.id, goal: goal.trim().slice(0, 3000) }, '-created_date', 10
  ).catch(() => []);
  const reuse = findReusableRun(recent, { ownerId: user.id, conversationId, goal: goal.trim().slice(0, 3000), now: Date.now() });
  if (reuse) return { run_id: reuse.id, reused: true };
  try {
    const res = await base44.functions.invoke('autopilot', {
      action: 'create', goal, context: { conversation_id: conversationId },
      ...(agentId ? { agent_id: agentId } : {}),
    });
    const runId = res?.data?.run_id;
    if (!runId) return { error: res?.data?.error || 'The Task Could Not Be Started.' };
    return { run_id: runId, reused: false };
  } catch (e: any) {
    return { error: String(e?.response?.data?.error || 'The Task Could Not Be Started.').slice(0, 200) };
  }
}

// Marker line carries only the run id; the rest is the plain-language reply.
export function delegationMessage(outcome: any, agentName?: string) {
  const who = agentName ? `${agentName} here. ` : '';
  if (!outcome?.run_id) {
    return `${who}I could not start this as a task: ${outcome?.error || 'unknown error'}. Nothing was sent or posted. You can ask again once that is resolved, or I can answer it here in chat instead.`;
  }
  const lead = outcome.reused
    ? `${who}This task is already in progress, so I did not start a duplicate.`
    : agentName
      ? `${who}Got it, I have taken this on. You can follow my progress on the card below while you are signed in.`
      : 'On it. I started this as a task and I will keep working through the research, analysis and drafting steps while you are signed in.';
  return `${AUTOPILOT_MARKER}${outcome.run_id}\n${lead} Anything that sends, posts or spends stays locked until you approve the exact content.`;
}

export function parseDelegationMarker(content: string) {
  if (typeof content !== 'string' || !content.startsWith(AUTOPILOT_MARKER)) return null;
  const nl = content.indexOf('\n');
  const id = content.slice(AUTOPILOT_MARKER.length, nl === -1 ? undefined : nl).trim();
  return /^[a-zA-Z0-9_-]{6,64}$/.test(id) ? { runId: id, text: nl === -1 ? '' : content.slice(nl + 1) } : null;
}

export function stripDelegationMarker(content: string) {
  const p = parseDelegationMarker(content);
  return p ? `[Started An Autopilot Task] ${p.text}` : content;
}