import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { source_id } = await req.json();
    if (!source_id) return Response.json({ error: 'Missing source_id' }, { status: 400 });

    const db = base44.asServiceRole;
    const sources = await db.entities.KnowledgeSource.filter({ id: source_id, created_by: user.email });
    const source = sources[0];
    if (!source) return Response.json({ error: 'Source not found' }, { status: 404 });

    let content = '';

    if (source.source_type === 'text') {
      content = source.raw_text || '';
    } else if (source.source_type === 'url') {
      // Fetch and extract text from the URL via LLM with internet context
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Fetch and extract all meaningful text content from this URL: ${source.url}\n\nReturn the full extracted text content only, preserving structure (headings, paragraphs, lists). Do not summarize — return the actual content.`,
        add_context_from_internet: true,
        model: 'gemini_3_flash'
      });
      content = typeof result === 'string' ? result : String(result);
    } else if (source.source_type === 'file') {
      // Use ExtractDataFromUploadedFile for structured extraction, fallback to LLM
      try {
        const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url: source.file_url,
          json_schema: {
            type: 'object',
            properties: {
              content: { type: 'string', description: 'All text content from the document' }
            }
          }
        });
        if (extracted.status === 'success' && extracted.output?.content) {
          content = extracted.output.content;
        } else {
          // Fallback: ask LLM to read the file
          const result = await base44.integrations.Core.InvokeLLM({
            prompt: 'Extract and return all text content from this document. Preserve structure — headings, paragraphs, lists. Return the raw content only.',
            file_urls: [source.file_url]
          });
          content = typeof result === 'string' ? result : String(result);
        }
      } catch (_) {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: 'Extract and return all text content from this document. Preserve structure. Return raw content only.',
          file_urls: [source.file_url]
        });
        content = typeof result === 'string' ? result : String(result);
      }
    }

    if (!content || content.trim().length === 0) {
      await db.entities.KnowledgeSource.update(source_id, {
        status: 'error',
        error_message: 'No content could be extracted from this source.'
      });
      return Response.json({ error: 'Empty content' }, { status: 422 });
    }

    await db.entities.KnowledgeSource.update(source_id, {
      content: content.slice(0, 50000), // cap at 50k chars
      status: 'ready',
      error_message: null
    });

    return Response.json({ success: true, content_length: content.length });
  } catch (error) {
    console.error('ingestKnowledgeSource error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});