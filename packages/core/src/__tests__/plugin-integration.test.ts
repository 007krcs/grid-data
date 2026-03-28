import { describe, it, expect, vi } from 'vitest';
import { createGrid } from '../engine/grid-engine';
import { ErrorHandler } from '../errors/error-handler';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { FilteringPlugin } from '@gridstorm/plugin-filtering';
import { SelectionPlugin } from '@gridstorm/plugin-selection';
import { PaginationPlugin } from '@gridstorm/plugin-pagination';
import { GroupingPlugin } from '@gridstorm/plugin-grouping';
import { EditingPlugin } from '@gridstorm/plugin-editing';

// ─── Test Data Factories ───

function makeEmployeeData() {
  return [
    { name: 'Alice', age: 30, dept: 'Engineering', salary: 120000 },
    { name: 'Bob', age: 25, dept: 'Marketing', salary: 80000 },
    { name: 'Charlie', age: 35, dept: 'Engineering', salary: 150000 },
    { name: 'Diana', age: 28, dept: 'Marketing', salary: 90000 },
    { name: 'Eve', age: 32, dept: 'Engineering', salary: 140000 },
    { name: 'Frank', age: 40, dept: 'Sales', salary: 100000 },
    { name: 'Grace', age: 27, dept: 'Sales', salary: 85000 },
    { name: 'Hank', age: 45, dept: 'Engineering', salary: 160000 },
    { name: 'Ivy', age: 33, dept: 'Marketing', salary: 95000 },
    { name: 'Jack', age: 29, dept: 'Sales', salary: 88000 },
  ];
}

/** Helper to get all displayed rows as an array */
function getDisplayedRows(engine: ReturnType<typeof createGrid>) {
  const count = engine.api.getDisplayedRowCount();
  const rows: any[] = [];
  for (let i = 0; i < count; i++) {
    const row = engine.api.getDisplayedRowAtIndex(i);
    if (row) rows.push(row);
  }
  return rows;
}

function createFullGrid(plugins: any[] = [], overrides: any = {}) {
  return createGrid({
    columns: [
      { field: 'name', sortable: true, filterable: true, editable: true },
      { field: 'age', sortable: true, filterable: true },
      { field: 'dept', sortable: true, filterable: true },
      { field: 'salary', sortable: true, filterable: true },
    ],
    rowData: makeEmployeeData(),
    plugins,
    ...overrides,
  });
}

// ─── Integration Tests ───

describe('Plugin Integration: Sorting + Filtering', () => {
  it('should filter first then sort the filtered results', () => {
    const engine = createFullGrid([SortingPlugin(), FilteringPlugin()]);

    // Filter to Engineering only
    engine.commandBus.dispatch('filter:set', {
      colId: 'dept',
      model: { filterType: 'text', type: 'equals', filter: 'Engineering' },
    });

    expect(engine.api.getDisplayedRowCount()).toBe(4); // Alice, Charlie, Eve, Hank

    // Sort by salary descending
    engine.commandBus.dispatch('sort:set', {
      sortModel: [{ colId: 'salary', sort: 'desc' }],
    });

    const rows = getDisplayedRows(engine);
    expect(rows[0]!.data.name).toBe('Hank'); // 160k
    expect(rows[1]!.data.name).toBe('Charlie'); // 150k
    expect(rows[2]!.data.name).toBe('Eve'); // 140k
    expect(rows[3]!.data.name).toBe('Alice'); // 120k

    engine.destroy();
  });

  it('should maintain sort order when filter changes', () => {
    const engine = createFullGrid([SortingPlugin(), FilteringPlugin()]);

    // Sort by name ascending first
    engine.commandBus.dispatch('sort:set', {
      sortModel: [{ colId: 'name', sort: 'asc' }],
    });

    // Then filter to Sales
    engine.commandBus.dispatch('filter:set', {
      colId: 'dept',
      model: { filterType: 'text', type: 'equals', filter: 'Sales' },
    });

    const rows = getDisplayedRows(engine);
    expect(rows.length).toBe(3);
    // Should still be sorted by name
    expect(rows[0]!.data.name).toBe('Frank');
    expect(rows[1]!.data.name).toBe('Grace');
    expect(rows[2]!.data.name).toBe('Jack');

    engine.destroy();
  });

  it('should clear filter and restore full dataset', () => {
    const engine = createFullGrid([SortingPlugin(), FilteringPlugin()]);

    // Filter
    engine.commandBus.dispatch('filter:set', {
      colId: 'dept',
      model: { filterType: 'text', type: 'equals', filter: 'Engineering' },
    });
    expect(engine.api.getDisplayedRowCount()).toBe(4);

    // Clear filter
    engine.commandBus.dispatch('filter:set', { colId: 'dept', model: null });
    expect(engine.api.getDisplayedRowCount()).toBe(10);

    engine.destroy();
  });
});

