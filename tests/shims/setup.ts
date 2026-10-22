// Lets Deno-style suites (Deno.test) run under vitest.
import { test } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

(globalThis as any).Deno = (globalThis as any).Deno || {
  test: (a: any, b?: any) => (typeof a === 'string' ? test(a, b) : test(a.name, a.fn)),
  env: { get: () => undefined },
  readTextFileSync: (p: string) => readFileSync(p, 'utf8'),
  readDirSync: (p: string) => readdirSync(p, { withFileTypes: true }).map(d => ({ name: d.name, isFile: d.isFile(), isDirectory: d.isDirectory() })),
};