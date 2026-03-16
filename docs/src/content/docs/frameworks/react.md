---
title: React Adapter
description: Use GridStorm in React applications with the @gridstorm/react package, featuring hooks, portals, controlled state, and full TypeScript support.
---

The `@gridstorm/react` package provides a first-class React wrapper around the GridStorm headless engine. It includes the `<GridStorm>` component, reactive hooks powered by `useSyncExternalStore`, a portal system for rendering React components inside grid cells, and full support for controlled and uncontrolled state patterns.

## Installation

```bash title="Terminal"
npm install @gridstorm/core @gridstorm/dom-renderer @gridstorm/react @gridstorm/theme-default
```

Import the default theme CSS in your application entry point:

```tsx title="main.tsx"
import '@gridstorm/theme-default';
```

## Basic Usage

```tsx title="EmployeeGrid.tsx"
import { GridStorm } from '@gridstorm/react';
import type { ReactColumnDef } from '@gridstorm/react';

interface Employee {
  id: string;
  name: string;
  department: string;
  salary: number;
}

const columns: ReactColumnDef<Employee>[] = [
  { field: 'name', headerName: 'Name', width: 200 },
  { field: 'department', headerName: 'Department', width: 150 },
  { field: 'salary', headerName: 'Salary', width: 120 },
];

const rowData: Employee[] = [
  { id: '1', name: 'Alice', department: 'Engineering', salary: 95000 },
  { id: '2', name: 'Bob', department: 'Design', salary: 85000 },
];

export function EmployeeGrid() {
  return (
    <GridStorm<Employee>
      columns={columns}
      rowData={rowData}
      getRowId={(params) => params.data.id}
      height={400}
    />
  );
}
```

:::example{title="React Integration Demo" href="/react-demo/"}
See the full React integration with hooks, custom cell renderers, portals, and error boundaries.
:::

## Props Reference

The `<GridStorm>` component accepts all core `GridConfig` props plus React-specific props for layout, controlled state, events, and renderer configuration.

### Core Grid Props

| Name | Type | Description |
|------|------|-------------|
| `columns` | `ReactColumnDef<TData>[]` | Column definitions. Supports React component renderers. |
| `rowData` | `TData[]` | Client-side row data array. |
| `dataSource` | `DataSource` | Server-side data source (alternative to `rowData`). |
| `rowModelType` | `string` | Row model type. Default: `'clientSide'`. |
| `getRowId` | `(params) => string` | Callback to generate a unique ID for each row. |
| `plugins` | `GridPlugin[]` | Array of plugins to register during initialization. |
| `defaultColDef` | `Partial<ColumnDef>` | Default column definition applied to all columns. |
| `rowHeight` | `number` | Row height in pixels. |
| `headerHeight` | `number` | Header row height in pixels. |
| `domLayout` | `'normal' \| 'autoHeight' \| 'print'` | Controls how the grid DOM height is determined. |
| `pinnedTopRowData` | `TData[]` | Rows pinned to the top of the grid. |
| `pinnedBottomRowData` | `TData[]` | Rows pinned to the bottom of the grid. |
| `suppressScrollX` | `boolean` | Suppress horizontal scrollbar. |
| `suppressScrollY` | `boolean` | Suppress vertical scrollbar. |
| `rowSelection` | `'single' \| 'multiple' \| false` | Row selection mode. |
| `editType` | `string` | Cell editing type. |
| `undoRedoCellEditing` | `boolean` | Enable undo/redo for cell editing. |
| `pagination` | `boolean` | Enable pagination. |
| `paginationPageSize` | `number` | Rows per page. |
| `animateRows` | `boolean` | Enable row animation on sort/filter changes. |
| `ariaLabel` | `string` | ARIA label for the grid root element. |
| `locale` | `string` | Locale identifier for i18n. |
| `theme` | `string` | Theme name applied to the grid. |

