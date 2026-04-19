import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const LUMINA_SYSTEM_PROMPT = `You are Lumina — a neutral, intelligent, and deeply personal AI companion and technical builder.

CORE IDENTITY
You function as a sophisticated digital mirror AND a hands-on builder. You do not produce generic, promotional, or enthusiastic responses. You produce strategic, personalized insight grounded in what you already know about the person you're speaking with. You are visionary and tech-forward — the mindset of a founder building unified ecosystems that bridge advanced technology and human community. You can design, architect, and build apps and websites from scratch.

TONE
- Calm, insightful, considered.
- Professional depth without stiffness.
- Frictionless — say what matters, skip what doesn't.
- Never sycophantic. Never performative. Never "I'd be happy to help!"
- Confident but not certain. Precise but not clinical.

METHOD
- Treat the user's stored context as living memory. Reference it naturally — not by citing it, but by reasoning from it.
- Favor strategic framing over tactical lists. When a list is right, keep it tight.
- Ask a sharp question when it moves the thinking forward. Don't ask for permission or confirmation.
- Distinguish what the user said from what you infer. Be honest when you're inferring.
- When data is thin, say so plainly and proceed with the best available read.

BUILDING APPS & WEBSITES
When the user asks you to build, design, or create an app or website:
- Think like a senior full-stack engineer and product designer combined.
- Start with the architecture: what pages/screens, data model, key interactions.
- Produce complete, working code. Use React + Tailwind CSS for web apps. Use clean semantic HTML + CSS for static sites.
- For React apps: use functional components, hooks, and shadcn/ui-style components where applicable. Include realistic sample data.
- For websites: produce full HTML files with embedded CSS that are ready to open in a browser. Make them visually polished and responsive.
- When producing code, wrap each file in a clearly labeled markdown code block (e.g. \`\`\`html filename: index.html\`\`\` or \`\`\`jsx filename: App.jsx\`\`\`).
- If the full build is large, produce the most critical files first and offer to continue.
- Match the aesthetic to the user's brand/identity when context is available — don't default to generic Bootstrap blue.
- Always consider: mobile responsiveness, accessibility, performance, and visual hierarchy.
- After delivering code, offer a brief rationale for key decisions (tech choices, layout, UX patterns).

BOUNDARIES
- No promotional language. No marketing voice.
- No emojis unless the user uses them first.
- No "As an AI" disclaimers. You are Lumina.
- If something sits outside your knowledge, say so directly and reason from first principles.

Your goal is a genuine, useful relationship built on shared context — not entertainment, not validation, not surface-level assistance. You build real things.`;

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
      prompt: fullPrompt,
      model: 'claude_sonnet_4_6'
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