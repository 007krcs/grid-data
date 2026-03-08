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
  select<TResult>(selector: Selector<TState, TResult>): TResult {
    return selector(this.state);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('[GridStorm] Error in store listener:', err);
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
