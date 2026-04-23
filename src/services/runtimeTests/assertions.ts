/**
 * Assertion helpers for runtime tests (no Jest dependency).
 */

export function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertEqual<T>(actual: T, expected: T, label: string): void {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

export function assertDefined<T>(value: T | null | undefined, label: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(`${label}: expected value to be defined, got ${String(value)}`);
  }
}

export function assertUndefined(value: unknown, label: string): void {
  if (value !== undefined) {
    throw new Error(`${label}: expected undefined, got ${JSON.stringify(value)}`);
  }
}

export function assertMatch(value: string, pattern: RegExp, label: string): void {
  if (!pattern.test(value)) {
    throw new Error(`${label}: "${value}" does not match ${pattern}`);
  }
}

export function assertContains<T>(arr: T[], item: T, label: string): void {
  if (!arr.includes(item)) {
    throw new Error(`${label}: array does not contain ${JSON.stringify(item)}`);
  }
}

export function assertThrows(fn: () => unknown, label: string): void {
  let threw = false;
  try {
    fn();
  } catch {
    threw = true;
  }
  if (!threw) {
    throw new Error(`${label}: expected function to throw`);
  }
}

export async function assertRejects(fn: () => Promise<unknown>, label: string): Promise<void> {
  let threw = false;
  try {
    await fn();
  } catch {
    threw = true;
  }
  if (!threw) {
    throw new Error(`${label}: expected promise to reject`);
  }
}
