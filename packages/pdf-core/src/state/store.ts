// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── PDF Store ───
// Mirrors GridStorm's Store pattern exactly. Lightweight reactive store
// with batched updates and selector-based subscriptions.

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

  getState(): TState {
    return this.state;
  }

  getVersion(): number {
    return this.version;
  }

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

  subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  select<TResult>(selector: Selector<TState, TResult>): TResult;
  select<TResult>(
    selector: Selector<TState, TResult>,
    listener: (value: TResult, prevValue: TResult) => void,
  ): () => void;
  select<TResult>(
    selector: Selector<TState, TResult>,
    listener?: (value: TResult, prevValue: TResult) => void,
  ): TResult | (() => void) {
    if (!listener) {
      return selector(this.state);
    }

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
    for (const listener of this.listeners) {
      try {
        listener();
      } catch (err) {
        console.error('[GridStorm PDF] Error in store listener:', err);
      }
    }
  }
}
