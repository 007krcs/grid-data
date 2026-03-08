// ─── Memoization Utilities ───

/**
 * Memoize a function with a single argument using reference equality.
 * For hot-path functions like value getters.
 */
export function memoizeOne<TArg, TResult>(fn: (arg: TArg) => TResult): (arg: TArg) => TResult {
  let lastArg: TArg | undefined;
  let lastResult: TResult;
  let called = false;

  return (arg: TArg): TResult => {
    if (called && arg === lastArg) return lastResult;
    lastArg = arg;
    lastResult = fn(arg);
    called = true;
    return lastResult;
  };
}

/**
 * Shallow equality check for two objects.
 */
export function shallowEqual<T extends Record<string, any>>(a: T, b: T): boolean {
  if (a === b) return true;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}
