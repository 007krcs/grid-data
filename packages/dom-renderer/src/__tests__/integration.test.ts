// ─── Integration Tests: Core Engine + Plugins + DOM Renderer ───
// Verifies the full stack working together in jsdom.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { DomRenderer } from '../renderer';
import { SortingPlugin } from '../../../plugin-sorting/src/sorting-plugin';
import { SelectionPlugin } from '../../../plugin-selection/src/selection-plugin';
import { FilteringPlugin } from '../../../plugin-filtering/src/filtering-plugin';
import { EditingPlugin } from '../../../plugin-editing/src/editing-plugin';
import { PaginationPlugin } from '../../../plugin-pagination/src/pagination-plugin';

// ── Test data helpers ──

interface TestRow {
  id: string;
  name: string;
  age: number;
  city: string;
}

function makeRows(count: number): TestRow[] {
  const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
  const cities = ['NYC', 'LA', 'Chicago', 'Houston', 'Phoenix'];
  return Array.from({ length: count }, (_, i) => ({
    id: `row-${i}`,
    name: names[i % names.length]!,
    age: 25 + i * 3,
    city: cities[i % cities.length]!,
  }));
}

function defaultColumns() {
  return [
    { colId: 'name', field: 'name' as const, headerName: 'Name', sortable: true, filterable: true },
    { colId: 'age', field: 'age' as const, headerName: 'Age', sortable: true, filterable: true },
    { colId: 'city', field: 'city' as const, headerName: 'City', sortable: true, filterable: true },
  ];
}

// ── Suite ──

