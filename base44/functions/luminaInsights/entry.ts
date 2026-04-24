import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current Lumina state
    const states = await base44.asServiceRole.entities.LuminaState.list();
    let state = states[0];

    if (!state) {
      state = await base44.asServiceRole.entities.LuminaState.create({
        version: '1.0.0',
        active_goals: ['Initialize_System'],
        technical_debt: []
      });
    }

    const insights = [];

    // 1. Audit Technical Debt
    if ((state.technical_debt || []).length > 3) {
      insights.push({
        id: 'DEBT_REFACTOR_001',
        type: 'optimization',
        title: 'Auto-Refactor Persistent Debt',
        description: "Pattern detected in handshake failures. Circuit-breaker pattern recommended to stabilize the link.",
        impactScore: 85,
        readiness: 'ready'
      });
    }

    // 2. Growth Analysis
    if (!(state.active_goals || []).includes('LBC_Resource_Library')) {
      insights.push({
        id: 'GROWTH_001',
        type: 'growth',
        title: 'Initialize LBC Resource Library',
        description: 'To scale the LBC protocol, a centralized developer hub is needed. Library structure ready to architect.',
        impactScore: 92,
        readiness: 'draft'
      });
    }

    // 3. Proactive Security
    insights.push({
      id: 'SEC_001',
      type: 'security',
      title: 'Protocol Guard Deployment',
      description: 'Strengthening the handshake between lbchub.site and lbc.network with JWT-based protocol verification.',
      impactScore: 98,
      readiness: 'ready'
    });

    // 4. Version check
    if (state.version && state.version !== '2.0.0') {
      insights.push({
        id: 'OPT_VERSION_001',
        type: 'optimization',
        title: 'Core Version Upgrade Available',
        description: `Current version ${state.version} can be upgraded. New version includes improved state persistence.`,
        impactScore: 72,
        readiness: 'draft'
      });
    }

    // 5. Goal saturation check
    if ((state.active_goals || []).length > 5) {
      insights.push({
        id: 'OPT_FOCUS_001',
        type: 'optimization',
        title: 'Goal Consolidation Recommended',
        description: `${state.active_goals.length} active goals detected. Consolidating to top 3 priorities will improve execution velocity.`,
        impactScore: 78,
        readiness: 'ready'
      });
    }

    // Sort by impact
    insights.sort((a, b) => b.impactScore - a.impactScore);

    return Response.json({
      success: true,
      insights,
      state_summary: {
        version: state.version,
        goals_count: (state.active_goals || []).length,
        debt_count: (state.technical_debt || []).length
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});