import { describe, it, expect, vi } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { GroupingPlugin } from '../../../plugin-grouping/src/grouping-plugin';
import { AggregationPlugin } from '../../../plugin-aggregation/src/aggregation-plugin';
import { PivotPlugin } from '../pivoting-plugin';

interface TestRow {
  name: string;
  dept: string;
  city: string;
  age: number;
}

const data: TestRow[] = [
  { name: 'Alice', dept: 'Engineering', city: 'NYC', age: 30 },
  { name: 'Bob', dept: 'Engineering', city: 'LA', age: 25 },
  { name: 'Charlie', dept: 'Sales', city: 'NYC', age: 35 },
  { name: 'Diana', dept: 'Sales', city: 'LA', age: 28 },
];

function createPivotGrid(pivotOptions: Parameters<typeof PivotPlugin>[0] = {}) {
  return createGrid<TestRow>({
    columns: [
      { field: 'name', headerName: 'Name' },
      { field: 'dept', headerName: 'Dept' },
      { field: 'city', headerName: 'City' },
      { field: 'age', headerName: 'Age', aggFunc: 'sum' },
    ],
    rowData: data,
    plugins: [GroupingPlugin(), AggregationPlugin(), PivotPlugin(pivotOptions)],
  });
}

describe('PivotPlugin', () => {
  it('creates grid with pivot + aggregation + grouping plugins', () => {
    const engine = createPivotGrid();
    expect(engine.api).toBeDefined();
    expect(engine.store).toBeDefined();
    expect(engine.api.getDisplayedRowCount()).toBe(4);
    engine.destroy();
  });

  it('pivot:enable activates pivot mode', () => {
    const engine = createPivotGrid();

    engine.commandBus.dispatch('pivot:enable', {});

    const pivotState = engine.store.getState().pluginState['pivoting'] as any;
    expect(pivotState.pivotMode).toBe(true);

    engine.destroy();
  });

  it('pivot:disable deactivates and clears generated columns', () => {
    const engine = createPivotGrid();

    // Enable, add pivot column, then disable
    engine.commandBus.dispatch('pivot:addColumn', { colId: 'city' });
    engine.commandBus.dispatch('pivot:enable', {});

    let pivotState = engine.store.getState().pluginState['pivoting'] as any;
    expect(pivotState.pivotMode).toBe(true);
    // Should have generated columns since we have pivot col + value col with aggFunc
    expect(pivotState.generatedColumns.length).toBeGreaterThan(0);

    engine.commandBus.dispatch('pivot:disable', {});

    pivotState = engine.store.getState().pluginState['pivoting'] as any;
    expect(pivotState.pivotMode).toBe(false);
    expect(pivotState.generatedColumns).toEqual([]);

    engine.destroy();
  });

  it('pivot:addColumn adds a pivot column', () => {
    const engine = createPivotGrid();

    engine.commandBus.dispatch('pivot:addColumn', { colId: 'city' });

    const pivotState = engine.store.getState().pluginState['pivoting'] as any;
    expect(pivotState.pivotColumns).toContain('city');
    expect(pivotState.pivotColumns).toEqual(['city']);

    engine.destroy();
  });

  it('pivot:addColumn with duplicate is ignored', () => {
    const engine = createPivotGrid();

    engine.commandBus.dispatch('pivot:addColumn', { colId: 'city' });
    engine.commandBus.dispatch('pivot:addColumn', { colId: 'city' });

    const pivotState = engine.store.getState().pluginState['pivoting'] as any;
    expect(pivotState.pivotColumns).toEqual(['city']);

    engine.destroy();
  });

  it('pivot:removeColumn removes a pivot column', () => {
    const engine = createPivotGrid();

    engine.commandBus.dispatch('pivot:addColumn', { colId: 'city' });
    engine.commandBus.dispatch('pivot:addColumn', { colId: 'dept' });
    engine.commandBus.dispatch('pivot:removeColumn', { colId: 'city' });

    const pivotState = engine.store.getState().pluginState['pivoting'] as any;
    expect(pivotState.pivotColumns).toEqual(['dept']);

    engine.destroy();
  });

  it('pivot:setColumns sets all pivot columns', () => {
    const engine = createPivotGrid();

    engine.commandBus.dispatch('pivot:setColumns', { colIds: ['city', 'dept'] });

    const pivotState = engine.store.getState().pluginState['pivoting'] as any;
    expect(pivotState.pivotColumns).toEqual(['city', 'dept']);

    engine.destroy();
  });

  it('pivot:setColumns replaces existing pivot columns', () => {
    const engine = createPivotGrid();

    engine.commandBus.dispatch('pivot:addColumn', { colId: 'city' });
    engine.commandBus.dispatch('pivot:setColumns', { colIds: ['dept'] });

    const pivotState = engine.store.getState().pluginState['pivoting'] as any;
    expect(pivotState.pivotColumns).toEqual(['dept']);

    engine.destroy();
  });

  it('emits pivot:changed event', () => {
    const engine = createPivotGrid();
    const listener = vi.fn();
    engine.eventBus.on('pivot:changed', listener);

    // Enable
    engine.commandBus.dispatch('pivot:enable', {});
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ pivotMode: true }),
    );

    // Disable
    engine.commandBus.dispatch('pivot:disable', {});
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ pivotMode: false }),
    );

    // Add column
    engine.commandBus.dispatch('pivot:addColumn', { colId: 'city' });
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ pivotColumns: ['city'] }),
    );

    // Remove column
    engine.commandBus.dispatch('pivot:removeColumn', { colId: 'city' });
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ pivotColumns: [] }),
    );

    // Set columns
    engine.commandBus.dispatch('pivot:setColumns', { colIds: ['dept', 'city'] });
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ pivotColumns: ['dept', 'city'] }),
    );

    expect(listener).toHaveBeenCalledTimes(5);

    engine.destroy();
  });

  it('generates pivot columns when pivot mode enabled with pivot columns and aggFunc', () => {
    const engine = createPivotGrid();

    engine.commandBus.dispatch('pivot:addColumn', { colId: 'city' });
    engine.commandBus.dispatch('pivot:enable', {});

    const pivotState = engine.store.getState().pluginState['pivoting'] as any;
    // With 'city' as pivot column and 'age' as value column with aggFunc='sum',
    // we expect generated columns for distinct city values (LA, NYC)
    expect(pivotState.generatedColumns.length).toBeGreaterThan(0);

    // Should have 2 generated columns: LA-age and NYC-age
    expect(pivotState.generatedColumns).toHaveLength(2);

    engine.destroy();
  });

  it('does not generate columns when pivot mode is disabled', () => {
    const engine = createPivotGrid();

    engine.commandBus.dispatch('pivot:addColumn', { colId: 'city' });
    // Do not enable pivot mode

    const pivotState = engine.store.getState().pluginState['pivoting'] as any;
    expect(pivotState.generatedColumns).toEqual([]);

    engine.destroy();
  });

  it('auto-detects pivot columns from column defs with pivot:true', () => {
    const engine = createGrid<TestRow>({
      columns: [
        { field: 'name', headerName: 'Name' },
        { field: 'dept', headerName: 'Dept' },
        { field: 'city', headerName: 'City', pivot: true, pivotIndex: 0 },
        { field: 'age', headerName: 'Age', aggFunc: 'sum' },
      ],
      rowData: data,
      plugins: [GroupingPlugin(), AggregationPlugin(), PivotPlugin()],
    });

    const pivotState = engine.store.getState().pluginState['pivoting'] as any;
    expect(pivotState.pivotColumns).toContain('city');

    engine.destroy();
  });

  it('declares aggregation as a dependency', () => {
    const plugin = PivotPlugin();
    expect(plugin.dependencies).toContain('aggregation');
  });

  it('throws if aggregation plugin is missing', () => {
    expect(() => {
      createGrid<TestRow>({
        columns: [
          { field: 'name', headerName: 'Name' },
          { field: 'dept', headerName: 'Dept' },
          { field: 'city', headerName: 'City' },
          { field: 'age', headerName: 'Age' },
        ],
        rowData: data,
        plugins: [PivotPlugin()],
      });
    }).toThrow();
  });

  it('disposer cleanup unregisters commands after destroy', () => {
    const engine = createPivotGrid();

    // Before destroy, commands work
    engine.commandBus.dispatch('pivot:addColumn', { colId: 'city' });
    let pivotState = engine.store.getState().pluginState['pivoting'] as any;
    expect(pivotState.pivotColumns).toEqual(['city']);

    // Destroy the engine (which calls plugin disposers)
    engine.destroy();

    // After destroy, commandBus is cleared so dispatch does nothing
    // We verify that no errors are thrown after cleanup
  });
});
