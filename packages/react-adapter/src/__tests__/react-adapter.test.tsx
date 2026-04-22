import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// Pre-load heavy adapter modules at import time (not inside individual tests)
// so they don't timeout under concurrent test-suite load.
import * as GridStormMod from '../GridStorm';
import * as useGridStateMod from '../hooks/useGridState';
import * as useGridColumnMod from '../hooks/useGridColumn';
import * as useGridSortMod from '../hooks/useGridSort';
import * as useGridFilterMod from '../hooks/useGridFilter';
import * as useGridSelectionMod from '../hooks/useGridSelection';
import * as useGridPaginationMod from '../hooks/useGridPagination';
import * as contextMod from '../context';
import * as ErrorBoundaryMod from '../ErrorBoundary';
import * as indexMod from '../index';
// Pre-warm the core engine so subsequent dynamic imports are cache-hits
import { createGrid } from '../../../core/src/engine/grid-engine';

describe('React Adapter', () => {
  describe('GridStorm component', () => {
    it('should export GridStorm component', () => {
      expect(GridStormMod.GridStorm).toBeDefined();
      expect(typeof GridStormMod.GridStorm).toBe('function');
    });

    it('should export useGridState hook', () => {
      expect(useGridStateMod.useGridState).toBeDefined();
    });

    it('should export useGridColumn hook', () => {
      expect(useGridColumnMod.useGridColumn).toBeDefined();
    });

    it('should export useGridSort hook', () => {
      expect(useGridSortMod.useGridSort).toBeDefined();
    });

    it('should export useGridFilter hook', () => {
      expect(useGridFilterMod.useGridFilter).toBeDefined();
    });

    it('should export useGridSelection hook', () => {
      expect(useGridSelectionMod.useGridSelection).toBeDefined();
    });

    it('should export useGridPagination hook', () => {
      expect(useGridPaginationMod.useGridPagination).toBeDefined();
    });

    it('should export GridContext and useGridContext', () => {
      expect(contextMod.GridContext).toBeDefined();
      expect(contextMod.useGridContext).toBeDefined();
    });

    it('should export ErrorBoundary', () => {
      expect(ErrorBoundaryMod.GridErrorBoundary).toBeDefined();
    });

    it('should export index with all public APIs', () => {
      expect(indexMod.GridStorm).toBeDefined();
      expect(indexMod.useGridState).toBeDefined();
      expect(indexMod.useGridSort).toBeDefined();
      expect(indexMod.useGridFilter).toBeDefined();
      expect(indexMod.useGridSelection).toBeDefined();
      expect(indexMod.useGridPagination).toBeDefined();
    });
  });

  describe('Engine lifecycle', () => {
    it('should create and destroy engine via createGrid', () => {
      const engine = createGrid({
        columns: [{ field: 'name' }],
        rowData: [{ name: 'Alice' }, { name: 'Bob' }],
      });

      expect(engine.api.getDisplayedRowCount()).toBe(2);
      engine.destroy();
    });

    it('should handle StrictMode double-mount pattern', () => {
      // Simulate StrictMode: create, destroy, create again
      const engine1 = createGrid({
        columns: [{ field: 'name' }],
        rowData: [{ name: 'Alice' }],
        getRowId: ({ data }) => data.name,
      });
      expect(engine1.api.getDisplayedRowCount()).toBe(1);
      engine1.destroy();

      const engine2 = createGrid({
        columns: [{ field: 'name' }],
        rowData: [{ name: 'Bob' }],
        getRowId: ({ data }) => data.name,
      });
      expect(engine2.api.getDisplayedRowCount()).toBe(1);
      expect(engine2.api.getRowNode('Bob')?.data?.name).toBe('Bob');
      engine2.destroy();
    });

    it('should support transaction updates after creation', () => {
      const engine = createGrid({
        columns: [{ field: 'name' }],
        rowData: [{ name: 'Alice' }],
        getRowId: ({ data }) => data.name,
      });

      engine.api.addRows([{ name: 'Bob' }]);
      expect(engine.api.getDisplayedRowCount()).toBe(2);

      engine.api.removeRows(['Alice']);
      expect(engine.api.getDisplayedRowCount()).toBe(1);

      engine.destroy();
    });

    it('should initialize with empty rowData when not provided', () => {
      const engine = createGrid({
        columns: [{ field: 'name' }],
        rowData: [],
      });

      expect(engine.api.getDisplayedRowCount()).toBe(0);
      engine.destroy();
    });
  });

  describe('Sort integration', () => {
    it('should apply sort model via api.setSortModel', () => {
      const engine = createGrid({
        columns: [{ field: 'name' }, { field: 'age' }],
        rowData: [
          { name: 'Charlie', age: 30 },
          { name: 'Alice', age: 25 },
          { name: 'Bob', age: 35 },
        ],
        getRowId: ({ data }) => data.name,
      });

      engine.api.setSortModel([{ colId: 'name', sort: 'asc' }]);
      expect(engine.store.getState().sortModel).toEqual([{ colId: 'name', sort: 'asc' }]);

      const displayedIds = engine.store.getState().displayedRowIds;
      const names = displayedIds.map(id => engine.store.getState().rowNodes.get(id)?.data?.name);
      expect(names).toEqual(['Alice', 'Bob', 'Charlie']);

      engine.destroy();
    });

    it('should clear sort model', () => {
      const engine = createGrid({
        columns: [{ field: 'name' }],
        rowData: [{ name: 'Bob' }, { name: 'Alice' }],
        getRowId: ({ data }) => data.name,
      });

      engine.api.setSortModel([{ colId: 'name', sort: 'asc' }]);
      expect(engine.store.getState().sortModel.length).toBe(1);

      engine.api.setSortModel([]);
      expect(engine.store.getState().sortModel.length).toBe(0);

      engine.destroy();
    });

    it('should emit column:sort:changed event when sort model changes', () => {
      const engine = createGrid({
        columns: [{ field: 'name' }],
        rowData: [{ name: 'Alice' }, { name: 'Bob' }],
      });

      const sortChangedCb = vi.fn();
      engine.eventBus.on('column:sort:changed', sortChangedCb);

      engine.api.setSortModel([{ colId: 'name', sort: 'desc' }]);
      expect(sortChangedCb).toHaveBeenCalledOnce();

      engine.destroy();
    });

    it('should support descending sort', () => {
      const engine = createGrid({
        columns: [{ field: 'age' }],
        rowData: [{ age: 10 }, { age: 30 }, { age: 20 }],
        getRowId: ({ data }) => String(data.age),
      });

      engine.api.setSortModel([{ colId: 'age', sort: 'desc' }]);
      const displayedIds = engine.store.getState().displayedRowIds;
      const ages = displayedIds.map(id => engine.store.getState().rowNodes.get(id)?.data?.age);
      expect(ages).toEqual([30, 20, 10]);

      engine.destroy();
    });

    it('setSortModel with null gracefully resets to empty array', () => {
      const engine = createGrid({
        columns: [{ field: 'name' }],
        rowData: [],
      });

      expect(() => engine.api.setSortModel(null as any)).not.toThrow();
      expect(engine.store.getState().sortModel).toEqual([]);
      engine.destroy();
    });
  });

  describe('Filter integration', () => {
    it('should apply quick filter', () => {
      const engine = createGrid({
        columns: [{ field: 'name' }],
        rowData: [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Alicia' }],
        getRowId: ({ data }) => data.name,
      });

      engine.api.setQuickFilter('ali');
      expect(engine.api.getDisplayedRowCount()).toBe(2);

      engine.api.setQuickFilter('');
      expect(engine.api.getDisplayedRowCount()).toBe(3);

      engine.destroy();
    });

    it('should emit quickFilter:changed event', () => {
      const engine = createGrid({
        columns: [{ field: 'name' }],
        rowData: [{ name: 'Alice' }, { name: 'Bob' }],
      });

      const filterCb = vi.fn();
      engine.eventBus.on('quickFilter:changed', filterCb);

      engine.api.setQuickFilter('Alice');
      expect(filterCb).toHaveBeenCalledOnce();

      engine.destroy();
    });

    it('should clear filter model', () => {
      const engine = createGrid({
        columns: [{ field: 'name' }],
        rowData: [{ name: 'Alice' }, { name: 'Bob' }],
        getRowId: ({ data }) => data.name,
      });

      engine.api.setQuickFilter('Alice');
      expect(engine.api.getDisplayedRowCount()).toBe(1);

      engine.api.setQuickFilter('');
      engine.api.setFilterModel({});
      expect(engine.api.getDisplayedRowCount()).toBe(2);

      engine.destroy();
    });
  });

  describe('Selection integration', () => {
    it('should select all rows', () => {
      const engine = createGrid({
        columns: [{ field: 'id' }],
        rowData: [{ id: 1 }, { id: 2 }, { id: 3 }],
        getRowId: ({ data }) => String(data.id),
        rowSelection: 'multiple',
      });

      engine.api.selectAll();
      expect(engine.store.getState().selection.selectedRowIds.size).toBe(3);

      engine.destroy();
    });

    it('should deselect all rows', () => {
      const engine = createGrid({
        columns: [{ field: 'id' }],
        rowData: [{ id: 1 }, { id: 2 }],
        getRowId: ({ data }) => String(data.id),
        rowSelection: 'multiple',
      });

      engine.api.selectAll();
      expect(engine.store.getState().selection.selectedRowIds.size).toBe(2);

      engine.api.deselectAll();
      expect(engine.store.getState().selection.selectedRowIds.size).toBe(0);

      engine.destroy();
    });

    it('should return selected rows data', () => {
      const engine = createGrid({
        columns: [{ field: 'name' }],
        rowData: [{ name: 'Alice' }, { name: 'Bob' }],
        getRowId: ({ data }) => data.name,
        rowSelection: 'multiple',
      });

      engine.api.selectAll();
      const selected = engine.api.getSelectedRows();
      expect(selected.length).toBe(2);
      expect(selected.map((r: any) => r.name).sort()).toEqual(['Alice', 'Bob']);

      engine.destroy();
    });

    it('should emit selection:changed event', () => {
      const engine = createGrid({
        columns: [{ field: 'id' }],
        rowData: [{ id: 1 }],
        getRowId: ({ data }) => String(data.id),
        rowSelection: 'multiple',
      });

      const selectionCb = vi.fn();
      engine.eventBus.on('selection:changed', selectionCb);

      engine.api.selectAll();
      expect(selectionCb).toHaveBeenCalledOnce();

      engine.destroy();
    });
  });

  describe('Row data management', () => {
    it('should update rowData via setRowData', () => {
      const engine = createGrid({
        columns: [{ field: 'name' }],
        rowData: [{ name: 'Alice' }, { name: 'Bob' }],
        getRowId: ({ data }) => data.name,
      });

      expect(engine.api.getDisplayedRowCount()).toBe(2);

      engine.api.setRowData([{ name: 'Charlie' }]);
      expect(engine.api.getDisplayedRowCount()).toBe(1);

      engine.destroy();
    });

    it('should emit rowData:changed event on setRowData', () => {
      const engine = createGrid({
        columns: [{ field: 'name' }],
        rowData: [],
      });

      const cb = vi.fn();
      engine.eventBus.on('rowData:changed', cb);

      engine.api.setRowData([{ name: 'Alice' }]);
      expect(cb).toHaveBeenCalledOnce();

      engine.destroy();
    });

    it('should update individual rows via updateRows', () => {
      const engine = createGrid({
        columns: [{ field: 'name' }, { field: 'age' }],
        rowData: [{ name: 'Alice', age: 25 }],
        getRowId: ({ data }) => data.name,
      });

      engine.api.updateRows([{ id: 'Alice', data: { age: 30 } }]);
      const node = engine.api.getRowNode('Alice');
      expect(node?.data?.age).toBe(30);

      engine.destroy();
    });

    it('should add rows via addRows', () => {
      const engine = createGrid({
        columns: [{ field: 'id' }],
        rowData: [{ id: 1 }],
        getRowId: ({ data }) => String(data.id),
      });

      engine.api.addRows([{ id: 2 }, { id: 3 }]);
      expect(engine.api.getDisplayedRowCount()).toBe(3);

      engine.destroy();
    });

    it('should remove rows via removeRows', () => {
      const engine = createGrid({
        columns: [{ field: 'id' }],
        rowData: [{ id: 1 }, { id: 2 }, { id: 3 }],
        getRowId: ({ data }) => String(data.id),
      });

      engine.api.removeRows(['1', '3']);
      expect(engine.api.getDisplayedRowCount()).toBe(1);
      expect(engine.api.getRowNode('2')).toBeDefined();

      engine.destroy();
    });
  });

  describe('Event bus integration', () => {
    it('should support event subscription and unsubscription', () => {
      const engine = createGrid({
        columns: [{ field: 'name' }],
        rowData: [],
      });

      const cb = vi.fn();
      const unsub = engine.eventBus.on('rowData:changed', cb);

      engine.api.setRowData([{ name: 'Alice' }]);
      expect(cb).toHaveBeenCalledOnce();

      unsub();
      engine.api.setRowData([{ name: 'Bob' }]);
      expect(cb).toHaveBeenCalledOnce(); // not called again after unsub

      engine.destroy();
    });

    it('should fire onGridReady callback when engine is created', () => {
      const readyCb = vi.fn();

      const engine = createGrid({
        columns: [{ field: 'id' }],
        rowData: [],
        onGridReady: (api) => {
          readyCb(api);
        },
      });

      expect(readyCb).toHaveBeenCalledOnce();
      expect(readyCb.mock.calls[0][0]).toBe(engine.api);

      engine.destroy();
    });
  });

  describe('Column model integration', () => {
    it('should initialize with column definitions', () => {
      const engine = createGrid({
        columns: [
          { field: 'id', headerName: 'ID' },
          { field: 'name', headerName: 'Name' },
          { field: 'age', headerName: 'Age' },
        ],
        rowData: [],
      });

      const columns = engine.store.getState().columns;
      expect(columns.length).toBe(3);
      expect(columns.map((c: any) => c.field)).toEqual(['id', 'name', 'age']);

      engine.destroy();
    });

    it('should update column defs via setColumnDefs', () => {
      const engine = createGrid({
        columns: [{ field: 'id' }],
        rowData: [],
      });

      engine.api.setColumnDefs([{ field: 'id' }, { field: 'name' }]);
      const columns = engine.store.getState().columns;
      expect(columns.length).toBe(2);

      engine.destroy();
    });

    it('should apply defaultColDef to all columns', () => {
      const engine = createGrid({
        columns: [{ field: 'id' }, { field: 'name' }],
        rowData: [],
        defaultColDef: { sortable: true, resizable: true },
      });

      const columns = engine.store.getState().columns;
      for (const col of columns) {
        expect((col as any).sortable).toBe(true);
        expect((col as any).resizable).toBe(true);
      }

      engine.destroy();
    });
  });

  describe('Controlled mode patterns', () => {
    it('should support external sort model control via command bus', () => {
      const engine = createGrid({
        columns: [{ field: 'name' }],
        rowData: [{ name: 'Bob' }, { name: 'Alice' }],
        getRowId: ({ data }) => data.name,
      });

      const sortChanges: any[] = [];
      engine.eventBus.on('column:sort:changed', (e) => sortChanges.push(e));

      engine.api.setSortModel([{ colId: 'name', sort: 'asc' }]);
      expect(sortChanges.length).toBe(1);
      expect(sortChanges[0].sortModel).toEqual([{ colId: 'name', sort: 'asc' }]);

      engine.destroy();
    });

    it('should support external filter model control', () => {
      const engine = createGrid({
        columns: [{ field: 'status' }],
        rowData: [
          { status: 'active' },
          { status: 'inactive' },
          { status: 'active' },
        ],
        getRowId: ({ data }) => data.status + Math.random(),
      });

      const filterChanges: any[] = [];
      engine.eventBus.on('quickFilter:changed', (e) => filterChanges.push(e));

      engine.api.setQuickFilter('active');
      expect(filterChanges.length).toBe(1);
      expect(engine.store.getState().quickFilterText).toBe('active');

      engine.destroy();
    });

    it('should support command bus middleware for intercepting commands', () => {
      const engine = createGrid({
        columns: [{ field: 'name' }],
        rowData: [],
      });

      const intercepted: string[] = [];
      const removeMw = engine.commandBus.use((ctx) => {
        intercepted.push(ctx.commandType);
      });

      engine.commandBus.dispatch('sort:set', { sortModel: [{ colId: 'name', sort: 'asc' }] });
      expect(intercepted).toContain('sort:set');

      removeMw();
      engine.destroy();
    });
  });

  describe('Error handling integration', () => {
    it('should attach error handler to engine', async () => {
      const { ErrorHandler } = await import('../../../core/src/errors/error-handler');

      const engine = createGrid({
        columns: [{ field: 'id' }],
        rowData: [],
      });

      const errorHandler = new ErrorHandler();
      errorHandler.setSuppressConsole(true);
      const errors: any[] = [];
      errorHandler.onError((e: any) => errors.push(e));

      engine.commandBus.setErrorHandler(errorHandler);

      engine.destroy();
      expect(errors.length).toBe(0);
    });
  });

  describe('State serialization', () => {
    it('should expose current state for serialization', () => {
      const engine = createGrid({
        columns: [{ field: 'name' }],
        rowData: [{ name: 'Alice' }],
        getRowId: ({ data }) => data.name,
      });

      engine.api.setSortModel([{ colId: 'name', sort: 'asc' }]);
      engine.api.setQuickFilter('ali');

      const state = engine.store.getState();
      expect(state.sortModel).toEqual([{ colId: 'name', sort: 'asc' }]);
      expect(state.quickFilterText).toBe('ali');

      const snapshot = {
        sortModel: state.sortModel,
        filterModel: state.filterModel,
        quickFilterText: state.quickFilterText,
      };

      const engine2 = createGrid({
        columns: [{ field: 'name' }],
        rowData: [{ name: 'Alice' }, { name: 'Bob' }],
        getRowId: ({ data }) => data.name,
      });

      engine2.api.setSortModel(snapshot.sortModel);
      engine2.api.setQuickFilter(snapshot.quickFilterText);

      expect(engine2.store.getState().sortModel).toEqual(snapshot.sortModel);
      expect(engine2.store.getState().quickFilterText).toBe(snapshot.quickFilterText);

      engine.destroy();
      engine2.destroy();
    });
  });
});
