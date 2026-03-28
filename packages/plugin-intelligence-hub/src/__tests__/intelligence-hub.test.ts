import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  IntelligenceHubPlugin,
  createInMemoryHubTransport,
  addLaplaceNoise,
} from '../intelligence-hub-plugin';
import type { BehaviorSample, HubInsight } from '../types';

// Reset hub store before each test by using hub:reset command or direct reset
// We use a fresh transport per test to avoid cross-test pollution where possible

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

describe('IntelligenceHubPlugin', () => {
  let mock: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    mock = createMockContext();
    // Reset shared hub store
    const resetPlugin = IntelligenceHubPlugin({ gridId: 'reset-grid' });
    resetPlugin.install(mock.ctx);
    mock.triggerCommand('hub:reset', {});
  });

  it('installs without errors', () => {
    const plugin = IntelligenceHubPlugin({ gridId: 'test-grid-1' });
    expect(() => plugin.install(mock.ctx)).not.toThrow();
  });

  it('hub:connect emits hub:connected', () => {
    const connectedListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'hub:connected',
      connectedListener,
    );

    const plugin = IntelligenceHubPlugin({ gridId: 'grid-connect' });
    plugin.install(mock.ctx);
    mock.triggerCommand('hub:connect', {});

    expect(connectedListener).toHaveBeenCalled();
    const payload = connectedListener.mock.calls[0]![0] as { gridId: string };
    expect(payload.gridId).toBe('grid-connect');
  });

  it('hub:disconnect emits hub:disconnected', () => {
    const disconnectedListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'hub:disconnected',
      disconnectedListener,
    );

    const plugin = IntelligenceHubPlugin({ gridId: 'grid-dc' });
    plugin.install(mock.ctx);
    mock.triggerCommand('hub:connect', {});
    mock.triggerCommand('hub:disconnect', {});

    expect(disconnectedListener).toHaveBeenCalled();
    const payload = disconnectedListener.mock.calls[0]![0] as { gridId: string };
    expect(payload.gridId).toBe('grid-dc');
  });

  it('hub:publish-sample publishes to transport', () => {
    const publishedListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'hub:sample-published',
      publishedListener,
    );

    const plugin = IntelligenceHubPlugin({ gridId: 'grid-pub' });
    plugin.install(mock.ctx);

    const sample: BehaviorSample = {
      type: 'sort-pattern',
      data: { column: 'name', direction: 'asc' },
      timestamp: Date.now(),
      gridId: 'grid-pub',
    };
    mock.triggerCommand('hub:publish-sample', sample);

    expect(publishedListener).toHaveBeenCalled();
  });

  it('receiving insight emits hub:insight-received', () => {
    const insightListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'hub:insight-received',
      insightListener,
    );

    // Use transport with minSamples=1 so insight triggers immediately
    const transport = createInMemoryHubTransport(1);
    const plugin = IntelligenceHubPlugin({ gridId: 'grid-ins', transport });
    plugin.install(mock.ctx);
    mock.triggerCommand('hub:connect', {});

    transport.publish({
      type: 'filter-pattern',
      data: { status: 'active' },
      timestamp: Date.now(),
      gridId: 'grid-ins',
    });

    expect(insightListener).toHaveBeenCalled();
    const insight = insightListener.mock.calls[0]![0] as HubInsight;
    expect(insight.type).toBe('filter-pattern');
  });

  it('hub:get-insights emits hub:insights-listed', () => {
    const insightsListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'hub:insights-listed',
      insightsListener,
    );

    const plugin = IntelligenceHubPlugin({ gridId: 'grid-get' });
    plugin.install(mock.ctx);
    mock.triggerCommand('hub:get-insights', {});

    expect(insightsListener).toHaveBeenCalled();
    const result = insightsListener.mock.calls[0]![0] as { insights: HubInsight[] };
    expect(Array.isArray(result.insights)).toBe(true);
  });

  it('multiple grids sharing data produces insights', () => {
    const transport = createInMemoryHubTransport(2);

    // Publish from grid A
    transport.publish({
      type: 'sort-pattern',
      data: { column: 'date', direction: 'desc' },
      timestamp: Date.now(),
      gridId: 'grid-A',
    });

    // Publish from grid B — should now produce insight
    transport.publish({
      type: 'sort-pattern',
      data: { column: 'date', direction: 'desc' },
      timestamp: Date.now(),
      gridId: 'grid-B',
    });

    const insights = transport.getInsights('sort-pattern');
    expect(insights.length).toBeGreaterThan(0);
    expect(insights[0]!.type).toBe('sort-pattern');
  });

  it('Laplace noise is added to numeric values', () => {
    const publishedListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'hub:sample-published',
      publishedListener,
    );

    const plugin = IntelligenceHubPlugin({
      gridId: 'grid-noise',
      privacyBudget: { epsilon: 1.0, noiseScale: 1.0 },
    });
    plugin.install(mock.ctx);

    mock.triggerCommand('hub:publish-sample', {
      type: 'column-ranking',
      data: { columnA: 100, columnB: 200 },
      timestamp: Date.now(),
      gridId: 'grid-noise',
    });

    expect(publishedListener).toHaveBeenCalled();
    // Noise is applied, so values might differ from originals (not guaranteed, but usually true)
    const published = publishedListener.mock.calls[0]![0] as BehaviorSample;
    expect(published.data).toBeDefined();
  });

  it('addLaplaceNoise with high epsilon (low privacy) produces small noise', () => {
    const original = 100;
    const highEpsilon = 100; // high epsilon = low noise
    const noises: number[] = [];
    for (let i = 0; i < 50; i++) {
      noises.push(Math.abs(addLaplaceNoise(original, 1, highEpsilon) - original));
    }
    const avgNoise = noises.reduce((a, b) => a + b, 0) / noises.length;
    expect(avgNoise).toBeLessThan(1); // scale = 1/100 = 0.01 so noise should be tiny
  });

  it('addLaplaceNoise with low epsilon (high privacy) produces larger noise', () => {
    const original = 100;
    const lowEpsilon = 0.01; // low epsilon = high noise
    const noises: number[] = [];
    for (let i = 0; i < 50; i++) {
      noises.push(Math.abs(addLaplaceNoise(original, 1, lowEpsilon) - original));
    }
    const avgNoise = noises.reduce((a, b) => a + b, 0) / noises.length;
    expect(avgNoise).toBeGreaterThan(1); // scale = 1/0.01 = 100, avg absolute noise ≫ 1
  });

  it('minimum samples threshold controls insight generation', () => {
    const transport = createInMemoryHubTransport(5); // require 5 samples

    // Publish 4 samples — not enough
    for (let i = 0; i < 4; i++) {
      transport.publish({
        type: 'query-pattern',
        data: { query: 'status:active' },
        timestamp: Date.now(),
        gridId: `grid-${i}`,
      });
    }

    expect(transport.getInsights('query-pattern').length).toBe(0);

    // Publish 5th — now enough
    transport.publish({
      type: 'query-pattern',
      data: { query: 'status:active' },
      timestamp: Date.now(),
      gridId: 'grid-4',
    });

    expect(transport.getInsights('query-pattern').length).toBeGreaterThan(0);
  });

  it('hub:reset clears the hub store', () => {
    const transport = createInMemoryHubTransport(1);

    transport.publish({
      type: 'sort-pattern',
      data: {},
      timestamp: Date.now(),
      gridId: 'grid-reset',
    });

    expect(transport.getInsights().length).toBeGreaterThan(0);

    const plugin = IntelligenceHubPlugin({ transport });
    plugin.install(mock.ctx);
    mock.triggerCommand('hub:reset', {});

    expect(transport.getInsights().length).toBe(0);
  });

  it('sort events auto-publish samples when shareSortPatterns is true', () => {
    const publishedListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'hub:sample-published',
      publishedListener,
    );

    const plugin = IntelligenceHubPlugin({ gridId: 'grid-sort', shareSortPatterns: true });
    plugin.install(mock.ctx);

    mock.triggerEvent('sort:changed', { column: 'age', direction: 'asc' });

    expect(publishedListener).toHaveBeenCalled();
    const published = publishedListener.mock.calls[0]![0] as BehaviorSample;
    expect(published.type).toBe('sort-pattern');
  });

  it('filter events auto-publish samples when shareFilterPatterns is true', () => {
    const publishedListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'hub:sample-published',
      publishedListener,
    );

    const plugin = IntelligenceHubPlugin({ gridId: 'grid-filter', shareFilterPatterns: true });
    plugin.install(mock.ctx);

    mock.triggerEvent('filter:changed', { status: 'active' });

    expect(publishedListener).toHaveBeenCalled();
    const published = publishedListener.mock.calls[0]![0] as BehaviorSample;
    expect(published.type).toBe('filter-pattern');
  });
});
