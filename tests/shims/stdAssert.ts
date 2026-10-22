import { expect } from 'vitest';

export function assert(v: unknown, msg?: string) { expect(!!v, msg).toBe(true); }
export function assertEquals(a: unknown, b: unknown, msg?: string) { expect(a, msg).toEqual(b); }
export function assertStringIncludes(a: string, b: string, msg?: string) { expect(a, msg).toContain(b); }