### Component Layout Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `height` | `number \| string` | `400` | Container height. Numbers are treated as pixels. |
| `width` | `number \| string` | `'100%'` | Container width. Numbers are treated as pixels. |
| `containerClass` | `string` | `undefined` | Additional CSS class on the container `<div>`. |
| `containerStyle` | `CSSProperties` | `undefined` | Additional inline styles on the container. |
| `contextMenu` | `ReactContextMenu<TData>` | `undefined` | Custom context menu React component. |
| `children` | `ReactNode` | `undefined` | Children rendered inside the `GridContext.Provider`. |

### Renderer Config Props

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `enableCellEditing` | `boolean` | auto-detect | Enable inline cell editing overlay. |
| `enableGrouping` | `boolean` | auto-detect | Enable row grouping visuals (chevron, indent, group label). |
| `groupIndent` | `number` | `24` | Indentation per group level in pixels. |
| `checkboxSelection` | `boolean` | `false` | Show checkbox selection column as the first column. |
| `checkboxColumnWidth` | `number` | `48` | Width of the checkbox column in pixels. |
| `floatingFilter` | `boolean` | `false` | Show floating filter inputs below the header. |
| `floatingFilterDebounce` | `number` | `300` | Debounce delay for filter input in milliseconds. |
| `enablePagination` | `boolean` | auto-detect | Show pagination bar below the grid. |
| `pageSizeOptions` | `number[]` | `[25, 50, 100, 250]` | Available page size options for the page size selector. |

### Controlled State Props

| Name | Type | Description |
|------|------|-------------|
| `sortModel` | `SortModelItem[]` | Controlled sort model. Grid will not update sort internally. |
| `onSortModelChange` | `(sortModel) => void` | Called when the user changes sort in controlled mode. |
| `filterModel` | `Record<string, FilterModel>` | Controlled filter model. |
| `onFilterModelChange` | `(filterModel) => void` | Called when the user changes filters in controlled mode. |
| `selectedRowIds` | `Set<string>` | Controlled selection (set of row IDs). |
| `onSelectedRowIdsChange` | `(ids, source) => void` | Called when the user changes selection in controlled mode. |
| `currentPage` | `number` | Controlled pagination page (0-indexed). |
| `onCurrentPageChange` | `(page) => void` | Called when the user changes page in controlled mode. |

### Event Callback Props

| Name | Core Event | Description |
|------|-----------|-------------|
| `onGridReady` | -- | Fires when the engine is initialized. Receives `GridApi`. |
| `onRowDataChanged` | `rowData:changed` | Row data was updated. |
| `onSelectionChanged` | `selection:changed` | Selection state changed. |
| `onSortChanged` | `column:sort:changed` | Sort model changed. |
| `onFilterChanged` | `filter:changed` | Filter model changed. |
| `onCellValueChanged` | `cell:valueChanged` | A cell value was edited. |
| `onCellClicked` | `cell:clicked` | A cell was clicked. |
| `onCellDoubleClicked` | `cell:doubleClicked` | A cell was double-clicked. |
| `onRowClicked` | `row:clicked` | A row was clicked. |
| `onCellEditingStarted` | `cell:editingStarted` | Cell editing began. |
| `onCellEditingStopped` | `cell:editingStopped` | Cell editing ended. |
| `onPaginationChanged` | `pagination:changed` | Pagination state changed. |
| `onColumnResized` | `column:resized` | A column was resized. |

## Hooks

All hooks must be called inside a child of `<GridStorm>`, where they have access to the `GridContext`. They use `useSyncExternalStore` internally, so they are SSR-compatible and React StrictMode-safe.

### useGridApi

Returns the `GridApi` instance for imperative actions.

```tsx title="ToolbarActions.tsx"
import { useGridApi } from '@gridstorm/react';

function ExportButton() {
  const api = useGridApi();

  return (
    <button onClick={() => console.log(api.getSelectedRows())}>
      Log Selected
    </button>
  );
}
```

| Return | Type | Description |
|--------|------|-------------|
| `api` | `GridApi<TData>` | The grid API instance. |

### useGridState

Selector-based reactive state subscription. Re-renders only when the selected value changes (reference equality).

