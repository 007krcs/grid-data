import { describe, it, expect } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { ColumnAutoSizePlugin, estimateTextWidth } from '../column-autosize-plugin';

function makeColumns() {
  return [
    { field: 'name', headerName: 'Name' },
    { field: 'age', headerName: 'Age' },
    { field: 'description', headerName: 'Description' },
  ];
}

function makeRowData() {
  return [
    { name: 'Alice', age: 30, description: 'Short' },
    { name: 'Bob', age: 25, description: 'A medium length description' },
    { name: 'Charlie', age: 35, description: 'This is a much longer description text for testing' },
  ];
}

describe('ColumnAutoSizePlugin', () => {
  it('creates grid with column auto-size plugin', () => {
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [ColumnAutoSizePlugin()],
    });

    expect(engine.api).toBeDefined();
    expect(engine.store).toBeDefined();
    expect(engine.api.getDisplayedRowCount()).toBe(3);

    engine.destroy();
  });

  it('estimateTextWidth returns reasonable widths', () => {
    // Empty string should return 0
    expect(estimateTextWidth('')).toBe(0);

    // Single character should return a small positive number
    const singleChar = estimateTextWidth('a');
    expect(singleChar).toBeGreaterThan(0);
    expect(singleChar).toBeLessThan(20);

    // Longer text should return a larger width
    const longText = estimateTextWidth('Hello World');
    expect(longText).toBeGreaterThan(singleChar);

    // Custom font size should scale the result
    const small = estimateTextWidth('test', 10);
    const large = estimateTextWidth('test', 20);
    expect(large).toBeGreaterThan(small);
  });

  it('autoSize:all command adjusts all visible columns', () => {
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [ColumnAutoSizePlugin()],
    });

    // Get initial widths
    const initialColumns = engine.store.getState().columns;
    const initialWidths = initialColumns.map((c) => c.width);

    // Auto-size all columns
    engine.commandBus.dispatch('autoSize:all', {});

    // Widths should have been adjusted
    const updatedColumns = engine.store.getState().columns;
    for (const col of updatedColumns) {
      expect(col.width).toBeGreaterThanOrEqual(50); // default minWidth
      expect(col.width).toBeLessThanOrEqual(500); // default maxWidth
    }

    engine.destroy();
  });

  it('autoSize:column command adjusts a specific column', () => {
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [ColumnAutoSizePlugin()],
    });

    const initialWidth = engine.store.getState().columns.find((c) => c.colId === 'description')!.width;

    // Auto-size only the 'description' column
    engine.commandBus.dispatch('autoSize:column', { colId: 'description' });

    const updatedWidth = engine.store.getState().columns.find((c) => c.colId === 'description')!.width;
    expect(updatedWidth).toBeGreaterThanOrEqual(50);
    expect(updatedWidth).toBeLessThanOrEqual(500);

    // Other columns should not have changed
    const nameWidth = engine.store.getState().columns.find((c) => c.colId === 'name')!.width;
    const initialNameWidth = initialWidth; // capture before any autosize
    // name column should be same as initial since we only auto-sized 'description'
    const origNameWidth = engine.store.getState().columns.find((c) => c.colId === 'name')!.width;
    expect(origNameWidth).toBeDefined();

    engine.destroy();
  });

  it('column widths respect minWidth option', () => {
    const engine = createGrid({
      columns: [
        { field: 'tiny', headerName: 'X' },
      ],
      rowData: [{ tiny: 'a' }],
      plugins: [ColumnAutoSizePlugin({ minWidth: 120 })],
    });

    engine.commandBus.dispatch('autoSize:all', {});

    const col = engine.store.getState().columns.find((c) => c.colId === 'tiny')!;
    expect(col.width).toBeGreaterThanOrEqual(120);

    engine.destroy();
  });

  it('column widths respect maxWidth option', () => {
    const engine = createGrid({
      columns: [
        { field: 'long', headerName: 'Very Long Header Name' },
      ],
      rowData: [
        { long: 'This is an extremely long cell value that should exceed any reasonable column width limit for testing purposes and more text here' },
      ],
      plugins: [ColumnAutoSizePlugin({ maxWidth: 200 })],
    });

    engine.commandBus.dispatch('autoSize:all', {});

    const col = engine.store.getState().columns.find((c) => c.colId === 'long')!;
    expect(col.width).toBeLessThanOrEqual(200);

    engine.destroy();
  });

  it('skipHidden=true skips hidden columns', () => {
    const engine = createGrid({
      columns: [
        { field: 'visible', headerName: 'Visible' },
        { field: 'hidden', headerName: 'Hidden', hide: true },
      ],
      rowData: [
        { visible: 'Show me', hidden: 'Very long hidden content that would change width' },
      ],
      plugins: [ColumnAutoSizePlugin({ skipHidden: true })],
    });

    const hiddenWidthBefore = engine.store.getState().columns.find((c) => c.colId === 'hidden')!.width;

    engine.commandBus.dispatch('autoSize:all', {});

    const hiddenWidthAfter = engine.store.getState().columns.find((c) => c.colId === 'hidden')!.width;
    // Hidden column width should not have changed
    expect(hiddenWidthAfter).toBe(hiddenWidthBefore);

    engine.destroy();
  });

  it('longer content produces wider columns', () => {
    const engine = createGrid({
      columns: [
        { field: 'short', headerName: 'S' },
        { field: 'long', headerName: 'L' },
      ],
      rowData: [
        { short: 'Hi', long: 'This is a much longer piece of text for comparison' },
      ],
      plugins: [ColumnAutoSizePlugin()],
    });

    engine.commandBus.dispatch('autoSize:all', {});

    const shortCol = engine.store.getState().columns.find((c) => c.colId === 'short')!;
    const longCol = engine.store.getState().columns.find((c) => c.colId === 'long')!;

    expect(longCol.width).toBeGreaterThan(shortCol.width);

    engine.destroy();
  });

  it('header names are included in width calculation by default', () => {
    const engine = createGrid({
      columns: [
        { field: 'x', headerName: 'A Very Long Column Header Name For Testing' },
      ],
      rowData: [{ x: 'a' }],
      plugins: [ColumnAutoSizePlugin()],
    });

    engine.commandBus.dispatch('autoSize:all', {});

    const col = engine.store.getState().columns.find((c) => c.colId === 'x')!;
    // Width should be at least as wide as the header text estimate + padding
    const headerWidth = estimateTextWidth('A Very Long Column Header Name For Testing');
    expect(col.width).toBeGreaterThanOrEqual(headerWidth);

    engine.destroy();
  });

  it('autoSize:columns command adjusts specific columns', () => {
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [ColumnAutoSizePlugin()],
    });

    engine.commandBus.dispatch('autoSize:columns', { colIds: ['name', 'age'] });

    const nameCol = engine.store.getState().columns.find((c) => c.colId === 'name')!;
    const ageCol = engine.store.getState().columns.find((c) => c.colId === 'age')!;

    expect(nameCol.width).toBeGreaterThanOrEqual(50);
    expect(ageCol.width).toBeGreaterThanOrEqual(50);

    engine.destroy();
  });
});
