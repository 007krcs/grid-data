import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CellFormulaPlugin } from '../cell-formula-plugin';
import type { FormulaState, FormulaDefinition } from '../types';

type RowNode = { id: string; data: unknown };

function makeMockCtx(rows: RowNode[] = []) {
  const state: Record<string, unknown> = {};
  const handlers: Record<string, ((p: unknown) => void)[]> = {};
  const eventHandlers: Record<string, ((p: unknown) => void)[]> = {};
  const emitted: Array<{ event: string; payload: unknown }> = [];
  // Minimal grid state for ctx.store
  let gridState: Record<string, unknown> = { rowNodes: new Map() };

  return {
    ctx: {
      registerState(key: string, initial: unknown) {
        state[key] = initial;
      },
      getState(key: string) {
        return state[key];
      },
      setState(key: string, updater: (prev: unknown) => unknown) {
        state[key] = updater(state[key]);
      },
      store: {
        getState() { return gridState; },
        setState(updater: (prev: Record<string, unknown>) => Record<string, unknown>) {
          gridState = updater(gridState);
        },
      },
      commandBus: {
        registerHandler(cmd: string, fn: (p: unknown) => void) {
          handlers[cmd] = handlers[cmd] ?? [];
          handlers[cmd].push(fn);
          return () => {
            handlers[cmd] = (handlers[cmd] ?? []).filter(h => h !== fn);
          };
        },
      },
      eventBus: {
        on(event: string, fn: (p: unknown) => void) {
          eventHandlers[event] = eventHandlers[event] ?? [];
          eventHandlers[event].push(fn);
          return () => {
            eventHandlers[event] = (eventHandlers[event] ?? []).filter(h => h !== fn);
          };
        },
        emit(event: string, payload: unknown) {
          emitted.push({ event, payload });
        },
      },
      api: {
        forEachNode: vi.fn((cb: (node: RowNode) => void) => rows.forEach(cb)),
      },
    },
    dispatch(cmd: string, payload: unknown) {
      (handlers[cmd] ?? []).forEach(h => h(payload));
    },
    triggerEvent(event: string, payload: unknown) {
      (eventHandlers[event] ?? []).forEach(h => h(payload));
    },
    emitted,
    handlers,
    eventHandlers,
    state,
  };
}