```tsx title="RowCounter.tsx"
import { useGridState } from '@gridstorm/react';

function RowCounter() {
  const rowCount = useGridState((state) => state.displayedRowIds.length);
  return <span>{rowCount} rows</span>;
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `selector` | `(state: GridState<TData>) => TResult` | Selector function that extracts a value from grid state. |

| Return | Type | Description |
|--------|------|-------------|
| `result` | `TResult` | The selected state value. |

### useGridColumn

Access column state and manipulation actions.

```tsx title="ColumnToggle.tsx"
import { useGridColumn } from '@gridstorm/react';

function ColumnToggle({ colId }: { colId: string }) {
  const { visibleColumns, setColumnVisible, getColumn } = useGridColumn();
  const col = getColumn(colId);

  return (
    <label>
      <input
        type="checkbox"
        checked={!col?.hide}
        onChange={(e) => setColumnVisible(colId, e.target.checked)}
      />
      {col?.headerName}
    </label>
  );
}
```

| Return Property | Type | Description |
|----------------|------|-------------|
| `allColumns` | `ColumnState[]` | All columns including hidden ones. |
| `visibleColumns` | `ColumnState[]` | Only visible columns. |
| `setColumnVisible` | `(colId, visible) => void` | Toggle column visibility. |
| `setColumnWidth` | `(colId, width) => void` | Set a column's width. |
| `moveColumn` | `(colId, toIndex) => void` | Move a column to a new index. |
| `setColumnPinned` | `(colId, pinned) => void` | Pin a column (`'left'`, `'right'`, or `null`). |
| `getColumn` | `(colId) => ColumnState \| undefined` | Get a single column by ID. |

### useGridSort

Access sort model state and actions.

```tsx title="SortControls.tsx"
import { useGridSort } from '@gridstorm/react';

function SortControls() {
  const { sortModel, isSorted, toggleSort, clearSort } = useGridSort();

  return (
    <div>
      <button onClick={() => toggleSort('name')}>Sort by Name</button>
      <button onClick={() => toggleSort('salary', true)}>Add Salary Sort</button>
      {isSorted && <button onClick={clearSort}>Clear Sort</button>}
    </div>
  );
}
```

| Return Property | Type | Description |
|----------------|------|-------------|
| `sortModel` | `SortModelItem[]` | Current sort model array. |
| `isSorted` | `boolean` | Whether any sort is active. |
| `setSortModel` | `(model) => void` | Set the sort model directly. |
| `toggleSort` | `(colId, multiSort?) => void` | Toggle sort on a column. Pass `true` for multi-sort. |
| `clearSort` | `() => void` | Clear all sorting. |

### useGridFilter

Access filter model state and actions.

```tsx title="FilterBar.tsx"
import { useGridFilter } from '@gridstorm/react';

function QuickSearch() {
  const { isFiltered, setQuickFilter, clearFilters } = useGridFilter();

  return (
    <div>
      <input
        placeholder="Search..."
        onChange={(e) => setQuickFilter(e.target.value)}
      />
      {isFiltered && <button onClick={clearFilters}>Clear</button>}
    </div>
  );
}
```

| Return Property | Type | Description |
|----------------|------|-------------|
| `filterModel` | `Record<string, FilterModel>` | Current filter model keyed by column ID. |
| `quickFilterText` | `string` | Current quick filter text. |
| `isFiltered` | `boolean` | Whether any filter is active. |
| `setFilterModel` | `(model) => void` | Set the filter model. |
| `setQuickFilter` | `(text) => void` | Set the quick filter text. |
| `clearFilters` | `() => void` | Clear all filters and quick filter text. |

### useGridPagination

Access pagination state and navigation actions.

```tsx title="Pager.tsx"
import { useGridPagination } from '@gridstorm/react';

