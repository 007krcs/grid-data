import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NlQueryPlugin, parseQuery } from '../nl-query-plugin';
import type { QueryHistoryEntry } from '../types';

function createMockContext() {
  const handlers = new Map<string, (payload: unknown) => void>();
  const eventListeners = new Map<string, Array<(payload: unknown) => void>>();
  return {
    ctx: {
      api: {
        getSortModel: vi.fn().mockReturnValue([]),
        setSortModel: vi.fn(),
        getFilterModel: vi.fn().mockReturnValue({}),
        setFilterModel: vi.fn(),
        setQuickFilter: vi.fn(),
        getRowNode: vi.fn(),
        forEachNode: vi.fn((cb: (node: unknown) => void) => {}),
        getAllColumns: vi.fn().mockReturnValue([]),
        getState: vi.fn().mockReturnValue({ quickFilterText: '', pluginState: {} }),
        getSelectedRows: vi.fn().mockReturnValue([]),
        setColumnVisible: vi.fn(),
        moveColumn: vi.fn(),
        dispatchCommand: vi.fn(),
      } as unknown as import('@gridstorm/core').GridApi,
      commandBus: {
        registerHandler: vi.fn((type: string, handler: (p: unknown) => void) => {
          handlers.set(type, handler);
          return () => handlers.delete(type);
        }),
        dispatch: vi.fn((type: string, payload: unknown) => {
          handlers.get(type)?.(payload);
        }),
      } as unknown,
      eventBus: {
        on: vi.fn((event: string, listener: (p: unknown) => void) => {
          if (!eventListeners.has(event)) eventListeners.set(event, []);
          eventListeners.get(event)!.push(listener);
          return () => {
            const arr = eventListeners.get(event) ?? [];
            const idx = arr.indexOf(listener);
            if (idx >= 0) arr.splice(idx, 1);
          };
        }),
        emit: vi.fn((event: string, payload: unknown) => {
          for (const l of eventListeners.get(event) ?? []) l(payload);
        }),
      } as unknown,
      registerState: vi.fn(),
      getState: vi.fn().mockReturnValue(undefined),
      setState: vi.fn(),
      registerCellRenderer: vi.fn(),
      registerCellEditor: vi.fn(),
    } as unknown as import('@gridstorm/core').PluginContext,
    triggerCommand: (type: string, payload: unknown) => handlers.get(type)?.(payload),
    triggerEvent: (event: string, payload: unknown) => {
      for (const l of eventListeners.get(event) ?? []) l(payload);
    },
  };
}

// ─── parseQuery tests ───

describe('parseQuery', () => {
  it('parses "sort by name" → sort asc operation', () => {
    const result = parseQuery('sort by name', {}, []);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toEqual({ type: 'sort', columnId: 'name', direction: 'asc' });
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.unrecognized).toHaveLength(0);
  });

  it('parses "sort age desc" → sort desc operation', () => {
    const result = parseQuery('sort age desc', {}, []);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toEqual({ type: 'sort', columnId: 'age', direction: 'desc' });
  });

  it('parses "sort name ascending" → sort asc operation', () => {
    const result = parseQuery('sort name ascending', {}, []);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toEqual({ type: 'sort', columnId: 'name', direction: 'asc' });
  });

  it('parses "filter status equals active" → filter equals operation', () => {
    const result = parseQuery('filter status equals active', {}, []);
    expect(result.operations).toHaveLength(1);
    const op = result.operations[0] as { type: string; columnId: string; operator: string; value: unknown };
    expect(op.type).toBe('filter');
    expect(op.columnId).toBe('status');
    expect(op.operator).toBe('equals');
    expect(op.value).toBe('active');
  });

  it('parses "where revenue greater than 1000" → filter greaterThan', () => {
    const result = parseQuery('where revenue greater than 1000', {}, []);
    expect(result.operations).toHaveLength(1);
    const op = result.operations[0] as { type: string; columnId: string; operator: string; value: unknown };
    expect(op.type).toBe('filter');
    expect(op.columnId).toBe('revenue');
    expect(op.operator).toBe('greaterThan');
    expect(op.value).toBe(1000);
  });

  it('parses "filter price less than 50" → filter lessThan', () => {
    const result = parseQuery('filter price less than 50', {}, []);
    expect(result.operations).toHaveLength(1);
    const op = result.operations[0] as { type: string; columnId: string; operator: string; value: unknown };
    expect(op.type).toBe('filter');
    expect(op.columnId).toBe('price');
    expect(op.operator).toBe('lessThan');
    expect(op.value).toBe(50);
  });

  it('parses "filter name contains smith" → filter contains', () => {
    const result = parseQuery('filter name contains smith', {}, []);
    expect(result.operations).toHaveLength(1);
    const op = result.operations[0] as { type: string; operator: string };
    expect(op.type).toBe('filter');
    expect(op.operator).toBe('contains');
  });

  it('parses "filter name starts with jo" → filter startsWith', () => {
    const result = parseQuery('filter name starts with jo', {}, []);
    expect(result.operations).toHaveLength(1);
    const op = result.operations[0] as { type: string; operator: string };
    expect(op.type).toBe('filter');
    expect(op.operator).toBe('startsWith');
  });

  it('parses "show alice" → quickFilter operation', () => {
    const result = parseQuery('show alice', {}, []);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toEqual({ type: 'quickFilter', text: 'alice' });
  });

  it('parses "search foo bar" → quickFilter operation', () => {
    const result = parseQuery('search foo bar', {}, []);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toEqual({ type: 'quickFilter', text: 'foo bar' });
  });

  it('parses "group by country" → group operation', () => {
    const result = parseQuery('group by country', {}, []);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toEqual({ type: 'group', columnId: 'country' });
  });

  it('parses "clear filters" → clearFilters operation', () => {
    const result = parseQuery('clear filters', {}, []);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toEqual({ type: 'clearFilters' });
  });

  it('parses "reset sort" → clearSort operation', () => {
    const result = parseQuery('reset sort', {}, []);
    expect(result.operations).toHaveLength(1);
    expect(result.operations[0]).toEqual({ type: 'clearSort' });
  });

  it('resolves column aliases in query parsing', () => {
    const aliases = { revenue: 'annual_revenue_usd' };
    const result = parseQuery('sort by revenue', aliases, []);
    expect(result.operations).toHaveLength(1);
    const op = result.operations[0] as { columnId: string };
    expect(op.columnId).toBe('annual_revenue_usd');
  });

  it('unrecognized query returns empty operations and adds to unrecognized', () => {
    const result = parseQuery('xyzzy gobbledygook', {}, []);
    expect(result.operations).toHaveLength(0);
    expect(result.unrecognized).toHaveLength(1);
    expect(result.confidence).toBe(0.0);
  });

  it('original query is preserved in ParsedQuery', () => {
    const result = parseQuery('Sort By Name', {}, []);
    expect(result.original).toBe('Sort By Name');
  });
});

