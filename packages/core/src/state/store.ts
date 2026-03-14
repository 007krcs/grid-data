// ─── Lightweight Reactive Store ───
// Custom store optimized for grid state patterns.
// Supports batched updates and selector-based subscriptions.

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

  /** Update state using an updater function. Notifies listeners unless batched. */
  setState(updater: (prev: TState) => TState): void {
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

    // Drain any updates that were queued during notification
    let drainIterations = 0;
    while (this.pendingUpdates.length > 0) {
      drainIterations++;
      if (drainIterations > 100) {
        console.error('[GridStorm] Possible infinite state update cycle detected — breaking after 100 iterations.');
        this.pendingUpdates = [];
        break;
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
