// © 2025 GridStorm / Tekivex — All Rights Reserved
// Tests for SSRM plugin cache invalidation and stale-response handling.

import { describe, it, expect } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { SSRMPlugin } from '../ssrm-plugin';
import type { SSRMDataSource, ServerRequest, ServerResponse } from '../types';

// Note: SortingPlugin is intentionally NOT installed here. SSRM listens for
// the core `column:sort:changed` / `filter:changed` events that the engine
// emits in response to api.setSortModel / api.setFilterModel — no UI plugin
// is needed for these events to fire, and excluding it keeps the test focused
// on SSRM's own behavior.

/** A controllable mock data source. Each call to getRows is captured along
 *  with the deferred promise it returned, so a test can resolve them in any
 *  order to simulate slow networks and races. */
function makeMockDataSource() {
  type Pending = {
    request: ServerRequest;
    resolve: (r: ServerResponse) => void;
    reject: (e: unknown) => void;
    promise: Promise<ServerResponse>;
  };
  const pending: Pending[] = [];
  const ds: SSRMDataSource = {
    getRows(request) {
      let resolve!: Pending['resolve'];
      let reject!: Pending['reject'];
      const promise = new Promise<ServerResponse>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      pending.push({ request, resolve, reject, promise });
      return promise;
    },
  };
  return { ds, pending };
}

function makeGrid(ds: SSRMDataSource) {
  return createGrid({
    columns: [{ field: 'symbol' }, { field: 'price' }],
    rowData: [],
    plugins: [SSRMPlugin({ dataSource: ds, blockSize: 100 })],
  });
}

describe('SSRMPlugin cache invalidation on sort/filter', () => {
  it('clears the cache and re-fetches block 0 when sort changes', async () => {
    const { ds, pending } = makeMockDataSource();
    const engine = makeGrid(ds);

    // Initial fetch (block 0) fires at install time.
    expect(pending).toHaveLength(1);
    pending[0]!.resolve({ rowData: [{ symbol: 'AAA', price: 1 }], rowCount: 1 });
    await pending[0]!.promise;

    // Change sort — plugin should bump signature, clear cache, fire a new fetch.
    engine.api.setSortModel([{ colId: 'price', sort: 'desc' }]);
    // The plugin re-fetches block 0 with the new sort.
    expect(pending.length).toBeGreaterThanOrEqual(2);
    const newest = pending[pending.length - 1]!;
    expect(newest.request.sortModel).toEqual([{ colId: 'price', sort: 'desc' }]);

    engine.destroy();
  });

  it('discards an in-flight response that resolves after sort changes', async () => {
    const { ds, pending } = makeMockDataSource();
    const engine = makeGrid(ds);

    // The initial fetch is in flight; do not resolve it yet.
    expect(pending).toHaveLength(1);
    const stale = pending[0]!;

    // Sort changes while stale fetch is still pending.
    engine.api.setSortModel([{ colId: 'price', sort: 'asc' }]);
    expect(pending.length).toBeGreaterThanOrEqual(2);
    const fresh = pending[pending.length - 1]!;

    // Resolve the STALE request first. Its response should be discarded;
    // nothing should be applied to the store from this resolution.
    stale.resolve({
      rowData: [{ symbol: 'STALE', price: 999 }],
      rowCount: 1,
    });
    await stale.promise;

    // The fresh request resolves with the real data.
    fresh.resolve({
      rowData: [{ symbol: 'FRESH', price: 1 }],
      rowCount: 1,
    });
    await fresh.promise;
    // Allow the await in fetchBlock to advance and updateStoreWithCachedData to run.
    await Promise.resolve();
    await Promise.resolve();

    const state = engine.store.getState();
    const rowIds = state.displayedRowIds;
    // Exactly one row should be displayed, and it should come from FRESH.
    expect(rowIds.length).toBe(1);
    const node = state.rowNodes.get(rowIds[0]!);
    expect((node?.data as Record<string, unknown> | undefined)?.symbol).toBe('FRESH');

    engine.destroy();
  });

  it('discards an in-flight response that resolves after filter changes', async () => {
    const { ds, pending } = makeMockDataSource();
    const engine = makeGrid(ds);

    expect(pending).toHaveLength(1);
    const stale = pending[0]!;

    engine.api.setFilterModel({ price: { filterType: 'number', type: 'greaterThan', filter: 100 } });
    expect(pending.length).toBeGreaterThanOrEqual(2);
    const fresh = pending[pending.length - 1]!;

    stale.resolve({ rowData: [{ symbol: 'STALE', price: 50 }], rowCount: 1 });
    await stale.promise;

    fresh.resolve({ rowData: [{ symbol: 'FRESH', price: 200 }], rowCount: 1 });
    await fresh.promise;
    await Promise.resolve();
    await Promise.resolve();

    const state = engine.store.getState();
    expect(state.displayedRowIds.length).toBe(1);
    const node = state.rowNodes.get(state.displayedRowIds[0]!);
    expect((node?.data as Record<string, unknown> | undefined)?.symbol).toBe('FRESH');

    engine.destroy();
  });
});
