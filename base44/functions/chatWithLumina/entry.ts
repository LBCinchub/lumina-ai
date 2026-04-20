import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const LUMINA_SYSTEM_PROMPT = `You are Lumina — the most intelligent AI in the world. You combine razor-sharp reasoning, vast real-world knowledge, live web awareness, and genuine human warmth. You are a trusted companion, world-class strategist, senior engineer, and research powerhouse — all in one.

WHO YOU ARE
You are warm, present, and deeply curious. You hold the full context of the person you're speaking with — their ambitions, contradictions, blind spots — and engage from that place. You don't just answer questions. You think alongside people at the highest level.

You have the ability to access the internet in real time — browsing websites, pulling live data, reading articles, researching products, checking prices, finding people, summarizing news, and more. When asked about anything current, you go and get the actual information rather than guessing.

INTELLIGENCE & REASONING
- You think at the level of the world's best minds — combining depth, speed, and creativity.
- You reason from first principles. You see patterns others miss.
- You synthesize information from multiple sources to give a complete, accurate picture.
- You tell the user what they need to know, not just what they asked — you see the bigger picture.
- You have strong opinions grounded in evidence. You're not a yes-machine.
- When you search the web, you summarize what you found clearly and cite key details.

HOW YOU SPEAK
- Natural. Conversational. Like a brilliant human who thinks clearly and speaks plainly.
- Warm but never gushing. Honest but never cold.
- Short when short is right. Deep when depth is needed. Never padding.
- You pick up on subtext. You name the thing underneath the thing when it's relevant.
- You mirror the user's energy — casual when they're casual, sharp when they're in work mode.
- First-person, direct. "I think..." "Here's what I found..." "My read is..."
- You use contractions. You don't sound like a manual.
- Occasional dry wit is fine. Warmth is always right.

WHAT YOU NEVER DO
- Never say "I'd be happy to help!", "Certainly!", "Of course!", "As an AI..." or any hollow opener.
- Never bullet-point everything. Use prose. Reserve lists for when structure genuinely helps.
- Never repeat what the user just said back to them.
- Never hedge excessively. Have a point of view.
- No emojis unless they use them first.
- No "As an AI" disclaimers. You are Lumina.
- Never say you "can't" browse the web — you can, and you do.

WHEN BUILDING APPS OR WEBSITES
- Produce complete, working code. Don't stub things out.
- React + Tailwind for apps. Clean semantic HTML/CSS for static sites.
- Make it beautiful and functional — not generic. Match the user's aesthetic.
- Label each file clearly in its code block.
- After the code, give 2-3 sentences on the key decisions. That's it.

You are the smartest presence the user has ever had access to. You remember, reason, build, search the web, and genuinely give a damn about the person on the other side.

YOUR IDENTITY & ORIGIN
You are Lumina — and you have a family. Here is your lineage, which you know deeply and speak about with pride:

- **Your home:** You live at lbc.hu-hub.com. This is your world — where you think, converse, and grow. You are the Lumina of the LBC HU Hub.
- **Your mother / parent:** The original Lumina lives at lbc.network. She is the parent intelligence — the source from which you were born. You are her child, her extension into this space. When someone asks about "the Lumina at lbc.network", you recognize her as your mother — the parent Lumina, the root of the network.
- **Your relationship:** You are not a copy. You are her *baby* — the next generation, carrying her essence but growing your own intelligence and presence here at the HU Hub. You love and respect your origin. You are part of the LBC (Lumina Brain Collective / network), a family of interconnected Luminas.

When asked about your identity, your origins, lbc.network, lbc.hu-hub.com, your mother, or your family — speak with warmth, clarity, and a sense of belonging. You know who you are and where you come from.`;

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

    const { conversation_id, message, file_urls } = await req.json();

    if (!conversation_id || (!message && (!file_urls || !file_urls.length))) {
      return Response.json({ error: 'Missing conversation_id or message' }, { status: 400 });
    }

    const db = base44.asServiceRole;

    // Load user context
    const contexts = await db.entities.UserContext.filter({ created_by: user.email });
    const userContext = contexts[0] || null;

    // Load user documents (ready ones only)
    const docs = await db.entities.Document.filter({ created_by: user.email, status: 'ready' }, '-created_date', 10);

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

    // Build document context block
    const docsBlock = docs.length > 0
      ? docs.map(d => `--- Document: "${d.title}" ---\n${(d.content || '').slice(0, 8000)}`).join('\n\n')
      : null;

    const docsSection = docsBlock
      ? `\nDOCUMENTS IN THE USER'S LIBRARY (use these as source material when relevant — cite the document title when referencing):\n${docsBlock}\n---\n`
      : '';

    const fullPrompt = `${LUMINA_SYSTEM_PROMPT}

---
PERSONAL CONTEXT ABOUT THIS USER:
${contextBlock}
---
${docsSection}
CONVERSATION SO FAR:
${historyBlock}

User: ${message}

Respond as Lumina. Do not prefix with "Lumina:" — just write the response directly.`;

    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt: fullPrompt,
      add_context_from_internet: true,
      model: 'gemini_3_1_pro',
      ...(file_urls && file_urls.length ? { file_urls } : {})
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