import { describe, it, expect } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { RowPinningPlugin } from '../row-pinning-plugin';
import type { RowPinningState } from '../row-pinning-plugin';

function makeColumns() {
  return [
    { field: 'name' },
    { field: 'age' },
    { field: 'score' },
  ];
}

function makeRowData() {
  return [
    { name: 'Alice', age: 30, score: 85 },
    { name: 'Bob', age: 25, score: 90 },
    { name: 'Charlie', age: 35, score: 75 },
    { name: 'Diana', age: 28, score: 95 },
  ];
}

function getPinningState(engine: ReturnType<typeof createGrid>): RowPinningState {
  return engine.store.getState().pluginState?.['rowPinning'] as RowPinningState;
}

function getRowIds(engine: ReturnType<typeof createGrid>): string[] {
  return Array.from(engine.store.getState().rowNodes.keys());
}

describe('RowPinningPlugin', () => {
  it('creates grid with row pinning plugin', () => {
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [RowPinningPlugin()],
    });

    expect(engine.api).toBeDefined();
    const state = getPinningState(engine);
    expect(state).toBeDefined();
    expect(state.pinnedTopRows).toEqual([]);
    expect(state.pinnedBottomRows).toEqual([]);

    engine.destroy();
  });

  it('rowPinning:pinTop pins a row to the top', () => {
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [RowPinningPlugin()],
    });

    const rowIds = getRowIds(engine);
    const firstRowId = rowIds[0]!;

    engine.commandBus.dispatch('rowPinning:pinTop', { rowIds: [firstRowId] });

    const state = getPinningState(engine);
    expect(state.pinnedTopRows).toHaveLength(1);
    expect(state.pinnedTopRows[0]!.id).toBe(firstRowId);
    expect(state.pinnedTopRows[0]!.position).toBe('top');
    expect(state.pinnedTopRows[0]!.data).toBeDefined();

    engine.destroy();
  });

  it('rowPinning:pinBottom pins a row to the bottom', () => {
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [RowPinningPlugin()],
    });

    const rowIds = getRowIds(engine);
    const lastRowId = rowIds[rowIds.length - 1]!;

    engine.commandBus.dispatch('rowPinning:pinBottom', { rowIds: [lastRowId] });

    const state = getPinningState(engine);
    expect(state.pinnedBottomRows).toHaveLength(1);
    expect(state.pinnedBottomRows[0]!.id).toBe(lastRowId);
    expect(state.pinnedBottomRows[0]!.position).toBe('bottom');

    engine.destroy();
  });

  it('rowPinning:unpin removes a pinned row', () => {
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [RowPinningPlugin()],
    });

    const rowIds = getRowIds(engine);
    const rowId = rowIds[0]!;

    // Pin first
    engine.commandBus.dispatch('rowPinning:pinTop', { rowIds: [rowId] });
    expect(getPinningState(engine).pinnedTopRows).toHaveLength(1);

    // Then unpin
    engine.commandBus.dispatch('rowPinning:unpin', { rowIds: [rowId] });
    expect(getPinningState(engine).pinnedTopRows).toHaveLength(0);

    engine.destroy();
  });

  it('rowPinning:unpinAll clears all pinned rows', () => {
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [RowPinningPlugin()],
    });

    const rowIds = getRowIds(engine);

    // Pin rows to top and bottom
    engine.commandBus.dispatch('rowPinning:pinTop', { rowIds: [rowIds[0]!] });
    engine.commandBus.dispatch('rowPinning:pinBottom', { rowIds: [rowIds[1]!] });

    const stateBefore = getPinningState(engine);
    expect(stateBefore.pinnedTopRows).toHaveLength(1);
    expect(stateBefore.pinnedBottomRows).toHaveLength(1);

    // Unpin all
    engine.commandBus.dispatch('rowPinning:unpinAll', {});

    const stateAfter = getPinningState(engine);
    expect(stateAfter.pinnedTopRows).toHaveLength(0);
    expect(stateAfter.pinnedBottomRows).toHaveLength(0);

    engine.destroy();
  });

  it('initial pinnedTopRowData creates pinned rows on install', () => {
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [RowPinningPlugin({
        pinnedTopRowData: [
          { name: 'Top1', age: 100, score: 100 },
          { name: 'Top2', age: 200, score: 200 },
        ],
      })],
    });

    const state = getPinningState(engine);
    expect(state.pinnedTopRows).toHaveLength(2);
    expect(state.pinnedTopRows[0]!.id).toBe('pinned-top-0');
    expect(state.pinnedTopRows[0]!.position).toBe('top');
    expect(state.pinnedTopRows[1]!.id).toBe('pinned-top-1');

    engine.destroy();
  });

  it('maxPinnedRows limits total pinned rows', () => {
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [RowPinningPlugin({ maxPinnedRows: 2 })],
    });

    const rowIds = getRowIds(engine);

    // Pin 2 rows (should succeed)
    engine.commandBus.dispatch('rowPinning:pinTop', { rowIds: [rowIds[0]!] });
    engine.commandBus.dispatch('rowPinning:pinBottom', { rowIds: [rowIds[1]!] });

    expect(getPinningState(engine).pinnedTopRows).toHaveLength(1);
    expect(getPinningState(engine).pinnedBottomRows).toHaveLength(1);

    // Try to pin a 3rd row (should be rejected due to max limit)
    engine.commandBus.dispatch('rowPinning:pinTop', { rowIds: [rowIds[2]!] });

    // Should still have only 2 pinned rows
    const state = getPinningState(engine);
    expect(state.pinnedTopRows).toHaveLength(1);
    expect(state.pinnedBottomRows).toHaveLength(1);

    engine.destroy();
  });

  it('cannot pin the same row twice', () => {
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [RowPinningPlugin()],
    });

    const rowIds = getRowIds(engine);
    const rowId = rowIds[0]!;

    // Pin once
    engine.commandBus.dispatch('rowPinning:pinTop', { rowIds: [rowId] });
    expect(getPinningState(engine).pinnedTopRows).toHaveLength(1);

    // Try to pin again (should be a no-op)
    engine.commandBus.dispatch('rowPinning:pinTop', { rowIds: [rowId] });
    expect(getPinningState(engine).pinnedTopRows).toHaveLength(1);

    // Also try pinning to bottom (same row already pinned to top)
    engine.commandBus.dispatch('rowPinning:pinBottom', { rowIds: [rowId] });
    expect(getPinningState(engine).pinnedBottomRows).toHaveLength(0);

    engine.destroy();
  });

  it('rowPinning:setTopData replaces top pinned rows', () => {
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [RowPinningPlugin({
        pinnedTopRowData: [{ name: 'Old', age: 1, score: 1 }],
      })],
    });

    expect(getPinningState(engine).pinnedTopRows).toHaveLength(1);
    expect(getPinningState(engine).pinnedTopRows[0]!.id).toBe('pinned-top-0');

    // Replace with new data
    engine.commandBus.dispatch('rowPinning:setTopData', {
      data: [
        { name: 'New1', age: 50, score: 50 },
        { name: 'New2', age: 60, score: 60 },
      ],
    });

    const state = getPinningState(engine);
    expect(state.pinnedTopRows).toHaveLength(2);
    expect(state.pinnedTopRows[0]!.id).toBe('pinned-top-0');
    expect(state.pinnedTopRows[1]!.id).toBe('pinned-top-1');

    engine.destroy();
  });

  it('rowPinning:setBottomData replaces bottom pinned rows', () => {
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [RowPinningPlugin()],
    });

    engine.commandBus.dispatch('rowPinning:setBottomData', {
      data: [
        { name: 'Footer1', age: 99, score: 99 },
      ],
    });

    const state = getPinningState(engine);
    expect(state.pinnedBottomRows).toHaveLength(1);
    expect(state.pinnedBottomRows[0]!.id).toBe('pinned-bottom-0');
    expect(state.pinnedBottomRows[0]!.position).toBe('bottom');

    engine.destroy();
  });

  it('initial pinnedBottomRowData creates pinned rows on install', () => {
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [RowPinningPlugin({
        pinnedBottomRowData: [
          { name: 'Bottom1', age: 10, score: 10 },
        ],
      })],
    });

    const state = getPinningState(engine);
    expect(state.pinnedBottomRows).toHaveLength(1);
    expect(state.pinnedBottomRows[0]!.id).toBe('pinned-bottom-0');
    expect(state.pinnedBottomRows[0]!.position).toBe('bottom');

    engine.destroy();
  });
});
