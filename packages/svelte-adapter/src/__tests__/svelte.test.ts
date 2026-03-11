// ─── Svelte Adapter Tests ───
// Tests the TypeScript parts of the Svelte adapter without requiring Svelte.
// We cannot import .svelte files or the Svelte runtime, so we test:
// - Export shapes and function signatures
// - Composable logic (setGridApi/getGridApi round-trip)
// - Default return values when no engine is initialized

import { describe, it, expect, beforeEach } from 'vitest';
import { gridstormAction } from '../gridstorm-action';
import {
  setGridApi,
  getGridApi,
  onGridApiChange,
} from '../composables/useGridApi';
import { getGridState } from '../composables/useGridState';
import { subscribeToGridEvent } from '../composables/useGridEvent';
import { getSelectedRows, selectAll, deselectAll } from '../composables/useGridSelection';
import { getSortModel, setSortModel } from '../composables/useGridSort';
import { getFilterModel, setFilterModel, setQuickFilter } from '../composables/useGridFilter';
import { getPaginationState, goToPage } from '../composables/useGridPagination';
import type { GridStormProps, GridStormEventHandlers } from '../types';

// ── gridstormAction ──

describe('gridstormAction', () => {
  it('should be a function', () => {
    expect(typeof gridstormAction).toBe('function');
  });
});

// ── GridStormProps type structure ──

describe('GridStormProps type', () => {
  it('should accept valid props', () => {
    const props: GridStormProps = {
      columns: [{ field: 'name' }],
      rowData: [{ name: 'Alice' }],
    };
    expect(props.columns).toHaveLength(1);
    expect(props.rowData).toHaveLength(1);
  });

  it('should accept optional props', () => {
    const props: GridStormProps = {
      columns: [],
      rowData: [],
      plugins: [],
      rowHeight: 40,
      headerHeight: 48,
      theme: 'dark',
      density: 'compact',
      height: 400,
      width: '100%',
      containerClass: 'my-grid',
      enableCellEditing: true,
      enableGrouping: false,
      floatingFilter: true,
      enablePagination: true,
      paginationPageSize: 25,
    };
    expect(props.density).toBe('compact');
    expect(props.paginationPageSize).toBe(25);
  });
});

// ── GridStormEventHandlers type structure ──

describe('GridStormEventHandlers type', () => {
  it('should accept event handler callbacks', () => {
    const handlers: GridStormEventHandlers = {
      onGridReady: (_api) => {},
      onSelectionChanged: (_nodes) => {},
      onSortChanged: (_model) => {},
      onFilterChanged: (_model) => {},
      onCellValueChanged: (_params) => {},
      onRowClicked: (_node) => {},
      onPaginationChanged: (_params) => {},
      onColumnResized: (_params) => {},
    };
    expect(handlers.onGridReady).toBeDefined();
  });
});

// ── Composable exports ──

describe('composable exports', () => {
  it('should export all composable functions', () => {
    expect(typeof setGridApi).toBe('function');
    expect(typeof getGridApi).toBe('function');
    expect(typeof onGridApiChange).toBe('function');
    expect(typeof getGridState).toBe('function');
    expect(typeof subscribeToGridEvent).toBe('function');
    expect(typeof getSelectedRows).toBe('function');
    expect(typeof selectAll).toBe('function');
    expect(typeof deselectAll).toBe('function');
    expect(typeof getSortModel).toBe('function');
    expect(typeof setSortModel).toBe('function');
    expect(typeof getFilterModel).toBe('function');
    expect(typeof setFilterModel).toBe('function');
    expect(typeof setQuickFilter).toBe('function');
    expect(typeof getPaginationState).toBe('function');
    expect(typeof goToPage).toBe('function');
  });
});

// ── useGridApi ──

describe('useGridApi', () => {
  beforeEach(() => {
    // Reset to null before each test
    setGridApi(null);
  });

  it('should return null when no engine is initialized', () => {
    expect(getGridApi()).toBeNull();
  });

  it('should round-trip setGridApi / getGridApi', () => {
    const mockApi = {
      setRowData: () => {},
      getSelectedNodes: () => [],
    } as any;

    setGridApi(mockApi);
    expect(getGridApi()).toBe(mockApi);
  });

  it('should notify listeners on change', () => {
    const calls: any[] = [];
    const unsub = onGridApiChange((api) => calls.push(api));

    const mockApi = { mock: true } as any;
    setGridApi(mockApi);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toBe(mockApi);

    setGridApi(null);
    expect(calls).toHaveLength(2);
    expect(calls[1]).toBeNull();

    unsub();

    // Should no longer receive notifications after unsubscribe
    setGridApi(mockApi);
    expect(calls).toHaveLength(2);
  });
});

// ── useGridSelection ──

describe('useGridSelection', () => {
  beforeEach(() => {
    setGridApi(null);
  });

  it('should return empty array when no engine is initialized', () => {
    expect(getSelectedRows()).toEqual([]);
  });

  it('should not throw when calling selectAll without engine', () => {
    expect(() => selectAll()).not.toThrow();
  });

  it('should not throw when calling deselectAll without engine', () => {
    expect(() => deselectAll()).not.toThrow();
  });
});

// ── useGridSort ──

describe('useGridSort', () => {
  beforeEach(() => {
    setGridApi(null);
  });

  it('should return empty array when no engine is initialized', () => {
    expect(getSortModel()).toEqual([]);
  });

  it('should not throw when calling setSortModel without engine', () => {
    expect(() => setSortModel([{ colId: 'name', sort: 'asc' }])).not.toThrow();
  });
});

// ── useGridFilter ──

describe('useGridFilter', () => {
  beforeEach(() => {
    setGridApi(null);
  });

  it('should return empty object when no engine is initialized', () => {
    expect(getFilterModel()).toEqual({});
  });

  it('should not throw when calling setFilterModel without engine', () => {
    expect(() => setFilterModel({})).not.toThrow();
  });

  it('should not throw when calling setQuickFilter without engine', () => {
    expect(() => setQuickFilter('test')).not.toThrow();
  });
});

// ── useGridPagination ──

describe('useGridPagination', () => {
  beforeEach(() => {
    setGridApi(null);
  });

  it('should return default state when no engine is initialized', () => {
    const state = getPaginationState();
    expect(state.currentPage).toBe(0);
    expect(state.pageSize).toBe(10);
    expect(state.totalPages).toBe(0);
    expect(state.totalRows).toBe(0);
  });

  it('should not throw when calling goToPage without engine', () => {
    expect(() => goToPage(1)).not.toThrow();
  });
});

// ── useGridEvent ──

describe('useGridEvent', () => {
  beforeEach(() => {
    setGridApi(null);
  });

  it('should return a no-op unsubscribe when no engine is initialized', () => {
    const unsub = subscribeToGridEvent('selection:changed', () => {});
    expect(typeof unsub).toBe('function');
    // Should not throw when called
    expect(() => unsub()).not.toThrow();
  });
});

// ── useGridState ──

describe('useGridState', () => {
  beforeEach(() => {
    setGridApi(null);
  });

  it('should return undefined when no engine is initialized', () => {
    const result = getGridState((state) => state.sortModel);
    expect(result).toBeUndefined();
  });
});
