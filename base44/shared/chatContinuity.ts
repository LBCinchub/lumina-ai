// Assembles the consent-aware continuity context for one authenticated main
// chat turn: settings (fail-closed), eligible memories, and past-thread
// recall. Identity always comes from the server session passed in as `user`.
import { validTimezone } from './memoryPolicy.ts';
import { loadMemorySettings, loadEligibleMemories, buildMemorySection } from './longTermMemory.ts';
import { recallHistory, buildRecallSection } from './historyRecall.ts';

export async function assembleContinuity({ userClient, db, user, conversationId, message, timezone, nowMs }) {
  const tz = validTimezone(timezone);
  const { ok, settings } = await loadMemorySettings(db, user);
  const memResult = ok ? await loadEligibleMemories(db, userClient, user, settings) : { status: 'error', memories: [] };
  let recall = null;
  if (ok) {
    recall = await recallHistory({ userClient, db, user, settings, currentConversationId: conversationId, message, nowMs, tz });
  } else {
    // Settings unknown: never search silently, but report a failure, not "no history".
    recall = await recallHistory({ userClient, db, user, settings: { history_access_enabled: false }, currentConversationId: conversationId, message, nowMs, tz });
    if (recall) recall = { status: 'error' };
  }
  return {
    tz, settings, settingsOk: ok,
    memoryStatus: memResult.status,
    recallStatus: recall ? recall.status : null,
    memorySection: buildMemorySection(memResult),
    recallSection: buildRecallSection(recall, tz),
  };
}

// Newest-N window of the current thread, returned in chronological order, so
// long threads never lose their most recent turns.
export async function loadRecentThread(db, conversationId, limit = 200) {
  const rows = await db.entities.Message.filter({ conversation_id: conversationId }, '-created_date', limit);
  return [...rows].reverse();
}