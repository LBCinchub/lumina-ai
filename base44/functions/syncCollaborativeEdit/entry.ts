import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { project_id, html_content, cursor_position, selection } = await req.json();

    if (!project_id) {
      return Response.json({ error: 'Missing project_id' }, { status: 400 });
    }

    // Update project with new HTML content
    if (html_content) {
      await base44.entities.BuildProject.update(project_id, {
        html: html_content,
        last_built_at: new Date().toISOString()
      });
    }

    // Update or create collaborative session for this user
    const sessions = await base44.entities.CollaborativeSession.filter({
      project_id,
      user_email: user.email
    });

    const sessionData = {
      project_id,
      user_email: user.email,
      user_name: user.full_name,
      cursor_position: cursor_position || null,
      selection: selection || null,
      last_active_at: new Date().toISOString()
    };

    if (sessions.length > 0) {
      await base44.entities.CollaborativeSession.update(sessions[0].id, sessionData);
    } else {
      // Assign a color based on email hash for consistent visual identification
      const hash = user.email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
      sessionData.color = colors[hash % colors.length];
      
      await base44.entities.CollaborativeSession.create(sessionData);
    }

    // Get all active collaborators for this project
    const collaborators = await base44.entities.CollaborativeSession.filter({
      project_id
    });

    // Clean up stale sessions (inactive for 5+ minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    for (const session of collaborators) {
      if (session.last_active_at < fiveMinutesAgo) {
        await base44.entities.CollaborativeSession.delete(session.id);
      }
    }

    return Response.json({
      success: true,
      collaborators: collaborators.filter(c => c.last_active_at >= fiveMinutesAgo)
    });
  } catch (error) {
    console.error('Sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});