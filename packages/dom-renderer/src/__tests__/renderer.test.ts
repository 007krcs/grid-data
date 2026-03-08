// ─── DomRenderer Tests ───
// Comprehensive tests for DOM structure, ARIA attributes, header/row/cell
// rendering, sort indicators, selection visuals, cleanup, and interactions.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGrid } from '@gridstorm/core';
import type { GridEngine } from '@gridstorm/core';
import { DomRenderer } from '../renderer';
import { SortingPlugin } from '../../../plugin-sorting/src/sorting-plugin';
import { SelectionPlugin } from '../../../plugin-selection/src/selection-plugin';

// ── Test data ──

interface TestRow {
  name: string;
  age: number;
  city: string;
}

const TEST_COLUMNS = [
  { field: 'name' as const, headerName: 'Name', sortable: true, width: 150 },
  { field: 'age' as const, headerName: 'Age', sortable: true, width: 100 },
  { field: 'city' as const, headerName: 'City', sortable: false, width: 200 },
];

const TEST_DATA: TestRow[] = [
  { name: 'Alice', age: 30, city: 'New York' },
  { name: 'Bob', age: 25, city: 'London' },
  { name: 'Charlie', age: 35, city: 'Tokyo' },
];

// ── Helpers ──

function createTestGrid(overrides: Record<string, any> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);

  const engine = createGrid<TestRow>({
    columns: TEST_COLUMNS,
    rowData: TEST_DATA,
    plugins: [SortingPlugin(), SelectionPlugin()],
    ...overrides,
  });

  const renderer = new DomRenderer({ container, engine });

  return { container, engine, renderer };
}

function mountAndGetRoot(renderer: DomRenderer, container: HTMLElement): HTMLElement {
  renderer.mount();
  const root = container.querySelector('.gs-root') as HTMLElement;
  return root;
}

// ── Suite ──

