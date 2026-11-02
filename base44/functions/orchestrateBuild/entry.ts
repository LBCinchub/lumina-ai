import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Authenticated server-side orchestration for the Build workspace.
// Moves LLM + image generation off the client so no integration keys or
// prompts are exposed to the browser. Any user may call it; rate limiting
// is enforced separately by checkBuildRequestLimit before this runs.
//
// step: "design" -> produces a visual description, a generated design image
//                   and the live page as one self-contained HTML document
// step: "title" -> produces a short project title

const HTML_RULES = `You are a senior front-end engineer. Turn the request into ONE complete, self-contained, production-quality HTML document.
- Output only the document: start with <!DOCTYPE html> and end with </html>. No explanations and no markdown fences.
- Style with the Tailwind CSS CDN: <script src="https://cdn.tailwindcss.com"></script>. Extra CSS goes in one <style> tag. Set an explicit background colour on <body>.
- Responsive: it must look right at 390px (phone), 768px (tablet) and desktop widths.
- Real, specific copy for this subject, never lorem ipsum.
- Visuals: CSS gradients, emoji or inline SVG only. No external images, no libraries, no trackers, no network requests and no forms that submit anywhere. Google Fonts are allowed.
- Vanilla JavaScript in one <script> tag only where interaction needs it.
- Keep it under about 350 lines.`;

// The model's reply is untrusted text: keep only one complete HTML document.
function extractHtml(raw) {
  const s = typeof raw === 'string' ? raw : String(raw?.content || '');
  const start = s.search(/<!doctype html|<html[\s>]/i);
  const end = s.toLowerCase().lastIndexOf('</html>');
  if (start === -1 || end < start) return null;
  return s.slice(start, end + 7);
}

async function buildHtml(base44, { request, design, currentHtml }) {
  const current = typeof currentHtml === 'string' && currentHtml.trim()
    ? `\n\nCURRENT PAGE (update it to satisfy the request and keep everything the request does not change):\n${currentHtml.slice(0, 60000)}`
    : '';
  try {
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `${HTML_RULES}\n\nDESIGN DIRECTION:\n${design}\n\nUSER REQUEST:\n${request}${current}`,
    });
    return extractHtml(res);
  } catch (_) {
    return null;
  }
}

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

    const { step, message, history, current_html } = await req.json().catch(() => ({}));
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

      // The design image and the live page are built in parallel from the same direction.
      const [imageUrl, html] = await Promise.all([
        base44.integrations.Core.GenerateImage({ prompt: content }).then(r => r?.url || null).catch(() => null),
        buildHtml(base44, { request: message, design: content, currentHtml: current_html }),
      ]);

      return Response.json({ content, image_url: imageUrl, html });
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