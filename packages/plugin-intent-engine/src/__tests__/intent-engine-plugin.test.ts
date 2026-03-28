import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntentEnginePlugin } from '../intent-engine-plugin';
import type { IntentState, ColumnScore } from '../types';

// Build a minimal mock context
function makeMockCtx() {
  const state: Record<string, unknown> = {};
  const handlers: Record<string, ((p: unknown) => void)[]> = {};
  const eventHandlers: Record<string, ((p: unknown) => void)[]> = {};
  const emitted: Array<{ event: string; payload: unknown }> = [];

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
      api: { getAllColumns: vi.fn(() => []), moveColumn: vi.fn() },
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

describe('IntentEnginePlugin', () => {
  let mock: ReturnType<typeof makeMockCtx>;

  beforeEach(() => {
    mock = makeMockCtx();
  });

  it('installs and registers initial state', () => {
    const plugin = IntentEnginePlugin();
    plugin.install(mock.ctx as never);
    const state = mock.state['intentEngine'] as IntentState;
    expect(state).toBeDefined();
    expect(state.records).toEqual([]);
    expect(state.ranking).toEqual([]);
    expect(state.lastApplied).toBeNull();
  });

  it('has correct plugin metadata', () => {
    const plugin = IntentEnginePlugin();
    expect(plugin.id).toBe('intent-engine');
    expect(plugin.name).toBe('Intent Engine');
    expect(plugin.version).toBe('0.1.0');
  });

  it('intent:record command adds a record and rebuilds ranking', () => {
    const plugin = IntentEnginePlugin();
    plugin.install(mock.ctx as never);

    mock.dispatch('intent:record', { columnId: 'colA', action: 'sort' });

    const state = mock.state['intentEngine'] as IntentState;
    expect(state.records).toHaveLength(1);
    expect(state.records[0]!.columnId).toBe('colA');
    expect(state.records[0]!.action).toBe('sort');
    expect(state.ranking).toHaveLength(1);
    expect(state.ranking[0]!.columnId).toBe('colA');
  });

  it('records timestamp is approximately now', () => {
    const plugin = IntentEnginePlugin();
    plugin.install(mock.ctx as never);

    const before = Date.now();
    mock.dispatch('intent:record', { columnId: 'colA', action: 'filter' });
    const after = Date.now();

    const state = mock.state['intentEngine'] as IntentState;
    expect(state.records[0]!.timestamp).toBeGreaterThanOrEqual(before);
    expect(state.records[0]!.timestamp).toBeLessThanOrEqual(after);
  });

  it('records are capped at maxRecords', () => {
    const plugin = IntentEnginePlugin({ maxRecords: 3 });
    plugin.install(mock.ctx as never);

    mock.dispatch('intent:record', { columnId: 'col1', action: 'sort' });
    mock.dispatch('intent:record', { columnId: 'col2', action: 'sort' });
    mock.dispatch('intent:record', { columnId: 'col3', action: 'sort' });
    mock.dispatch('intent:record', { columnId: 'col4', action: 'sort' });

    const state = mock.state['intentEngine'] as IntentState;
    expect(state.records).toHaveLength(3);
    // oldest (col1) should have been dropped
    expect(state.records.map(r => r.columnId)).not.toContain('col1');
    expect(state.records.map(r => r.columnId)).toContain('col4');
  });

  it('intent:reset clears all records and ranking', () => {
    const plugin = IntentEnginePlugin();
    plugin.install(mock.ctx as never);

    mock.dispatch('intent:record', { columnId: 'colA', action: 'sort' });
    mock.dispatch('intent:record', { columnId: 'colB', action: 'filter' });
    mock.dispatch('intent:reset', undefined);

    const state = mock.state['intentEngine'] as IntentState;
    expect(state.records).toEqual([]);
    expect(state.ranking).toEqual([]);
    expect(state.lastApplied).toBeNull();
  });

  it('intent:ranking-updated event is emitted after each track', () => {
    const plugin = IntentEnginePlugin();
    plugin.install(mock.ctx as never);

    mock.dispatch('intent:record', { columnId: 'colA', action: 'sort' });
    mock.dispatch('intent:record', { columnId: 'colB', action: 'filter' });

    const rankingEvents = mock.emitted.filter(e => e.event === 'intent:ranking-updated');
    expect(rankingEvents).toHaveLength(2);
    const payload = rankingEvents[0]!.payload as { ranking: ColumnScore[] };
    expect(payload.ranking).toBeDefined();
    expect(Array.isArray(payload.ranking)).toBe(true);
  });

  it('multiple columns get ranked — more frequent column ranks higher', () => {
    const plugin = IntentEnginePlugin();
    plugin.install(mock.ctx as never);

    // colA gets 3 records, colB gets 1
    mock.dispatch('intent:record', { columnId: 'colA', action: 'sort' });
    mock.dispatch('intent:record', { columnId: 'colA', action: 'filter' });
    mock.dispatch('intent:record', { columnId: 'colA', action: 'hide' });
    mock.dispatch('intent:record', { columnId: 'colB', action: 'sort' });

    const state = mock.state['intentEngine'] as IntentState;
    expect(state.ranking).toHaveLength(2);
    expect(state.ranking[0]!.columnId).toBe('colA');
    expect(state.ranking[0]!.frequency).toBe(3);
    expect(state.ranking[1]!.columnId).toBe('colB');
    expect(state.ranking[1]!.frequency).toBe(1);
  });

  it('recency decay: a very recent action scores higher than an old one', () => {
    const plugin = IntentEnginePlugin({ halfLifeMs: 1000 });
    plugin.install(mock.ctx as never);

    // Manually insert an old record for colA
    mock.ctx.setState('intentEngine', (prev: unknown) => {
      const state = prev as IntentState;
      return {
        ...state,
        records: [
          { columnId: 'colA', action: 'sort' as const, timestamp: Date.now() - 100_000 },
        ],
      };
    });

    // colB gets a fresh record right now
    mock.dispatch('intent:record', { columnId: 'colB', action: 'sort' });

    const state = mock.state['intentEngine'] as IntentState;
    const colA = state.ranking.find(r => r.columnId === 'colA')!;
    const colB = state.ranking.find(r => r.columnId === 'colB')!;
    // colB is recent so its recency should be higher
    expect(colB.recency).toBeGreaterThan(colA.recency);
  });

  it('autoTrack=false skips event subscriptions — no handlers registered', () => {
    const plugin = IntentEnginePlugin({ autoTrack: false });
    plugin.install(mock.ctx as never);

    // These events should not cause any records to be added
    mock.triggerEvent('sort:changed', { sortModel: [{ colId: 'colA' }] });
    mock.triggerEvent('filter:changed', { filterModel: { colB: {} } });
    mock.triggerEvent('column:visibility-changed', { columnId: 'colC', visible: false });

    const state = mock.state['intentEngine'] as IntentState;
    expect(state.records).toHaveLength(0);
  });

  it('autoTrack=true (default) tracks sort:changed events', () => {
    const plugin = IntentEnginePlugin({ autoTrack: true });
    plugin.install(mock.ctx as never);

    mock.triggerEvent('sort:changed', { sortModel: [{ colId: 'colA' }, { colId: 'colB' }] });

    const state = mock.state['intentEngine'] as IntentState;
    expect(state.records).toHaveLength(2);
    expect(state.records[0]!.action).toBe('sort');
    expect(state.records[1]!.action).toBe('sort');
  });

  it('autoTrack tracks filter:changed events', () => {
    const plugin = IntentEnginePlugin({ autoTrack: true });
    plugin.install(mock.ctx as never);

    mock.triggerEvent('filter:changed', { filterModel: { colA: { type: 'equals' } } });

    const state = mock.state['intentEngine'] as IntentState;
    expect(state.records).toHaveLength(1);
    expect(state.records[0]!.columnId).toBe('colA');
    expect(state.records[0]!.action).toBe('filter');
  });

  it('autoTrack tracks column:visibility-changed hide/show correctly', () => {
    const plugin = IntentEnginePlugin({ autoTrack: true });
    plugin.install(mock.ctx as never);

    mock.triggerEvent('column:visibility-changed', { columnId: 'colA', visible: false });
    mock.triggerEvent('column:visibility-changed', { columnId: 'colA', visible: true });

    const state = mock.state['intentEngine'] as IntentState;
    expect(state.records).toHaveLength(2);
    expect(state.records[0]!.action).toBe('hide');
    expect(state.records[1]!.action).toBe('show');
  });

  it('cleanup removes all command handlers', () => {
    const plugin = IntentEnginePlugin();
    const cleanup = plugin.install(mock.ctx as never);

    cleanup();

    // After cleanup, dispatching commands should do nothing
    mock.dispatch('intent:record', { columnId: 'colA', action: 'sort' });
    const state = mock.state['intentEngine'] as IntentState;
    // records remain empty since handler was removed
    expect(state.records).toHaveLength(0);
  });

  it('cleanup removes auto-track event subscriptions', () => {
    const plugin = IntentEnginePlugin({ autoTrack: true });
    const cleanup = plugin.install(mock.ctx as never);

    cleanup();

    mock.triggerEvent('sort:changed', { sortModel: [{ colId: 'colA' }] });

    const state = mock.state['intentEngine'] as IntentState;
    expect(state.records).toHaveLength(0);
  });

  it('intent:apply-ranking calls moveColumn for each ranked column', () => {
    const plugin = IntentEnginePlugin();
    plugin.install(mock.ctx as never);

    mock.dispatch('intent:record', { columnId: 'colA', action: 'sort' });
    mock.dispatch('intent:record', { columnId: 'colB', action: 'sort' });

    mock.ctx.api.getAllColumns = vi.fn(() => []);
    mock.dispatch('intent:apply-ranking', undefined);

    const state = mock.state['intentEngine'] as IntentState;
    expect(state.lastApplied).not.toBeNull();
    expect(mock.ctx.api.moveColumn).toHaveBeenCalled();
  });
});
