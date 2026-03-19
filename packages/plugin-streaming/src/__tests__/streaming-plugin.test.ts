import { describe, it, expect, vi, afterEach } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { StreamingPlugin } from '../streaming-plugin';
import type { StreamingState, StreamAdapter, StreamHandlers } from '../streaming-plugin';

/** Create a mock adapter that captures the stream handlers for manual data injection. */
function createMockAdapter(): { adapter: StreamAdapter; getHandlers: () => StreamHandlers | undefined } {
  let handlers: StreamHandlers | undefined;
  return {
    adapter: {
      connect(h: StreamHandlers) {
        handlers = h;
      },
      disconnect() {
        handlers = undefined;
      },
    },
    getHandlers() {
      return handlers;
    },
  };
}

function makeGrid(pluginOptions = {}) {
  return createGrid({
    columns: [
      { field: 'symbol' },
      { field: 'price' },
      { field: 'volume' },
    ],
    rowData: [
      { symbol: 'AAPL', price: 150, volume: 1000 },
      { symbol: 'GOOG', price: 2800, volume: 500 },
      { symbol: 'MSFT', price: 300, volume: 800 },
    ],
    getRowId: ({ data }: { data: Record<string, unknown> }) => String(data.symbol),
    plugins: [StreamingPlugin({ batchInterval: 100, ...pluginOptions })],
  });
}

function getStreamingState(engine: ReturnType<typeof createGrid>): StreamingState {
  return engine.store.getState().pluginState?.['streaming'] as StreamingState;
}

