---
title: React
description: Complete guide to using GridStorm with React 18+, including hooks, custom renderers, controlled state, portals, and TypeScript types.
---

The `@gridstorm/react` package provides a production-grade React wrapper around the headless GridStorm core. It includes the `<GridStorm>` component, a suite of hooks for accessing grid state, portal-based custom renderers, an error boundary, and full TypeScript support.

## Installation

```bash
npm install @gridstorm/core @gridstorm/dom-renderer @gridstorm/react @gridstorm/theme-default
```

## Basic Usage

```tsx title="App.tsx"
import { GridStorm } from '@gridstorm/react';
import '@gridstorm/theme-default/css';

interface Employee {
  name: string;
  age: number;
  department: string;
}

const columns = [
  { field: 'name' as const, headerName: 'Name', sortable: true },
  { field: 'age' as const, headerName: 'Age', width: 100 },
  { field: 'department' as const, headerName: 'Department' },
];

const data: Employee[] = [
  { name: 'Alice', age: 30, department: 'Engineering' },
  { name: 'Bob', age: 25, department: 'Design' },
];

export default function App() {
  return <GridStorm<Employee> columns={columns} rowData={data} height={400} />;
}
```

## GridStorm Component Props

The `<GridStorm>` component accepts all `GridConfig` properties plus React-specific additions:

| Prop | Type | Default | Description |
|---|---|---|---|
| `columns` | `ReactColumnDef[]` | Required | Column definitions (supports React renderers) |
| `rowData` | `TData[]` | `undefined` | Row data array |
| `plugins` | `GridPlugin[]` | `[]` | Plugins to install |
| `height` | `number \| string` | `400` | Container height |
| `width` | `number \| string` | `'100%'` | Container width |
| `containerClass` | `string` | `undefined` | CSS class for the container |
| `containerStyle` | `CSSProperties` | `undefined` | Inline styles for the container |
| `theme` | `string` | `undefined` | Theme name (`'light'`, `'dark'`, `'high-contrast'`) |
| `contextMenu` | `ReactContextMenu` | `undefined` | React context menu component |
| `children` | `ReactNode` | `undefined` | Children (for context consumers) |

Plus all `GridConfig` properties (`rowHeight`, `headerHeight`, `defaultColDef`, `getRowId`, `pagination`, `paginationPageSize`, etc.) and all event callback props.

## Event Callback Props

```tsx title="Event callbacks"
<GridStorm
  columns={columns}
  rowData={data}
  onGridReady={(api) => console.log('Grid ready')}
  onRowDataChanged={(e) => console.log('Data changed')}
  onSelectionChanged={(e) => console.log('Selection:', e.selectedNodes.length)}
  onSortChanged={(e) => console.log('Sort:', e.sortModel)}
  onFilterChanged={(e) => console.log('Filter:', e.filterModel)}
  onCellValueChanged={(e) => console.log('Cell:', e.colId, e.newValue)}
  onCellClicked={(e) => console.log('Click:', e.colId)}
  onCellDoubleClicked={(e) => console.log('DblClick:', e.colId)}
  onRowClicked={(e) => console.log('Row:', e.node.id)}
  onCellEditingStarted={(e) => console.log('Edit start:', e.colId)}
  onCellEditingStopped={(e) => console.log('Edit stop:', e.cancelled)}
  onPaginationChanged={(e) => console.log('Page:', e.currentPage)}
  onColumnResized={(e) => console.log('Resize:', e.column.colId)}
/>
```

## Hooks Reference

All hooks must be used inside a `<GridStorm>` component (or its children), which provides the required React context.

### useGridApi

Access the `GridApi` instance for programmatic control:

```tsx title="useGridApi"
import { useGridApi } from '@gridstorm/react';

function Toolbar() {
  const api = useGridApi();

  return (
    <button onClick={() => api.setRowData(newData)}>
      Refresh Data
    </button>
  );
}
```

### useGridSort

Reactive sort model state and actions:

```tsx title="useGridSort"
import { useGridSort } from '@gridstorm/react';

function SortControls() {
  const { sortModel, isSorted, setSortModel, toggleSort, clearSort } = useGridSort();

  return (
    <div>
      <span>Sorted by {sortModel.length} columns</span>
      <button onClick={() => toggleSort('name')}>Sort Name</button>
      <button onClick={() => toggleSort('age', true)}>Add Age Sort</button>
      <button onClick={clearSort}>Clear</button>
    </div>
  );
}
```

