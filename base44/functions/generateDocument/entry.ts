import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { getUserPlan, planAtLeast } from '../../shared/tiers.ts';

// Document Generation — drafts strategic summaries and reports directly
// from the authenticated user's conversation context. Superagent tier.
//
// Security model:
//  - The conversation is loaded with the USER-SCOPED client, so RLS verifies
//    ownership: a foreign conversation id simply returns nothing → 404.
//  - The LLM is called exclusively server-side.
//  - The draft is saved to the user's Document library (RLS: owner-only).
const KINDS = ['strategic_summary', 'report', 'brief', 'memo'];
const KIND_LABELS = {
  strategic_summary: 'Strategic Summary',
  report: 'Report',
  brief: 'Brief',
  memo: 'Memo',
};
const MAX_INSTRUCTIONS_CHARS = 1000;
const MAX_TITLE_CHARS = 120;
const MAX_MESSAGES = 100;
const MAX_CHARS_PER_MSG = 3000;
const MAX_TRANSCRIPT_CHARS = 60000;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const conversationId = typeof body.conversation_id === 'string' ? body.conversation_id : '';
    const kind = KINDS.includes(body.kind) ? body.kind : 'strategic_summary';
    const instructions = typeof body.instructions === 'string' ? body.instructions.trim().slice(0, MAX_INSTRUCTIONS_CHARS) : '';
    const customTitle = typeof body.title === 'string' ? body.title.trim().slice(0, MAX_TITLE_CHARS) : '';
    if (!conversationId) return Response.json({ error: 'Open A Conversation First.' }, { status: 400 });

    // Superagent-tier gate — server-side, from the canonical subscription record.
    const plan = await getUserPlan(base44, user);
    if (!planAtLeast(plan, 'superagent')) {
      return Response.json({
        error: 'Document Generation Is An LBC AI Superagent Capability — Upgrade To Draft Documents.',
        upgrade_required: true,
      }, { status: 402 });
    }

    // RLS-verified ownership: a foreign conversation filters to nothing → 404.
    let conversations = [];
    try {
      conversations = await base44.entities.Conversation.filter({ id: conversationId });
    } catch (_) {}
    const conversation = conversations && conversations[0];
    if (!conversation) return Response.json({ error: 'Not found' }, { status: 404 });

    // Conversation transcript — user-scoped read.
    const messages = await base44.entities.Message.filter(
      { conversation_id: conversationId }, 'created_date', MAX_MESSAGES
    ).catch(() => []);
    if (!messages || messages.length === 0) {
      return Response.json({ error: 'This Conversation Has No Content To Draft From Yet.' }, { status: 400 });
    }

    let transcript = messages.map(m =>
      `${m.role === 'user' ? 'User' : 'LBC AI'}: ${String(m.content || '').slice(0, MAX_CHARS_PER_MSG)}`
    ).join('\n\n');
    if (transcript.length > MAX_TRANSCRIPT_CHARS) {
      transcript = transcript.slice(transcript.length - MAX_TRANSCRIPT_CHARS);
    }

    const prompt = `You are a senior strategy writer for LBC AI. Draft a polished ${KIND_LABELS[kind]} document from the conversation below.

Rules:
- Use ONLY the conversation as your source of truth. Do not invent facts, numbers, or commitments that are not present.
- Where the conversation is ambiguous or something is unverified, say so plainly instead of papering over it.
- Write in clean markdown with a title heading, then well-structured sections with headings and bullet points where useful.
- Include: an Executive Summary, the key insights and decisions surfaced in the conversation, and clear Recommendations and Next Steps.
- Professional, decisive, Title Case for headings. No preamble — output the document itself, starting with the title.${instructions ? `\n\nThe user's specific direction for this draft: ${instructions}` : ''}

=== CONVERSATION: "${conversation.title || 'Untitled'}" ===
${transcript}
=== END OF CONVERSATION ===`;

    const result = await base44.integrations.Core.InvokeLLM({ prompt });
    const content = typeof result === 'string' ? result : (result && result.content) || '';
    if (!content) return Response.json({ error: 'The Draft Could Not Be Generated — Please Try Again.' }, { status: 502 });

    // First markdown heading becomes the document title.
    const headingMatch = content.match(/^#\s+(.+)$/m);
    const title = customTitle || (headingMatch ? headingMatch[1].trim().slice(0, MAX_TITLE_CHARS) : `${KIND_LABELS[kind]} — ${conversation.title || 'Conversation'}`).slice(0, MAX_TITLE_CHARS);

    // Saved to the user's Document library (RLS: owner-only).
    const doc = await base44.entities.Document.create({
      title,
      content,
      status: 'ready',
    });

    return Response.json({ id: doc.id, title, content });
  } catch (error) {
    return Response.json({ error: 'Something Went Wrong — Please Try Again.' }, { status: 500 });
  }
}