describe('Plugin Integration: Sorting + Selection', () => {
  it('should preserve selection after sorting', () => {
    const engine = createFullGrid([SortingPlugin(), SelectionPlugin()]);

    // Get first row ID
    const firstRow = engine.api.getDisplayedRowAtIndex(0)!;

    // Select row
    engine.commandBus.dispatch('selection:select', { rowId: firstRow.id });

    let selection = engine.store.getState().selection.selectedRowIds;
    expect(selection.has(firstRow.id)).toBe(true);

    // Sort — selection should persist
    engine.commandBus.dispatch('sort:set', {
      sortModel: [{ colId: 'name', sort: 'desc' }],
    });

    selection = engine.store.getState().selection.selectedRowIds;
    expect(selection.has(firstRow.id)).toBe(true);

    engine.destroy();
  });
});

describe('Plugin Integration: Filtering + Pagination', () => {
  it('should paginate filtered data correctly', () => {
    const engine = createFullGrid([FilteringPlugin(), PaginationPlugin({ pageSize: 3 })]);

    // Initially page 1 has 3 of 10 rows
    expect(engine.api.getDisplayedRowCount()).toBe(3);

    // Filter to Engineering (4 rows) — page 1 should now show 3 of 4
    engine.commandBus.dispatch('filter:set', {
      colId: 'dept',
      model: { filterType: 'text', type: 'equals', filter: 'Engineering' },
    });

    // Total filtered rows is 4, page size is 3
    expect(engine.api.getDisplayedRowCount()).toBeLessThanOrEqual(4);

    engine.destroy();
  });
});

describe('Plugin Integration: Sorting + Filtering + Pagination', () => {
  it('should sort filtered results and paginate correctly', () => {
    const engine = createFullGrid([
      SortingPlugin(),
      FilteringPlugin(),
      PaginationPlugin({ pageSize: 2 }),
    ]);

    // Filter to Engineering (4 people)
    engine.commandBus.dispatch('filter:set', {
      colId: 'dept',
      model: { filterType: 'text', type: 'equals', filter: 'Engineering' },
    });

    // Sort by salary ascending
    engine.commandBus.dispatch('sort:set', {
      sortModel: [{ colId: 'salary', sort: 'asc' }],
    });

    // Page 1 should have first 2 lowest-salary engineers
    const rows = getDisplayedRows(engine);
    expect(rows.length).toBe(2);
    expect(rows[0]!.data.name).toBe('Alice'); // 120k
    expect(rows[1]!.data.name).toBe('Eve'); // 140k

    engine.destroy();
  });
});

describe('Plugin Integration: Selection + Editing', () => {
  it('should allow editing a selected cell', () => {
    const engine = createFullGrid([SelectionPlugin(), EditingPlugin()]);

    const row = engine.api.getDisplayedRowAtIndex(0)!;

    // Select a row first
    engine.commandBus.dispatch('selection:select', { rowId: row.id });

    // Start editing
    engine.commandBus.dispatch('editing:start', {
      rowId: row.id,
      colId: 'name',
    });

    const editState = engine.store.getState().editing;
    expect(editState).not.toBeNull();
    expect(editState?.rowId).toBe(row.id);
    expect(editState?.colId).toBe('name');

    // Set a new value then stop editing
    engine.commandBus.dispatch('editing:setValue', { value: 'Alice Updated' });
    engine.commandBus.dispatch('editing:stop', {});

    // Editing state should be cleared
    expect(engine.store.getState().editing).toBeNull();

    engine.destroy();
  });
});

describe('Plugin Integration: Grouping + Sorting', () => {
  it('should group and sort without crashing', () => {
    const engine = createFullGrid([GroupingPlugin(), SortingPlugin()]);

    // Group by department
    engine.commandBus.dispatch('group:setColumns', { colIds: ['dept'] });

    // Sort by name ascending within each group
    engine.commandBus.dispatch('sort:set', {
      sortModel: [{ colId: 'name', sort: 'asc' }],
    });

    const count = engine.api.getDisplayedRowCount();
    expect(count).toBeGreaterThan(0);

    engine.destroy();
  });
});

describe('Plugin Integration: Multiple Sorts', () => {
  it('should support multi-column sorting', () => {
    const engine = createFullGrid([SortingPlugin({ multiSort: true })]);

    // Sort by dept asc, then salary desc
    engine.commandBus.dispatch('sort:set', {
      sortModel: [
        { colId: 'dept', sort: 'asc' },
        { colId: 'salary', sort: 'desc' },
      ],
    });

    const rows = getDisplayedRows(engine);
    // Engineering should come first (alphabetically)
    expect(rows[0]!.data.dept).toBe('Engineering');
    // Within Engineering, highest salary first
    expect(rows[0]!.data.name).toBe('Hank'); // 160k

    engine.destroy();
  });
});

