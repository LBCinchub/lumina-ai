import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// LBC AI Twin Digital ID engine.
// All twin data is strictly private per user — every entity is RLS-scoped to
// created_by_id, and we use the user-scoped client (base44.entities) so the
// platform enforces isolation. Twin A can never see twin B's data.
//
// Actions:
//   get_profile            — return the user's twin profile + auth settings
//   update_settings        — persist per-vertical auth modes, max spend, and
//                            optionally the communication style
//   recommend              — up to 3 personalized recommendations from learned traits
//   learn_from_interaction — silently log an interaction and update the profile
//   list_requests          — the user's own twin action requests, newest first
//   decide_request         — approve or deny one pending request; approval is
//                            bound to the estimated cost the user was shown

const MODES = ['auto', 'confirm', 'off'];
const pickMode = (value, current) => (MODES.includes(value) ? value : (current || 'confirm'));
const publicRequest = (r) => ({
  id: r.id, vertical: r.vertical, summary: r.summary, status: r.status,
  estimated_cost_usd: r.estimated_cost_usd || 0, created_date: r.created_date,
});

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const action = body.action;

    async function getProfile() {
      const rows = await base44.entities.UserTwinProfile.list();
      let p = rows[0];
      if (!p) {
        p = await base44.entities.UserTwinProfile.create({
          interaction_count: 0,
          confidence_score: 0,
          communication_style: 'balanced',
          learned_traits: []
        });
      }
      return p;
    }

    if (action === 'get_profile') {
      const profile = await getProfile();
      const settingsRows = await base44.entities.TwinAuthorizationSettings.list();
      return Response.json({ profile, settings: settingsRows[0] || null });
    }

    if (action === 'update_settings') {
      const { ride_booking, marketplace_listing, travel_booking, max_auto_spend_usd, communication_style } = body;
      const settingsRows = await base44.entities.TwinAuthorizationSettings.list();
      let s = settingsRows[0];
      const settingsData = {
        ride_booking: pickMode(ride_booking, s?.ride_booking),
        marketplace_listing: pickMode(marketplace_listing, s?.marketplace_listing),
        travel_booking: pickMode(travel_booking, s?.travel_booking),
        max_auto_spend_usd: typeof max_auto_spend_usd === 'number' && Number.isFinite(max_auto_spend_usd)
          ? Math.max(0, max_auto_spend_usd)
          : (s?.max_auto_spend_usd || 0)
      };
      if (!s) s = await base44.entities.TwinAuthorizationSettings.create(settingsData);
      else s = await base44.entities.TwinAuthorizationSettings.update(s.id, settingsData);

      let profile = null;
      if (communication_style && ['terse', 'balanced', 'chatty'].includes(communication_style)) {
        const p = await getProfile();
        if ((p.communication_style || 'balanced') !== communication_style) {
          profile = await base44.entities.UserTwinProfile.update(p.id, { communication_style });
        } else {
          profile = p;
        }
      }
      return Response.json({ settings: s, profile });
    }

    if (action === 'learn_from_interaction') {
      const vertical = body.vertical || 'general';
      const action_type = body.action_type || 'browse';
      const action_data = typeof body.action_data === 'string'
        ? body.action_data
        : JSON.stringify(body.action_data || {});

      await base44.entities.TwinInteractionLog.create({ vertical, action_type, action_data });

      const p = await getProfile();
      const count = (p.interaction_count || 0) + 1;
      // Confidence grows logarithmically with interactions, capped at 100.
      const confidence = Math.min(100, Math.round((Math.log10(count + 1) / Math.log10(50)) * 100));

      let traits = Array.isArray(p.learned_traits) ? p.learned_traits.map(t => ({ ...t })) : [];
      const traitKey = `${vertical}:${action_type}`;
      let t = traits.find(x => x.trait === traitKey);
      if (t) {
        t.count = (t.count || 0) + 1;
        t.confidence = Math.min(100, (t.confidence || 0) + 8);
      } else {
        traits.push({ trait: traitKey, confidence: 12, count: 1 });
      }
      traits.sort((a, b) => (b.count || 0) - (a.count || 0));
      traits = traits.slice(0, 10);

      const updated = await base44.entities.UserTwinProfile.update(p.id, {
        interaction_count: count,
        confidence_score: confidence,
        learned_traits: traits
      });
      return Response.json({ profile: updated });
    }

    if (action === 'recommend') {
      const p = await getProfile();
      const traits = Array.isArray(p.learned_traits) ? p.learned_traits : [];
      const recs = [];
      for (const t of traits.slice(0, 3)) {
        const conf = t.confidence || 0;
        const exploratory = conf < 40;
        const [vertical, atype] = (t.trait || '').split(':');
        let text = '';
        if (vertical === 'ride_booking') {
          text = exploratory
            ? 'I noticed you might like booking rides in advance — want me to set that up next time?'
            : 'Based on your rides, I can auto-book your usual route within your spend limit.';
        } else if (vertical === 'marketplace_listing') {
          text = exploratory
            ? 'I noticed you might like listing items quickly — I can draft a listing from your photos.'
            : 'I can auto-list items like your recent ones within your spend limit.';
        } else if (vertical === 'travel_booking') {
          text = exploratory
            ? 'I noticed you might like travel deals — I can watch for flights matching your past trips.'
            : 'I can auto-book travel matching your preferences within your spend limit.';
        } else {
          text = exploratory
            ? 'I noticed you might like exploring new options here.'
            : 'I can streamline your next step based on your activity.';
        }
        recs.push({ id: t.trait, vertical, action_type: atype, confidence: conf, text, exploratory });
      }
      return Response.json({
        recommendations: recs,
        confidence_score: p.confidence_score || 0,
        communication_style: p.communication_style || 'balanced'
      });
    }

    // Action requests: read through the user's own RLS-scoped client, like the
    // profile and settings above (no built-in owner field in the query), and
    // the owner is re-checked on every record as a second line of defense.
    const ownRequests = async (query = {}) => {
      const rows = await base44.entities.TwinActionRequest.filter(query, '-created_date', 50);
      return (Array.isArray(rows) ? rows : []).filter((r) => r?.created_by_id === user.id);
    };

    if (action === 'list_requests') {
      const rows = await ownRequests();
      return Response.json({ requests: rows.map(publicRequest) });
    }

    if (action === 'decide_request') {
      const decision = body.decision;
      if (decision !== 'approve' && decision !== 'deny') {
        return Response.json({ error: 'Choose Approve Or Deny.' }, { status: 400 });
      }
      const rows = typeof body.request_id === 'string' && /^[a-f0-9]{24}$/i.test(body.request_id)
        ? await ownRequests({ id: body.request_id })
        : [];
      const r = rows[0];
      if (!r) return Response.json({ error: 'Not found' }, { status: 404 });
      if (r.status !== 'pending') {
        return Response.json({ error: 'This Request Was Already Decided.', request: publicRequest(r) }, { status: 409 });
      }
      // Every financial action needs explicit approval of the exact cost shown.
      if (decision === 'approve' && Number(body.expected_cost_usd) !== Number(r.estimated_cost_usd || 0)) {
        return Response.json({ error: 'The Estimated Cost Changed. Review It Before Approving.', request: publicRequest(r) }, { status: 409 });
      }
      const status = decision === 'approve' ? 'confirmed' : 'denied';
      await base44.entities.TwinActionRequest.update(r.id, { status });
      return Response.json({ request: publicRequest({ ...r, status }) });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('lbcTwinEngine failed:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}