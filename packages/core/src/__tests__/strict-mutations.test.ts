// ─── strictMutations ───
// Proves the "commands are the only way to mutate state" invariant is
// enforceable: external setState throws, every bundled plugin keeps working.

import { describe, it, expect } from 'vitest';
import { createGrid, GridStormMutationError, INTERNAL_SETSTATE } from '../index';
import { SortingPlugin } from '../../../plugin-sorting/src/sorting-plugin';
import { FilteringPlugin } from '../../../plugin-filtering/src/filtering-plugin';
import { SelectionPlugin } from '../../../plugin-selection/src/selection-plugin';
import { EditingPlugin } from '../../../plugin-editing/src/editing-plugin';
import { PaginationPlugin } from '../../../plugin-pagination/src/pagination-plugin';
import { ColumnPinningPlugin } from '../../../plugin-column-pinning/src/pinning-plugin';
import { ColumnReorderPlugin } from '../../../plugin-column-reorder/src/reorder-plugin';
import { GroupingPlugin } from '../../../plugin-grouping/src/grouping-plugin';
import { AggregationPlugin } from '../../../plugin-aggregation/src/aggregation-plugin';
import { StatusBarPlugin } from '../../../plugin-status-bar/src/status-bar-plugin';
import { RowPinningPlugin } from '../../../plugin-row-pinning/src/row-pinning-plugin';
import { CellRangePlugin } from '../../../plugin-cell-range/src/cell-range-plugin';
import { TimeTravelPlugin } from '../../../plugin-time-travel/src/time-travel-plugin';

interface Row {
  id: string;
  name: string;
  dept: string;
  salary: number;
}

const COLUMNS = [
  { field: 'name' as const, headerName: 'Name', sortable: true, filterable: true, editable: true },
  { field: 'dept' as const, headerName: 'Dept', sortable: true, filterable: true, rowGroup: true },
  { field: 'salary' as const, headerName: 'Salary', sortable: true, filterable: true, editable: true },
];

const DATA: Row[] = Array.from({ length: 60 }, (_, i) => ({
  id: `r${i}`,
  name: `Person ${i}`,
  dept: ['Eng', 'Sales', 'Ops'][i % 3]!,
  salary: 1000 + i * 10,
}));

describe('strictMutations', () => {
  it('is off by default: external setState only warns', () => {
    const engine = createGrid<Row>({ columns: COLUMNS, rowData: DATA });
    expect(engine.store.isStrict()).toBe(false);
    expect(() => engine.store.setState((s) => ({ ...s, quickFilterText: 'x' }))).not.toThrow();
    engine.destroy();
  });

  it('throws GridStormMutationError on unmarked external setState', () => {
    const engine = createGrid<Row>({ columns: COLUMNS, rowData: DATA, strictMutations: true });
    expect(engine.store.isStrict()).toBe(true);
    const before = engine.store.getState();
    expect(() => engine.store.setState((s) => ({ ...s, quickFilterText: 'x' }))).toThrow(GridStormMutationError);
    // Nothing was applied.
    expect(engine.store.getState()).toBe(before);
    engine.destroy();
  });

  it('accepts internally marked writes', () => {
    const engine = createGrid<Row>({ columns: COLUMNS, rowData: DATA, strictMutations: true });
    expect(() =>
      engine.store.setState((s) => ({ ...s, quickFilterText: 'x' }), INTERNAL_SETSTATE),
    ).not.toThrow();
    expect(engine.store.getState().quickFilterText).toBe('x');
    engine.destroy();
  });

  it('every bundled plugin operates under strict mode without throwing', () => {
    const engine = createGrid<Row>({
      columns: COLUMNS,
      rowData: DATA,
      getRowId: (p) => p.data.id,
      strictMutations: true,
      paginationPageSize: 20,
      plugins: [
        SortingPlugin(),
        FilteringPlugin(),
        SelectionPlugin({ mode: 'multiple' }),
        EditingPlugin(),
        PaginationPlugin({ pageSize: 20 }),
        ColumnPinningPlugin(),
        ColumnReorderPlugin(),
        GroupingPlugin(),
        AggregationPlugin(),
        StatusBarPlugin(),
        RowPinningPlugin({ pinnedTopRowData: [{ id: 'top', name: 'TOP', dept: '-', salary: 0 }] }),
        CellRangePlugin(),
        TimeTravelPlugin(),
      ],
    } as any);

    const { api, commandBus } = engine;
    const run = (label: string, fn: () => void) => {
      try {
        fn();
      } catch (err) {
        throw new Error(`${label} violated strictMutations: ${(err as Error).message}`);
      }
    };

    run('sort', () => api.setSortModel([{ colId: 'salary', sort: 'desc' }]));
    run('filter', () => api.setFilterModel({ dept: { filterType: 'text', type: 'equals', filter: 'Eng' } }));
    run('quick filter', () => api.setQuickFilter('Person 1'));
    run('clear filters', () => {
      api.setFilterModel({});
      api.setQuickFilter('');
    });
    run('select', () => commandBus.dispatch('selection:select', { rowId: 'r1' }));
    run('selectAll/deselectAll', () => {
      api.selectAll();
      api.deselectAll();
    });
    run('pagination', () => api.paginationGoToPage(1));
    run('column pin', () => api.setColumnPinned('name', 'left'));
    run('column move', () => api.moveColumn('salary', 0));
    run('column width', () => api.setColumnWidth('name', 220));
    run('row pinning', () => commandBus.dispatch('rowPinning:pinBottom', { rowIds: ['r2'] }));
    run('status bar', () => commandBus.dispatch('statusBar:calculate', {}));
    run('expand groups', () => {
      api.expandAll();
      api.collapseAll();
    });
    run('edit', () => {
      api.startEditingCell({ rowIndex: 0, colId: 'name' } as any);
      commandBus.dispatch('editing:setValue', { value: 'Edited' });
      api.stopEditing(false);
    });
    run('updateRows', () => api.updateRows([{ id: 'r3', data: { salary: 1 } }]));
    run('undo', () => commandBus.dispatch('editing:undo', {}));
    run('setRowData', () => api.setRowData(DATA.slice(0, 10)));

    expect(engine.store.isStrict()).toBe(true);
    engine.destroy();
  });

  it('row data has exactly one write path (editing and updateRows agree)', () => {
    const engine = createGrid<Row>({
      columns: COLUMNS,
      rowData: DATA,
      getRowId: (p) => p.data.id,
      strictMutations: true,
      plugins: [EditingPlugin()],
    });
    const events: any[] = [];
    engine.eventBus.on('cell:valueChanged', (e) => events.push(e));

    engine.api.updateRows([{ id: 'r0', data: { salary: 5 } }]);
    expect(engine.api.getRowNode('r0')?.data?.salary).toBe(5);
    expect(events[0]).toMatchObject({ colId: 'salary', oldValue: 1000, newValue: 5 });

    engine.api.startEditingCell({ rowIndex: 0, colId: 'name' } as any);
    engine.commandBus.dispatch('editing:setValue', { value: 'Renamed' });
    engine.api.stopEditing(false);
    expect(engine.api.getRowNode('r0')?.data?.name).toBe('Renamed');
    expect(events[1]).toMatchObject({ colId: 'name', oldValue: 'Person 0', newValue: 'Renamed' });
    engine.destroy();
  });
});
