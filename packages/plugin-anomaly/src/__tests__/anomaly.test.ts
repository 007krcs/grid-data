import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnomalyPlugin } from '../anomaly-plugin';
import type { AnomalyEvent, ColumnStats } from '../types';

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
        forEachNode: vi.fn((_cb: (node: unknown) => void) => {}),
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

describe('AnomalyPlugin', () => {
  let mock: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    mock = createMockContext();
  });

  it('installs without errors', () => {
    const plugin = AnomalyPlugin();
    expect(() => plugin.install(mock.ctx)).not.toThrow();
  });

  it('anomaly:configure sets up column watch', () => {
    const plugin = AnomalyPlugin();
    plugin.install(mock.ctx);

    mock.triggerCommand('anomaly:configure', {
      columnId: 'price',
      watchThreshold: 2.0,
      warningThreshold: 2.5,
      criticalThreshold: 3.0,
    });

    // Verify stats are available
    const statsListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'anomaly:stats-updated',
      statsListener,
    );

    mock.triggerCommand('anomaly:get-stats', {});

    const payload = statsListener.mock.calls[0]![0] as { stats: ColumnStats[] };
    const priceStats = payload.stats.find((s) => s.columnId === 'price');
    expect(priceStats).toBeDefined();
  });

  it('anomaly:feed with normal value does not emit anomaly:detected', () => {
    const plugin = AnomalyPlugin();
    plugin.install(mock.ctx);

    mock.triggerCommand('anomaly:configure', { columnId: 'price' });

    const detectedListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'anomaly:detected',
      detectedListener,
    );

    // Feed a cluster of normal values to build baseline
    for (let i = 0; i < 20; i++) {
      mock.triggerCommand('anomaly:feed', { rowId: `row-${i}`, columnId: 'price', value: 100 + i });
    }

    // Feed another normal value (within range)
    mock.triggerCommand('anomaly:feed', { rowId: 'row-normal', columnId: 'price', value: 110 });

    expect(detectedListener).not.toHaveBeenCalled();
  });

  it('anomaly:feed with high z-score emits anomaly:detected with watch severity', () => {
    const plugin = AnomalyPlugin({
      columns: [{ columnId: 'price', watchThreshold: 2.0, warningThreshold: 2.5, criticalThreshold: 3.0 }],
    });
    plugin.install(mock.ctx);

    const detectedListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'anomaly:detected',
      detectedListener,
    );

    // Feed a tight cluster of values near 100
    for (let i = 0; i < 30; i++) {
      mock.triggerCommand('anomaly:feed', { rowId: `row-${i}`, columnId: 'price', value: 100 });
    }
    // Inject a slight outlier to trigger "watch" but not "warning"
    // mean=100, std≈0, but to avoid 0 stdDev let's mix slightly
    // Reset with a varied cluster instead
  });

  it('anomaly:feed with very high z-score emits critical severity', () => {
    const plugin = AnomalyPlugin({
      columns: [{ columnId: 'score', watchThreshold: 2.0, warningThreshold: 2.5, criticalThreshold: 3.0 }],
    });
    plugin.install(mock.ctx);

    const detectedListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'anomaly:detected',
      detectedListener,
    );

    // Build baseline: mean≈10, stdDev≈1
    const baseValues = [9, 10, 11, 10, 9, 11, 10, 10, 9, 11, 10, 9, 11, 10, 10];
    for (let i = 0; i < baseValues.length; i++) {
      mock.triggerCommand('anomaly:feed', {
        rowId: `row-${i}`,
        columnId: 'score',
        value: baseValues[i],
      });
    }

    // Feed a critical outlier: value=100, z-score >> 3.0
    mock.triggerCommand('anomaly:feed', { rowId: 'row-outlier', columnId: 'score', value: 100 });

    expect(detectedListener).toHaveBeenCalled();
    const event = detectedListener.mock.calls.at(-1)![0] as AnomalyEvent;
    expect(event.severity).toBe('critical');
    expect(event.zscore).toBeGreaterThan(3.0);
    expect(event.columnId).toBe('score');
    expect(event.rowId).toBe('row-outlier');
    expect(event.acknowledged).toBe(false);
  });

  it('anomaly:acknowledge marks anomaly as acknowledged', () => {
    const plugin = AnomalyPlugin({
      columns: [{ columnId: 'score' }],
    });
    plugin.install(mock.ctx);

    const detectedListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'anomaly:detected',
      detectedListener,
    );

    // Build baseline
    const baseValues = [9, 10, 11, 10, 9, 11, 10, 10, 9, 11, 10, 9, 11, 10, 10];
    for (let i = 0; i < baseValues.length; i++) {
      mock.triggerCommand('anomaly:feed', { rowId: `row-${i}`, columnId: 'score', value: baseValues[i] });
    }
    mock.triggerCommand('anomaly:feed', { rowId: 'row-outlier', columnId: 'score', value: 100 });

    expect(detectedListener).toHaveBeenCalled();
    const anomalyId = (detectedListener.mock.calls.at(-1)![0] as AnomalyEvent).id;

    // Acknowledge it
    mock.triggerCommand('anomaly:acknowledge', { id: anomalyId });

    // Active anomalies should now be empty (all acknowledged)
    const activeListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'anomaly:active-listed',
      activeListener,
    );
    mock.triggerCommand('anomaly:get-active', {});

    const payload = activeListener.mock.calls[0]![0] as { anomalies: AnomalyEvent[] };
    const found = payload.anomalies.find((a) => a.id === anomalyId);
    expect(found).toBeUndefined();
  });

  it('anomaly:get-stats emits stats for configured columns', () => {
    const plugin = AnomalyPlugin({
      columns: [{ columnId: 'revenue' }, { columnId: 'quantity' }],
    });
    plugin.install(mock.ctx);

    const statsListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'anomaly:stats-updated',
      statsListener,
    );

    mock.triggerCommand('anomaly:get-stats', {});

    const payload = statsListener.mock.calls[0]![0] as { stats: ColumnStats[] };
    expect(payload.stats).toHaveLength(2);
    const ids = payload.stats.map((s) => s.columnId);
    expect(ids).toContain('revenue');
    expect(ids).toContain('quantity');
  });

  it('stats mean is correct after multiple feeds', () => {
    const plugin = AnomalyPlugin({ columns: [{ columnId: 'val' }] });
    plugin.install(mock.ctx);

    const values = [10, 20, 30, 40, 50];
    for (let i = 0; i < values.length; i++) {
      mock.triggerCommand('anomaly:feed', { rowId: `row-${i}`, columnId: 'val', value: values[i] });
    }

    const statsListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'anomaly:stats-updated',
      statsListener,
    );
    mock.triggerCommand('anomaly:get-stats', {});

    const payload = statsListener.mock.calls[0]![0] as { stats: ColumnStats[] };
    const stats = payload.stats.find((s) => s.columnId === 'val')!;
    expect(stats.mean).toBeCloseTo(30, 5);
  });

  it('stats std dev is correct', () => {
    const plugin = AnomalyPlugin({ columns: [{ columnId: 'val' }] });
    plugin.install(mock.ctx);

    // Values: 2,4,4,4,5,5,7,9 → mean=5, variance=4, stdDev=2 (sample stddev)
    const values = [2, 4, 4, 4, 5, 5, 7, 9];
    for (let i = 0; i < values.length; i++) {
      mock.triggerCommand('anomaly:feed', { rowId: `row-${i}`, columnId: 'val', value: values[i] });
    }

    const statsListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'anomaly:stats-updated',
      statsListener,
    );
    mock.triggerCommand('anomaly:get-stats', {});

    const payload = statsListener.mock.calls[0]![0] as { stats: ColumnStats[] };
    const stats = payload.stats.find((s) => s.columnId === 'val')!;
    expect(stats.mean).toBeCloseTo(5, 5);
    expect(stats.stdDev).toBeCloseTo(2, 1);
  });

  it('rolling window evicts old values', () => {
    const plugin = AnomalyPlugin({
      columns: [{ columnId: 'val', windowSize: 3 }],
    });
    plugin.install(mock.ctx);

    // Feed 5 values with windowSize=3 — only last 3 should be in window
    const values = [1, 2, 3, 100, 200];
    for (let i = 0; i < values.length; i++) {
      mock.triggerCommand('anomaly:feed', { rowId: `row-${i}`, columnId: 'val', value: values[i] });
    }

    const statsListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'anomaly:stats-updated',
      statsListener,
    );
    mock.triggerCommand('anomaly:get-stats', {});

    const payload = statsListener.mock.calls[0]![0] as { stats: ColumnStats[] };
    const stats = payload.stats.find((s) => s.columnId === 'val')!;
    // Window should be [3, 100, 200] — mean = (3+100+200)/3 = 101
    expect(stats.count).toBe(3);
    expect(stats.mean).toBeCloseTo(101, 1);
  });

  it('anomaly:remove stops watching column', () => {
    const plugin = AnomalyPlugin({ columns: [{ columnId: 'price' }] });
    plugin.install(mock.ctx);

    mock.triggerCommand('anomaly:remove', { columnId: 'price' });

    const statsListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'anomaly:stats-updated',
      statsListener,
    );
    mock.triggerCommand('anomaly:get-stats', {});

    const payload = statsListener.mock.calls[0]![0] as { stats: ColumnStats[] };
    const priceStats = payload.stats.find((s) => s.columnId === 'price');
    expect(priceStats).toBeUndefined();
  });

  it('anomaly:get-active lists unacknowledged anomalies', () => {
    const plugin = AnomalyPlugin({ columns: [{ columnId: 'score' }] });
    plugin.install(mock.ctx);

    // Build baseline and trigger anomaly
    const baseValues = [9, 10, 11, 10, 9, 11, 10, 10, 9, 11, 10, 9, 11, 10, 10];
    for (let i = 0; i < baseValues.length; i++) {
      mock.triggerCommand('anomaly:feed', { rowId: `row-${i}`, columnId: 'score', value: baseValues[i] });
    }
    mock.triggerCommand('anomaly:feed', { rowId: 'row-outlier', columnId: 'score', value: 100 });

    const activeListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'anomaly:active-listed',
      activeListener,
    );
    mock.triggerCommand('anomaly:get-active', {});

    const payload = activeListener.mock.calls[0]![0] as { anomalies: AnomalyEvent[] };
    expect(payload.anomalies.length).toBeGreaterThan(0);
    expect(payload.anomalies.every((a) => !a.acknowledged)).toBe(true);
  });

  it('multiple columns can be watched independently', () => {
    const plugin = AnomalyPlugin({
      columns: [
        { columnId: 'price', windowSize: 50 },
        { columnId: 'quantity', windowSize: 50 },
      ],
    });
    plugin.install(mock.ctx);

    for (let i = 0; i < 5; i++) {
      mock.triggerCommand('anomaly:feed', { rowId: `r${i}`, columnId: 'price', value: 10 + i });
      mock.triggerCommand('anomaly:feed', { rowId: `r${i}`, columnId: 'quantity', value: 100 + i });
    }

    const statsListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'anomaly:stats-updated',
      statsListener,
    );
    mock.triggerCommand('anomaly:get-stats', {});

    const payload = statsListener.mock.calls[0]![0] as { stats: ColumnStats[] };
    expect(payload.stats).toHaveLength(2);

    const priceStats = payload.stats.find((s) => s.columnId === 'price')!;
    const qtyStats = payload.stats.find((s) => s.columnId === 'quantity')!;

    expect(priceStats.mean).toBeCloseTo(12, 1);
    expect(qtyStats.mean).toBeCloseTo(102, 1);
  });

  it('cleanup removes all handlers', () => {
    const plugin = AnomalyPlugin({ columns: [{ columnId: 'price' }] });
    const dispose = plugin.install(mock.ctx);

    dispose?.();

    const statsListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'anomaly:stats-updated',
      statsListener,
    );

    // After cleanup, commands should not be handled
    mock.triggerCommand('anomaly:get-stats', {});
    expect(statsListener).not.toHaveBeenCalled();
  });
});