describe('DomRenderer', () => {
  let container: HTMLElement;
  let engine: GridEngine<TestRow>;
  let renderer: DomRenderer;

  beforeEach(() => {
    const ctx = createTestGrid();
    container = ctx.container;
    engine = ctx.engine;
    renderer = ctx.renderer;
  });

  afterEach(() => {
    renderer.destroy();
    engine.destroy();
    if (container.parentElement) {
      container.parentElement.removeChild(container);
    }
  });

  // ── 1. DOM Structure Creation ──

  describe('DOM structure creation', () => {
    it('should create .gs-root with role="grid"', () => {
      renderer.mount();

      const root = container.querySelector('.gs-root');
      expect(root).not.toBeNull();
      expect(root!.getAttribute('role')).toBe('grid');
    });

    it('should create .gs-header with role="rowgroup"', () => {
      renderer.mount();

      const header = container.querySelector('.gs-header');
      expect(header).not.toBeNull();
      expect(header!.getAttribute('role')).toBe('rowgroup');
    });

    it('should create .gs-body with role="rowgroup"', () => {
      renderer.mount();

      const body = container.querySelector('.gs-body');
      expect(body).not.toBeNull();
      expect(body!.getAttribute('role')).toBe('rowgroup');
    });

    it('should create .gs-body-viewport', () => {
      renderer.mount();

      const viewport = container.querySelector('.gs-body-viewport');
      expect(viewport).not.toBeNull();
    });

    it('should nest elements in correct hierarchy: root > wrapper > header + viewport > body', () => {
      renderer.mount();

      const root = container.querySelector('.gs-root')!;
      const wrapper = root.querySelector('.gs-wrapper')!;
      expect(wrapper).not.toBeNull();

      const header = wrapper.querySelector('.gs-header');
      const viewport = wrapper.querySelector('.gs-body-viewport');
      expect(header).not.toBeNull();
      expect(viewport).not.toBeNull();

      const body = viewport!.querySelector('.gs-body');
      expect(body).not.toBeNull();
    });
  });

  // ── 2. ARIA Attributes ──

  describe('ARIA attributes', () => {
    it('should set aria-label="Data Grid" by default', () => {
      renderer.mount();

      const root = container.querySelector('.gs-root')!;
      expect(root.getAttribute('aria-label')).toBe('Data Grid');
    });

    it('should set aria-rowcount to the number of displayed rows', () => {
      renderer.mount();

      const root = container.querySelector('.gs-root')!;
      expect(root.getAttribute('aria-rowcount')).toBe('3');
    });

    it('should set aria-colcount to the number of visible columns', () => {
      renderer.mount();

      const root = container.querySelector('.gs-root')!;
      expect(root.getAttribute('aria-colcount')).toBe('3');
    });

    it('should set aria-multiselectable="true"', () => {
      renderer.mount();

      const root = container.querySelector('.gs-root')!;
      expect(root.getAttribute('aria-multiselectable')).toBe('true');
    });

    it('should create an aria-live region for announcements', () => {
      renderer.mount();

      const liveRegion = container.querySelector('.gs-live-region');
      expect(liveRegion).not.toBeNull();
      expect(liveRegion!.getAttribute('aria-live')).toBe('polite');
      expect(liveRegion!.getAttribute('aria-atomic')).toBe('true');
    });
  });

  // ── 3. Header Rendering ──

  describe('Header rendering', () => {
    it('should create a header row with role="row"', () => {
      renderer.mount();

      const headerRow = container.querySelector('.gs-header-row');
      expect(headerRow).not.toBeNull();
      expect(headerRow!.getAttribute('role')).toBe('row');
    });

    it('should create header cells for each visible column', () => {
      renderer.mount();

      const headerCells = container.querySelectorAll('.gs-header-cell');
      expect(headerCells.length).toBe(3);
    });

    it('should set role="columnheader" on each header cell', () => {
      renderer.mount();

      const headerCells = container.querySelectorAll('.gs-header-cell');
      headerCells.forEach((cell) => {
        expect(cell.getAttribute('role')).toBe('columnheader');
      });
    });

    it('should set correct data-col-id on header cells', () => {
      renderer.mount();

      const headerCells = container.querySelectorAll('.gs-header-cell');
      expect(headerCells[0]!.getAttribute('data-col-id')).toBe('name');
      expect(headerCells[1]!.getAttribute('data-col-id')).toBe('age');
      expect(headerCells[2]!.getAttribute('data-col-id')).toBe('city');
    });

    it('should render column name text in header cells', () => {
      renderer.mount();

      const headerCells = container.querySelectorAll('.gs-header-cell');
      expect(headerCells[0]!.textContent).toContain('Name');
      expect(headerCells[1]!.textContent).toContain('Age');
      expect(headerCells[2]!.textContent).toContain('City');
    });
  });

  // ── 4. Row Rendering ──

  describe('Row rendering', () => {
    it('should render data rows with role="row"', () => {
      renderer.mount();

      const rows = container.querySelectorAll('.gs-body .gs-row');
      expect(rows.length).toBe(3);
      rows.forEach((row) => {
        expect(row.getAttribute('role')).toBe('row');
      });
    });

    it('should set aria-rowindex on each row (1-based + header offset)', () => {
      renderer.mount();

      const rows = container.querySelectorAll('.gs-body .gs-row');
      // aria-rowindex is displayIndex + 2 (1-based + header row)
      expect(rows[0]!.getAttribute('aria-rowindex')).toBe('2');
      expect(rows[1]!.getAttribute('aria-rowindex')).toBe('3');
      expect(rows[2]!.getAttribute('aria-rowindex')).toBe('4');
    });

    it('should set data-row-id on each row', () => {
      renderer.mount();

      const rows = container.querySelectorAll('.gs-body .gs-row');
      expect(rows.length).toBe(3);

      const rowIds = Array.from(rows).map((r) => r.getAttribute('data-row-id'));
      // Default IDs are row-0, row-1, row-2
      expect(rowIds).toContain('row-0');
      expect(rowIds).toContain('row-1');
      expect(rowIds).toContain('row-2');
    });
  });

  // ── 5. Cell Rendering ──

  describe('Cell rendering', () => {
    it('should create cells with role="gridcell"', () => {
      renderer.mount();

      const cells = container.querySelectorAll('.gs-body .gs-cell');
      expect(cells.length).toBe(9); // 3 rows x 3 columns
      cells.forEach((cell) => {
        expect(cell.getAttribute('role')).toBe('gridcell');
      });
    });

    it('should set aria-colindex on each cell (1-based)', () => {
      renderer.mount();

      const firstRow = container.querySelector('.gs-body .gs-row')!;
      const cells = firstRow.querySelectorAll('.gs-cell');
      expect(cells[0]!.getAttribute('aria-colindex')).toBe('1');
      expect(cells[1]!.getAttribute('aria-colindex')).toBe('2');
      expect(cells[2]!.getAttribute('aria-colindex')).toBe('3');
    });

    it('should render correct text content matching row data', () => {
      renderer.mount();

      const rows = container.querySelectorAll('.gs-body .gs-row');

      // Find the row for Alice (row-0)
      const aliceRow = container.querySelector('[data-row-id="row-0"]')!;
      const aliceCells = aliceRow.querySelectorAll('.gs-cell');
      expect(aliceCells[0]!.textContent).toBe('Alice');
      expect(aliceCells[1]!.textContent).toBe('30');
      expect(aliceCells[2]!.textContent).toBe('New York');

      // Find the row for Bob (row-1)
      const bobRow = container.querySelector('[data-row-id="row-1"]')!;
      const bobCells = bobRow.querySelectorAll('.gs-cell');
      expect(bobCells[0]!.textContent).toBe('Bob');
      expect(bobCells[1]!.textContent).toBe('25');
      expect(bobCells[2]!.textContent).toBe('London');
    });

    it('should set data-col-id on each cell', () => {
      renderer.mount();

      const firstRow = container.querySelector('.gs-body .gs-row')!;
      const cells = firstRow.querySelectorAll('.gs-cell');
      expect(cells[0]!.getAttribute('data-col-id')).toBe('name');
      expect(cells[1]!.getAttribute('data-col-id')).toBe('age');
      expect(cells[2]!.getAttribute('data-col-id')).toBe('city');
    });
  });

  // ── 6. Sort Indicator ──

  describe('Sort indicator', () => {
    it('should show aria-sort="ascending" and sort icon after sorting', () => {
      renderer.mount();

      // Dispatch sort:toggle on the "name" column
      engine.commandBus.dispatch('sort:toggle', { colId: 'name', multiSort: false });

      // Re-query header cells after sort triggers header re-render
      const nameHeader = container.querySelector('[data-col-id="name"].gs-header-cell')!;
      expect(nameHeader.getAttribute('aria-sort')).toBe('ascending');

      const sortIcon = nameHeader.querySelector('.gs-sort-icon');
      expect(sortIcon).not.toBeNull();
      expect(sortIcon!.textContent).toBe('\u25B2'); // ▲
    });

    it('should show aria-sort="descending" after toggling sort twice', () => {
      renderer.mount();

      // First toggle -> asc
      engine.commandBus.dispatch('sort:toggle', { colId: 'name', multiSort: false });
      // Second toggle -> desc
      engine.commandBus.dispatch('sort:toggle', { colId: 'name', multiSort: false });

      const nameHeader = container.querySelector('[data-col-id="name"].gs-header-cell')!;
      expect(nameHeader.getAttribute('aria-sort')).toBe('descending');

      const sortIcon = nameHeader.querySelector('.gs-sort-icon');
      expect(sortIcon).not.toBeNull();
      expect(sortIcon!.textContent).toBe('\u25BC'); // ▼
    });

    it('should remove aria-sort after cycling past descending', () => {
      renderer.mount();

      // asc -> desc -> null
      engine.commandBus.dispatch('sort:toggle', { colId: 'name', multiSort: false });
      engine.commandBus.dispatch('sort:toggle', { colId: 'name', multiSort: false });
      engine.commandBus.dispatch('sort:toggle', { colId: 'name', multiSort: false });

      const nameHeader = container.querySelector('[data-col-id="name"].gs-header-cell')!;
      expect(nameHeader.getAttribute('aria-sort')).toBeNull();
    });
  });

  // ── 7. Selection Visual ──

  describe('Selection visual', () => {
    it('should add gs-row-selected class and aria-selected="true" on selected row', () => {
      renderer.mount();

      // Select the first row via the selection plugin command
      engine.commandBus.dispatch('selection:select', {
        rowId: 'row-0',
        source: 'click',
      });

      const row = container.querySelector('[data-row-id="row-0"]')!;
      expect(row.classList.contains('gs-row-selected')).toBe(true);
      expect(row.getAttribute('aria-selected')).toBe('true');
    });

    it('should not set aria-selected on unselected rows', () => {
      renderer.mount();

      // Select only row-0
      engine.commandBus.dispatch('selection:select', {
        rowId: 'row-0',
        source: 'click',
      });

      const unselectedRow = container.querySelector('[data-row-id="row-1"]')!;
      expect(unselectedRow.classList.contains('gs-row-selected')).toBe(false);
      expect(unselectedRow.getAttribute('aria-selected')).toBeNull();
    });

    it('should remove selection visual when row is deselected', () => {
      renderer.mount();

      // Select row-0
      engine.commandBus.dispatch('selection:select', {
        rowId: 'row-0',
        source: 'click',
      });

      // Deselect by selecting another row (single selection mode by default)
      engine.commandBus.dispatch('selection:select', {
        rowId: 'row-1',
        source: 'click',
      });

      const row0 = container.querySelector('[data-row-id="row-0"]')!;
      expect(row0.classList.contains('gs-row-selected')).toBe(false);
      expect(row0.getAttribute('aria-selected')).toBeNull();
    });
  });

  // ── 8. Destroy Cleanup ──

  describe('Destroy cleanup', () => {
    it('should remove the root element from the container after destroy()', () => {
      renderer.mount();

      expect(container.querySelector('.gs-root')).not.toBeNull();

      renderer.destroy();

      expect(container.querySelector('.gs-root')).toBeNull();
    });

    it('should leave the container element intact after destroy()', () => {
      renderer.mount();
      renderer.destroy();

      expect(container.parentElement).toBe(document.body);
      expect(container.children.length).toBe(0);
    });
  });

  // ── 9. Custom ariaLabel ──

  describe('Custom ariaLabel', () => {
    it('should use custom ariaLabel from grid config', () => {
      // Clean up the default setup
      renderer.destroy();
      engine.destroy();
      if (container.parentElement) {
        container.parentElement.removeChild(container);
      }

      // Create new grid with custom ariaLabel
      const ctx = createTestGrid({ ariaLabel: 'My Grid' });
      container = ctx.container;
      engine = ctx.engine;
      renderer = ctx.renderer;

      renderer.mount();

      const root = container.querySelector('.gs-root')!;
      expect(root.getAttribute('aria-label')).toBe('My Grid');
    });
  });

  // ── 10. Hidden Columns ──

  describe('Hidden columns', () => {
    it('should not render hidden columns in header', () => {
      // Clean up the default setup
      renderer.destroy();
      engine.destroy();
      if (container.parentElement) {
        container.parentElement.removeChild(container);
      }

      // Create grid with one hidden column
      const ctx = createTestGrid({
        columns: [
          { field: 'name', headerName: 'Name', sortable: true, width: 150 },
          { field: 'age', headerName: 'Age', sortable: true, width: 100, hide: true },
          { field: 'city', headerName: 'City', sortable: false, width: 200 },
        ],
      });
      container = ctx.container;
      engine = ctx.engine;
      renderer = ctx.renderer;

      renderer.mount();

      const headerCells = container.querySelectorAll('.gs-header-cell');
      expect(headerCells.length).toBe(2);

      const colIds = Array.from(headerCells).map((c) => c.getAttribute('data-col-id'));
      expect(colIds).toContain('name');
      expect(colIds).toContain('city');
      expect(colIds).not.toContain('age');
    });

    it('should not render hidden column cells in data rows', () => {
      // Clean up the default setup
      renderer.destroy();
      engine.destroy();
      if (container.parentElement) {
        container.parentElement.removeChild(container);
      }

      const ctx = createTestGrid({
        columns: [
          { field: 'name', headerName: 'Name', sortable: true, width: 150 },
          { field: 'age', headerName: 'Age', sortable: true, width: 100, hide: true },
          { field: 'city', headerName: 'City', sortable: false, width: 200 },
        ],
      });
      container = ctx.container;
      engine = ctx.engine;
      renderer = ctx.renderer;

      renderer.mount();

      const firstRow = container.querySelector('.gs-body .gs-row')!;
      const cells = firstRow.querySelectorAll('.gs-cell');
      expect(cells.length).toBe(2);

      const cellColIds = Array.from(cells).map((c) => c.getAttribute('data-col-id'));
      expect(cellColIds).not.toContain('age');
    });

    it('should update aria-colcount to reflect visible columns only', () => {
      // Clean up the default setup
      renderer.destroy();
      engine.destroy();
      if (container.parentElement) {
        container.parentElement.removeChild(container);
      }

      const ctx = createTestGrid({
        columns: [
          { field: 'name', headerName: 'Name', sortable: true, width: 150 },
          { field: 'age', headerName: 'Age', sortable: true, width: 100, hide: true },
          { field: 'city', headerName: 'City', sortable: false, width: 200 },
        ],
      });
      container = ctx.container;
      engine = ctx.engine;
      renderer = ctx.renderer;

      renderer.mount();

      const root = container.querySelector('.gs-root')!;
      expect(root.getAttribute('aria-colcount')).toBe('2');
    });
  });

  // ── 11. Row Update on Data Change ──

  describe('Row update on data change', () => {
    it('should update cells when setRowData is called with new data', () => {
      renderer.mount();

      // Verify initial data
      let row0 = container.querySelector('[data-row-id="row-0"]')!;
      let nameCells = row0.querySelectorAll('.gs-cell');
      expect(nameCells[0]!.textContent).toBe('Alice');

      // Update data
      engine.api.setRowData([
        { name: 'Zara', age: 28, city: 'Paris' },
        { name: 'Oscar', age: 40, city: 'Berlin' },
      ]);

      // The rows should now reflect the new data
      const rows = container.querySelectorAll('.gs-body .gs-row');
      expect(rows.length).toBe(2);

      row0 = container.querySelector('[data-row-id="row-0"]')!;
      nameCells = row0.querySelectorAll('.gs-cell');
      expect(nameCells[0]!.textContent).toBe('Zara');
      expect(nameCells[1]!.textContent).toBe('28');
      expect(nameCells[2]!.textContent).toBe('Paris');

      const row1 = container.querySelector('[data-row-id="row-1"]')!;
      const row1Cells = row1.querySelectorAll('.gs-cell');
      expect(row1Cells[0]!.textContent).toBe('Oscar');
      expect(row1Cells[1]!.textContent).toBe('40');
      expect(row1Cells[2]!.textContent).toBe('Berlin');
    });

    it('should update aria-rowcount when row count changes', () => {
      renderer.mount();

      const root = container.querySelector('.gs-root')!;
      expect(root.getAttribute('aria-rowcount')).toBe('3');

      engine.api.setRowData([{ name: 'Solo', age: 1, city: 'Mars' }]);

      expect(root.getAttribute('aria-rowcount')).toBe('1');
    });
  });

  // ── 12. Cell Click Emits Event ──

  describe('Cell click emits event', () => {
    it('should emit cell:clicked event when a cell is clicked', () => {
      renderer.mount();

      const listener = vi.fn();
      engine.eventBus.on('cell:clicked', listener);

      // Click the first cell (name column of first row)
      const firstCell = container.querySelector('.gs-body .gs-row .gs-cell')!;
      firstCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          colId: 'name',
          value: expect.anything(),
        }),
      );
    });

    it('should emit row:clicked event when a cell is clicked', () => {
      renderer.mount();

      const listener = vi.fn();
      engine.eventBus.on('row:clicked', listener);

      const firstCell = container.querySelector('.gs-body .gs-row .gs-cell')!;
      firstCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          node: expect.objectContaining({ id: expect.any(String) }),
        }),
      );
    });

    it('should emit cell:doubleClicked event on double-click', () => {
      renderer.mount();

      const listener = vi.fn();
      engine.eventBus.on('cell:doubleClicked', listener);

      const firstCell = container.querySelector('.gs-body .gs-row .gs-cell')!;
      firstCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          colId: 'name',
        }),
      );
    });
  });

  // ── 13. Custom Class Prefix ──

  describe('Custom class prefix', () => {
    it('should use a custom class prefix when specified', () => {
      // Clean up the default setup
      renderer.destroy();
      engine.destroy();
      if (container.parentElement) {
        container.parentElement.removeChild(container);
      }

      const newContainer = document.createElement('div');
      document.body.appendChild(newContainer);
      container = newContainer;

      engine = createGrid<TestRow>({
        columns: TEST_COLUMNS,
        rowData: TEST_DATA,
        plugins: [SortingPlugin(), SelectionPlugin()],
      });

      renderer = new DomRenderer({
        container: newContainer,
        engine,
        classPrefix: 'myg',
      });

      renderer.mount();

      expect(newContainer.querySelector('.myg-root')).not.toBeNull();
      expect(newContainer.querySelector('.myg-header')).not.toBeNull();
      expect(newContainer.querySelector('.myg-body')).not.toBeNull();
      expect(newContainer.querySelector('.myg-body-viewport')).not.toBeNull();

      const headerCells = newContainer.querySelectorAll('.myg-header-cell');
      expect(headerCells.length).toBe(3);

      const rows = newContainer.querySelectorAll('.myg-row');
      expect(rows.length).toBe(3);
    });
  });

  // ── 14. Header Click Triggers Sort ──

  describe('Header click triggers sort', () => {
    it('should toggle sort when clicking a sortable header cell', () => {
      renderer.mount();

      const nameHeader = container.querySelector('[data-col-id="name"].gs-header-cell')! as HTMLElement;
      nameHeader.click();

      // After the click, the sort model should have been updated
      const sortModel = engine.api.getSortModel();
      expect(sortModel).toEqual([{ colId: 'name', sort: 'asc' }]);

      // And the header should show the sort indicator
      const updatedHeader = container.querySelector('[data-col-id="name"].gs-header-cell')!;
      expect(updatedHeader.getAttribute('aria-sort')).toBe('ascending');
    });

    it('should not toggle sort when clicking a non-sortable header cell', () => {
      renderer.mount();

      const cityHeader = container.querySelector('[data-col-id="city"].gs-header-cell')! as HTMLElement;
      cityHeader.click();

      // Sort model should remain empty
      const sortModel = engine.api.getSortModel();
      expect(sortModel).toEqual([]);
    });
  });

  // ── 15. Empty Row Data ──

  describe('Empty row data', () => {
    it('should handle empty row data gracefully', () => {
      // Clean up the default setup
      renderer.destroy();
      engine.destroy();
      if (container.parentElement) {
        container.parentElement.removeChild(container);
      }

      const ctx = createTestGrid({ rowData: [] });
      container = ctx.container;
      engine = ctx.engine;
      renderer = ctx.renderer;

      renderer.mount();

      const rows = container.querySelectorAll('.gs-body .gs-row');
      expect(rows.length).toBe(0);

      const root = container.querySelector('.gs-root')!;
      expect(root.getAttribute('aria-rowcount')).toBe('0');
    });
  });

  // ── 16. Multiple Mounts Are Safe ──

  describe('Lifecycle edge cases', () => {
    it('should be safe to call destroy() multiple times', () => {
      renderer.mount();

      renderer.destroy();
      // Second destroy should not throw
      expect(() => renderer.destroy()).not.toThrow();
    });
  });
});