function Pager() {
  const {
    currentPage, totalPages, hasNextPage, hasPreviousPage,
    nextPage, previousPage, firstPage, lastPage,
  } = useGridPagination();

  return (
    <nav>
      <button onClick={firstPage} disabled={!hasPreviousPage}>First</button>
      <button onClick={previousPage} disabled={!hasPreviousPage}>Prev</button>
      <span>Page {currentPage + 1} of {totalPages}</span>
      <button onClick={nextPage} disabled={!hasNextPage}>Next</button>
      <button onClick={lastPage} disabled={!hasNextPage}>Last</button>
    </nav>
  );
}
```

| Return Property | Type | Description |
|----------------|------|-------------|
| `currentPage` | `number` | Current page (0-indexed). |
| `totalPages` | `number` | Total number of pages. |
| `pageSize` | `number` | Rows per page. |
| `totalRows` | `number` | Total row count after filtering. |
| `hasNextPage` | `boolean` | Whether there is a next page. |
| `hasPreviousPage` | `boolean` | Whether there is a previous page. |
| `goToPage` | `(page) => void` | Go to a specific page. |
| `nextPage` | `() => void` | Go to the next page. |
| `previousPage` | `() => void` | Go to the previous page. |
| `firstPage` | `() => void` | Go to the first page. |
| `lastPage` | `() => void` | Go to the last page. |

### useGridSelection

Access selection state and actions.

```tsx title="SelectionInfo.tsx"
import { useGridSelection } from '@gridstorm/react';

function SelectionInfo() {
  const { selectedCount, selectAll, deselectAll, getSelectedRows } =
    useGridSelection<Employee>();

  return (
    <div>
      <span>{selectedCount} selected</span>
      <button onClick={selectAll}>Select All</button>
      <button onClick={deselectAll}>Deselect All</button>
      <button onClick={() => console.log(getSelectedRows())}>Log Data</button>
    </div>
  );
}
```

| Return Property | Type | Description |
|----------------|------|-------------|
| `selectedRowIds` | `Set<string>` | Set of selected row IDs. |
| `selectedCount` | `number` | Number of selected rows. |
| `getSelectedRows` | `() => TData[]` | Get selected row data objects. |
| `getSelectedNodes` | `() => RowNode<TData>[]` | Get selected RowNode objects. |
| `isRowSelected` | `(rowId) => boolean` | Check if a specific row is selected. |
| `selectAll` | `() => void` | Select all visible rows. |
| `deselectAll` | `() => void` | Deselect all rows. |

### useGridEvent

Subscribe to typed grid events. The handler ref prevents stale closures without re-subscribing.

```tsx title="EventLogger.tsx"
import { useGridEvent } from '@gridstorm/react';

