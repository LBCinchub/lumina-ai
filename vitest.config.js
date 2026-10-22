// Test-only config. Maps Deno/backend-runtime specifiers to local shims so the
// Deno-style suites and the real backend handlers load under vitest. Never
// used by the app build (vite.config.js).
import path from 'node:path';

const root = process.cwd();
const shim = (f) => path.resolve(root, 'tests/shims', f);

export default ({
  resolve: {
    alias: [
      { find: /^jsr:@std\/assert(@[^/]*)?$/, replacement: shim('stdAssert.ts') },
      { find: /^npm:@base44\/sdk(@[^/]*)?$/, replacement: shim('sdk.ts') },
      { find: 'base44:runtime', replacement: shim('runtime.ts') },
      { find: '@', replacement: path.resolve(root, 'src') },
    ],
  },
  test: { setupFiles: [shim('setup.ts')] },
});