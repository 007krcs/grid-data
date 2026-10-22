// Ad-hoc breakdown of where a 100k-row sort spends its time.
// Run: pnpm --filter @gridstorm/benchmarks exec tsx src/profile-sort.ts
import { createGrid, sortRowNodes } from '@gridstorm/core';
import type { ColumnDef } from '@gridstorm/core';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { FilteringPlugin } from '@gridstorm/plugin-filtering';
import { generateRows, type BenchRow } from './fixtures/data-generators.js';

const COLUMNS: ColumnDef<BenchRow>[] = [
  { field: 'id', headerName: 'ID', sortable: true },
  { field: 'name', headerName: 'Name', sortable: true },
  { field: 'department', headerName: 'Department', sortable: true },
  { field: 'salary', headerName: 'Salary', sortable: true },
];

const data = generateRows(100_000);
const t = (label: string, fn: () => void) => {
  const s = performance.now();
  fn();
  console.log(label.padEnd(40), (performance.now() - s).toFixed(1), 'ms');
};

let engine = createGrid<BenchRow>({ columns: COLUMNS, rowData: data, plugins: [SortingPlugin(), FilteringPlugin()] });
t('createGrid (warm-up)', () => { engine.destroy(); engine = createGrid<BenchRow>({ columns: COLUMNS, rowData: data, plugins: [SortingPlugin(), FilteringPlugin()] }); });

const state = engine.store.getState();
const nodes = [...state.rowNodes.values()];
t('sortRowNodes salary asc (pure)', () => sortRowNodes(nodes, [{ colId: 'salary', sort: 'asc' }], state.columns));
t('sortRowNodes name asc (pure)', () => sortRowNodes(nodes, [{ colId: 'name', sort: 'asc' }], state.columns));
t('api.setSortModel salary asc', () => engine.api.setSortModel([{ colId: 'salary', sort: 'asc' }]));
t('api.setSortModel [] (clear)', () => engine.api.setSortModel([]));
t('api.setSortModel name desc', () => engine.api.setSortModel([{ colId: 'name', sort: 'desc' }]));
t('commandBus sort:set salary', () => engine.commandBus.dispatch('sort:set', { sortModel: [{ colId: 'salary', sort: 'asc' }] }));
t('api.setFilterModel contains', () => engine.api.setFilterModel({ department: { filterType: 'text', type: 'contains', filter: 'Eng' } }));
engine.destroy();