describe('Plugin Integration: All Core Plugins Together', () => {
  it('should initialize with all core plugins without conflicts', () => {
    const engine = createFullGrid([
      SortingPlugin(),
      FilteringPlugin(),
      SelectionPlugin(),
      PaginationPlugin({ pageSize: 5 }),
      EditingPlugin(),
    ]);

    expect(engine.api).toBeDefined();
    expect(engine.api.getDisplayedRowCount()).toBe(5); // first page of 10

    engine.destroy();
  });

  it('should maintain consistency across sort -> filter -> paginate cycle', () => {
    const engine = createFullGrid([
      SortingPlugin(),
      FilteringPlugin(),
      PaginationPlugin({ pageSize: 5 }),
    ]);

    // Step 1: Sort by name
    engine.commandBus.dispatch('sort:set', {
      sortModel: [{ colId: 'name', sort: 'asc' }],
    });

    // Step 2: Filter to Engineering
    engine.commandBus.dispatch('filter:set', {
      colId: 'dept',
      model: { filterType: 'text', type: 'equals', filter: 'Engineering' },
    });

    // Step 3: Verify results (4 engineers, all fit on one page of 5)
    const rows = getDisplayedRows(engine);
    expect(rows.length).toBe(4);

    // Names should be sorted ascending
    const names = rows.map((r: any) => r.data.name);
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);

    engine.destroy();
  });

  it('should handle rapid sequential operations', () => {
    const engine = createFullGrid([SortingPlugin(), FilteringPlugin(), SelectionPlugin()]);

    const firstRow = engine.api.getDisplayedRowAtIndex(0)!;

    // Rapid fire operations
    engine.commandBus.dispatch('sort:set', { sortModel: [{ colId: 'age', sort: 'asc' }] });
    engine.commandBus.dispatch('selection:select', { rowId: firstRow.id });
    engine.commandBus.dispatch('filter:set', {
      colId: 'dept',
      model: { filterType: 'text', type: 'equals', filter: 'Engineering' },
    });
    engine.commandBus.dispatch('sort:set', { sortModel: [{ colId: 'name', sort: 'desc' }] });

    // Should not crash and state should be consistent
    const count = engine.api.getDisplayedRowCount();
    expect(count).toBe(4);

    engine.destroy();
  });

  it('should emit events for all plugin operations', () => {
    const engine = createFullGrid([SortingPlugin(), FilteringPlugin()]);
    const events: string[] = [];

    engine.eventBus.on('column:sort:changed', () => events.push('sort'));
    engine.eventBus.on('filter:changed', () => events.push('filter'));

    engine.commandBus.dispatch('sort:set', {
      sortModel: [{ colId: 'name', sort: 'asc' }],
    });
    engine.commandBus.dispatch('filter:set', {
      colId: 'dept',
      model: { filterType: 'text', type: 'equals', filter: 'Engineering' },
    });

    expect(events).toContain('sort');
    expect(events).toContain('filter');

    engine.destroy();
  });
});

describe('Plugin Integration: Error Handling', () => {
  it('should report command handler errors through ErrorHandler', () => {
    const errorHandler = new ErrorHandler();
    errorHandler.setSuppressConsole(true);
    const errorSpy = vi.fn();
    errorHandler.onError(errorSpy);

    const engine = createFullGrid([SortingPlugin()]);
    engine.commandBus.setErrorHandler(errorHandler);

    // Register a broken handler
    engine.commandBus.registerHandler('sort:set', () => {
      throw new Error('intentional test error');
    });

    engine.commandBus.dispatch('sort:set', {
      sortModel: [{ colId: 'name', sort: 'asc' }],
    });

    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls[0]![0]!.context.source).toBe('command');

    engine.destroy();
  });

  it('should report event listener errors through ErrorHandler', () => {
    const errorHandler = new ErrorHandler();
    errorHandler.setSuppressConsole(true);
    const errorSpy = vi.fn();
    errorHandler.onError(errorSpy);

    const engine = createFullGrid([SortingPlugin()]);
    engine.eventBus.setErrorHandler(errorHandler);

    // Use the correct event name emitted by the core engine
    engine.eventBus.on('column:sort:changed', () => {
      throw new Error('listener error');
    });

    engine.commandBus.dispatch('sort:set', {
      sortModel: [{ colId: 'name', sort: 'asc' }],
    });

    expect(errorSpy).toHaveBeenCalled();
    expect(errorSpy.mock.calls[0]![0]!.context.source).toBe('event');

    engine.destroy();
  });
});
