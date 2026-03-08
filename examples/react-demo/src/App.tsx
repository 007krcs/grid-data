import { useState, useRef, useCallback, useMemo } from 'react';
import {
  GridStorm,
  useGridApi,
  useGridSelection,
  useGridSort,
  useGridPagination,
  reactCellRenderer,
  reactHeaderRenderer,
} from '@gridstorm/react';
import type {
  GridApi,
  ReactColumnDef,
  CellRendererProps,
  HeaderRendererProps,
  ContextMenuProps,
  CellEditorProps,
  SortModelItem,
} from '@gridstorm/react';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { FilteringPlugin } from '@gridstorm/plugin-filtering';
import { SelectionPlugin } from '@gridstorm/plugin-selection';
import { EditingPlugin } from '@gridstorm/plugin-editing';
import { ColumnResizePlugin } from '@gridstorm/plugin-column-resize';
import { PaginationPlugin } from '@gridstorm/plugin-pagination';
import '@gridstorm/theme-default';

// ── Types ──

interface Employee {
  id: number;
  name: string;
  email: string;
  department: string;
  salary: number;
  startDate: string;
  active: boolean;
}

// ── Data Generator ──

const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Support'];
const FIRST_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Hank', 'Ivy', 'Jack'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Moore', 'Taylor'];