function CellClickLogger() {
  useGridEvent('cell:clicked', (event) => {
    console.log('Clicked:', event.colId, event.value);
  });

  return null;
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `event` | `keyof GridEventMap` | The event name to subscribe to. |
| `handler` | `(payload) => void` | Callback invoked when the event fires. |

## Custom Cell Renderers

You can use React components as cell renderers. The `PortalManager` automatically detects React renderers and portals them into grid cells.

```tsx title="StatusCell.tsx"
import type { CellRendererProps } from '@gridstorm/react';

function StatusBadge({ value }: CellRendererProps<Employee, string>) {
  const color = value === 'Active' ? 'green' : 'gray';
  return <span style={{ color, fontWeight: 600 }}>{value}</span>;
}

const columns: ReactColumnDef<Employee>[] = [
  { field: 'name', headerName: 'Name' },
  { field: 'status', headerName: 'Status', cellRenderer: StatusBadge },
];
```

### CellRendererProps Reference

| Property | Type | Description |
|----------|------|-------------|
| `value` | `TValue` | The cell's current value (after `valueGetter`). |
| `formattedValue` | `string` | The formatted display value (after `valueFormatter`). |
| `data` | `TData \| undefined` | The row data object. |
| `node` | `RowNode<TData>` | The RowNode for this row. |
| `colDef` | `ColumnDef<TData, TValue>` | The column definition. |
| `colId` | `string` | Column ID. |
| `rowIndex` | `number` | Display row index. |
| `api` | `GridApi<TData>` | Grid API reference. |

### Custom Header Renderers

```tsx title="CustomHeader.tsx"
import type { HeaderRendererProps } from '@gridstorm/react';

function SortableHeader({ displayName, sortDirection, onSortRequested }: HeaderRendererProps) {
  const icon = sortDirection === 'asc' ? ' ^' : sortDirection === 'desc' ? ' v' : '';
  return (
    <div onClick={() => onSortRequested(false)}>
      {displayName}{icon}
    </div>
  );
}
```

### HeaderRendererProps Reference

| Property | Type | Description |
|----------|------|-------------|
| `colDef` | `ColumnDef<TData>` | Column definition. |
| `colId` | `string` | Column ID. |
| `displayName` | `string` | Display name for the header. |
| `sortDirection` | `SortDirection` | Current sort direction (`'asc'`, `'desc'`, or `null`). |
| `sortIndex` | `number \| null` | Sort priority index for multi-sort. |
| `api` | `GridApi<TData>` | Grid API reference. |
| `onSortRequested` | `(multiSort: boolean) => void` | Request a sort toggle on this column. |

### Custom Cell Editors

```tsx title="NumericEditor.tsx"
import type { CellEditorProps } from '@gridstorm/react';

function NumericEditor({ value, onValueChange, stopEditing }: CellEditorProps<Employee, number>) {
  return (
    <input
      type="number"
      defaultValue={value}
      autoFocus
      onChange={(e) => onValueChange(Number(e.target.value))}
      onKeyDown={(e) => {
        if (e.key === 'Enter') stopEditing();
        if (e.key === 'Escape') stopEditing(true);
      }}
    />
  );
}

const columns: ReactColumnDef<Employee>[] = [
  { field: 'salary', headerName: 'Salary', editable: true, cellEditorComponent: NumericEditor },
];
```

### CellEditorProps Reference

| Property | Type | Description |
|----------|------|-------------|
| `value` | `TValue` | Current cell value. |
| `data` | `TData` | Row data object. |
| `colId` | `string` | Column ID. |
| `rowId` | `string` | Row ID. |
| `column` | `ColumnState` | Column state object. |
| `editorParams` | `Record<string, unknown>` | Additional editor params from column def. |
| `onValueChange` | `(value: TValue) => void` | Callback to update the value while editing. |
| `stopEditing` | `(cancel?: boolean) => void` | Stop editing. Pass `true` to cancel without saving. |
| `api` | `GridApi<TData>` | Grid API reference. |

### Context Menu Component

```tsx title="CustomMenu.tsx"
import type { ContextMenuProps } from '@gridstorm/react';

function MyMenu({ node, colId, value, api, closeMenu }: ContextMenuProps) {
  return (
    <div className="gs-context-menu">
      <button
        className="gs-context-menu-item"
        onClick={() => {
          navigator.clipboard.writeText(String(value));
          closeMenu();
        }}
      >
        Copy Value
      </button>
      <button className="gs-context-menu-item" onClick={closeMenu}>
        Close
      </button>
    </div>
  );
}

<GridStorm columns={columns} rowData={rowData} contextMenu={MyMenu} />
```

### ContextMenuProps Reference

| Property | Type | Description |
|----------|------|-------------|
| `position` | `CellPosition` | The cell position that was right-clicked. |
| `node` | `RowNode<TData>` | The row node. |
| `colId` | `string` | Column ID. |
| `value` | `any` | Cell value. |
| `api` | `GridApi<TData>` | Grid API reference. |
| `closeMenu` | `() => void` | Close the context menu. |

## Portal System

The `PortalManager` is the mechanism that bridges React components with the DOM-based grid renderer. You do not need to configure it manually -- it is included automatically when you use the `<GridStorm>` component.

How it works:

1. A `MutationObserver` watches the `.gs-body` element for DOM changes from `DomRenderer`.
2. When rows are added or removed, the `PortalManager` scans visible cells for columns that have React renderers.
3. For each matching cell, a stable wrapper `<div style="display:contents">` is created inside the cell, and a React portal renders the component into that wrapper.
4. When `DomRenderer` destroys or recycles cells during virtual scrolling, the wrapper is detached but React can still safely unmount its children.
5. Header renderer portals work the same way, re-scanning when sort or column changes occur.
6. Editor portals are created when `cell:editingStarted` fires and destroyed when `cell:editingStopped` fires.
7. Context menu portals are created on right-click and destroyed when the menu is closed.

## Controlled vs Uncontrolled Modes

By default, GridStorm manages its own state (uncontrolled). You can take control of specific state slices by providing the controlled props and their corresponding change handlers.

### Uncontrolled (default)

```tsx title="Uncontrolled.tsx"
<GridStorm
  columns={columns}
  rowData={rowData}
  onSortChanged={(e) => console.log('Sort changed:', e.sortModel)}
/>
```

### Controlled Sort

```tsx title="ControlledSort.tsx"
import { useState } from 'react';
import type { SortModelItem } from '@gridstorm/core';

function ControlledSortGrid() {
  const [sortModel, setSortModel] = useState<SortModelItem[]>([]);

  return (
    <GridStorm
      columns={columns}
      rowData={rowData}
      sortModel={sortModel}
      onSortModelChange={(newModel) => {
        // Validate, transform, or persist before applying
        setSortModel(newModel);
      }}
    />
  );
}
```

### Controlled Selection

```tsx title="ControlledSelection.tsx"
function ControlledSelectionGrid() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  return (
    <GridStorm
      columns={columns}
      rowData={rowData}
      rowSelection="multiple"
      selectedRowIds={selectedIds}
      onSelectedRowIdsChange={(ids, source) => {
        console.log('Selection source:', source);
        setSelectedIds(ids);
      }}
    />
  );
}
```

### Controlled Pagination

```tsx title="ControlledPagination.tsx"
function ControlledPaginationGrid() {
  const [page, setPage] = useState(0);

  return (
    <GridStorm
      columns={columns}
      rowData={rowData}
      pagination
      paginationPageSize={25}
      currentPage={page}
      onCurrentPageChange={setPage}
    />
  );
}
```

### Controlled Filter

```tsx title="ControlledFilter.tsx"
function ControlledFilterGrid() {
  const [filterModel, setFilterModel] = useState({});

  return (
    <GridStorm
      columns={columns}
      rowData={rowData}
      filterModel={filterModel}
      onFilterModelChange={(newModel) => {
        setFilterModel(newModel);
      }}
    />
  );
}
```

## Children and Context

The `<GridStorm>` component provides a React context via `GridContext.Provider`. Any children rendered inside it can use all GridStorm hooks:

```tsx title="ChildrenPattern.tsx"
<GridStorm columns={columns} rowData={data} plugins={plugins}>
  <Toolbar />       {/* Can use useGridApi(), useGridSort(), etc. */}
  <StatusBar />
  <PaginationBar />
</GridStorm>
```

## SSR Support

All hooks use `useSyncExternalStore` with a `getServerSnapshot` parameter that returns the same snapshot as the client. The grid engine is created in a `useEffect`, so it only runs on the client. During SSR, the component renders an empty container `<div>`.

## React StrictMode Compatibility

The `<GridStorm>` component is fully compatible with React StrictMode. The internal `useGridEngine` hook creates the engine in a `useEffect` so that StrictMode's cleanup-then-remount cycle creates a fresh engine each time. The previous engine is destroyed in the cleanup function, preventing memory leaks.

## Error Boundary

The `<GridStorm>` component wraps itself in a `GridErrorBoundary` that catches rendering errors and displays a fallback UI instead of crashing the entire application.

## TypeScript Generics

The `<GridStorm>` component and all hooks accept a generic `TData` parameter for row data typing:

```tsx title="TypedGrid.tsx"
interface Trade {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
}

// Component is fully typed
<GridStorm<Trade>
  columns={[
    { field: 'symbol', headerName: 'Symbol' },
    { field: 'price', headerName: 'Price' },
  ]}
  rowData={trades}
  getRowId={(p) => p.data.id}
/>

// Hooks infer TData from context
const rows = useGridSelection<Trade>().getSelectedRows();
// rows is Trade[]
```

## Next Steps

- [Theming](/core-concepts/theming/) -- customize the grid appearance with CSS tokens
- [Columns](/core-concepts/columns/) -- learn about column definitions and features
- [Events & Commands](/core-concepts/events-commands/) -- listen to grid events and dispatch commands
- [Vanilla JS](/frameworks/vanilla/) -- use GridStorm without a framework
- [Angular](/frameworks/angular/) -- use GridStorm with Angular
