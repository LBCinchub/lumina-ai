import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { document_id, file_url, title } = await req.json();

    if (!document_id || !file_url) {
      return Response.json({ error: 'Missing document_id or file_url' }, { status: 400 });
    }

    const db = base44.asServiceRole;

    // Use ExtractDataFromUploadedFile to get text content
    const extraction = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          full_text: {
            type: "string",
            description: "The complete extracted text content of the document, preserving structure and all paragraphs"
          },
          summary: {
            type: "string",
            description: "A concise 2-3 sentence summary of what this document is about"
          }
        }
      }
    });

    if (extraction.status === 'error') {
      await db.entities.Document.update(document_id, { status: 'error' });
      return Response.json({ error: extraction.details }, { status: 500 });
    }

    const { full_text, summary } = extraction.output || {};
    const content = full_text || '';

    await db.entities.Document.update(document_id, {
      content,
      status: 'ready'
    });

    return Response.json({ success: true, summary, chars: content.length });
  } catch (error) {
    console.error('parseDocument error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});