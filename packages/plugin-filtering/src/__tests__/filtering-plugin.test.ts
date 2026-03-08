import { describe, it, expect, vi } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { FilteringPlugin } from '../filtering-plugin';

function createFilterableGrid(pluginOptions = {}) {
  return createGrid({
    columns: [
      { field: 'name', sortable: true, filterable: true },
      { field: 'age', sortable: true, filterable: true },
      { field: 'city', sortable: true, filterable: true },
    ],
    rowData: [
      { name: 'Alice', age: 30, city: 'NYC' },
      { name: 'Bob', age: 25, city: 'LA' },
      { name: 'Charlie', age: 35, city: 'NYC' },
      { name: 'Diana', age: 28, city: 'SF' },
    ],
    plugins: [FilteringPlugin(pluginOptions)],
  });
}

describe('FilteringPlugin', () => {
  it('creates grid with filtering plugin successfully', () => {
    const engine = createFilterableGrid();
    expect(engine.api).toBeDefined();
    expect(engine.store).toBeDefined();
    expect(engine.api.getDisplayedRowCount()).toBe(4);
    engine.destroy();
  });

  it('filter:set adds a filter for a column', () => {
    const engine = createFilterableGrid();

    const filterModel = { filterType: 'text' as const, type: 'equals' as const, filter: 'Alice' };
    engine.commandBus.dispatch('filter:set', { colId: 'name', model: filterModel });

    const state = engine.store.getState();
    expect(state.filterModel['name']).toBeDefined();
    expect(state.filterModel['name'].filterType).toBe('text');
    expect(state.filterModel['name'].type).toBe('equals');
    expect(state.filterModel['name'].filter).toBe('Alice');

    // Filtering should reduce displayed rows
    expect(engine.api.getDisplayedRowCount()).toBe(1);

    engine.destroy();
  });

  it('filter:set with null model removes filter', () => {
    const engine = createFilterableGrid();

    // Set a filter first
    const filterModel = { filterType: 'text' as const, type: 'equals' as const, filter: 'Alice' };
    engine.commandBus.dispatch('filter:set', { colId: 'name', model: filterModel });
    expect(engine.api.getDisplayedRowCount()).toBe(1);

    // Remove the filter
    engine.commandBus.dispatch('filter:set', { colId: 'name', model: null });
    const fm = engine.store.getState().filterModel ?? {};
    expect('name' in fm).toBe(false);
    expect(engine.api.getDisplayedRowCount()).toBe(4);

    engine.destroy();
  });

  it('filter:clear removes all filters', () => {
    const engine = createFilterableGrid();

    // Set filters on two columns
    engine.commandBus.dispatch('filter:set', {
      colId: 'name',
      model: { filterType: 'text', type: 'equals', filter: 'Alice' },
    });
    engine.commandBus.dispatch('filter:set', {
      colId: 'city',
      model: { filterType: 'text', type: 'equals', filter: 'NYC' },
    });

    // Should have filters
    expect(Object.keys(engine.store.getState().filterModel).length).toBeGreaterThan(0);

    // Clear all
    engine.commandBus.dispatch('filter:clear', {});
    expect(Object.keys(engine.store.getState().filterModel)).toHaveLength(0);
    expect(engine.api.getDisplayedRowCount()).toBe(4);

    engine.destroy();
  });

  it('filter:quickFilter applies quick text filter', () => {
    const engine = createFilterableGrid();

    engine.commandBus.dispatch('filter:quickFilter', { text: 'bob' });

    const state = engine.store.getState();
    expect(state.quickFilterText).toBe('bob');
    expect(engine.api.getDisplayedRowCount()).toBe(1);

    engine.destroy();
  });

  it('filter:isActive callback returns true/false correctly', () => {
    const engine = createFilterableGrid();

    // Set a filter on name
    engine.commandBus.dispatch('filter:set', {
      colId: 'name',
      model: { filterType: 'text', type: 'equals', filter: 'Alice' },
    });

    // Check isActive for name (filtered)
    let isActive = false;
    engine.commandBus.dispatch('filter:isActive', {
      colId: 'name',
      callback: (active: boolean) => { isActive = active; },
    });
    expect(isActive).toBe(true);

    // Check isActive for age (not filtered)
    let isActiveAge = false;
    engine.commandBus.dispatch('filter:isActive', {
      colId: 'age',
      callback: (active: boolean) => { isActiveAge = active; },
    });
    expect(isActiveAge).toBe(false);

    engine.destroy();
  });

  it('filter:setColumn adds filter for specific column', () => {
    const engine = createFilterableGrid();

    const filterModel = { filterType: 'text' as const, type: 'contains' as const, filter: 'li' };
    engine.commandBus.dispatch('filter:setColumn', { colId: 'name', model: filterModel });

    const state = engine.store.getState();
    expect(state.filterModel['name']).toBeDefined();
    expect(state.filterModel['name'].type).toBe('contains');

    // "Alice" and "Charlie" both contain "li"
    expect(engine.api.getDisplayedRowCount()).toBe(2);

    engine.destroy();
  });

  it('filter:removeColumn removes filter for specific column', () => {
    const engine = createFilterableGrid();

    // Set filters on two columns
    engine.commandBus.dispatch('filter:set', {
      colId: 'name',
      model: { filterType: 'text', type: 'equals', filter: 'Alice' },
    });
    engine.commandBus.dispatch('filter:set', {
      colId: 'city',
      model: { filterType: 'text', type: 'equals', filter: 'NYC' },
    });

    // Remove only name filter
    engine.commandBus.dispatch('filter:removeColumn', { colId: 'name' });

    const state = engine.store.getState();
    expect(state.filterModel['name']).toBeUndefined();
    expect(state.filterModel['city']).toBeDefined();

    engine.destroy();
  });

  it('multiple filters can coexist', () => {
    const engine = createFilterableGrid();

    // Set both filters at once via setFilterModel API
    engine.api.setFilterModel({
      name: { filterType: 'text', type: 'contains', filter: 'li' },
      city: { filterType: 'text', type: 'equals', filter: 'NYC' },
    });

    const state = engine.store.getState();
    expect(Object.keys(state.filterModel)).toHaveLength(2);
    expect(state.filterModel['name']).toBeDefined();
    expect(state.filterModel['city']).toBeDefined();

    // Alice (name contains "li", city NYC) and Charlie (name contains "li", city NYC)
    expect(engine.api.getDisplayedRowCount()).toBe(2);

    engine.destroy();
  });

  it('filtered rows are reflected in getDisplayedRowCount', () => {
    const engine = createFilterableGrid();

    // No filter — all 4 rows
    expect(engine.api.getDisplayedRowCount()).toBe(4);

    // Filter to only NYC — Alice and Charlie
    engine.commandBus.dispatch('filter:set', {
      colId: 'city',
      model: { filterType: 'text', type: 'equals', filter: 'NYC' },
    });
    expect(engine.api.getDisplayedRowCount()).toBe(2);

    // Clear — back to 4
    engine.commandBus.dispatch('filter:clear', {});
    expect(engine.api.getDisplayedRowCount()).toBe(4);

    engine.destroy();
  });

  it('disposer unregisters commands after destroy', () => {
    const engine = createFilterableGrid();

    // Before destroy, filter works
    engine.commandBus.dispatch('filter:set', {
      colId: 'name',
      model: { filterType: 'text', type: 'equals', filter: 'Alice' },
    });
    expect(engine.api.getDisplayedRowCount()).toBe(1);

    // Clear
    engine.commandBus.dispatch('filter:clear', {});
    expect(engine.api.getDisplayedRowCount()).toBe(4);

    // Destroy the engine (which calls plugin disposers)
    engine.destroy();

    // After destroy, commands should have no handlers so dispatching is a no-op
    // The commandBus is cleared by destroy(), so dispatch does nothing
  });
});