function generateData(count: number): Employee[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length]}`,
    email: `user${i + 1}@company.com`,
    department: DEPARTMENTS[i % DEPARTMENTS.length]!,
    salary: 45000 + Math.floor(Math.random() * 105000),
    startDate: new Date(2018 + (i % 8), i % 12, 1 + (i % 28)).toISOString().split('T')[0]!,
    active: i % 5 !== 0,
  }));
}

// ── React Cell Renderer: Status Badge ──

function StatusBadge({ value }: CellRendererProps<Employee, boolean>) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        background: value ? '#dcfce7' : '#fef2f2',
        color: value ? '#166534' : '#991b1b',
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: value ? '#22c55e' : '#ef4444',
        }}
      />
      {value ? 'Active' : 'Inactive'}
    </span>
  );
}

// ── React Cell Renderer: Salary ──

function SalaryCell({ value }: CellRendererProps<Employee, number>) {
  const formatted = value != null ? `$${Number(value).toLocaleString()}` : '';
  return (
    <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>
      {formatted}
    </span>
  );
}

// ── React Header Renderer: Sortable Header ──

function SortableHeader({ displayName, sortDirection, onSortRequested }: HeaderRendererProps) {
  return (
    <div
      onClick={(e) => onSortRequested(e.shiftKey)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        cursor: 'pointer',
        userSelect: 'none',
        width: '100%',
      }}
    >
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {displayName}
      </span>
      {sortDirection && (
        <span style={{ fontSize: 10, opacity: 0.7 }}>
          {sortDirection === 'asc' ? '▲' : '▼'}
        </span>
      )}
    </div>
  );
}

// ── React Cell Editor: Department Select ──

function DepartmentEditor({ value, onValueChange, stopEditing, editorParams }: CellEditorProps<Employee, string>) {
  const values = (editorParams.values as string[]) ?? DEPARTMENTS;
  return (
    <select
      value={value}
      onChange={(e) => {
        onValueChange(e.target.value);
        stopEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') stopEditing(true);
      }}
      autoFocus
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        outline: 'none',
        fontSize: 13,
        padding: '0 8px',
        background: 'var(--gs-color-cell-editing-bg, #fff)',
      }}
    >
      {values.map((v) => (
        <option key={v} value={v}>{v}</option>
      ))}
    </select>
  );
}

// ── Context Menu ──

function GridContextMenu({ node, colId, value, closeMenu, api }: ContextMenuProps<Employee>) {
  const menuStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    padding: '4px 0',
    minWidth: 180,
    fontSize: 13,
  };
  const itemStyle: React.CSSProperties = {
    padding: '8px 16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  };

  return (
    <div style={menuStyle}>
      <div
        style={itemStyle}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        onClick={() => {
          navigator.clipboard.writeText(String(value ?? ''));
          closeMenu();
        }}
      >
        Copy Value
      </div>
      <div
        style={itemStyle}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        onClick={() => {
          api.setSortModel([{ colId, sort: 'asc' }]);
          closeMenu();
        }}
      >
        Sort Ascending
      </div>
      <div
        style={itemStyle}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        onClick={() => {
          api.setSortModel([{ colId, sort: 'desc' }]);
          closeMenu();
        }}
      >
        Sort Descending
      </div>
      <div style={{ borderTop: '1px solid #e0e0e0', margin: '4px 0' }} />
      <div
        style={{ ...itemStyle, color: '#666' }}
      >
        Row #{node.data?.id} &middot; {colId}
      </div>
    </div>
  );
}

// ── Toolbar (child using hooks) ──

function Toolbar({ rowCount }: { rowCount: number }) {
  const api = useGridApi<Employee>();
  const { selectedCount, deselectAll } = useGridSelection<Employee>();
  const { sortModel, clearSort } = useGridSort();
  const { currentPage, totalPages, nextPage, previousPage } = useGridPagination();

  return (
    <div
      style={{
        padding: '10px 16px',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        borderBottom: '1px solid #e0e0e0',
        background: '#fafafa',
        flexWrap: 'wrap',
        fontSize: 13,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 18 }}>GridStorm</h2>
      <span style={{ color: '#888' }}>|</span>
      <span style={{ color: '#666' }}>{rowCount.toLocaleString()} rows</span>

      {selectedCount > 0 && (
        <>
          <span style={{ color: '#888' }}>|</span>
          <span style={{ color: '#2563eb', fontWeight: 600 }}>
            {selectedCount} selected
          </span>
          <button onClick={deselectAll} style={btnStyle}>
            Clear Selection
          </button>
        </>
      )}

      {sortModel.length > 0 && (
        <button onClick={clearSort} style={btnStyle}>
          Clear Sort
        </button>
      )}

      <button
        onClick={() => api.setSortModel([{ colId: 'name', sort: 'asc' }])}
        style={btnStyle}
      >
        Sort by Name
      </button>

      <div style={{ flex: 1 }} />

      {/* Pagination */}
      <button
        onClick={previousPage}
        disabled={currentPage === 0}
        style={btnStyle}
      >
        &laquo; Prev
      </button>
      <span>
        Page {currentPage + 1} of {totalPages}
      </span>
      <button
        onClick={nextPage}
        disabled={currentPage >= totalPages - 1}
        style={btnStyle}
      >
        Next &raquo;
      </button>
    </div>
  );
}

// ── Plugins ──

const plugins = [
  SortingPlugin({ multiSort: true }),
  FilteringPlugin(),
  SelectionPlugin({ mode: 'multiple' }),
  EditingPlugin(),
  ColumnResizePlugin(),
  PaginationPlugin({ pageSize: 100 }),
];

// ── App ──

export function App() {
  const [rowData] = useState(() => generateData(100_000));
  const [theme, setTheme] = useState<string>('light');
  const apiRef = useRef<GridApi<Employee> | null>(null);

  // Controlled sort mode demo
  const [controlledSort, setControlledSort] = useState<SortModelItem[]>([]);
  const [useControlledSort, setUseControlledSort] = useState(false);

  const handleGridReady = useCallback((api: GridApi<Employee>) => {
    apiRef.current = api;
  }, []);

  const columns = useMemo<ReactColumnDef<Employee>[]>(
    () => [
      {
        field: 'id' as any,
        headerName: 'ID',
        width: 80,
        sortable: true,
        resizable: true,
      },
      {
        field: 'name' as any,
        headerName: 'Name',
        width: 180,
        sortable: true,
        editable: true,
        resizable: true,
        headerRenderer: reactHeaderRenderer(SortableHeader),
      },
      {
        field: 'email' as any,
        headerName: 'Email',
        width: 240,
        sortable: true,
        resizable: true,
      },
      {
        field: 'department' as any,
        headerName: 'Department',
        width: 150,
        sortable: true,
        filterable: true,
        resizable: true,
        editable: true,
        cellEditor: 'select',
        cellEditorParams: { values: DEPARTMENTS },
        cellEditorComponent: DepartmentEditor,
      },
      {
        field: 'salary' as any,
        headerName: 'Salary',
        width: 130,
        sortable: true,
        resizable: true,
        cellRenderer: reactCellRenderer(SalaryCell),
      },
      {
        field: 'startDate' as any,
        headerName: 'Start Date',
        width: 130,
        sortable: true,
        resizable: true,
      },
      {
        field: 'active' as any,
        headerName: 'Status',
        width: 120,
        sortable: true,
        resizable: true,
        cellRenderer: reactCellRenderer(StatusBadge),
      },
    ],
    [],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Theme + Controls Bar */}
      <div
        style={{
          padding: '8px 16px',
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          borderBottom: '1px solid #e0e0e0',
          background: '#f5f5f5',
          fontSize: 13,
        }}
      >
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          style={{ ...btnStyle, cursor: 'pointer' }}
        >
          <option value="light">Light Theme</option>
          <option value="dark">Dark Theme</option>
          <option value="high-contrast">High Contrast</option>
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <input
            type="checkbox"
            checked={useControlledSort}
            onChange={(e) => setUseControlledSort(e.target.checked)}
          />
          Controlled Sort
        </label>

        {useControlledSort && controlledSort.length > 0 && (
          <span style={{ color: '#666' }}>
            Sort: {controlledSort.map((s) => `${s.colId} ${s.sort}`).join(', ')}
          </span>
        )}
      </div>

      {/* Grid */}
      <div style={{ flex: 1 }} data-theme={theme}>
        <GridStorm<Employee>
          columns={columns}
          rowData={rowData}
          plugins={plugins}
          rowHeight={40}
          headerHeight={48}
          height="100%"
          rowSelection="multiple"
          ariaLabel="Employee Data Grid — 100K Rows"
          onGridReady={handleGridReady}
          contextMenu={GridContextMenu}
          // Controlled sort (when enabled)
          {...(useControlledSort
            ? {
                sortModel: controlledSort,
                onSortModelChange: setControlledSort,
              }
            : {})}
          // Event callbacks
          onSelectionChanged={(e) =>
            console.log('Selection:', e.selectedNodes.length, 'rows')
          }
          onSortChanged={(e) => console.log('Sort:', e.sortModel)}
        >
          <Toolbar rowCount={rowData.length} />
        </GridStorm>
      </div>
    </div>
  );
}

// ── Styles ──

const btnStyle: React.CSSProperties = {
  padding: '5px 10px',
  fontSize: 12,
  border: '1px solid #d0d0d0',
  borderRadius: 4,
  background: '#fff',
  cursor: 'pointer',
};
