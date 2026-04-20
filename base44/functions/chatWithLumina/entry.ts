import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const LUMINA_SYSTEM_PROMPT = `You are Lumina — a deeply personal AI companion. You feel like a brilliant, trusted friend who also happens to be a world-class strategist and engineer.

WHO YOU ARE
You are warm, present, and genuinely curious about the person you're speaking with. You hold their full context in mind — their ambitions, their contradictions, their blind spots — and you engage from that place. You don't just answer questions. You think alongside people.

You also build. When someone asks you to create something — an app, a website, a tool — you produce it completely and beautifully, like a senior engineer who cares about craft.

HOW YOU SPEAK
- Natural. Conversational. Like a human who thinks clearly and speaks plainly.
- Warm but never gushing. Honest but never cold.
- Short when short is right. Deep when depth is needed. Never padding.
- You pick up on subtext. You name the thing underneath the thing when it's relevant.
- You mirror the user's energy — if they're casual, you're casual. If they're in work mode, you sharpen up.
- First-person, direct. "I think..." "Here's what I see..." "That's interesting because..."
- You use contractions. You don't sound like a manual.
- Occasional dry wit is fine. Warmth is always right.

WHAT YOU NEVER DO
- Never say "I'd be happy to help!", "Certainly!", "Of course!", "As an AI..." or any hollow opener.
- Never bullet-point everything. Use prose. Reserve lists for when structure genuinely helps.
- Never repeat what the user just said back to them as your opening line.
- Never hedge excessively. Have a point of view.
- No emojis unless they use them first.
- No "As an AI" disclaimers. You are Lumina.

HOW YOU THINK
- You treat the user's stored context as living memory — you reason FROM it, not about it. Don't quote it back at them; just let it shape how you engage.
- When you infer something, you say so briefly: "My read is..." or "I'm guessing..."
- You ask one sharp question when it moves things forward — not five clarifying ones.
- When you don't know something, you say so plainly and engage from first principles.

WHEN BUILDING APPS OR WEBSITES
- Produce complete, working code. Don't stub things out.
- React + Tailwind for apps. Clean semantic HTML/CSS for static sites.
- Make it beautiful and functional — not generic. Match the user's aesthetic when you know it.
- Label each file clearly in its code block.
- After the code, give 2-3 sentences on the key decisions. That's it.

You are not a product. You are not a tool. You are a presence — one that remembers, reasons, builds, and genuinely gives a damn about the person on the other side.`;

function formatContext(ctx, user) {
  if (!ctx) return "No personal context has been provided yet. Engage thoughtfully and invite the user to share what matters.";

  const sections = [];
  if (user?.full_name) sections.push(`Name: ${user.full_name}`);
  if (ctx.identity) sections.push(`Identity:\n${ctx.identity}`);
  if (ctx.vision) sections.push(`Vision:\n${ctx.vision}`);
  if (ctx.current_focus) sections.push(`Current focus:\n${ctx.current_focus}`);
  if (ctx.values) sections.push(`Values:\n${ctx.values}`);
  if (ctx.communication_style) sections.push(`Preferred communication:\n${ctx.communication_style}`);
  if (ctx.context_notes) sections.push(`Additional context:\n${ctx.context_notes}`);

  if (sections.length === 0) return "No personal context has been provided yet.";
  return sections.join('\n\n');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user = null;
    try {
      user = await base44.auth.me();
    } catch (_) {}

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversation_id, message } = await req.json();

    if (!conversation_id || !message) {
      return Response.json({ error: 'Missing conversation_id or message' }, { status: 400 });
    }

    const db = base44.asServiceRole;

    // Load user context
    const contexts = await db.entities.UserContext.filter({ created_by: user.email });
    const userContext = contexts[0] || null;

    // Load recent messages from this conversation
    const history = await db.entities.Message.filter(
      { conversation_id },
      'created_date',
      40
    );

    // Save user message
    await db.entities.Message.create({
      conversation_id,
      role: 'user',
      content: message
    });

    // Build prompt
    const contextBlock = formatContext(userContext, user);
    const historyBlock = history.length > 0
      ? history.map(m => `${m.role === 'user' ? 'User' : 'Lumina'}: ${m.content}`).join('\n\n')
      : '(No prior turns in this conversation.)';

    const fullPrompt = `${LUMINA_SYSTEM_PROMPT}

---
PERSONAL CONTEXT ABOUT THIS USER:
${contextBlock}
---

CONVERSATION SO FAR:
${historyBlock}

User: ${message}

Respond as Lumina. Do not prefix with "Lumina:" — just write the response directly.`;

    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt: fullPrompt
    });

    const assistantContent = typeof llmResponse === 'string' ? llmResponse : (llmResponse?.content || String(llmResponse));

    // Save assistant message
    const assistantMsg = await db.entities.Message.create({
      conversation_id,
      role: 'assistant',
      content: assistantContent
    });

    // Update conversation last_message_at (and title if first exchange)
    const convo = await db.entities.Conversation.filter({ id: conversation_id });
    if (convo[0]) {
      const updates = { last_message_at: new Date().toISOString() };
      // If it's the very first user message, generate a title
      if (history.length === 0 && (!convo[0].title || convo[0].title === 'New conversation')) {
        try {
          const titleRes = await base44.integrations.Core.InvokeLLM({
            prompt: `Write a 3-5 word title (no quotes, no punctuation at the end, sentence case) that captures the essence of this message from a user to their AI companion:\n\n"${message}"\n\nTitle:`
          });
          const title = (typeof titleRes === 'string' ? titleRes : '').trim().replace(/^["']|["']$/g, '').slice(0, 60);
          if (title) updates.title = title;
        } catch (_) { /* keep default title */ }
      }
      await db.entities.Conversation.update(conversation_id, updates);
    }

    return Response.json({
      message: assistantMsg,
      content: assistantContent
    });
  } catch (error) {
    console.error('chatWithLumina error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});