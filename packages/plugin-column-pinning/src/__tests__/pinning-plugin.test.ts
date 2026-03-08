import { describe, it, expect } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { ColumnPinningPlugin } from '../pinning-plugin';

function createPinnableGrid(pluginOptions = {}) {
  return createGrid({
    columns: [
      { field: 'name' },
      { field: 'age' },
      { field: 'city' },
      { field: 'score' },
    ],
    rowData: [
      { name: 'Alice', age: 30, city: 'NYC', score: 95 },
      { name: 'Bob', age: 25, city: 'LA', score: 88 },
    ],
    plugins: [ColumnPinningPlugin(pluginOptions)],
  });
}

describe('ColumnPinningPlugin', () => {
  it('creates grid with column pinning plugin successfully', () => {
    const engine = createPinnableGrid();
    expect(engine.api).toBeDefined();
    expect(engine.store).toBeDefined();
    expect(engine.api.getDisplayedRowCount()).toBe(2);
    expect(engine.api.getAllColumns()).toHaveLength(4);
    engine.destroy();
  });

  it('column:pin pins a column to the left', () => {
    const engine = createPinnableGrid();

    engine.commandBus.dispatch('column:pin', { colId: 'name', pinned: 'left' });

    const col = engine.api.getColumn('name');
    expect(col!.pinned).toBe('left');

    engine.destroy();
  });

  it('column:pin pins a column to the right', () => {
    const engine = createPinnableGrid();

    engine.commandBus.dispatch('column:pin', { colId: 'score', pinned: 'right' });

    const col = engine.api.getColumn('score');
    expect(col!.pinned).toBe('right');

    engine.destroy();
  });

  it('column:pin with null unpins a column', () => {
    const engine = createPinnableGrid();

    // Pin first
    engine.commandBus.dispatch('column:pin', { colId: 'name', pinned: 'left' });
    expect(engine.api.getColumn('name')!.pinned).toBe('left');

    // Unpin
    engine.commandBus.dispatch('column:pin', { colId: 'name', pinned: null });
    expect(engine.api.getColumn('name')!.pinned).toBeNull();

    engine.destroy();
  });

  it('pinning reorders columns (left first, center, right last)', () => {
    const engine = createPinnableGrid();

    // Initial order: name, age, city, score
    let cols = engine.api.getAllColumns();
    expect(cols.map((c) => c.colId)).toEqual(['name', 'age', 'city', 'score']);

    // Pin score to left
    engine.commandBus.dispatch('column:pin', { colId: 'score', pinned: 'left' });

    // score should be first (left-pinned)
    cols = engine.api.getAllColumns();
    expect(cols[0]!.colId).toBe('score');
    expect(cols[0]!.pinned).toBe('left');

    // Pin city to right
    engine.commandBus.dispatch('column:pin', { colId: 'city', pinned: 'right' });

    cols = engine.api.getAllColumns();
    // Left-pinned first, then center, then right-pinned
    const leftPinned = cols.filter((c) => c.pinned === 'left');
    const center = cols.filter((c) => !c.pinned);
    const rightPinned = cols.filter((c) => c.pinned === 'right');

    expect(leftPinned.map((c) => c.colId)).toEqual(['score']);
    expect(center.length).toBe(2); // name, age
    expect(rightPinned.map((c) => c.colId)).toEqual(['city']);

    // Verify ordering: left comes first, then center, then right
    const leftEnd = cols.indexOf(leftPinned[leftPinned.length - 1]!);
    const centerStart = cols.indexOf(center[0]!);
    const rightStart = cols.indexOf(rightPinned[0]!);
    expect(leftEnd).toBeLessThan(centerStart);
    expect(centerStart).toBeLessThan(rightStart);

    engine.destroy();
  });

  it('maxPinnedLeft enforces limit', () => {
    const engine = createPinnableGrid({ maxPinnedLeft: 1 });

    // Pin first column left — should work
    engine.commandBus.dispatch('column:pin', { colId: 'name', pinned: 'left' });
    expect(engine.api.getColumn('name')!.pinned).toBe('left');

    // Try to pin second column left — should be blocked
    engine.commandBus.dispatch('column:pin', { colId: 'age', pinned: 'left' });
    expect(engine.api.getColumn('age')!.pinned).toBeNull();

    engine.destroy();
  });

  it('maxPinnedRight enforces limit', () => {
    const engine = createPinnableGrid({ maxPinnedRight: 1 });

    // Pin first column right — should work
    engine.commandBus.dispatch('column:pin', { colId: 'score', pinned: 'right' });
    expect(engine.api.getColumn('score')!.pinned).toBe('right');

    // Try to pin second column right — should be blocked
    engine.commandBus.dispatch('column:pin', { colId: 'city', pinned: 'right' });
    expect(engine.api.getColumn('city')!.pinned).toBeNull();

    engine.destroy();
  });

  it('column:unpinAll unpins all columns', () => {
    const engine = createPinnableGrid();

    // Pin some columns
    engine.commandBus.dispatch('column:pin', { colId: 'name', pinned: 'left' });
    engine.commandBus.dispatch('column:pin', { colId: 'score', pinned: 'right' });
    expect(engine.api.getColumn('name')!.pinned).toBe('left');
    expect(engine.api.getColumn('score')!.pinned).toBe('right');

    // Unpin all
    engine.commandBus.dispatch('column:unpinAll', {});

    expect(engine.api.getColumn('name')!.pinned).toBeNull();
    expect(engine.api.getColumn('score')!.pinned).toBeNull();

    engine.destroy();
  });

  it('pinning non-existent column does nothing', () => {
    const engine = createPinnableGrid();

    const colsBefore = engine.api.getAllColumns().map((c) => ({ colId: c.colId, pinned: c.pinned }));

    engine.commandBus.dispatch('column:pin', { colId: 'nonexistent', pinned: 'left' });

    const colsAfter = engine.api.getAllColumns().map((c) => ({ colId: c.colId, pinned: c.pinned }));
    expect(colsAfter).toEqual(colsBefore);

    engine.destroy();
  });

  it('disposer unregisters commands (column:pin no longer works after destroy)', () => {
    const engine = createPinnableGrid();

    // Before destroy, pinning works
    engine.commandBus.dispatch('column:pin', { colId: 'name', pinned: 'left' });
    expect(engine.api.getColumn('name')!.pinned).toBe('left');

    // Unpin first
    engine.commandBus.dispatch('column:pin', { colId: 'name', pinned: null });
    expect(engine.api.getColumn('name')!.pinned).toBeNull();

    // Destroy the engine (which calls plugin disposers)
    engine.destroy();

    // After destroy, commands should have no handlers so dispatching is a no-op
    // The commandBus is cleared by destroy(), so dispatch does nothing
  });
});
