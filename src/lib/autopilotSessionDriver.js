// Pure decision logic for the single foreground session driver. Kept free of
// React/SDK so it is unit-tested. Foreground only: it advances runs while the
// owner is signed in on some tab; it is NOT offline background execution.

export const LOCK_KEY = 'lbc.autopilot.driver';
export const LOCK_TTL_MS = 20000;
export const MAX_CONSECUTIVE_ERRORS = 3;
export const STEP_DELAY_MS = 900;

// One tab drives at a time. The server lease (compare-and-swap) is the real
// guard against double execution; this only avoids wasted parallel polling.
export function tryAcquireLock(storage, tabId, now = Date.now()) {
  try {
    const cur = JSON.parse(storage.getItem(LOCK_KEY) || 'null');
    if (cur && cur.tab !== tabId && cur.until > now) return false;
    storage.setItem(LOCK_KEY, JSON.stringify({ tab: tabId, until: now + LOCK_TTL_MS }));
    return true;
  } catch (_) {
    return true; // storage unavailable: server lease still fences execution
  }
}

export function releaseLock(storage, tabId) {
  try {
    const cur = JSON.parse(storage.getItem(LOCK_KEY) || 'null');
    if (cur?.tab === tabId) storage.removeItem(LOCK_KEY);
  } catch (_) { /* ignore */ }
}

// Pick the next run to advance: only status 'running', never one that hit
// the error bound. Paused/cancelled/blocked/awaiting_* are never driven.
export function pickRunToDrive(runs, errorCounts = {}) {
  return (runs || [])
    .filter(r => r?.status === 'running' && (errorCounts[r.id] || 0) < MAX_CONSECUTIVE_ERRORS)
    .sort((a, b) => String(a.created_date).localeCompare(String(b.created_date)))[0] || null;
}

// 401/403 = session gone or revoked → stop driving entirely.
export function isAuthStop(err) {
  const s = err?.response?.status || err?.status;
  return s === 401 || s === 403;
}