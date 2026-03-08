import { describe, it, expect, vi } from 'vitest';
import { Store, createSelector } from '../state/store';

describe('Store', () => {
  it('should initialize with the given state', () => {
    const store = new Store({ count: 0 });
    expect(store.getState()).toEqual({ count: 0 });
  });

  it('should update state with setState', () => {
    const store = new Store({ count: 0 });
    store.setState((prev) => ({ ...prev, count: 1 }));
    expect(store.getState().count).toBe(1);
  });

  it('should skip update when state is referentially equal', () => {
    const state = { count: 0 };
    const store = new Store(state);
    const listener = vi.fn();
    store.subscribe(listener);

    store.setState((prev) => prev); // same reference
    expect(listener).not.toHaveBeenCalled();
  });

  it('should notify listeners on state change', () => {
    const store = new Store({ count: 0 });
    const listener = vi.fn();
    store.subscribe(listener);

    store.setState((prev) => ({ ...prev, count: 1 }));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should allow unsubscribing', () => {
    const store = new Store({ count: 0 });
    const listener = vi.fn();
    const unsub = store.subscribe(listener);

    unsub();
    store.setState((prev) => ({ ...prev, count: 1 }));
    expect(listener).not.toHaveBeenCalled();
  });

  it('should batch multiple updates into one notification', () => {
    const store = new Store({ a: 0, b: 0 });
    const listener = vi.fn();
    store.subscribe(listener);

    store.batch(() => {
      store.setState((prev) => ({ ...prev, a: 1 }));
      store.setState((prev) => ({ ...prev, b: 2 }));
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getState()).toEqual({ a: 1, b: 2 });
  });

  it('should handle nested batches', () => {
    const store = new Store({ count: 0 });
    const listener = vi.fn();
    store.subscribe(listener);

    store.batch(() => {
      store.setState((prev) => ({ ...prev, count: 1 }));
      store.batch(() => {
        store.setState((prev) => ({ ...prev, count: 2 }));
      });
      // Inner batch shouldn't have notified yet
      expect(listener).not.toHaveBeenCalled();
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getState().count).toBe(2);
  });

  it('should increment version on each state change', () => {
    const store = new Store({ count: 0 });
    expect(store.getVersion()).toBe(0);

    store.setState((prev) => ({ ...prev, count: 1 }));
    expect(store.getVersion()).toBe(1);

    store.setState((prev) => ({ ...prev, count: 2 }));
    expect(store.getVersion()).toBe(2);
  });

  it('should run selectors against current state', () => {
    const store = new Store({ items: [1, 2, 3] });
    const result = store.select((s) => s.items.length);
    expect(result).toBe(3);
  });

  it('should catch errors in listeners without crashing', () => {
    const store = new Store({ count: 0 });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    store.subscribe(() => {
      throw new Error('Listener error');
    });

    const goodListener = vi.fn();
    store.subscribe(goodListener);

    store.setState((prev) => ({ ...prev, count: 1 }));

    expect(consoleSpy).toHaveBeenCalled();
    expect(goodListener).toHaveBeenCalledTimes(1);
    consoleSpy.mockRestore();
  });
});

describe('createSelector', () => {
  it('should compute derived state', () => {
    type State = { items: number[] };
    const selectItems = (s: State) => s.items;
    const selectSum = createSelector([selectItems], (items) =>
      items.reduce((a, b) => a + b, 0),
    );

    expect(selectSum({ items: [1, 2, 3] })).toBe(6);
  });

  it('should memoize results when deps are unchanged', () => {
    type State = { items: number[] };
    const selectItems = (s: State) => s.items;
    const combiner = vi.fn((items: number[]) => items.length);
    const selectCount = createSelector([selectItems], combiner);

    const items = [1, 2, 3];
    const state: State = { items };

    selectCount(state);
    selectCount(state); // Same state reference

    expect(combiner).toHaveBeenCalledTimes(1);
  });

  it('should recompute when deps change', () => {
    type State = { items: number[] };
    const selectItems = (s: State) => s.items;
    const combiner = vi.fn((items: number[]) => items.length);
    const selectCount = createSelector([selectItems], combiner);

    selectCount({ items: [1, 2] });
    selectCount({ items: [1, 2, 3] }); // Different reference

    expect(combiner).toHaveBeenCalledTimes(2);
  });
});
