import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TemporalPlugin } from '../temporal-plugin';
import type { TemporalState, TemporalSnapshot } from '../types';

function makeMockCtx(
  gridState: {
    sortModel?: unknown[];
    filterModel?: Record<string, unknown>;
    quickFilterText?: string;
  } = {},
) {
  const state: Record<string, unknown> = {};
  const handlers: Record<string, ((p: unknown) => void)[]> = {};
  const eventHandlers: Record<string, ((p: unknown) => void)[]> = {};
  const emitted: Array<{ event: string; payload: unknown }> = [];

  const api = {
    getSortModel: vi.fn(() => gridState.sortModel ?? []),
    getFilterModel: vi.fn(() => gridState.filterModel ?? {}),
    setSortModel: vi.fn(),
    setFilterModel: vi.fn(),
    setQuickFilter: vi.fn(),
    quickFilterText: gridState.quickFilterText ?? '',
  };

  const ctx = {
    registerState(key: string, initial: unknown) {
      state[key] = initial;
    },
    getState(key: string) {
      return state[key];
    },
    setState(key: string, updater: (prev: unknown) => unknown) {
      state[key] = updater(state[key]);
    },
    commandBus: {
      registerHandler(cmd: string, fn: (p: unknown) => void) {
        handlers[cmd] = handlers[cmd] ?? [];
        handlers[cmd].push(fn);
        return () => {
          handlers[cmd] = (handlers[cmd] ?? []).filter(h => h !== fn);
        };
      },
      dispatch(cmd: string, payload: unknown) {
        (handlers[cmd] ?? []).forEach(h => h(payload));
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
    api,
  };

  return {
    ctx,
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
    api,
  };
}

describe('TemporalPlugin', () => {
  let mock: ReturnType<typeof makeMockCtx>;

  beforeEach(() => {
    mock = makeMockCtx();
  });

  it('installs and registers initial state', () => {
    const plugin = TemporalPlugin();
    plugin.install(mock.ctx as never);

    const state = mock.state['temporal'] as TemporalState;
    expect(state).toBeDefined();
    expect(state.snapshots).toEqual([]);
    expect(state.undoStack).toEqual([]);
    expect(state.redoStack).toEqual([]);
    expect(state.current).toBeNull();
  });

  it('has correct plugin metadata', () => {
    const plugin = TemporalPlugin();
    expect(plugin.id).toBe('temporal');
    expect(plugin.name).toBe('Temporal (Time Travel)');
    expect(plugin.version).toBe('0.1.0');
  });

  it('temporal:snapshot captures current grid state', () => {
    mock = makeMockCtx({
      sortModel: [{ colId: 'name', sort: 'asc' }],
      filterModel: { age: { type: 'greaterThan', filter: 30 } },
      quickFilterText: 'hello',
    });

    const plugin = TemporalPlugin();
    plugin.install(mock.ctx as never);

    mock.dispatch('temporal:snapshot', { label: 'My Snapshot' });

    const state = mock.state['temporal'] as TemporalState;
    expect(state.current).not.toBeNull();
    expect(state.current!.label).toBe('My Snapshot');
    expect(state.current!.sortModel).toEqual([{ colId: 'name', sort: 'asc' }]);
    expect(state.current!.filterModel).toEqual({ age: { type: 'greaterThan', filter: 30 } });
  });

  it('temporal:snapshot stores snapshot in snapshots array', () => {
    const plugin = TemporalPlugin();
    plugin.install(mock.ctx as never);

    mock.dispatch('temporal:snapshot', { label: 'Snap 1' });
    mock.dispatch('temporal:snapshot', { label: 'Snap 2' });

    const state = mock.state['temporal'] as TemporalState;
    expect(state.snapshots).toHaveLength(2);
    expect(state.snapshots[0]!.label).toBe('Snap 1');
    expect(state.snapshots[1]!.label).toBe('Snap 2');
  });

  it('temporal:snapshot-taken event is emitted after snapshot', () => {
    const plugin = TemporalPlugin();
    plugin.install(mock.ctx as never);

    mock.dispatch('temporal:snapshot', { label: 'Test' });

    const events = mock.emitted.filter(e => e.event === 'temporal:snapshot-taken');
    expect(events).toHaveLength(1);
    const payload = events[0]!.payload as { snapshot: TemporalSnapshot };
    expect(payload.snapshot.label).toBe('Test');
    expect(payload.snapshot.id).toMatch(/^snap_/);
  });

  it('temporal:snapshot generates unique IDs', () => {
    const plugin = TemporalPlugin();
    plugin.install(mock.ctx as never);

    mock.dispatch('temporal:snapshot', { label: 'A' });
    mock.dispatch('temporal:snapshot', { label: 'B' });

    const state = mock.state['temporal'] as TemporalState;
    expect(state.snapshots[0]!.id).not.toBe(state.snapshots[1]!.id);
  });

  it('temporal:undo restores previous state and calls api', () => {
    mock = makeMockCtx({ sortModel: [{ colId: 'name', sort: 'asc' }] });
    const plugin = TemporalPlugin();
    plugin.install(mock.ctx as never);

    mock.dispatch('temporal:snapshot', { label: 'Before' });
    mock.dispatch('temporal:snapshot', { label: 'After' });

    mock.dispatch('temporal:undo', undefined);

    expect(mock.api.setSortModel).toHaveBeenCalled();
    const state = mock.state['temporal'] as TemporalState;
    expect(state.current!.label).toBe('Before');
  });

  it('temporal:undo does nothing when undo stack is empty', () => {
    const plugin = TemporalPlugin();
    plugin.install(mock.ctx as never);

    // No snapshots taken, undo should be a no-op
    expect(() => {
      mock.dispatch('temporal:undo', undefined);
    }).not.toThrow();

    const state = mock.state['temporal'] as TemporalState;
    expect(state.current).toBeNull();
    expect(mock.api.setSortModel).not.toHaveBeenCalled();
  });

  it('temporal:redo restores undone state', () => {
    const plugin = TemporalPlugin();
    plugin.install(mock.ctx as never);

    mock.dispatch('temporal:snapshot', { label: 'State A' });
    mock.dispatch('temporal:snapshot', { label: 'State B' });

    mock.dispatch('temporal:undo', undefined);
    let state = mock.state['temporal'] as TemporalState;
    expect(state.current!.label).toBe('State A');

    mock.dispatch('temporal:redo', undefined);
    state = mock.state['temporal'] as TemporalState;
    expect(state.current!.label).toBe('State B');
  });

  it('temporal:redo does nothing when redo stack is empty', () => {
    const plugin = TemporalPlugin();
    plugin.install(mock.ctx as never);

    mock.dispatch('temporal:snapshot', { label: 'Only' });

    expect(() => {
      mock.dispatch('temporal:redo', undefined);
    }).not.toThrow();

    const state = mock.state['temporal'] as TemporalState;
    expect(state.redoStack).toHaveLength(0);
  });

  it('undo moves current to redoStack and pops from undoStack', () => {
    const plugin = TemporalPlugin();
    plugin.install(mock.ctx as never);

    mock.dispatch('temporal:snapshot', { label: 'A' });
    mock.dispatch('temporal:snapshot', { label: 'B' });
    mock.dispatch('temporal:snapshot', { label: 'C' });

    // Undo from C -> B
    mock.dispatch('temporal:undo', undefined);
    let state = mock.state['temporal'] as TemporalState;
    expect(state.current!.label).toBe('B');
    expect(state.undoStack).toHaveLength(1);
    expect(state.undoStack[0]!.label).toBe('A');
    expect(state.redoStack).toHaveLength(1);
    expect(state.redoStack[0]!.label).toBe('C');
  });

  it('redo stack is cleared on new snapshot', () => {
    const plugin = TemporalPlugin();
    plugin.install(mock.ctx as never);

    mock.dispatch('temporal:snapshot', { label: 'A' });
    mock.dispatch('temporal:snapshot', { label: 'B' });
    mock.dispatch('temporal:undo', undefined);

    let state = mock.state['temporal'] as TemporalState;
    expect(state.redoStack).toHaveLength(1);

    // Taking a new snapshot should clear redo
    mock.dispatch('temporal:snapshot', { label: 'C' });
    state = mock.state['temporal'] as TemporalState;
    expect(state.redoStack).toHaveLength(0);
  });

  it('temporal:goto restores a specific snapshot by id', () => {
    const plugin = TemporalPlugin();
    plugin.install(mock.ctx as never);

    mock.dispatch('temporal:snapshot', { label: 'First' });
    mock.dispatch('temporal:snapshot', { label: 'Second' });
    mock.dispatch('temporal:snapshot', { label: 'Third' });

    const state = mock.state['temporal'] as TemporalState;
    const firstId = state.snapshots[0]!.id;

    mock.dispatch('temporal:goto', { id: firstId });

    const updatedState = mock.state['temporal'] as TemporalState;
    expect(updatedState.current!.label).toBe('First');
    expect(mock.api.setSortModel).toHaveBeenCalled();

    const restoredEvents = mock.emitted.filter(e => e.event === 'temporal:restored');
    const gotoEvent = restoredEvents.find(
      e => (e.payload as { direction: string }).direction === 'goto',
    );
    expect(gotoEvent).toBeDefined();
  });

  it('temporal:goto does nothing for unknown id', () => {
    const plugin = TemporalPlugin();
    plugin.install(mock.ctx as never);

    mock.dispatch('temporal:snapshot', { label: 'Real' });

    expect(() => {
      mock.dispatch('temporal:goto', { id: 'nonexistent_id' });
    }).not.toThrow();

    expect(mock.api.setSortModel).not.toHaveBeenCalled();
  });

  it('maxHistory limits undo stack size', () => {
    const plugin = TemporalPlugin({ maxHistory: 3 });
    plugin.install(mock.ctx as never);

    // Take 5 snapshots — undoStack can only hold 3
    mock.dispatch('temporal:snapshot', { label: 'S1' });
    mock.dispatch('temporal:snapshot', { label: 'S2' });
    mock.dispatch('temporal:snapshot', { label: 'S3' });
    mock.dispatch('temporal:snapshot', { label: 'S4' });
    mock.dispatch('temporal:snapshot', { label: 'S5' });

    const state = mock.state['temporal'] as TemporalState;
    expect(state.undoStack.length).toBeLessThanOrEqual(3);
  });

  it('temporal:restored event emits with direction=undo on undo', () => {
    const plugin = TemporalPlugin();
    plugin.install(mock.ctx as never);

    mock.dispatch('temporal:snapshot', { label: 'A' });
    mock.dispatch('temporal:snapshot', { label: 'B' });
    mock.dispatch('temporal:undo', undefined);

    const restoredEvents = mock.emitted.filter(e => e.event === 'temporal:restored');
    expect(restoredEvents).toHaveLength(1);
    expect((restoredEvents[0]!.payload as { direction: string }).direction).toBe('undo');
  });

  it('temporal:restored event emits with direction=redo on redo', () => {
    const plugin = TemporalPlugin();
    plugin.install(mock.ctx as never);

    mock.dispatch('temporal:snapshot', { label: 'A' });
    mock.dispatch('temporal:snapshot', { label: 'B' });
    mock.dispatch('temporal:undo', undefined);
    mock.dispatch('temporal:redo', undefined);

    const restoredEvents = mock.emitted.filter(e => e.event === 'temporal:restored');
    expect(restoredEvents).toHaveLength(2);
    expect((restoredEvents[1]!.payload as { direction: string }).direction).toBe('redo');
  });

  it('cleanup removes all handlers', () => {
    const plugin = TemporalPlugin();
    const cleanup = plugin.install(mock.ctx as never);

    cleanup();

    mock.dispatch('temporal:snapshot', { label: 'After cleanup' });
    const state = mock.state['temporal'] as TemporalState;
    expect(state.snapshots).toHaveLength(0);
    expect((mock.handlers['temporal:snapshot'] ?? []).length).toBe(0);
    expect((mock.handlers['temporal:undo'] ?? []).length).toBe(0);
    expect((mock.handlers['temporal:redo'] ?? []).length).toBe(0);
    expect((mock.handlers['temporal:goto'] ?? []).length).toBe(0);
  });
});
