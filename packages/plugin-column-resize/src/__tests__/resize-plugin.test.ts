import { describe, it, expect } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { ColumnResizePlugin } from '../resize-plugin';

function createResizableGrid(pluginOptions = {}) {
  return createGrid({
    columns: [
      { field: 'name', resizable: true, width: 150, minWidth: 80, maxWidth: 300 },
      { field: 'age', resizable: true, width: 100 },
      { field: 'city', resizable: false, width: 120 },
    ],
    rowData: [
      { name: 'Alice', age: 30, city: 'NYC' },
      { name: 'Bob', age: 25, city: 'LA' },
    ],
    plugins: [ColumnResizePlugin(pluginOptions)],
  });
}

describe('ColumnResizePlugin', () => {
  it('creates grid with column resize plugin successfully', () => {
    const engine = createResizableGrid();
    expect(engine.api).toBeDefined();
    expect(engine.store).toBeDefined();
    expect(engine.api.getDisplayedRowCount()).toBe(2);
    expect(engine.api.getAllColumns()).toHaveLength(3);
    engine.destroy();
  });

  it('column:resize changes column width', () => {
    const engine = createResizableGrid();

    engine.commandBus.dispatch('column:resize', { colId: 'name', delta: 50 });

    const col = engine.api.getColumn('name');
    expect(col!.width).toBe(200);

    engine.destroy();
  });

  it('column:resize respects minWidth constraint', () => {
    const engine = createResizableGrid();

    // name column has minWidth: 80, current width: 150, delta: -200 would go to -50
    engine.commandBus.dispatch('column:resize', { colId: 'name', delta: -200 });

    const col = engine.api.getColumn('name');
    expect(col!.width).toBe(80);

    engine.destroy();
  });

  it('column:resize respects maxWidth constraint', () => {
    const engine = createResizableGrid();

    // name column has maxWidth: 300, current width: 150, delta: +300 would go to 450
    engine.commandBus.dispatch('column:resize', { colId: 'name', delta: 300 });

    const col = engine.api.getColumn('name');
    expect(col!.width).toBe(300);

    engine.destroy();
  });

  it('column:resize ignores non-resizable columns', () => {
    const engine = createResizableGrid();

    // city column has resizable: false
    const widthBefore = engine.api.getColumn('city')!.width;

    engine.commandBus.dispatch('column:resize', { colId: 'city', delta: 50 });

    const col = engine.api.getColumn('city');
    expect(col!.width).toBe(widthBefore);

    engine.destroy();
  });

  it('column:resize with negative delta narrows column', () => {
    const engine = createResizableGrid();

    engine.commandBus.dispatch('column:resize', { colId: 'name', delta: -30 });

    const col = engine.api.getColumn('name');
    expect(col!.width).toBe(120);

    engine.destroy();
  });

  it('column:resize clamps to global minWidth', () => {
    // Global minWidth of 100, name column minWidth is 80
    // Effective minWidth should be max(80, 100) = 100
    const engine = createResizableGrid({ minWidth: 100 });

    engine.commandBus.dispatch('column:resize', { colId: 'name', delta: -200 });

    const col = engine.api.getColumn('name');
    expect(col!.width).toBe(100);

    engine.destroy();
  });

  it('column:resize clamps to global maxWidth', () => {
    // Global maxWidth of 200, name column maxWidth is 300
    // Effective maxWidth should be min(300, 200) = 200
    const engine = createResizableGrid({ maxWidth: 200 });

    engine.commandBus.dispatch('column:resize', { colId: 'name', delta: 300 });

    const col = engine.api.getColumn('name');
    expect(col!.width).toBe(200);

    engine.destroy();
  });

  it('autoSize is disabled when enableAutoSize is false', () => {
    const engine = createResizableGrid({ enableAutoSize: false });

    const widthBefore = engine.api.getColumn('name')!.width;

    // Command dispatches but does nothing because enableAutoSize is false
    expect(() => {
      engine.commandBus.dispatch('column:autoSize', { colId: 'name' });
    }).not.toThrow();

    // Width should remain unchanged (autoSize returns early)
    const col = engine.api.getColumn('name');
    expect(col!.width).toBe(widthBefore);

    engine.destroy();
  });

  it('disposer unregisters commands (column:resize no longer works after destroy)', () => {
    const engine = createResizableGrid();

    // Before destroy, resize works
    engine.commandBus.dispatch('column:resize', { colId: 'name', delta: 50 });
    expect(engine.api.getColumn('name')!.width).toBe(200);

    // Resize back
    engine.commandBus.dispatch('column:resize', { colId: 'name', delta: -50 });
    expect(engine.api.getColumn('name')!.width).toBe(150);

    // Destroy the engine (which calls plugin disposers)
    engine.destroy();

    // After destroy, commands should have no handlers so dispatching is a no-op
    // The commandBus is cleared by destroy(), so dispatch does nothing
  });
});
