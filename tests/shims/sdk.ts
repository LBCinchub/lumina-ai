// Synthetic SDK: handlers receive whatever client the test installed.
// __clientFor(req) (when set) gives each request its own session client so
// concurrent multi-user tests never share identity.
const pick = (req?: any) => (globalThis as any).__clientFor ? (globalThis as any).__clientFor(req) : (globalThis as any).__client;
export const createClientFromRequest = (req?: any) => pick(req);
export const createClient = () => (globalThis as any).__client;