// ─── Plugin integration tests ───

describe('NlQueryPlugin', () => {
  let mock: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    mock = createMockContext();
  });

  it('installs without errors', () => {
    const plugin = NlQueryPlugin();
    expect(() => plugin.install(mock.ctx)).not.toThrow();
  });

  it('nlquery:execute calls api.setSortModel for sort op', () => {
    const plugin = NlQueryPlugin();
    plugin.install(mock.ctx);

    mock.triggerCommand('nlquery:execute', { query: 'sort by name' });

    expect(mock.ctx.api.setSortModel).toHaveBeenCalledWith([
      { colId: 'name', sort: 'asc' },
    ]);
  });

  it('nlquery:execute calls api.setFilterModel for filter op', () => {
    const plugin = NlQueryPlugin();
    plugin.install(mock.ctx);

    mock.triggerCommand('nlquery:execute', { query: 'filter status equals active' });

    expect(mock.ctx.api.setFilterModel).toHaveBeenCalledWith(
      expect.objectContaining({
        status: expect.objectContaining({ type: 'equals', filter: 'active' }),
      }),
    );
  });

  it('nlquery:execute calls api.setQuickFilter for quickFilter op', () => {
    const plugin = NlQueryPlugin();
    plugin.install(mock.ctx);

    mock.triggerCommand('nlquery:execute', { query: 'show alice' });

    expect(mock.ctx.api.setQuickFilter).toHaveBeenCalledWith('alice');
  });

  it('nlquery:execute emits nlquery:applied event', () => {
    const plugin = NlQueryPlugin();
    plugin.install(mock.ctx);

    const appliedListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'nlquery:applied',
      appliedListener,
    );

    mock.triggerCommand('nlquery:execute', { query: 'sort by age' });

    expect(appliedListener).toHaveBeenCalledWith(
      expect.objectContaining({ operationsApplied: 1 }),
    );
  });

  it('unknown query emits nlquery:failed', () => {
    const plugin = NlQueryPlugin();
    plugin.install(mock.ctx);

    const failedListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'nlquery:failed',
      failedListener,
    );

    mock.triggerCommand('nlquery:execute', { query: 'xyzzy gobbledygook' });

    expect(failedListener).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'xyzzy gobbledygook' }),
    );
  });

  it('nlquery:history emits history list', () => {
    const plugin = NlQueryPlugin();
    plugin.install(mock.ctx);

    mock.triggerCommand('nlquery:execute', { query: 'sort by name' });
    mock.triggerCommand('nlquery:execute', { query: 'show alice' });

    const historyListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'nlquery:history-listed',
      historyListener,
    );

    mock.triggerCommand('nlquery:history', {});

    expect(historyListener).toHaveBeenCalledOnce();
    const payload = historyListener.mock.calls[0]![0] as { history: QueryHistoryEntry[] };
    expect(payload.history).toHaveLength(2);
  });

  it('history is capped at maxHistory', () => {
    const plugin = NlQueryPlugin({ maxHistory: 3 });
    plugin.install(mock.ctx);

    for (let i = 0; i < 5; i++) {
      mock.triggerCommand('nlquery:execute', { query: `sort by col${i}` });
    }

    const historyListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'nlquery:history-listed',
      historyListener,
    );

    mock.triggerCommand('nlquery:history', {});

    const payload = historyListener.mock.calls[0]![0] as { history: QueryHistoryEntry[] };
    expect(payload.history).toHaveLength(3);
  });

  it('nlquery:clear calls setFilterModel({}) and setSortModel([])', () => {
    const plugin = NlQueryPlugin();
    plugin.install(mock.ctx);

    mock.triggerCommand('nlquery:clear', {});

    expect(mock.ctx.api.setFilterModel).toHaveBeenCalledWith({});
    expect(mock.ctx.api.setSortModel).toHaveBeenCalledWith([]);
  });

  it('cleanup unregisters all handlers', () => {
    const plugin = NlQueryPlugin();
    const dispose = plugin.install(mock.ctx);

    dispose?.();

    // After cleanup, commands should no longer be handled
    mock.triggerCommand('nlquery:execute', { query: 'sort by name' });
    expect(mock.ctx.api.setSortModel).not.toHaveBeenCalled();
  });
});
