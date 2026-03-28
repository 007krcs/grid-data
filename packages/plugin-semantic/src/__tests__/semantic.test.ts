import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SemanticPlugin, detectSemanticType } from '../semantic-plugin';
import type { ColumnSemantics, SemanticAnalysis } from '../types';

function createMockContext() {
  const handlers = new Map<string, (payload: unknown) => void>();
  const eventListeners = new Map<string, Array<(payload: unknown) => void>>();
  const ctx = {
    api: {
      getSortModel: vi.fn().mockReturnValue([]),
      setSortModel: vi.fn(),
      getFilterModel: vi.fn().mockReturnValue({}),
      setFilterModel: vi.fn(),
      setQuickFilter: vi.fn(),
      getRowNode: vi.fn(),
      forEachNode: vi.fn(),
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
  } as unknown as import('@gridstorm/core').PluginContext;
  return {
    ctx,
    triggerCommand: (type: string, payload: unknown) => handlers.get(type)?.(payload),
    triggerEvent: (event: string, payload: unknown) => {
      for (const l of eventListeners.get(event) ?? []) l(payload);
    },
  };
}

describe('SemanticPlugin', () => {
  let mock: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    mock = createMockContext();
  });

  it('installs without errors', () => {
    const plugin = SemanticPlugin();
    expect(() => plugin.install(mock.ctx)).not.toThrow();
  });

  it('detectSemanticType identifies emails correctly', () => {
    const values = ['user@example.com', 'admin@test.org', 'foo.bar@baz.io', 'hello@world.co.uk'];
    const results = detectSemanticType(values, 200, 0.6);
    const emailResult = results.find((r) => r.type === 'email');
    expect(emailResult).toBeDefined();
    expect(emailResult!.confidence).toBeGreaterThanOrEqual(0.6);
  });

  it('detectSemanticType identifies URLs correctly', () => {
    const values = ['https://example.com', 'http://test.org/path', 'https://foo.bar/baz?q=1'];
    const results = detectSemanticType(values, 200, 0.5);
    const urlResult = results.find((r) => r.type === 'url');
    expect(urlResult).toBeDefined();
    expect(urlResult!.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('detectSemanticType identifies integers', () => {
    const values = ['1', '42', '100', '999', '0', '-5'];
    const results = detectSemanticType(values, 200, 0.5);
    const intResult = results.find((r) => r.type === 'integer');
    expect(intResult).toBeDefined();
    expect(intResult!.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('detectSemanticType identifies decimals', () => {
    const values = ['1.5', '42.0', '3.14', '0.99', '-2.7'];
    const results = detectSemanticType(values, 200, 0.5);
    const decimalResult = results.find((r) => r.type === 'decimal');
    expect(decimalResult).toBeDefined();
    expect(decimalResult!.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('detectSemanticType identifies phone numbers', () => {
    const values = ['555-123-4567', '(555) 987-6543', '5559876543', '555.456.7890'];
    const results = detectSemanticType(values, 200, 0.5);
    const phoneResult = results.find((r) => r.type === 'phone');
    expect(phoneResult).toBeDefined();
    expect(phoneResult!.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('detectSemanticType identifies dates', () => {
    const values = ['2024-01-15', '2023-12-31', '2022-06-01', '01/15/2024', '12/31/2023'];
    const results = detectSemanticType(values, 200, 0.5);
    const dateResult = results.find((r) => r.type === 'date');
    expect(dateResult).toBeDefined();
    expect(dateResult!.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('detectSemanticType identifies booleans', () => {
    const values = ['true', 'false', 'yes', 'no', 'True', 'False'];
    const results = detectSemanticType(values, 200, 0.5);
    const boolResult = results.find((r) => r.type === 'boolean');
    expect(boolResult).toBeDefined();
    expect(boolResult!.confidence).toBeGreaterThanOrEqual(0.5);
  });

  it('detectSemanticType returns confidence scores sorted descending', () => {
    const values = ['1', '2', '3', '42', '100'];
    const results = detectSemanticType(values, 200, 0.0);
    for (let i = 1; i < results.length; i++) {
      expect(results[i]!.confidence).toBeLessThanOrEqual(results[i - 1]!.confidence);
    }
  });

  it('low confidence results below minConfidence are filtered', () => {
    // Mix of different types — no single type will dominate at 0.99 threshold
    const values = ['user@example.com', '42', 'hello world some longer text', 'true', '2024-01-01'];
    const results = detectSemanticType(values, 200, 0.99);
    // unknown always passes (confidence 1.0), email with 1/5 = 0.2 confidence should not appear
    const emailResult = results.find((r) => r.type === 'email');
    expect(emailResult).toBeUndefined();
  });

  it('semantic:analyze emits semantic:column-typed events', () => {
    const colTypedListener = vi.fn();
    const api = mock.ctx.api as unknown as {
      getAllColumns: ReturnType<typeof vi.fn>;
      forEachNode: ReturnType<typeof vi.fn>;
    };
    api.getAllColumns.mockReturnValue([{ field: 'email' }]);
    api.forEachNode.mockImplementation((cb: (node: unknown) => void) => {
      ['user@example.com', 'admin@test.org', 'foo@bar.io'].forEach((v) =>
        cb({ data: { email: v } }),
      );
    });

    const plugin = SemanticPlugin({ autoAnalyze: false });
    plugin.install(mock.ctx);

    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'semantic:column-typed',
      colTypedListener,
    );

    mock.triggerCommand('semantic:analyze', {});
    expect(colTypedListener).toHaveBeenCalled();
    const result = colTypedListener.mock.calls[0]![0] as ColumnSemantics;
    expect(result.columnId).toBe('email');
  });

  it('semantic:get-analysis emits analysis complete event', () => {
    const analysisListener = vi.fn();
    const api = mock.ctx.api as unknown as {
      getAllColumns: ReturnType<typeof vi.fn>;
      forEachNode: ReturnType<typeof vi.fn>;
    };
    api.getAllColumns.mockReturnValue([{ field: 'score' }]);
    api.forEachNode.mockImplementation((cb: (node: unknown) => void) => {
      [1, 2, 3].forEach((v) => cb({ data: { score: v } }));
    });

    const plugin = SemanticPlugin({ autoAnalyze: false });
    plugin.install(mock.ctx);

    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'semantic:analysis-complete',
      analysisListener,
    );

    mock.triggerCommand('semantic:get-analysis', {});
    expect(analysisListener).toHaveBeenCalled();
    const analysis = analysisListener.mock.calls[0]![0] as SemanticAnalysis;
    expect(analysis.columns).toBeDefined();
    expect(analysis.relationships).toBeDefined();
    expect(analysis.analyzedAt).toBeGreaterThan(0);
  });
});
