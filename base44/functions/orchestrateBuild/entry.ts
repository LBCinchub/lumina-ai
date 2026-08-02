import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Authenticated server-side orchestration for the Build workspace.
// Moves LLM + image generation off the client so no integration keys or
// prompts are exposed to the browser. Any user may call it; rate limiting
// is enforced separately by checkBuildRequestLimit before this runs.
//
// step: "design" -> produces a visual description + generated image
// step: "title" -> produces a short project title

const DESIGN_SYSTEM = `You are an expert product designer and UI/UX specialist. Your role is to visualize and design beautiful interfaces.

When someone asks you to build something, describe what the design would look like as a detailed visual prompt. Focus on:
- Layout and structure
- Colors, typography, and visual hierarchy
- Key UI elements and their positioning
- Overall aesthetic and mood
- Specific details that make it unique

Respond with a detailed image description (2-3 sentences) that captures the complete visual design.`;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    let user = null;
    try {
      user = await base44.auth.me();
    } catch (_) {}
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { step, message, history } = await req.json().catch(() => ({}));
    if (!step) {
      return Response.json({ error: 'step required' }, { status: 400 });
    }

    if (step === 'design') {
      if (!message) {
        return Response.json({ error: 'message required' }, { status: 400 });
      }
      const prompt = `${DESIGN_SYSTEM}

CONVERSATION SO FAR:
${history || '(none)'}

User request: ${message}

Respond with a detailed image description (2-3 sentences) that captures the complete visual design.`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        model: 'gemini_3_1_pro',
      });
      const content = typeof res === 'string' ? res : (res?.content || String(res));

      let imageUrl = null;
      try {
        const imageRes = await base44.integrations.Core.GenerateImage({ prompt: content });
        imageUrl = imageRes?.url || null;
      } catch (_) {}

      return Response.json({ content, image_url: imageUrl });
    }

    if (step === 'title') {
      if (!message) {
        return Response.json({ error: 'message required' }, { status: 400 });
      }
      const titleRes = await base44.integrations.Core.InvokeLLM({
        prompt: `Write a 3-5 word title (no quotes, no punctuation at the end, sentence case) that captures what this build request is about:\n\n"${message}"\n\nTitle:`,
      });
      const title = (typeof titleRes === 'string' ? titleRes : '')
        .trim()
        .replace(/^["']|["']$/g, '')
        .slice(0, 60);
      return Response.json({ title: title || null });
    }

    return Response.json({ error: 'Unknown step' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: 'Something went wrong' }, { status: 500 });
  }
}