describe('CellFormulaPlugin', () => {
  let mock: ReturnType<typeof makeMockCtx>;

  beforeEach(() => {
    mock = makeMockCtx();
  });

  it('installs and registers initial state', () => {
    const plugin = CellFormulaPlugin();
    plugin.install(mock.ctx as never);

    const state = mock.state['cellFormula'] as FormulaState;
    expect(state).toBeDefined();
    expect(state.definitions).toBeInstanceOf(Map);
    expect(state.definitions.size).toBe(0);
    expect(state.errors).toEqual([]);
    expect(state.computedValues).toBeInstanceOf(Map);
  });

  it('has correct plugin metadata', () => {
    const plugin = CellFormulaPlugin();
    expect(plugin.id).toBe('cell-formula');
    expect(plugin.name).toBe('Cell Formula');
    expect(plugin.version).toBe('0.1.0');
  });

  it('formula:define stores definition in state', () => {
    const plugin = CellFormulaPlugin();
    plugin.install(mock.ctx as never);

    const def: FormulaDefinition = {
      columnId: 'total',
      dependencies: ['price', 'qty'],
      compute: (row) => (row as { price: number; qty: number }).price * (row as { price: number; qty: number }).qty,
    };

    mock.dispatch('formula:define', def);

    const state = mock.state['cellFormula'] as FormulaState;
    expect(state.definitions.has('total')).toBe(true);
    expect(state.definitions.get('total')).toBe(def);
  });

  it('compute function is called with row data', () => {
    const rows: RowNode[] = [
      { id: 'r1', data: { price: 10, qty: 3 } },
      { id: 'r2', data: { price: 5, qty: 4 } },
    ];
    mock = makeMockCtx(rows);

    const computeFn = vi.fn((row: unknown) => {
      const r = row as { price: number; qty: number };
      return r.price * r.qty;
    });

    const plugin = CellFormulaPlugin();
    plugin.install(mock.ctx as never);

    mock.dispatch('formula:define', {
      columnId: 'total',
      dependencies: ['price', 'qty'],
      compute: computeFn,
    });

    expect(computeFn).toHaveBeenCalledTimes(2);
    // Use objectContaining because the write-back step adds the computed 'total'
    // field to node.data in-place, mutating the recorded call argument
    expect(computeFn).toHaveBeenCalledWith(expect.objectContaining({ price: 10, qty: 3 }));
    expect(computeFn).toHaveBeenCalledWith(expect.objectContaining({ price: 5, qty: 4 }));
  });

  it('computed values are stored by columnId -> rowId -> value', () => {
    const rows: RowNode[] = [
      { id: 'r1', data: { price: 10, qty: 3 } },
      { id: 'r2', data: { price: 5, qty: 4 } },
    ];
    mock = makeMockCtx(rows);

    const plugin = CellFormulaPlugin();
    plugin.install(mock.ctx as never);

    mock.dispatch('formula:define', {
      columnId: 'total',
      dependencies: ['price', 'qty'],
      compute: (row: unknown) => {
        const r = row as { price: number; qty: number };
        return r.price * r.qty;
      },
    });

    const state = mock.state['cellFormula'] as FormulaState;
    const totalValues = state.computedValues.get('total')!;
    expect(totalValues).toBeInstanceOf(Map);
    expect(totalValues.get('r1')).toBe(30);
    expect(totalValues.get('r2')).toBe(20);
  });

  it('formula:computed event is emitted after define', () => {
    const plugin = CellFormulaPlugin();
    plugin.install(mock.ctx as never);

    mock.dispatch('formula:define', {
      columnId: 'total',
      dependencies: [],
      compute: () => 42,
    });

    const computedEvents = mock.emitted.filter(e => e.event === 'formula:computed');
    expect(computedEvents).toHaveLength(1);
    const payload = computedEvents[0]!.payload as { columnId: string };
    expect(payload.columnId).toBe('total');
  });

  it('formula:remove deletes definition and computed values', () => {
    const plugin = CellFormulaPlugin();
    plugin.install(mock.ctx as never);

    mock.dispatch('formula:define', {
      columnId: 'total',
      dependencies: [],
      compute: () => 99,
    });

    mock.dispatch('formula:remove', { columnId: 'total' });

    const state = mock.state['cellFormula'] as FormulaState;
    expect(state.definitions.has('total')).toBe(false);
    expect(state.computedValues.has('total')).toBe(false);
  });

  it('formula:recalculate recomputes all formulas when no columnId given', () => {
    const rows: RowNode[] = [{ id: 'r1', data: { x: 5 } }];
    mock = makeMockCtx(rows);

    const computeA = vi.fn(() => 1);
    const computeB = vi.fn(() => 2);

    const plugin = CellFormulaPlugin();
    plugin.install(mock.ctx as never);

    mock.dispatch('formula:define', { columnId: 'colA', dependencies: [], compute: computeA });
    mock.dispatch('formula:define', { columnId: 'colB', dependencies: [], compute: computeB });

    // Reset call counts
    computeA.mockClear();
    computeB.mockClear();

    mock.dispatch('formula:recalculate', undefined);

    expect(computeA).toHaveBeenCalledTimes(1);
    expect(computeB).toHaveBeenCalledTimes(1);
  });

  it('formula:recalculate with columnId recomputes only that column', () => {
    const rows: RowNode[] = [{ id: 'r1', data: {} }];
    mock = makeMockCtx(rows);

    const computeA = vi.fn(() => 1);
    const computeB = vi.fn(() => 2);

    const plugin = CellFormulaPlugin();
    plugin.install(mock.ctx as never);

    mock.dispatch('formula:define', { columnId: 'colA', dependencies: [], compute: computeA });
    mock.dispatch('formula:define', { columnId: 'colB', dependencies: [], compute: computeB });

    computeA.mockClear();
    computeB.mockClear();

    mock.dispatch('formula:recalculate', { columnId: 'colA' });

    expect(computeA).toHaveBeenCalledTimes(1);
    expect(computeB).not.toHaveBeenCalled();
  });

  it('errors in compute function are caught and stored in state', () => {
    const rows: RowNode[] = [{ id: 'r1', data: {} }];
    mock = makeMockCtx(rows);

    const plugin = CellFormulaPlugin({ onError: 'report' });
    plugin.install(mock.ctx as never);

    mock.dispatch('formula:define', {
      columnId: 'badCol',
      dependencies: [],
      compute: () => { throw new Error('compute failed'); },
    });

    const state = mock.state['cellFormula'] as FormulaState;
    expect(state.errors).toHaveLength(1);
    expect(state.errors[0]!.columnId).toBe('badCol');
    expect(state.errors[0]!.rowId).toBe('r1');
    expect(state.errors[0]!.message).toBe('compute failed');
  });

  it('formula:error event is emitted when errorMode is report', () => {
    const rows: RowNode[] = [{ id: 'r1', data: {} }];
    mock = makeMockCtx(rows);

    const plugin = CellFormulaPlugin({ onError: 'report' });
    plugin.install(mock.ctx as never);

    mock.dispatch('formula:define', {
      columnId: 'badCol',
      dependencies: [],
      compute: () => { throw new Error('oops'); },
    });

    const errorEvents = mock.emitted.filter(e => e.event === 'formula:error');
    expect(errorEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('errors are silenced when onError is silent', () => {
    const rows: RowNode[] = [{ id: 'r1', data: {} }];
    mock = makeMockCtx(rows);

    const plugin = CellFormulaPlugin({ onError: 'silent' });
    plugin.install(mock.ctx as never);

    expect(() => {
      mock.dispatch('formula:define', {
        columnId: 'badCol',
        dependencies: [],
        compute: () => { throw new Error('silenced'); },
      });
    }).not.toThrow();

    const errorEvents = mock.emitted.filter(e => e.event === 'formula:error');
    expect(errorEvents).toHaveLength(0);
  });

  it('multiple formulas coexist independently', () => {
    const rows: RowNode[] = [{ id: 'r1', data: { a: 2, b: 3 } }];
    mock = makeMockCtx(rows);

    const plugin = CellFormulaPlugin();
    plugin.install(mock.ctx as never);

    mock.dispatch('formula:define', {
      columnId: 'sum',
      dependencies: ['a', 'b'],
      compute: (row: unknown) => {
        const r = row as { a: number; b: number };
        return r.a + r.b;
      },
    });
    mock.dispatch('formula:define', {
      columnId: 'product',
      dependencies: ['a', 'b'],
      compute: (row: unknown) => {
        const r = row as { a: number; b: number };
        return r.a * r.b;
      },
    });

    const state = mock.state['cellFormula'] as FormulaState;
    expect(state.computedValues.get('sum')!.get('r1')).toBe(5);
    expect(state.computedValues.get('product')!.get('r1')).toBe(6);
  });

  it('rows:updated event triggers recompute of all formulas', () => {
    const rows: RowNode[] = [{ id: 'r1', data: {} }];
    mock = makeMockCtx(rows);

    const computeFn = vi.fn(() => 42);
    const plugin = CellFormulaPlugin();
    plugin.install(mock.ctx as never);

    mock.dispatch('formula:define', { columnId: 'col', dependencies: [], compute: computeFn });
    computeFn.mockClear();

    mock.triggerEvent('rows:updated', {});

    expect(computeFn).toHaveBeenCalledTimes(1);
  });

  it('cleanup removes all command handlers', () => {
    const plugin = CellFormulaPlugin();
    const cleanup = plugin.install(mock.ctx as never);

    (cleanup as () => void)();

    // After cleanup, dispatching define should not register anything
    const initialHandlerCount = Object.keys(mock.handlers).length;
    mock.dispatch('formula:define', {
      columnId: 'col',
      dependencies: [],
      compute: () => 0,
    });

    const state = mock.state['cellFormula'] as FormulaState;
    // definitions should remain empty since handler was removed
    expect(state.definitions.size).toBe(0);
    // handler arrays should be empty after cleanup
    expect((mock.handlers['formula:define'] ?? []).length).toBe(0);
    expect(initialHandlerCount).toBeGreaterThanOrEqual(0);
  });
});
