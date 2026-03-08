import { describe, it, expect, vi } from 'vitest';
import { createGrid } from '../engine/grid-engine';
import type { GridConfig } from '../types/grid';

function createBasicGrid(overrides?: Partial<GridConfig>) {
  return createGrid({
    columns: [
      { field: 'name', sortable: true },
      { field: 'age', sortable: true },
    ],
    rowData: [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
      { name: 'Charlie', age: 35 },
    ],
    ...overrides,
  });
}

describe('createGrid', () => {
  it('should create a grid engine with api', () => {
    const engine = createBasicGrid();
    expect(engine.api).toBeDefined();
    expect(engine.store).toBeDefined();
    expect(engine.eventBus).toBeDefined();
    expect(engine.commandBus).toBeDefined();
    engine.destroy();
  });

  it('should initialize with correct row count', () => {
    const engine = createBasicGrid();
    expect(engine.api.getDisplayedRowCount()).toBe(3);
    engine.destroy();
  });

  it('should initialize columns', () => {
    const engine = createBasicGrid();
    const cols = engine.api.getAllColumns();
    expect(cols).toHaveLength(2);
    expect(cols[0]!.colId).toBe('name');
    engine.destroy();
  });

  it('should support getRowNode', () => {
    const engine = createBasicGrid();
    const node = engine.api.getRowNode('row-0');
    expect(node).toBeDefined();
    expect(node!.data.name).toBe('Alice');
    engine.destroy();
  });

  it('should call onGridReady callback', () => {
    const onGridReady = vi.fn();
    const engine = createBasicGrid({ onGridReady });
    expect(onGridReady).toHaveBeenCalledWith(engine.api);
    engine.destroy();
  });
});

describe('GridApi - Data', () => {
  it('should update row data', () => {
    const engine = createBasicGrid();
    engine.api.setRowData([{ name: 'New', age: 1 }]);
    expect(engine.api.getDisplayedRowCount()).toBe(1);
    engine.destroy();
  });

  it('should iterate nodes with forEachNode', () => {
    const engine = createBasicGrid();
    const names: string[] = [];
    engine.api.forEachNode((node) => names.push(node.data.name));
    expect(names).toEqual(['Alice', 'Bob', 'Charlie']);
    engine.destroy();
  });

  it('should get displayed row at index', () => {
    const engine = createBasicGrid();
    const node = engine.api.getDisplayedRowAtIndex(1);
    expect(node).toBeDefined();
    engine.destroy();
  });
});

describe('GridApi - Sorting', () => {
  it('should sort by name ascending', () => {
    const engine = createBasicGrid();
    engine.api.setSortModel([{ colId: 'name', sort: 'asc' }]);

    const names: string[] = [];
    for (let i = 0; i < engine.api.getDisplayedRowCount(); i++) {
      names.push(engine.api.getDisplayedRowAtIndex(i)!.data.name);
    }
    expect(names).toEqual(['Alice', 'Bob', 'Charlie']);
    engine.destroy();
  });

  it('should sort by age descending', () => {
    const engine = createBasicGrid();
    engine.api.setSortModel([{ colId: 'age', sort: 'desc' }]);

    const ages: number[] = [];
    for (let i = 0; i < engine.api.getDisplayedRowCount(); i++) {
      ages.push(engine.api.getDisplayedRowAtIndex(i)!.data.age);
    }
    expect(ages).toEqual([35, 30, 25]);
    engine.destroy();
  });

  it('should clear sort model', () => {
    const engine = createBasicGrid();
    engine.api.setSortModel([{ colId: 'name', sort: 'asc' }]);
    engine.api.setSortModel([]);
    expect(engine.api.getSortModel()).toEqual([]);
    engine.destroy();
  });
});

describe('GridApi - Filtering', () => {
  it('should filter rows', () => {
    const engine = createBasicGrid();
    engine.api.setFilterModel({
      name: { filterType: 'text', type: 'equals', filter: 'Alice' },
    });
    expect(engine.api.getDisplayedRowCount()).toBe(1);
    engine.destroy();
  });

  it('should clear filter', () => {
    const engine = createBasicGrid();
    engine.api.setFilterModel({
      name: { filterType: 'text', type: 'equals', filter: 'Alice' },
    });
    engine.api.setFilterModel({});
    expect(engine.api.getDisplayedRowCount()).toBe(3);
    engine.destroy();
  });

  it('should apply quick filter', () => {
    const engine = createBasicGrid();
    engine.api.setQuickFilter('bob');
    expect(engine.api.getDisplayedRowCount()).toBe(1);
    engine.destroy();
  });
});

describe('GridApi - Selection', () => {
  it('should select all rows', () => {
    const engine = createBasicGrid();
    engine.api.selectAll();
    expect(engine.api.getSelectedRows()).toHaveLength(3);
    engine.destroy();
  });

  it('should deselect all', () => {
    const engine = createBasicGrid();
    engine.api.selectAll();
    engine.api.deselectAll();
    expect(engine.api.getSelectedRows()).toHaveLength(0);
    engine.destroy();
  });
});

describe('GridApi - Columns', () => {
  it('should set column visibility', () => {
    const engine = createBasicGrid();
    engine.api.setColumnVisible('name', false);
    const col = engine.api.getColumn('name');
    expect(col!.hide).toBe(true);
    engine.destroy();
  });

  it('should set column width', () => {
    const engine = createBasicGrid();
    engine.api.setColumnWidth('name', 300);
    const col = engine.api.getColumn('name');
    expect(col!.width).toBe(300);
    engine.destroy();
  });

  it('should get visible columns', () => {
    const engine = createBasicGrid();
    engine.api.setColumnVisible('name', false);
    const visible = engine.api.getVisibleColumns();
    expect(visible).toHaveLength(1);
    expect(visible[0]!.colId).toBe('age');
    engine.destroy();
  });
});

describe('GridApi - Pagination', () => {
  it('should navigate pages', () => {
    const engine = createBasicGrid({ paginationPageSize: 2 });
    expect(engine.api.paginationGetCurrentPage()).toBe(0);
    expect(engine.api.paginationGetTotalPages()).toBe(2);

    engine.api.paginationGoToPage(1);
    expect(engine.api.paginationGetCurrentPage()).toBe(1);
    engine.destroy();
  });
});

describe('GridApi - Lifecycle', () => {
  it('should emit grid:destroyed on destroy', () => {
    const engine = createBasicGrid();
    const listener = vi.fn();
    engine.api.addEventListener('grid:destroyed', listener);

    engine.destroy();
    expect(listener).toHaveBeenCalled();
  });
});
