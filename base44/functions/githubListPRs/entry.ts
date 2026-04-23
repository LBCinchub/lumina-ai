import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const CONNECTOR_ID = '69e9a63841ece86c3a6ac789';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { accessToken } = await base44.asServiceRole.connectors.getCurrentAppUserConnection(CONNECTOR_ID);

    // Get all repos for the authenticated user
    const reposRes = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated&type=all', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json',
      }
    });

    if (!reposRes.ok) {
      const err = await reposRes.json();
      return Response.json({ error: err.message || 'Failed to fetch repos' }, { status: reposRes.status });
    }

    const repos = await reposRes.json();

    // Fetch open PRs for each repo in parallel (limit to repos with open issues to reduce calls)
    const prResults = await Promise.all(
      repos.filter(r => r.open_issues_count > 0).map(async (repo) => {
        const prRes = await fetch(`https://api.github.com/repos/${repo.full_name}/pulls?state=open&per_page=50`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github+json',
          }
        });
        if (!prRes.ok) return [];
        const prs = await prRes.json();
        return prs.map(pr => ({
          id: pr.id,
          number: pr.number,
          title: pr.title,
          repo: repo.full_name,
          repo_url: repo.html_url,
          user: pr.user?.login,
          user_avatar: pr.user?.avatar_url,
          url: pr.html_url,
          created_at: pr.created_at,
          updated_at: pr.updated_at,
          labels: pr.labels?.map(l => ({ name: l.name, color: l.color })) || [],
          draft: pr.draft,
        }));
      })
    );

    const allPRs = prResults.flat().sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));

    return Response.json({ prs: allPRs, total: allPRs.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});