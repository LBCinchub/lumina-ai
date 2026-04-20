// deno-lint-ignore no-undef
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all conversations for this user
    const conversations = await base44.entities.Conversation.list('-last_message_at', 100);

    // Process conversations that need titles
    const updates = [];
    
    for (const convo of conversations) {
      // Skip if already has a good title
      if (convo.title && convo.title !== 'New conversation' && convo.title.length > 10) {
        continue;
      }

      // Get first message from this conversation
      const messages = await base44.entities.Message.filter(
        { conversation_id: convo.id },
        'created_date',
        1
      );

      if (!messages.length) continue;

      const firstMessage = messages[0];

      // Generate title from first message
      try {
        const titleRes = await base44.integrations.Core.InvokeLLM({
          prompt: `Write a 3-5 word title (no quotes, no punctuation at the end, sentence case) that captures what this conversation is about:\n\n"${firstMessage.content}"\n\nTitle:`
        });
        
        const newTitle = (typeof titleRes === 'string' ? titleRes : '')
          .trim()
          .replace(/^["']|["']$/g, '')
          .slice(0, 60);

        if (newTitle) {
          await base44.entities.Conversation.update(convo.id, { title: newTitle });
          updates.push({ id: convo.id, title: newTitle });
        }
      } catch (_) {
        // Skip if title generation fails
      }
    }

    return Response.json({ updated: updates.length, conversations: updates });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});