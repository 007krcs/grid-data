import { describe, it, expect, vi } from 'vitest';
import { Store } from '../state/store';

interface TestState {
  count: number;
  name: string;
  items: number[];
  nested: { value: number };
}

function createTestStore(overrides?: Partial<TestState>): Store<TestState> {
  return new Store<TestState>({
    count: 0,
    name: 'initial',
    items: [1, 2, 3],
    nested: { value: 10 },
    ...overrides,
  });
}

describe('Store.select (subscription mode)', () => {
  it('should call listener when the selected slice changes', () => {
    const store = createTestStore();
    const listener = vi.fn();

    store.select((s) => s.count, listener);

    store.setState((prev) => ({ ...prev, count: 1 }));

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(1, 0);
  });

  it('should not call listener when the selected slice is unchanged', () => {
    const store = createTestStore();
    const listener = vi.fn();

    store.select((s) => s.count, listener);

    // Change name, not count
    store.setState((prev) => ({ ...prev, name: 'updated' }));

    expect(listener).not.toHaveBeenCalled();
  });

  it('should track multiple state changes', () => {
    const store = createTestStore();
    const listener = vi.fn();

    store.select((s) => s.count, listener);

    store.setState((prev) => ({ ...prev, count: 1 }));
    store.setState((prev) => ({ ...prev, count: 2 }));
    store.setState((prev) => ({ ...prev, count: 3 }));

    expect(listener).toHaveBeenCalledTimes(3);
    expect(listener).toHaveBeenNthCalledWith(1, 1, 0);
    expect(listener).toHaveBeenNthCalledWith(2, 2, 1);
    expect(listener).toHaveBeenNthCalledWith(3, 3, 2);
  });

  it('should return an unsubscribe function', () => {
    const store = createTestStore();
    const listener = vi.fn();

    const unsub = store.select((s) => s.count, listener);

    store.setState((prev) => ({ ...prev, count: 1 }));
    expect(listener).toHaveBeenCalledTimes(1);

    unsub();

    store.setState((prev) => ({ ...prev, count: 2 }));
    expect(listener).toHaveBeenCalledTimes(1); // No additional calls
  });

  it('should use reference equality for change detection', () => {
    const store = createTestStore();
    const listener = vi.fn();

    store.select((s) => s.items, listener);

    // Same array reference — no change
    store.setState((prev) => ({ ...prev, name: 'updated' }));
    expect(listener).not.toHaveBeenCalled();

    // New array reference — change detected
    const newItems = [4, 5, 6];
    store.setState((prev) => ({ ...prev, items: newItems }));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(newItems, [1, 2, 3]);
  });

  it('should work with nested object selectors', () => {
    const store = createTestStore();
    const listener = vi.fn();

    store.select((s) => s.nested, listener);

    // Same nested reference — no change
    store.setState((prev) => ({ ...prev, count: 99 }));
    expect(listener).not.toHaveBeenCalled();

    // New nested reference — change detected
    const newNested = { value: 20 };
    store.setState((prev) => ({ ...prev, nested: newNested }));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({ value: 20 }, { value: 10 });
  });

  it('should work with derived selectors', () => {
    const store = createTestStore();
    const listener = vi.fn();

    store.select((s) => s.items.length, listener);

    // Same length — no change
    store.setState((prev) => ({ ...prev, items: [10, 20, 30] }));
    expect(listener).not.toHaveBeenCalled();

    // Different length — change detected
    store.setState((prev) => ({ ...prev, items: [10, 20] }));
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(2, 3);
  });

  it('should support multiple independent subscriptions', () => {
    const store = createTestStore();
    const countListener = vi.fn();
    const nameListener = vi.fn();

    store.select((s) => s.count, countListener);
    store.select((s) => s.name, nameListener);

    store.setState((prev) => ({ ...prev, count: 5 }));
    expect(countListener).toHaveBeenCalledTimes(1);
    expect(nameListener).not.toHaveBeenCalled();

    store.setState((prev) => ({ ...prev, name: 'changed' }));
    expect(countListener).toHaveBeenCalledTimes(1);
    expect(nameListener).toHaveBeenCalledTimes(1);
  });

  it('should work with batched updates', () => {
    const store = createTestStore();
    const listener = vi.fn();

    store.select((s) => s.count, listener);

    store.batch(() => {
      store.setState((prev) => ({ ...prev, count: 1 }));
      store.setState((prev) => ({ ...prev, count: 2 }));
    });

    // Only called once after batch completes, with final value
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(2, 0);
  });

  it('should not fire during batch if selected value returns to original', () => {
    const store = createTestStore({ count: 0 });
    const listener = vi.fn();

    store.select((s) => s.count, listener);

    store.batch(() => {
      store.setState((prev) => ({ ...prev, count: 5 }));
      store.setState((prev) => ({ ...prev, count: 0 })); // back to original
    });

    // The listener still fires since the store notifies once after batch,
    // but the select subscription checks reference equality.
    // Since count is a primitive and 0 === 0, it should NOT fire.
    expect(listener).not.toHaveBeenCalled();
  });

  it('should preserve original select behavior (single argument)', () => {
    const store = createTestStore({ count: 42 });

    // Original select behavior: returns value
    const result = store.select((s) => s.count);
    expect(result).toBe(42);
  });

  it('should handle listener errors without crashing other listeners', () => {
    const store = createTestStore();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // This listener throws via the underlying store subscription
    store.select(
      (s) => s.count,
      () => {
        throw new Error('Select listener error');
      },
    );

    const goodListener = vi.fn();
    store.subscribe(goodListener);

    store.setState((prev) => ({ ...prev, count: 1 }));

    // The store catches listener errors
    expect(consoleSpy).toHaveBeenCalled();
    expect(goodListener).toHaveBeenCalledTimes(1);

    consoleSpy.mockRestore();
  });
});
