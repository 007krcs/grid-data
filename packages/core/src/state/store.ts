// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Lightweight Reactive Store ───
// Custom store optimized for grid state patterns.
// Supports batched updates and selector-based subscriptions.

/**
 * Marker passed by trusted internal call sites (CommandBus handlers, plugin
 * setState, lifecycle hooks) when invoking {@link Store.setState}. External
 * callers cannot reasonably construct this symbol, which lets the store
 * emit a dev-mode warning when arbitrary code mutates state without going
 * through the CommandBus.
 *
 * The "commands are the only way to mutate state" invariant remains
 * advisory at runtime — we don't break working code that bypasses it —
 * but the warning surfaces violations during development so they can be
 * routed through a proper command.
 */
export const INTERNAL_SETSTATE = Symbol.for('@gridstorm/core/internal-setstate');

const isDevEnv = ((): boolean => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const env = (globalThis as any).process?.env?.NODE_ENV;
    return env !== 'production';
  } catch {
    return true;
  }
})();

let _externalSetStateWarned = false;

export type StoreListener = () => void;
export type Selector<TState, TResult> = (state: TState) => TResult;

export class Store<TState> {
  private state: TState;
  private listeners = new Set<StoreListener>();
  private batchDepth = 0;
  private pendingNotify = false;
  private version = 0;
  private notifying = false;
  private pendingUpdates: Array<(prev: TState) => TState> = [];

  constructor(initialState: TState) {
    this.state = initialState;
  }

  /** Get current state snapshot. */
  getState(): TState {
    return this.state;
  }

  /** Get state version counter. Incremented on every state change. */
  getVersion(): number {
    return this.version;
  }

  /**
   * Update state using an updater function. Notifies listeners unless batched.
   *
   * @param updater - Function returning the next state given the current one.
   * @param marker - Pass {@link INTERNAL_SETSTATE} from trusted internal
   *   call sites (CommandBus handlers, plugin context). When the marker is
   *   omitted in development, the store logs a one-time warning pointing
   *   to the recommended `dispatchCommand` flow. In production the warning
   *   is suppressed entirely to avoid overhead.
   */
  setState(updater: (prev: TState) => TState, marker?: symbol): void {
    if (isDevEnv && marker !== INTERNAL_SETSTATE && !_externalSetStateWarned) {
      _externalSetStateWarned = true;
      console.warn(
        '[GridStorm] Store.setState() was called without the INTERNAL_SETSTATE marker. ' +
          'The "commands are the only way to mutate state" invariant is intended to be ' +
          'upheld by routing through GridApi.dispatchCommand. If you are inside a plugin, ' +
          'use ctx.setState (already passes the marker). External direct mutation works ' +
          'but is unsupported and will fight with command-based undo/time-travel. ' +
          'This warning is logged once per session and only in development.',
      );
    }
    // Re-entrancy guard: if we're in the middle of notifying listeners,
    // queue the update to be applied after the current notification cycle.
    if (this.notifying) {
      this.pendingUpdates.push(updater);
      return;
    }

    const next = updater(this.state);
    if (next === this.state) return;

    this.state = next;
    this.version++;

    if (this.batchDepth > 0) {
      this.pendingNotify = true;
    } else {
      this.notify();
    }
  }

  /**
   * Batch multiple state updates into a single notification.
   * Listeners are only called once after the batch completes.
   */
  batch(fn: () => void): void {
    this.batchDepth++;
    try {
      fn();
    } finally {
      this.batchDepth--;
      if (this.batchDepth === 0 && this.pendingNotify) {
        this.pendingNotify = false;
        this.notify();
      }
    }
  }

  /** Subscribe to state changes. Returns an unsubscribe function. */
  subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Run a selector against current state. */
  select<TResult>(selector: Selector<TState, TResult>): TResult;
  /**
   * Subscribe to a specific slice of state. Only fires when the selected
   * value changes (by reference equality).
   *
   * @param selector - Function that extracts a slice from the full state.
   * @param listener - Callback invoked when the selected value changes.
   * @returns An unsubscribe function.
   *
   * @example
   * ```ts
   * const unsub = store.select(
   *   (state) => state.sortModel,
   *   (next, prev) => console.log('Sort changed:', prev, '->', next),
   * );
   * // Later: unsub();
   * ```
   */
  select<TResult>(
    selector: Selector<TState, TResult>,
    listener: (value: TResult, prevValue: TResult) => void,
  ): () => void;
  select<TResult>(
    selector: Selector<TState, TResult>,
    listener?: (value: TResult, prevValue: TResult) => void,
  ): TResult | (() => void) {
    if (!listener) {
      // Original behavior: run selector and return result
      return selector(this.state);
    }

    // Subscription mode: only notify when selected slice changes
    let prevValue = selector(this.state);
    return this.subscribe(() => {
      const nextValue = selector(this.state);
      if (nextValue !== prevValue) {
        const prev = prevValue;
        prevValue = nextValue;
        listener(nextValue, prev);
      }
    });
  }

  private notify(): void {
    this.notifying = true;
    try {
      for (const listener of [...this.listeners]) {
        try {
          listener();
        } catch (err) {
          console.error('[GridStorm] Error in store listener:', err);
        }
      }
    } finally {
      this.notifying = false;
    }

    // Drain any updates that were queued during notification.
    // A cap of 100 iterations protects against runaway feedback loops, but
    // silently dropping state on overflow (previous behavior) hid real bugs
    // in production — store mutations vanished without any signal. We now
    // throw so the bug surfaces; callers that are intentionally cyclic must
    // break the loop themselves rather than relying on the store to swallow
    // it.
    let drainIterations = 0;
    while (this.pendingUpdates.length > 0) {
      drainIterations++;
      if (drainIterations > 100) {
        const droppedCount = this.pendingUpdates.length;
        this.pendingUpdates = [];
        throw new Error(
          `[GridStorm] Possible infinite state update cycle detected: ` +
            `${droppedCount} pending update(s) discarded after 100 drain iterations. ` +
            `A listener is dispatching setState in a way that re-enters itself. ` +
            `Inspect your subscribers for a loop.`,
        );
      }
      const queued = this.pendingUpdates;
      this.pendingUpdates = [];
      for (const updater of queued) {
        const next = updater(this.state);
        if (next !== this.state) {
          this.state = next;
          this.version++;
        }
      }
      // Notify again for the queued updates
      this.notifying = true;
      try {
        for (const listener of [...this.listeners]) {
          try {
            listener();
          } catch (err) {
            console.error('[GridStorm] Error in store listener:', err);
          }
        }
      } finally {
        this.notifying = false;
      }
    }
  }
}

/**
 * Create a memoized selector that recomputes only when dependencies change.
 * Uses shallow reference equality for dependency checking.
 */
export function createSelector<TState, TDeps extends any[], TResult>(
  dependencies: { [K in keyof TDeps]: Selector<TState, TDeps[K]> },
  combiner: (...deps: TDeps) => TResult,
): Selector<TState, TResult> {
  let lastDeps: TDeps | undefined;
  let lastResult: TResult;
  let initialized = false;

  return (state: TState): TResult => {
    const deps = dependencies.map((d) => d(state)) as TDeps;

    if (initialized && lastDeps && deps.every((d, i) => d === lastDeps![i])) {
      return lastResult;
    }

    lastDeps = deps;
    lastResult = combiner(...deps);
    initialized = true;
    return lastResult;
  };
}
