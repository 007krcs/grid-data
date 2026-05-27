// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// Hooks story. Demonstrates the React-side observation surface: useGridApi,
// useGridState, useGridSelection, useGridSort. A sibling component reads
// the grid's state through hooks and displays live metrics next to it,
// proving that React renders react automatically to engine events without
// any manual subscription plumbing in the consumer.

import type { Meta, StoryObj } from '@storybook/react';
import { useCallback, useMemo, useRef } from 'react';
import { GridStorm, useGridApi, useGridState, useGridSort, useGridSelection } from '@gridstorm/react';
import type { ColumnDef, GridApi } from '@gridstorm/core';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { SelectionPlugin } from '@gridstorm/plugin-selection';
import { makeEmployees, formatCurrency, type Employee } from './_helpers';

const meta: Meta = {
  title: '1 · React/Hooks',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'A sidebar component inside the same React tree reads the grid ' +
          "state via hooks and renders live metrics. There's no manual " +
          'subscription or polling — `useGridState` is a `useSyncExternalStore` ' +
          'bridge so React re-renders only when the selected slice actually ' +
          'changes. Click rows, sort columns, watch the sidebar update.',
      },
    },
  },
};

export default meta;

function StateSidebar() {
  const api = useGridApi<Employee>();
  const totalRows = useGridState<Employee, number>((s) => s.displayedRowIds.length);
  const { sortModel } = useGridSort();
  const { selectedRowIds } = useGridSelection<Employee>();

  return (
    <aside style={{ minWidth: 240, padding: '12px 16px', background: '#f8fafc', borderRadius: 8, fontFamily: 'system-ui, sans-serif', fontSize: 14 }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#0f172a' }}>Grid state (live)</h3>
      <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px', margin: 0 }}>
        <dt style={{ color: '#64748b' }}>Visible rows</dt>
        <dd style={{ margin: 0, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>{totalRows.toLocaleString()}</dd>

        <dt style={{ color: '#64748b' }}>Selected</dt>
        <dd style={{ margin: 0, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>{selectedRowIds.size}</dd>

        <dt style={{ color: '#64748b' }}>Sort model</dt>
        <dd style={{ margin: 0, fontFamily: 'ui-monospace, SFMono-Regular, monospace', wordBreak: 'break-all' }}>
          {sortModel.length === 0
            ? '(no sort)'
            : sortModel.map((s) => `${s.colId} ${s.sort}`).join(', ')}
        </dd>
      </dl>

      <div style={{ marginTop: 16, display: 'flex', gap: 6 }}>
        <button
          onClick={() => api?.selectAll()}
          style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
        >
          Select all
        </button>
        <button
          onClick={() => api?.deselectAll()}
          style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer' }}
        >
          Deselect all
        </button>
      </div>
    </aside>
  );
}

function HooksDemo() {
  const apiRef = useRef<GridApi<Employee> | null>(null);
  const columns = useMemo<ColumnDef<Employee>[]>(
    () => [
      { field: 'name', headerName: 'Name', width: 180, sortable: true },
      { field: 'role', headerName: 'Role', width: 160, sortable: true },
      { field: 'department', headerName: 'Department', width: 160, sortable: true },
      { field: 'salary', headerName: 'Salary', width: 130, sortable: true, valueFormatter: formatCurrency },
      { field: 'rating', headerName: 'Rating', width: 100, sortable: true },
    ],
    [],
  );
  const plugins = useMemo(() => [SortingPlugin(), SelectionPlugin({ mode: 'multiple' })], []);
  const rowData = useMemo(() => makeEmployees(120), []);
  const onGridReady = useCallback((api: GridApi<Employee>) => { apiRef.current = api; }, []);

  return (
    <div style={{ display: 'flex', gap: 16, padding: 16 }}>
      <div style={{ flex: 1 }}>
        <GridStorm
          columns={columns}
          rowData={rowData}
          plugins={plugins}
          rowSelection="multiple"
          getRowId={({ data }) => String(data.id)}
          height={440}
          onGridReady={onGridReady}
        >
          <StateSidebar />
        </GridStorm>
      </div>
    </div>
  );
}

export const SideBySideMetrics: StoryObj = {
  name: 'Live state via hooks',
  render: () => <HooksDemo />,
};
