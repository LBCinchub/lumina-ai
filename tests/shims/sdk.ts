// Synthetic SDK: handlers receive whatever client the test installed.
export const createClientFromRequest = () => (globalThis as any).__client;
export const createClient = () => (globalThis as any).__client;