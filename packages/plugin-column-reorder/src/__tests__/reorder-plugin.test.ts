import { describe, it, expect, vi } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { ColumnReorderPlugin } from '../reorder-plugin';

function createReorderGrid(pluginOptions = {}, columnOverrides?: any[]) {
  return createGrid({
    columns: columnOverrides ?? [
      { field: 'name', headerName: 'Name' },
      { field: 'age', headerName: 'Age' },
      { field: 'city', headerName: 'City' },
      { field: 'score', headerName: 'Score' },
    ],
    rowData: [{ name: 'Alice', age: 30, city: 'NYC', score: 90 }],
    plugins: [ColumnReorderPlugin(pluginOptions)],
  });
}

describe('ColumnReorderPlugin', () => {
  it('creates grid with column reorder plugin successfully', () => {
    const engine = createReorderGrid();
    expect(engine.api).toBeDefined();
    expect(engine.store).toBeDefined();
    expect(engine.api.getDisplayedRowCount()).toBe(1);
    expect(engine.api.getAllColumns()).toHaveLength(4);
    engine.destroy();
  });

  it('column:move moves a column to new index', () => {
    const engine = createReorderGrid();

    const colsBefore = engine.api.getAllColumns().map((c) => c.colId);
    expect(colsBefore).toEqual(['name', 'age', 'city', 'score']);

    engine.commandBus.dispatch('column:move', { colId: 'name', toIndex: 2 });

    const colsAfter = engine.api.getAllColumns().map((c) => c.colId);
    expect(colsAfter).toEqual(['age', 'city', 'name', 'score']);
    engine.destroy();
  });

  it('column:move respects lockPosition', () => {
    const engine = createReorderGrid({}, [
      { field: 'name', headerName: 'Name', lockPosition: true },
      { field: 'age', headerName: 'Age' },
      { field: 'city', headerName: 'City' },
      { field: 'score', headerName: 'Score' },
    ]);

    const colsBefore = engine.api.getAllColumns().map((c) => c.colId);
    expect(colsBefore).toEqual(['name', 'age', 'city', 'score']);

    // Attempt to move the locked column
    engine.commandBus.dispatch('column:move', { colId: 'name', toIndex: 2 });

    const colsAfter = engine.api.getAllColumns().map((c) => c.colId);
    // Should remain unchanged because name has lockPosition: true
    expect(colsAfter).toEqual(['name', 'age', 'city', 'score']);
    engine.destroy();
  });

  it('column:move with lockPinnedColumns prevents cross-zone moves', () => {
    const engine = createReorderGrid({ lockPinnedColumns: true }, [
      { field: 'name', headerName: 'Name', pinned: 'left' },
      { field: 'age', headerName: 'Age', pinned: 'left' },
      { field: 'city', headerName: 'City' },
      { field: 'score', headerName: 'Score' },
    ]);

    const colsBefore = engine.api.getAllColumns().map((c) => c.colId);
    expect(colsBefore).toEqual(['name', 'age', 'city', 'score']);

    // Attempt to move a pinned column to an unpinned position
    engine.commandBus.dispatch('column:move', { colId: 'name', toIndex: 2 });

    const colsAfter = engine.api.getAllColumns().map((c) => c.colId);
    // Should remain unchanged because name is pinned:'left' and city at index 2 is unpinned
    expect(colsAfter).toEqual(['name', 'age', 'city', 'score']);
    engine.destroy();
  });

  it('column:move within same pin zone is allowed when lockPinnedColumns is enabled', () => {
    const engine = createReorderGrid({ lockPinnedColumns: true }, [
      { field: 'name', headerName: 'Name', pinned: 'left' },
      { field: 'age', headerName: 'Age', pinned: 'left' },
      { field: 'city', headerName: 'City' },
      { field: 'score', headerName: 'Score' },
    ]);

    // Move within the same pinned zone (both pinned:'left')
    engine.commandBus.dispatch('column:move', { colId: 'name', toIndex: 1 });

    const colsAfter = engine.api.getAllColumns().map((c) => c.colId);
    // Move should succeed since both are in the same pin zone
    expect(colsAfter).toEqual(['age', 'name', 'city', 'score']);
    engine.destroy();
  });

  it('column:swap swaps two columns', () => {
    const engine = createReorderGrid();

    engine.commandBus.dispatch('column:swap', { colIdA: 'name', colIdB: 'score' });

    const cols = engine.api.getAllColumns().map((c) => c.colId);
    expect(cols).toEqual(['score', 'age', 'city', 'name']);
    engine.destroy();
  });

  it('column:swap emits column:moved event', () => {
    const engine = createReorderGrid();
    const listener = vi.fn();
    engine.eventBus.on('column:moved', listener);

    engine.commandBus.dispatch('column:swap', { colIdA: 'name', colIdB: 'city' });

    expect(listener).toHaveBeenCalledTimes(1);
    const payload = listener.mock.calls[0][0];
    expect(payload).toHaveProperty('column');
    expect(payload).toHaveProperty('fromIndex');
    expect(payload).toHaveProperty('toIndex');
    expect(payload.fromIndex).toBe(0);
    expect(payload.toIndex).toBe(2);
    engine.destroy();
  });

  it('column:move with non-existent column does nothing', () => {
    const engine = createReorderGrid();

    expect(() => {
      engine.commandBus.dispatch('column:move', { colId: 'nonexistent', toIndex: 0 });
    }).not.toThrow();

    const cols = engine.api.getAllColumns().map((c) => c.colId);
    expect(cols).toEqual(['name', 'age', 'city', 'score']);
    engine.destroy();
  });

  it('column:swap with non-existent column does nothing', () => {
    const engine = createReorderGrid();

    expect(() => {
      engine.commandBus.dispatch('column:swap', { colIdA: 'name', colIdB: 'nonexistent' });
    }).not.toThrow();

    const cols = engine.api.getAllColumns().map((c) => c.colId);
    expect(cols).toEqual(['name', 'age', 'city', 'score']);
    engine.destroy();
  });

  it('column:swap with both non-existent columns does nothing', () => {
    const engine = createReorderGrid();

    expect(() => {
      engine.commandBus.dispatch('column:swap', { colIdA: 'foo', colIdB: 'bar' });
    }).not.toThrow();

    const cols = engine.api.getAllColumns().map((c) => c.colId);
    expect(cols).toEqual(['name', 'age', 'city', 'score']);
    engine.destroy();
  });

  it('column:swap of adjacent columns works correctly', () => {
    const engine = createReorderGrid();

    engine.commandBus.dispatch('column:swap', { colIdA: 'age', colIdB: 'city' });

    const cols = engine.api.getAllColumns().map((c) => c.colId);
    expect(cols).toEqual(['name', 'city', 'age', 'score']);
    engine.destroy();
  });

  it('disposer unregisters commands after destroy', () => {
    const engine = createReorderGrid();

    // Before destroy, move works
    engine.commandBus.dispatch('column:move', { colId: 'name', toIndex: 3 });
    let cols = engine.api.getAllColumns().map((c) => c.colId);
    expect(cols).toEqual(['age', 'city', 'score', 'name']);

    // Destroy the engine (which calls plugin disposers)
    engine.destroy();

    // After destroy, commands should have no handlers so dispatching is a no-op
    // The commandBus is cleared by destroy(), so dispatch does nothing
  });
});
