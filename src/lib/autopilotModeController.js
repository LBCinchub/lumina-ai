// Client controller for Persistent Mode: shows only server-confirmed state,
// one save at a time, and a late initial load never overwrites a completed save.
export function modeErrorMessage(e, fallback) {
  return e?.response?.data?.error || fallback;
}

export function createModeController(invoke, emit) {
  let s = { enabled: null, background: null, loading: true, saving: false, error: null, lastOp: null };
  let saveStarted = false;
  const set = (p) => { s = { ...s, ...p }; emit(s); };

  const load = async () => {
    set({ loading: true, error: null, lastOp: 'load' });
    try {
      const res = await invoke({ action: 'get_mode' });
      if (saveStarted) return; // stale: a save already owns the state
      set({ enabled: res.data.enabled === true, background: res.data.background || null, loading: false });
    } catch (e) {
      if (saveStarted) return;
      set({ loading: false, error: modeErrorMessage(e, 'Could Not Load Persistent Mode. Your Saved Setting Was Not Changed.') });
    }
  };

  const save = async (enabled) => {
    if (s.saving || typeof enabled !== 'boolean') return false;
    saveStarted = true;
    set({ saving: true, loading: false, error: null, lastOp: { enabled } });
    try {
      const res = await invoke({ action: 'set_mode', enabled });
      set({ enabled: res.data.enabled === true, background: res.data.background || s.background, saving: false });
      return true;
    } catch (e) {
      set({ saving: false, error: modeErrorMessage(e, 'Could Not Save Persistent Mode. Your Previous Setting Is Kept.') });
      return false;
    }
  };

  const retry = () => (s.lastOp && s.lastOp !== 'load' ? save(s.lastOp.enabled) : load());
  return { load, save, retry, get state() { return s; } };
}