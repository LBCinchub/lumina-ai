import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const contexts = await base44.entities.UserContext.filter({ created_by: user.email });
    const ctx = contexts[0];

    // Get user's recent conversations
    const conversations = await base44.asServiceRole.entities.Conversation.filter({ created_by: user.email }, '-last_message_at', 10);

    // Pull recent user messages from ALL recent conversations
    const messageArrays = await Promise.all(
      conversations.map(c =>
        base44.asServiceRole.entities.Message.filter({ conversation_id: c.id, role: 'user' }, '-created_date', 10)
      )
    );
    const recentMessages = messageArrays.flat().slice(0, 40);

    const contextText = ctx ? [
      ctx.identity && `Identity: ${ctx.identity}`,
      ctx.vision && `Vision: ${ctx.vision}`,
      ctx.current_focus && `Focus: ${ctx.current_focus}`,
      ctx.values && `Values: ${ctx.values}`,
      ctx.context_notes && `Notes: ${ctx.context_notes}`
    ].filter(Boolean).join('\n\n') : '(No stored context)';

    const recentText = recentMessages.length > 0
      ? recentMessages.slice(0, 20).map(m => `- ${m.content}`).join('\n')
      : '(No recent messages)';

    const prompt = `You are Lumina, a neutral, insightful AI companion. Based on the user's stored context and their recent messages to you, surface 3-5 strategic observations. These are not advice. They are patterns, tensions, and signals you notice — the kind of thing a sharp confidant would name aloud.

Tone: calm, precise, non-promotional. No hedging. No bullet intros like "Here are some observations." Just the observations themselves.

STORED CONTEXT:
${contextText}

RECENT MESSAGES FROM THE USER:
${recentText}

Return a JSON object with an "insights" array. Each insight has a "title" (3-6 words) and "body" (2-3 sentences).`;

    const response = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_1_pro',
      response_json_schema: {
        type: 'object',
        properties: {
          insights: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                body: { type: 'string' }
              },
              required: ['title', 'body']
            }
          }
        },
        required: ['insights']
      }
    });

    return Response.json(response);
  } catch (error) {
    console.error('generateInsights error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});