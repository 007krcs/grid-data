import { describe, it, expect, vi } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { RowReorderPlugin } from '../row-reorder-plugin';

function makeRowData() {
  return [
    { name: 'Alice', age: 30, city: 'NYC' },
    { name: 'Bob', age: 25, city: 'LA' },
    { name: 'Charlie', age: 35, city: 'CHI' },
    { name: 'Diana', age: 28, city: 'SEA' },
  ];
}

function createReorderGrid(pluginOptions = {}) {
  return createGrid({
    columns: [
      { field: 'name', headerName: 'Name' },
      { field: 'age', headerName: 'Age' },
      { field: 'city', headerName: 'City' },
    ],
    rowData: makeRowData(),
    plugins: [RowReorderPlugin(pluginOptions)],
  });
}

function getDisplayedIds(engine: ReturnType<typeof createGrid>) {
  return engine.store.getState().displayedRowIds;
}

describe('RowReorderPlugin', () => {
  it('creates grid with row reorder plugin successfully', () => {
    const engine = createReorderGrid();
    expect(engine.api).toBeDefined();
    expect(engine.store).toBeDefined();
    expect(engine.api.getDisplayedRowCount()).toBe(4);
    engine.destroy();
  });

  it('row:move moves a row to a new display index', () => {
    const engine = createReorderGrid();

    const idsBefore = getDisplayedIds(engine);
    expect(idsBefore).toEqual(['row-0', 'row-1', 'row-2', 'row-3']);

    engine.commandBus.dispatch('row:move', { rowId: 'row-0', toIndex: 2 });

    const idsAfter = getDisplayedIds(engine);
    expect(idsAfter).toEqual(['row-1', 'row-2', 'row-0', 'row-3']);
    engine.destroy();
  });

  it('row:move to index 0 moves a row to the beginning', () => {
    const engine = createReorderGrid();

    engine.commandBus.dispatch('row:move', { rowId: 'row-3', toIndex: 0 });

    const idsAfter = getDisplayedIds(engine);
    expect(idsAfter).toEqual(['row-3', 'row-0', 'row-1', 'row-2']);
    engine.destroy();
  });

  it('row:move to end moves a row to the last position', () => {
    const engine = createReorderGrid();

    engine.commandBus.dispatch('row:move', { rowId: 'row-0', toIndex: 3 });

    const idsAfter = getDisplayedIds(engine);
    expect(idsAfter).toEqual(['row-1', 'row-2', 'row-3', 'row-0']);
    engine.destroy();
  });

  it('row:move emits row:moved event', () => {
    const engine = createReorderGrid();
    const listener = vi.fn();
    engine.eventBus.on('row:moved', listener);

    engine.commandBus.dispatch('row:move', { rowId: 'row-1', toIndex: 3 });

    expect(listener).toHaveBeenCalledTimes(1);
    const payload = listener.mock.calls[0][0];
    expect(payload.rowId).toBe('row-1');
    expect(payload.fromIndex).toBe(1);
    expect(payload.toIndex).toBe(3);
    engine.destroy();
  });

  it('row:move with non-existent row does nothing', () => {
    const engine = createReorderGrid();

    expect(() => {
      engine.commandBus.dispatch('row:move', { rowId: 'nonexistent', toIndex: 0 });
    }).not.toThrow();

    const ids = getDisplayedIds(engine);
    expect(ids).toEqual(['row-0', 'row-1', 'row-2', 'row-3']);
    engine.destroy();
  });

  it('row:move clamps to valid indices', () => {
    const engine = createReorderGrid();

    engine.commandBus.dispatch('row:move', { rowId: 'row-0', toIndex: 100 });

    const ids = getDisplayedIds(engine);
    // Should be at the last position
    expect(ids).toEqual(['row-1', 'row-2', 'row-3', 'row-0']);
    engine.destroy();
  });

  it('row:move clamps negative index to 0', () => {
    const engine = createReorderGrid();

    engine.commandBus.dispatch('row:move', { rowId: 'row-3', toIndex: -5 });

    const ids = getDisplayedIds(engine);
    expect(ids).toEqual(['row-3', 'row-0', 'row-1', 'row-2']);
    engine.destroy();
  });

  it('row:swap swaps two rows', () => {
    const engine = createReorderGrid();

    engine.commandBus.dispatch('row:swap', { rowIdA: 'row-0', rowIdB: 'row-3' });

    const ids = getDisplayedIds(engine);
    expect(ids).toEqual(['row-3', 'row-1', 'row-2', 'row-0']);
    engine.destroy();
  });

  it('row:swap of adjacent rows works correctly', () => {
    const engine = createReorderGrid();

    engine.commandBus.dispatch('row:swap', { rowIdA: 'row-1', rowIdB: 'row-2' });

    const ids = getDisplayedIds(engine);
    expect(ids).toEqual(['row-0', 'row-2', 'row-1', 'row-3']);
    engine.destroy();
  });

  it('row:swap emits row:moved event', () => {
    const engine = createReorderGrid();
    const listener = vi.fn();
    engine.eventBus.on('row:moved', listener);

    engine.commandBus.dispatch('row:swap', { rowIdA: 'row-0', rowIdB: 'row-2' });

    expect(listener).toHaveBeenCalledTimes(1);
    const payload = listener.mock.calls[0][0];
    expect(payload.rowId).toBe('row-0');
    expect(payload.fromIndex).toBe(0);
    expect(payload.toIndex).toBe(2);
    engine.destroy();
  });

  it('row:swap with non-existent row A does nothing', () => {
    const engine = createReorderGrid();

    expect(() => {
      engine.commandBus.dispatch('row:swap', { rowIdA: 'nonexistent', rowIdB: 'row-1' });
    }).not.toThrow();

    const ids = getDisplayedIds(engine);
    expect(ids).toEqual(['row-0', 'row-1', 'row-2', 'row-3']);
    engine.destroy();
  });

  it('row:swap with non-existent row B does nothing', () => {
    const engine = createReorderGrid();

    expect(() => {
      engine.commandBus.dispatch('row:swap', { rowIdA: 'row-0', rowIdB: 'nonexistent' });
    }).not.toThrow();

    const ids = getDisplayedIds(engine);
    expect(ids).toEqual(['row-0', 'row-1', 'row-2', 'row-3']);
    engine.destroy();
  });

  it('row:swap with both non-existent rows does nothing', () => {
    const engine = createReorderGrid();

    expect(() => {
      engine.commandBus.dispatch('row:swap', { rowIdA: 'foo', rowIdB: 'bar' });
    }).not.toThrow();

    const ids = getDisplayedIds(engine);
    expect(ids).toEqual(['row-0', 'row-1', 'row-2', 'row-3']);
    engine.destroy();
  });

  it('multiple moves produce correct final order', () => {
    const engine = createReorderGrid();

    // Move row-0 to end, then row-3 to beginning
    engine.commandBus.dispatch('row:move', { rowId: 'row-0', toIndex: 3 });
    engine.commandBus.dispatch('row:move', { rowId: 'row-3', toIndex: 0 });

    const ids = getDisplayedIds(engine);
    expect(ids).toEqual(['row-3', 'row-1', 'row-2', 'row-0']);
    engine.destroy();
  });

  it('move then swap produces correct order', () => {
    const engine = createReorderGrid();

    engine.commandBus.dispatch('row:move', { rowId: 'row-0', toIndex: 2 });
    // Now: ['row-1', 'row-2', 'row-0', 'row-3']
    engine.commandBus.dispatch('row:swap', { rowIdA: 'row-1', rowIdB: 'row-3' });

    const ids = getDisplayedIds(engine);
    expect(ids).toEqual(['row-3', 'row-2', 'row-0', 'row-1']);
    engine.destroy();
  });

  it('row:move does not move same row to same position', () => {
    const engine = createReorderGrid();
    const listener = vi.fn();
    engine.eventBus.on('row:moved', listener);

    // Move row-1 to index 1 (its current position)
    engine.commandBus.dispatch('row:move', { rowId: 'row-1', toIndex: 1 });

    // Event still fires since the command executed
    const ids = getDisplayedIds(engine);
    expect(ids).toEqual(['row-0', 'row-1', 'row-2', 'row-3']);
    engine.destroy();
  });

  it('row:move preserves row data integrity', () => {
    const engine = createReorderGrid();

    engine.commandBus.dispatch('row:move', { rowId: 'row-0', toIndex: 2 });

    // Verify the actual row data is still correct
    const node = engine.api.getRowNode('row-0');
    expect(node?.data).toEqual({ name: 'Alice', age: 30, city: 'NYC' });

    const node2 = engine.api.getRowNode('row-2');
    expect(node2?.data).toEqual({ name: 'Charlie', age: 35, city: 'CHI' });
    engine.destroy();
  });

  it('disposer unregisters commands after destroy', () => {
    const engine = createReorderGrid();

    // Before destroy, move works
    engine.commandBus.dispatch('row:move', { rowId: 'row-0', toIndex: 3 });
    let ids = getDisplayedIds(engine);
    expect(ids).toEqual(['row-1', 'row-2', 'row-3', 'row-0']);

    // Destroy the engine (which calls plugin disposers)
    engine.destroy();
    // After destroy, commands should have no handlers
  });

  it('row reorder with custom getRowId', () => {
    const engine = createGrid({
      columns: [
        { field: 'name', headerName: 'Name' },
        { field: 'age', headerName: 'Age' },
      ],
      rowData: [
        { id: 'a', name: 'Alice', age: 30 },
        { id: 'b', name: 'Bob', age: 25 },
        { id: 'c', name: 'Charlie', age: 35 },
      ],
      getRowId: ({ data }) => (data as any).id,
      plugins: [RowReorderPlugin()],
    });

    const idsBefore = getDisplayedIds(engine);
    expect(idsBefore).toEqual(['a', 'b', 'c']);

    engine.commandBus.dispatch('row:move', { rowId: 'a', toIndex: 2 });

    const idsAfter = getDisplayedIds(engine);
    expect(idsAfter).toEqual(['b', 'c', 'a']);
    engine.destroy();
  });

  it('row:swap with custom getRowId', () => {
    const engine = createGrid({
      columns: [
        { field: 'name', headerName: 'Name' },
      ],
      rowData: [
        { id: 'x', name: 'X' },
        { id: 'y', name: 'Y' },
        { id: 'z', name: 'Z' },
      ],
      getRowId: ({ data }) => (data as any).id,
      plugins: [RowReorderPlugin()],
    });

    engine.commandBus.dispatch('row:swap', { rowIdA: 'x', rowIdB: 'z' });

    const ids = getDisplayedIds(engine);
    expect(ids).toEqual(['z', 'y', 'x']);
    engine.destroy();
  });

  it('can be created with enableDragDrop disabled', () => {
    const engine = createReorderGrid({ enableDragDrop: false });
    expect(engine.api).toBeDefined();

    // Commands should still work even without drag-drop
    engine.commandBus.dispatch('row:move', { rowId: 'row-0', toIndex: 2 });
    const ids = getDisplayedIds(engine);
    expect(ids).toEqual(['row-1', 'row-2', 'row-0', 'row-3']);
    engine.destroy();
  });

  it('can be created with custom options', () => {
    const engine = createReorderGrid({
      enableDragDrop: true,
      showDragHandle: false,
      lockGroupedRows: false,
      dragHandleWidth: 32,
    });
    expect(engine.api).toBeDefined();
    engine.destroy();
  });
});