describe('StreamingPlugin', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates grid with streaming plugin', () => {
    const engine = makeGrid();
    const state = getStreamingState(engine);
    expect(state).toBeDefined();
    expect(state.connected).toBe(false);
    expect(state.totalUpdates).toBe(0);
    expect(state.pendingUpdates).toEqual([]);
    expect(state.recentChanges).toEqual([]);
    engine.destroy();
  });

  it('stream:push adds updates to pending queue and batch processes them', async () => {
    vi.useFakeTimers();
    const mock = createMockAdapter();
    const engine = makeGrid({ adapter: mock.adapter });

    // Connect first to start the batch timer
    await engine.commandBus.dispatchAsync('stream:connect', {});
    expect(getStreamingState(engine).connected).toBe(true);

    engine.commandBus.dispatch('stream:push', {
      updates: [
        { id: 'AAPL', data: { price: 155 } },
        { id: 'GOOG', data: { price: 2850 } },
      ],
    });

    // Advance time to trigger batch processing
    vi.advanceTimersByTime(200);

    const state = getStreamingState(engine);
    expect(state.totalUpdates).toBe(2);
    engine.destroy();
  });

  it('batch processing applies updates to row data', async () => {
    vi.useFakeTimers();
    const mock = createMockAdapter();
    const engine = makeGrid({ adapter: mock.adapter });

    await engine.commandBus.dispatchAsync('stream:connect', {});

    engine.commandBus.dispatch('stream:push', {
      updates: [{ id: 'AAPL', data: { price: 160 } }],
    });

    vi.advanceTimersByTime(200);

    const aaplNode = engine.api.getRowNode('AAPL');
    expect(aaplNode).toBeDefined();
    expect((aaplNode!.data as Record<string, unknown>).price).toBe(160);
    engine.destroy();
  });

  it('cell changes track direction (up for increase, down for decrease)', async () => {
    vi.useFakeTimers();
    const mock = createMockAdapter();
    const engine = makeGrid({ adapter: mock.adapter });

    await engine.commandBus.dispatchAsync('stream:connect', {});

    engine.commandBus.dispatch('stream:push', {
      updates: [
        { id: 'AAPL', data: { price: 160 } }, // up: 150 -> 160
        { id: 'GOOG', data: { price: 2700 } }, // down: 2800 -> 2700
      ],
    });

    vi.advanceTimersByTime(200);

    const state = getStreamingState(engine);
    expect(state.recentChanges.length).toBeGreaterThanOrEqual(2);

    const aaplChange = state.recentChanges.find(
      (c) => c.rowId === 'AAPL' && c.colId === 'price',
    );
    expect(aaplChange).toBeDefined();
    expect(aaplChange!.direction).toBe('up');
    expect(aaplChange!.oldValue).toBe(150);
    expect(aaplChange!.newValue).toBe(160);

    const googChange = state.recentChanges.find(
      (c) => c.rowId === 'GOOG' && c.colId === 'price',
    );
    expect(googChange).toBeDefined();
    expect(googChange!.direction).toBe('down');
    engine.destroy();
  });

  it('stream:pause stops processing', async () => {
    vi.useFakeTimers();
    const mock = createMockAdapter();
    const engine = makeGrid({ adapter: mock.adapter });

    await engine.commandBus.dispatchAsync('stream:connect', {});

    engine.commandBus.dispatch('stream:pause', {});

    engine.commandBus.dispatch('stream:push', {
      updates: [{ id: 'AAPL', data: { price: 999 } }],
    });

    vi.advanceTimersByTime(500);

    // When paused, onData ignores incoming updates so nothing is queued
    const state = getStreamingState(engine);
    expect(state.totalUpdates).toBe(0);

    // Row data should be unchanged
    const aaplNode = engine.api.getRowNode('AAPL');
    expect((aaplNode!.data as Record<string, unknown>).price).toBe(150);
    engine.destroy();
  });

  it('stream:resume restarts processing', async () => {
    vi.useFakeTimers();
    const mock = createMockAdapter();
    const engine = makeGrid({ adapter: mock.adapter });

    await engine.commandBus.dispatchAsync('stream:connect', {});

    engine.commandBus.dispatch('stream:pause', {});

    engine.commandBus.dispatch('stream:push', {
      updates: [{ id: 'AAPL', data: { price: 170 } }],
    });

    vi.advanceTimersByTime(200);

    // Still paused, nothing processed
    expect(getStreamingState(engine).totalUpdates).toBe(0);

    engine.commandBus.dispatch('stream:resume', {});

    // Push new update after resuming
    engine.commandBus.dispatch('stream:push', {
      updates: [{ id: 'MSFT', data: { price: 350 } }],
    });

    vi.advanceTimersByTime(200);

    const state = getStreamingState(engine);
    expect(state.totalUpdates).toBeGreaterThan(0);

    const msftNode = engine.api.getRowNode('MSFT');
    expect((msftNode!.data as Record<string, unknown>).price).toBe(350);
    engine.destroy();
  });

  it('totalUpdates increments after batch processing', async () => {
    vi.useFakeTimers();
    const mock = createMockAdapter();
    const engine = makeGrid({ adapter: mock.adapter });

    await engine.commandBus.dispatchAsync('stream:connect', {});

    engine.commandBus.dispatch('stream:push', {
      updates: [{ id: 'AAPL', data: { price: 155 } }],
    });
    vi.advanceTimersByTime(200);

    expect(getStreamingState(engine).totalUpdates).toBe(1);

    engine.commandBus.dispatch('stream:push', {
      updates: [
        { id: 'GOOG', data: { price: 2900 } },
        { id: 'MSFT', data: { price: 310 } },
      ],
    });
    vi.advanceTimersByTime(200);

    expect(getStreamingState(engine).totalUpdates).toBe(3);
    engine.destroy();
  });

  it('pending queue is capped to prevent unbounded growth', async () => {
    vi.useFakeTimers();
    const mock = createMockAdapter();
    const engine = makeGrid({ adapter: mock.adapter, maxBatchSize: 5 });

    await engine.commandBus.dispatchAsync('stream:connect', {});

    // Push far more than maxBatchSize * 10 (5 * 10 = 50) updates
    const bigBatch = Array.from({ length: 100 }, (_, i) => ({
      id: 'AAPL',
      data: { price: 100 + i },
    }));

    engine.commandBus.dispatch('stream:push', { updates: bigBatch });

    // The internal pendingQueue should be capped to maxBatchSize * 10 = 50
    vi.advanceTimersByTime(200);

    const state = getStreamingState(engine);
    // At least some updates were processed
    expect(state.totalUpdates).toBeGreaterThan(0);
    // pendingUpdates should be less than the original 100
    expect(state.pendingUpdates.length).toBeLessThan(100);
    engine.destroy();
  });

  it('non-numeric value changes have neutral direction', async () => {
    vi.useFakeTimers();
    const mock = createMockAdapter();
    const engine = makeGrid({ adapter: mock.adapter });

    await engine.commandBus.dispatchAsync('stream:connect', {});

    engine.commandBus.dispatch('stream:push', {
      updates: [{ id: 'AAPL', data: { symbol: 'AAPL_NEW' } }],
    });

    vi.advanceTimersByTime(200);

    const state = getStreamingState(engine);
    const symbolChange = state.recentChanges.find(
      (c) => c.rowId === 'AAPL' && c.colId === 'symbol',
    );
    expect(symbolChange).toBeDefined();
    expect(symbolChange!.direction).toBe('neutral');
    engine.destroy();
  });
});
