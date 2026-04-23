import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CONNECTOR_ID = '69e99f17b40a584c51165b61';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { repo, path, branch = 'main' } = await req.json();
    if (!repo || !path) return Response.json({ error: 'Missing repo or path' }, { status: 400 });

    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);

    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json',
      }
    });

    const data = await res.json();
    if (!res.ok) return Response.json({ error: data.message || 'GitHub API error' }, { status: res.status });

    const content = decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
    return Response.json({ content, sha: data.sha, url: data.html_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});