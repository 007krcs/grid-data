// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Batched Update Utilities ───

/**
 * Schedule a microtask-batched callback.
 * Multiple calls within the same microtask are coalesced into one execution.
 */
export function createBatchedCallback(callback: () => void): () => void {
  let scheduled = false;

  return () => {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      callback();
    });
  };
}

/**
 * Throttle a function to run at most once per animation frame.
 */
export function rafThrottle<T extends (...args: any[]) => void>(fn: T): T & { cancel(): void } {
  let rafId: number | null = null;
  let lastArgs: any[] | null = null;

  const throttled = (...args: any[]) => {
    lastArgs = args;
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (lastArgs) {
        fn(...lastArgs);
        lastArgs = null;
      }
    });
  };

  throttled.cancel = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    lastArgs = null;
  };

  return throttled as T & { cancel(): void };
}