describe('Integration: Core + Plugins + DomRenderer', () => {
  let container: HTMLElement;
  let engine: ReturnType<typeof createGrid>;
  let renderer: DomRenderer;

  beforeEach(() => {
    container = document.createElement('div');
    // Give the container dimensions so the virtual scroller has a viewport
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true });
    Object.defineProperty(container, 'clientWidth', { value: 800, configurable: true });
    document.body.appendChild(container);
  });

  afterEach(() => {
    renderer?.destroy();
    engine?.destroy();
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  });

  // ── Helper to mount a grid ──
  function mountGrid(options: {
    rows?: TestRow[];
    columns?: any[];
    plugins?: any[];
  } = {}) {
    const rows = options.rows ?? makeRows(3);
    const columns = options.columns ?? defaultColumns();
    const plugins = options.plugins ?? [];

    engine = createGrid<TestRow>({
      columns,
      rowData: rows,
      getRowId: ({ data }) => data.id,
      plugins,
      rowHeight: 40,
    });

    renderer = new DomRenderer({
      container,
      engine,
    });

    renderer.mount();
  }

  // ──────────────────────────────────────────────
  // 1. Sort + render update
  // ──────────────────────────────────────────────
  it('should update header aria-sort when sort:toggle is dispatched', () => {
    mountGrid({ plugins: [SortingPlugin()] });

    // Verify no sort initially
    const nameHeader = container.querySelector('[data-col-id="name"][role="columnheader"]');
    expect(nameHeader).toBeTruthy();
    expect(nameHeader!.getAttribute('aria-sort')).toBeNull();

    // Dispatch sort:toggle on the 'name' column
    engine.commandBus.dispatch('sort:toggle', { colId: 'name' });

    // Re-query after sort (header re-renders)
    const updatedHeader = container.querySelector('[data-col-id="name"][role="columnheader"]');
    expect(updatedHeader).toBeTruthy();
    expect(updatedHeader!.getAttribute('aria-sort')).toBe('ascending');

    // Toggle again -> descending
    engine.commandBus.dispatch('sort:toggle', { colId: 'name' });
    const descHeader = container.querySelector('[data-col-id="name"][role="columnheader"]');
    expect(descHeader!.getAttribute('aria-sort')).toBe('descending');
  });

  // ──────────────────────────────────────────────
  // 2. Selection + render update
  // ──────────────────────────────────────────────
  it('should add gs-row-selected class and aria-selected when a row is selected', () => {
    mountGrid({ plugins: [SelectionPlugin()] });

    // Dispatch selection:select for row-0
    engine.commandBus.dispatch('selection:select', { rowId: 'row-0' });

    const rowEl = container.querySelector('[data-row-id="row-0"]');
    expect(rowEl).toBeTruthy();
    expect(rowEl!.classList.contains('gs-row-selected')).toBe(true);
    expect(rowEl!.getAttribute('aria-selected')).toBe('true');

    // Other rows should not be selected
    const row1El = container.querySelector('[data-row-id="row-1"]');
    expect(row1El).toBeTruthy();
    expect(row1El!.classList.contains('gs-row-selected')).toBe(false);
    expect(row1El!.getAttribute('aria-selected')).toBeNull();
  });

  // ──────────────────────────────────────────────
  // 3. Filter + row count
  // ──────────────────────────────────────────────
  it('should render fewer rows after applying a text filter', () => {
    mountGrid({
      rows: makeRows(5),
      plugins: [FilteringPlugin()],
    });

    // Initially all 5 rows rendered
    const initialRows = container.querySelectorAll('[role="row"][data-row-id]');
    expect(initialRows.length).toBe(5);

    // Apply a "contains" filter on name to match only 'Alice'
    engine.commandBus.dispatch('filter:setColumn', {
      colId: 'name',
      model: { filterType: 'text', type: 'contains', filter: 'Alice' },
    });

    // Now only rows whose name contains 'Alice' should be rendered
    const filteredRows = container.querySelectorAll('[role="row"][data-row-id]');
    expect(filteredRows.length).toBeLessThan(5);
    expect(filteredRows.length).toBeGreaterThan(0);

    // Verify remaining rows are the ones matching 'Alice'
    filteredRows.forEach((el) => {
      const rowId = el.getAttribute('data-row-id')!;
      const node = engine.store.getState().rowNodes.get(rowId);
      expect(node).toBeTruthy();
      expect((node!.data as TestRow).name).toBe('Alice');
    });
  });

  // ──────────────────────────────────────────────
  // 4. Data update
  // ──────────────────────────────────────────────
  it('should update aria-rowcount after setRowData', () => {
    mountGrid({ rows: makeRows(3) });

    // Initially 3 rows
    const root = container.querySelector('[role="grid"]');
    expect(root).toBeTruthy();
    expect(root!.getAttribute('aria-rowcount')).toBe('3');

    // Update with 5 new rows
    engine.api.setRowData(makeRows(5));

    expect(root!.getAttribute('aria-rowcount')).toBe('5');

    // Verify 5 rows are rendered in DOM
    const rowEls = container.querySelectorAll('[role="row"][data-row-id]');
    expect(rowEls.length).toBe(5);
  });

  // ──────────────────────────────────────────────
  // 5. Column visibility
  // ──────────────────────────────────────────────
  it('should hide a column header when setColumnVisible is called with false', () => {
    mountGrid({
      columns: [
        { colId: 'name', field: 'name' as const, headerName: 'Name' },
        { colId: 'age', field: 'age' as const, headerName: 'Age' },
        { colId: 'city', field: 'city' as const, headerName: 'City' },
        { colId: 'id', field: 'id' as const, headerName: 'ID' },
      ],
    });

    // Initially 4 column headers
    let headers = container.querySelectorAll('[role="columnheader"]');
    expect(headers.length).toBe(4);

    // Hide the 'age' column
    engine.api.setColumnVisible('age', false);

    // Now only 3 headers
    headers = container.querySelectorAll('[role="columnheader"]');
    expect(headers.length).toBe(3);

    // Verify 'age' header is gone
    const ageHeader = container.querySelector('[data-col-id="age"][role="columnheader"]');
    expect(ageHeader).toBeNull();

    // Verify aria-colcount updated
    const root = container.querySelector('[role="grid"]');
    expect(root!.getAttribute('aria-colcount')).toBe('3');
  });

  // ──────────────────────────────────────────────
  // 6. Multiple plugins coexistence
  // ──────────────────────────────────────────────
  it('should support sorting + selection + filtering together', () => {
    mountGrid({
      rows: makeRows(5),
      plugins: [SortingPlugin(), SelectionPlugin(), FilteringPlugin()],
    });

    // 1) Sort by name ascending
    engine.commandBus.dispatch('sort:toggle', { colId: 'name' });
    const nameHeader = container.querySelector('[data-col-id="name"][role="columnheader"]');
    expect(nameHeader!.getAttribute('aria-sort')).toBe('ascending');

    // Verify the first displayed row has the alphabetically first name
    const state = engine.store.getState();
    const firstRowId = state.displayedRowIds[0]!;
    const firstNode = state.rowNodes.get(firstRowId)!;
    expect((firstNode.data as TestRow).name).toBe('Alice');

    // 2) Select a row
    engine.commandBus.dispatch('selection:select', { rowId: firstRowId });
    const selectedRowEl = container.querySelector(`[data-row-id="${firstRowId}"]`);
    expect(selectedRowEl!.classList.contains('gs-row-selected')).toBe(true);
    expect(selectedRowEl!.getAttribute('aria-selected')).toBe('true');

    // 3) Apply a filter that keeps only some rows
    engine.commandBus.dispatch('filter:setColumn', {
      colId: 'age',
      model: { filterType: 'number', type: 'greaterThan', filter: 30 },
    });

    const filteredRows = container.querySelectorAll('[role="row"][data-row-id]');
    expect(filteredRows.length).toBeLessThan(5);
    expect(filteredRows.length).toBeGreaterThan(0);

    // Sorting should still be reflected
    const sortedHeader = container.querySelector('[data-col-id="name"][role="columnheader"]');
    expect(sortedHeader!.getAttribute('aria-sort')).toBe('ascending');
  });

  // ──────────────────────────────────────────────
  // 7. Destroy cleans up
  // ──────────────────────────────────────────────
  it('should empty the container after destroy', () => {
    mountGrid();

    // Grid DOM is present
    expect(container.querySelector('[role="grid"]')).toBeTruthy();
    expect(container.children.length).toBeGreaterThan(0);

    // Destroy
    renderer.destroy();

    // Container should be empty
    expect(container.querySelector('[role="grid"]')).toBeNull();
    expect(container.children.length).toBe(0);
  });

  // ──────────────────────────────────────────────
  // 8. Cell click event
  // ──────────────────────────────────────────────
  it('should emit cell:clicked when a cell is clicked', () => {
    mountGrid();

    const spy = vi.fn();
    engine.eventBus.on('cell:clicked', spy);

    // Find a cell in the DOM
    const cell = container.querySelector('[role="gridcell"]');
    expect(cell).toBeTruthy();

    // Simulate click
    cell!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        colId: expect.any(String),
        node: expect.objectContaining({ id: expect.any(String) }),
      }),
    );
  });

  // ──────────────────────────────────────────────
  // 9. Custom cell renderer
  // ──────────────────────────────────────────────
  it('should render custom cellRenderer HTML in the cell', () => {
    mountGrid({
      columns: [
        {
          colId: 'name',
          field: 'name' as const,
          headerName: 'Name',
          cellRenderer: ({ value }: { value: any }) => '<b>' + value + '</b>',
        },
        { colId: 'age', field: 'age' as const, headerName: 'Age' },
      ],
    });

    // Find the first name cell
    const nameCell = container.querySelector('[data-col-id="name"][role="gridcell"]');
    expect(nameCell).toBeTruthy();

    // Verify it contains a <b> element
    const bold = nameCell!.querySelector('b');
    expect(bold).toBeTruthy();
    expect(bold!.textContent).toBe('Alice');
  });

  // ──────────────────────────────────────────────
  // 10. Value formatter
  // ──────────────────────────────────────────────
  it('should apply valueFormatter to cell display text', () => {
    mountGrid({
      columns: [
        { colId: 'name', field: 'name' as const, headerName: 'Name' },
        {
          colId: 'age',
          field: 'age' as const,
          headerName: 'Age',
          valueFormatter: ({ value }: { value: any }) => '$' + value,
        },
      ],
    });

    // Find the first age cell
    const ageCells = container.querySelectorAll('[data-col-id="age"][role="gridcell"]');
    expect(ageCells.length).toBeGreaterThan(0);

    const firstAgeCell = ageCells[0]!;
    expect(firstAgeCell.textContent).toContain('$');
    expect(firstAgeCell.textContent).toBe('$25');
  });

  // ──────────────────────────────────────────────
  // 11. Row click emits row:clicked event
  // ──────────────────────────────────────────────
  it('should emit row:clicked via cell click propagation', () => {
    mountGrid();

    const spy = vi.fn();
    engine.eventBus.on('row:clicked', spy);

    // Click a cell (the renderer emits row:clicked for every cell click)
    const cell = container.querySelector('[role="gridcell"]');
    expect(cell).toBeTruthy();
    cell!.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        node: expect.objectContaining({ id: 'row-0' }),
      }),
    );
  });

  // ──────────────────────────────────────────────
  // 12. Sorting reorders rendered rows
  // ──────────────────────────────────────────────
  it('should reorder row DOM elements after sorting', () => {
    mountGrid({
      rows: [
        { id: 'row-0', name: 'Charlie', age: 30, city: 'NYC' },
        { id: 'row-1', name: 'Alice', age: 25, city: 'LA' },
        { id: 'row-2', name: 'Bob', age: 28, city: 'Chicago' },
      ],
      plugins: [SortingPlugin()],
    });

    // Before sorting: order is Charlie, Alice, Bob (insertion order)
    let rowIds = Array.from(container.querySelectorAll('[data-row-id]')).map(
      (el) => el.getAttribute('data-row-id'),
    );
    expect(rowIds).toEqual(['row-0', 'row-1', 'row-2']);

    // Sort by name ascending
    engine.commandBus.dispatch('sort:toggle', { colId: 'name' });

    // After sorting: Alice, Bob, Charlie
    const state = engine.store.getState();
    expect(state.displayedRowIds).toEqual(['row-1', 'row-2', 'row-0']);

    // Verify DOM rows are present for the correct IDs
    rowIds = Array.from(container.querySelectorAll('[data-row-id]')).map(
      (el) => el.getAttribute('data-row-id'),
    );
    // All three should be in the DOM
    expect(rowIds).toContain('row-0');
    expect(rowIds).toContain('row-1');
    expect(rowIds).toContain('row-2');
  });

  // ──────────────────────────────────────────────
  // 13. Pagination plugin sets page size
  // ──────────────────────────────────────────────
  it('should update pagination state when PaginationPlugin is used', () => {
    mountGrid({
      rows: makeRows(5),
      plugins: [PaginationPlugin({ pageSize: 2 })],
    });

    const state = engine.store.getState();
    expect(state.pagination.pageSize).toBe(2);
    expect(state.pagination.totalRows).toBe(5);
    expect(engine.api.paginationGetTotalPages()).toBe(3);
    expect(engine.api.paginationGetCurrentPage()).toBe(0);
  });

  // ──────────────────────────────────────────────
  // 14. Quick filter reduces displayed rows
  // ──────────────────────────────────────────────
  it('should reduce rendered rows when quick filter is applied', () => {
    mountGrid({
      rows: makeRows(5),
      plugins: [FilteringPlugin()],
    });

    // All 5 rows initially
    expect(container.querySelectorAll('[role="row"][data-row-id]').length).toBe(5);

    // Apply quick filter that matches 'Bob'
    engine.commandBus.dispatch('filter:quickFilter', { text: 'Bob' });

    const filteredRows = container.querySelectorAll('[role="row"][data-row-id]');
    expect(filteredRows.length).toBeLessThan(5);
    expect(filteredRows.length).toBeGreaterThan(0);
  });

  // ──────────────────────────────────────────────
  // 15. Cell double-click triggers editing:start with EditingPlugin
  // ──────────────────────────────────────────────
  it('should start editing on cell double-click when EditingPlugin is installed', () => {
    mountGrid({
      columns: [
        { colId: 'name', field: 'name' as const, headerName: 'Name', editable: true },
        { colId: 'age', field: 'age' as const, headerName: 'Age', editable: true },
      ],
      plugins: [SelectionPlugin(), EditingPlugin()],
    });

    const spy = vi.fn();
    engine.eventBus.on('cell:editingStarted', spy);

    // Find a cell and double-click it
    const cell = container.querySelector('[data-col-id="name"][role="gridcell"]');
    expect(cell).toBeTruthy();
    cell!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({
        colId: 'name',
        node: expect.objectContaining({ id: 'row-0' }),
      }),
    );

    // Verify editing state is set
    const editState = engine.store.getState().editing;
    expect(editState).not.toBeNull();
    expect(editState!.colId).toBe('name');
    expect(editState!.rowId).toBe('row-0');
  });

  // ──────────────────────────────────────────────
  // 16. ARIA attributes are correctly set
  // ──────────────────────────────────────────────
  it('should set proper ARIA attributes on the grid structure', () => {
    mountGrid({ rows: makeRows(3) });

    // Root grid element
    const grid = container.querySelector('[role="grid"]');
    expect(grid).toBeTruthy();
    expect(grid!.getAttribute('aria-label')).toBe('Data Grid');
    expect(grid!.getAttribute('aria-multiselectable')).toBe('true');
    expect(grid!.getAttribute('aria-rowcount')).toBe('3');
    expect(grid!.getAttribute('aria-colcount')).toBe('3');

    // Header row group
    const headerRowGroup = container.querySelector('[role="rowgroup"]');
    expect(headerRowGroup).toBeTruthy();

    // Header row
    const headerRow = container.querySelector('.gs-header-row[role="row"]');
    expect(headerRow).toBeTruthy();

    // Column headers
    const colHeaders = container.querySelectorAll('[role="columnheader"]');
    expect(colHeaders.length).toBe(3);

    // Data rows
    const dataRows = container.querySelectorAll('[data-row-id][role="row"]');
    expect(dataRows.length).toBe(3);

    // Each data row has aria-rowindex (1-based, +1 for header)
    dataRows.forEach((row, _i) => {
      expect(row.getAttribute('aria-rowindex')).toBeTruthy();
    });

    // Cells have aria-colindex
    const cells = container.querySelectorAll('[role="gridcell"]');
    expect(cells.length).toBe(9); // 3 rows * 3 columns
    cells.forEach((cell) => {
      expect(cell.getAttribute('aria-colindex')).toBeTruthy();
    });
  });

  // ──────────────────────────────────────────────
  // 17. Selection deselect on second click
  // ──────────────────────────────────────────────
  it('should deselect a row when clicked again with selection plugin', () => {
    mountGrid({ plugins: [SelectionPlugin()] });

    // Select row-0
    engine.commandBus.dispatch('selection:select', { rowId: 'row-0' });
    let rowEl = container.querySelector('[data-row-id="row-0"]');
    expect(rowEl!.classList.contains('gs-row-selected')).toBe(true);

    // Deselect row-0 by selecting again (single mode deselection)
    engine.commandBus.dispatch('selection:select', { rowId: 'row-0' });
    rowEl = container.querySelector('[data-row-id="row-0"]');
    expect(rowEl!.classList.contains('gs-row-selected')).toBe(false);
    expect(rowEl!.getAttribute('aria-selected')).toBeNull();
  });

  // ──────────────────────────────────────────────
  // 18. cellClass applied to cells
  // ──────────────────────────────────────────────
  it('should apply cellClass to rendered cells', () => {
    mountGrid({
      columns: [
        {
          colId: 'name',
          field: 'name' as const,
          headerName: 'Name',
          cellClass: 'custom-name-cell',
        },
        { colId: 'age', field: 'age' as const, headerName: 'Age' },
      ],
    });

    const nameCell = container.querySelector('[data-col-id="name"][role="gridcell"]');
    expect(nameCell).toBeTruthy();
    expect(nameCell!.classList.contains('custom-name-cell')).toBe(true);
  });

  // ──────────────────────────────────────────────
  // 19. Custom cellRenderer returning HTMLElement
  // ──────────────────────────────────────────────
  it('should support cellRenderer returning an HTMLElement', () => {
    mountGrid({
      columns: [
        {
          colId: 'name',
          field: 'name' as const,
          headerName: 'Name',
          cellRenderer: ({ value }: { value: any }) => {
            const span = document.createElement('span');
            span.className = 'custom-rendered';
            span.textContent = String(value).toUpperCase();
            return span;
          },
        },
        { colId: 'age', field: 'age' as const, headerName: 'Age' },
      ],
    });

    const nameCell = container.querySelector('[data-col-id="name"][role="gridcell"]');
    expect(nameCell).toBeTruthy();

    const customSpan = nameCell!.querySelector('span.custom-rendered');
    expect(customSpan).toBeTruthy();
    expect(customSpan!.textContent).toBe('ALICE');
  });

  // ──────────────────────────────────────────────
  // 20. Clear filter restores all rows
  // ──────────────────────────────────────────────
  it('should restore all rows when filter is cleared', () => {
    mountGrid({
      rows: makeRows(5),
      plugins: [FilteringPlugin()],
    });

    // Apply filter
    engine.commandBus.dispatch('filter:setColumn', {
      colId: 'name',
      model: { filterType: 'text', type: 'contains', filter: 'Alice' },
    });

    const filteredCount = container.querySelectorAll('[role="row"][data-row-id]').length;
    expect(filteredCount).toBeLessThan(5);

    // Clear all filters
    engine.commandBus.dispatch('filter:clear', {});

    const restoredCount = container.querySelectorAll('[role="row"][data-row-id]').length;
    expect(restoredCount).toBe(5);
  });
});