### useGridFilter

Reactive filter model and quick filter:

```tsx title="useGridFilter"
import { useGridFilter } from '@gridstorm/react';

function FilterBar() {
  const { isFiltered, filterModel, setQuickFilter, setFilterModel, clearFilters } = useGridFilter();

  return (
    <div>
      <input placeholder="Search..." onChange={(e) => setQuickFilter(e.target.value)} />
      {isFiltered && <button onClick={clearFilters}>Clear</button>}
    </div>
  );
}
```

### useGridSelection

Selection state and actions:

```tsx title="useGridSelection"
import { useGridSelection } from '@gridstorm/react';

function SelectionBar() {
  const { selectedCount, selectAll, deselectAll, isRowSelected, getSelectedRows } = useGridSelection();

  return (
    <div>
      <span>{selectedCount} selected</span>
      <button onClick={selectAll}>Select All</button>
      <button onClick={deselectAll}>Deselect</button>
      <button onClick={() => console.log(getSelectedRows())}>Log Selected</button>
    </div>
  );
}
```

### useGridPagination

Pagination state and navigation:

```tsx title="useGridPagination"
import { useGridPagination } from '@gridstorm/react';

function Pager() {
  const { currentPage, totalPages, hasNextPage, hasPreviousPage, nextPage, previousPage } = useGridPagination();

  return (
    <div>
      <button onClick={previousPage} disabled={!hasPreviousPage}>Prev</button>
      <span>Page {currentPage + 1} of {totalPages}</span>
      <button onClick={nextPage} disabled={!hasNextPage}>Next</button>
    </div>
  );
}
```

### useGridColumn

Column state and manipulation:

```tsx title="useGridColumn"
import { useGridColumn } from '@gridstorm/react';

function ColumnToggle() {
  const { allColumns, visibleColumns, setColumnVisible, setColumnWidth } = useGridColumn();

  return (
    <div>
      {allColumns.map((col) => (
        <label key={col.colId}>
          <input
            type="checkbox"
            checked={!col.hide}
            onChange={(e) => setColumnVisible(col.colId, e.target.checked)}
          />
          {col.headerName}
        </label>
      ))}
    </div>
  );
}
```

### useGridEvent

Subscribe to any grid event with automatic cleanup:

```tsx title="useGridEvent"
import { useGridEvent } from '@gridstorm/react';

function CellLogger() {
  useGridEvent('cell:clicked', (event) => {
    console.log('Clicked:', event.colId, event.value);
  });

  useGridEvent('cell:valueChanged', (event) => {
    console.log('Changed:', event.colId, event.oldValue, '->', event.newValue);
  });

  return null;
}
```

### useGridState

Low-level access to the reactive grid state:

```tsx title="useGridState"
import { useGridState } from '@gridstorm/react';

function RowCounter() {
  const { engine } = useGridContext();
  // Direct store subscription for custom state slices
  const totalRows = useSyncExternalStore(
    (cb) => engine.store.subscribe(cb),
    () => engine.store.getState().pagination.totalRows,
  );

  return <span>{totalRows} total rows</span>;
}
```

## Custom Cell Renderers (React Components)

Pass React components as cell renderers for rich cell content:

```tsx title="React cell renderer"
import type { CellRendererProps } from '@gridstorm/react';

function StatusBadge({ value }: CellRendererProps) {
  const color = value === 'active' ? 'green' : value === 'inactive' ? 'red' : 'orange';
  return (
    <span style={{
      padding: '2px 8px',
      borderRadius: '12px',
      background: color,
      color: 'white',
      fontSize: '12px',
    }}>
      {value}
    </span>
  );
}

// Use in column definition:
const columns = [
  { field: 'name', headerName: 'Name' },
  { field: 'status', headerName: 'Status', cellRenderer: StatusBadge },
];
```

The `CellRendererProps` include:

| Prop | Type | Description |
|---|---|---|
| `value` | `TValue` | Cell value (after valueGetter) |
| `formattedValue` | `string` | Formatted display value |
| `data` | `TData \| undefined` | Row data object |
| `node` | `RowNode` | Row node |
| `colDef` | `ColumnDef` | Column definition |
| `colId` | `string` | Column ID |
| `rowIndex` | `number` | Display row index |
| `api` | `GridApi` | Grid API |

