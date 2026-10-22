// Explicitly selected Autopilot context, re-validated server-side against the
// authenticated user on create AND immediately before every step. Anything not
// owned, quarantined, or malformed is rejected before any model or tool call.
import { authorizeConversation, isValidId } from './conversationAccess.ts';
import { loadRecentThread } from './chatContinuity.ts';
import { isAllowedImageUrl } from './chatTools.ts';

export class ContextError extends Error {
  constructor(public field: string) { super('context_not_found'); }
}

// raw comes from the browser and is NEVER trusted for identity.
export async function validateContext(db: any, userClient: any, user: any, raw: any) {
  const out: any = {};
  if (!raw || typeof raw !== 'object') return out;
  if (raw.conversation_id != null) {
    const c = await authorizeConversation(db, user, raw.conversation_id);
    if (!c) throw new ContextError('conversation');
    out.conversation_id = c.id;
  }
  if (raw.project_id != null) {
    if (!isValidId(raw.project_id)) throw new ContextError('project');
    const rows = await userClient.entities.BuildProject.filter({ id: raw.project_id, created_by: user.email }).catch(() => null);
    const p = Array.isArray(rows) && rows.length === 1 ? rows[0] : null;
    if (!p || p.created_by !== user.email) throw new ContextError('project');
    out.project_id = p.id;
  }
  if (raw.image_ref != null) {
    const url = raw.image_ref;
    if (!isAllowedImageUrl(url)) throw new ContextError('image');
    let owned = false;
    const assets = await userClient.entities.SavedImageAsset.filter({ image_url: url }).catch(() => []);
    owned = Array.isArray(assets) && assets.some((a: any) => a.created_by_id === user.id && a.image_url === url);
    if (!owned && out.conversation_id) {
      const t = await loadRecentThread(db, user, out.conversation_id, 200).catch(() => ({ messages: [] }));
      owned = t.messages.some((m: any) => m.role === 'assistant' && String(m.content || '').startsWith(`__IMAGE__${url}`));
    }
    if (!owned) throw new ContextError('image');
    out.image_ref = url;
  }
  return out;
}

// Untrusted excerpt of the selected, still-owned context for step prompts.
export async function contextEvidence(db: any, userClient: any, user: any, context: any) {
  const ctx = await validateContext(db, userClient, user, context); // re-check, throws if revoked
  const parts: string[] = [];
  if (ctx.conversation_id) {
    const t = await loadRecentThread(db, user, ctx.conversation_id, 20);
    parts.push('[Selected Conversation]\n' + t.messages
      .filter((m: any) => !String(m.content || '').startsWith('__IMAGE__'))
      .map((m: any) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${String(m.content || '').slice(0, 1500)}`).join('\n'));
  }
  if (ctx.project_id) {
    const p = (await userClient.entities.BuildProject.filter({ id: ctx.project_id }))[0];
    parts.push(`[Selected Project: "${String(p?.title || '').slice(0, 120)}"]\n${String(p?.html || '').slice(0, 8000)}`);
  }
  return { context: ctx, evidence: parts.join('\n\n').slice(0, 20000) };
}