import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CONNECTOR_ID = '69e9a63841ece86c3a6ac789';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { repo, path, content, message, branch = 'main' } = await req.json();
    if (!path || !content || !message || !repo) {
      return Response.json({ error: 'Missing required fields: path, content, message, repo' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);

    const encodedContent = btoa(unescape(encodeURIComponent(content)));

    // Check if file exists to get its SHA
    let sha = null;
    try {
      const existing = await fetch(`https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github+json',
        }
      });
      if (existing.ok) {
        const data = await existing.json();
        sha = data.sha;
      }
    } catch (_) {}

    const body = { message, content: encodedContent, branch };
    if (sha) body.sha = sha;

    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    const result = await res.json();
    if (!res.ok) return Response.json({ error: result.message || 'GitHub API error' }, { status: res.status });

    return Response.json({
      success: true,
      commit: result.commit?.sha,
      url: result.content?.html_url,
      message: `Pushed to ${repo}/${path}`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});