## Custom Header Renderers

```tsx title="React header renderer"
import type { HeaderRendererProps } from '@gridstorm/react';

function SortableHeader({ displayName, sortDirection, onSortRequested }: HeaderRendererProps) {
  const arrow = sortDirection === 'asc' ? ' ^' : sortDirection === 'desc' ? ' v' : '';
  return (
    <div
      style={{ cursor: 'pointer', userSelect: 'none' }}
      onClick={(e) => onSortRequested(e.shiftKey)}
    >
      {displayName}{arrow}
    </div>
  );
}

{ field: 'name', headerRenderer: SortableHeader }
```

## Custom Cell Editors

```tsx title="React cell editor"
import type { CellEditorProps } from '@gridstorm/react';

function TagEditor({ value, onValueChange, stopEditing }: CellEditorProps) {
  const [text, setText] = useState(value ?? '');

  return (
    <input
      autoFocus
      value={text}
      onChange={(e) => { setText(e.target.value); onValueChange(e.target.value); }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') stopEditing();
        if (e.key === 'Escape') stopEditing(true);
      }}
      onBlur={() => stopEditing()}
    />
  );
}

{ field: 'tags', editable: true, cellEditorComponent: TagEditor }
```

## Controlled State

The `<GridStorm>` component supports both uncontrolled (grid manages state internally) and controlled (parent owns state) modes.

### Controlled Sort

```tsx title="Controlled sort"
const [sortModel, setSortModel] = useState<SortModelItem[]>([]);

<GridStorm
  columns={columns}
  rowData={data}
  plugins={plugins}
  sortModel={sortModel}
  onSortModelChange={setSortModel}
/>
```

### Controlled Filter

```tsx title="Controlled filter"
const [filterModel, setFilterModel] = useState({});

<GridStorm
  columns={columns}
  rowData={data}
  plugins={plugins}
  filterModel={filterModel}
  onFilterModelChange={setFilterModel}
/>
```

### Controlled Selection

```tsx title="Controlled selection"
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

<GridStorm
  columns={columns}
  rowData={data}
  plugins={plugins}
  selectedRowIds={selectedIds}
  onSelectedRowIdsChange={(ids, source) => setSelectedIds(ids)}
/>
```

### Controlled Pagination

```tsx title="Controlled pagination"
const [page, setPage] = useState(0);

<GridStorm
  columns={columns}
  rowData={data}
  plugins={plugins}
  currentPage={page}
  onCurrentPageChange={setPage}
/>
```

## Context Menu with React

Provide a custom React component as the context menu:

```tsx title="React context menu"
import type { ContextMenuProps } from '@gridstorm/react';

function MyMenu({ node, colId, value, api, closeMenu }: ContextMenuProps) {
  return (
    <div className="custom-menu">
      <button onClick={() => {
        navigator.clipboard.writeText(String(value));
        closeMenu();
      }}>
        Copy Value
      </button>
      <button onClick={closeMenu}>Close</button>
    </div>
  );
}

<GridStorm columns={columns} rowData={data} contextMenu={MyMenu} />
```

## Error Boundary

The `<GridStorm>` component wraps itself in a `GridErrorBoundary` that catches rendering errors and displays a fallback UI instead of crashing the entire application.

## TypeScript

The `<GridStorm>` component is fully generic:

```tsx
<GridStorm<Employee>
  columns={columns}    // Type-checked against Employee
  rowData={employees}  // Must be Employee[]
  onCellValueChanged={(e) => {
    e.node.data // TypeScript knows this is Employee | undefined
  }}
/>
```

The `ReactColumnDef<TData>` type extends the core `ColumnDef` to also accept React component types for `cellRenderer`, `headerRenderer`, and `cellEditorComponent`.

## Children and Context

The `<GridStorm>` component provides a React context. Any children rendered inside it can use all GridStorm hooks:

```tsx title="Children pattern"
<GridStorm columns={columns} rowData={data} plugins={plugins}>
  <Toolbar />       {/* Can use useGridApi(), useGridSort(), etc. */}
  <StatusBar />
  <PaginationBar />
</GridStorm>
```

## Next Steps

- **[Quick Start](/getting-started/quick-start/)** -- Get a grid on screen.
- **[Plugins](/plugins/plugin-system/)** -- Install and configure plugins.
- **[API Reference](/api/grid-api/)** -- Full GridApi method reference.
