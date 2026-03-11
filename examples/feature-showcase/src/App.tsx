import { useState, useMemo, useCallback, useRef } from 'react';
import { GridStorm } from '@gridstorm/react';
import type { ColumnDef, GridPlugin, GridApi } from '@gridstorm/core';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { FilteringPlugin } from '@gridstorm/plugin-filtering';
import { SelectionPlugin } from '@gridstorm/plugin-selection';
import { EditingPlugin } from '@gridstorm/plugin-editing';
import { ColumnResizePlugin } from '@gridstorm/plugin-column-resize';
import { ColumnPinningPlugin } from '@gridstorm/plugin-column-pinning';
import { ColumnReorderPlugin } from '@gridstorm/plugin-column-reorder';
import { PaginationPlugin } from '@gridstorm/plugin-pagination';
import { GroupingPlugin } from '@gridstorm/plugin-grouping';
import { AggregationPlugin } from '@gridstorm/plugin-aggregation';
import { ContextMenuPlugin } from '@gridstorm/plugin-context-menu';
import { ClipboardPlugin } from '@gridstorm/plugin-clipboard';
import { RowReorderPlugin } from '@gridstorm/plugin-row-reorder';
import '@gridstorm/theme-default';
import { generateEmployees, generateProducts } from './data';
// Types from data generators used by demos

// ── Feature Demos ──

interface FeatureDemo {
  id: string;
  title: string;
  description: string;
  category: 'core' | 'column' | 'data' | 'interaction' | 'enterprise';
}

const FEATURES: FeatureDemo[] = [
  { id: 'sorting', title: 'Sorting', description: 'Single & multi-column sorting with custom sort cycles', category: 'core' },
  { id: 'filtering', title: 'Filtering', description: 'Quick-filter search across all columns', category: 'core' },
  { id: 'selection', title: 'Row Selection', description: 'Click rows to select with multi-select support', category: 'core' },
  { id: 'pagination', title: 'Pagination', description: 'Client-side pagination with configurable page sizes', category: 'data' },
  { id: 'virtual-scroll', title: 'Virtual Scrolling', description: 'Render 100K+ rows at 60fps with virtual scrolling', category: 'core' },
  { id: 'theming', title: 'Theming', description: 'Light, dark, high-contrast themes with CSS variables', category: 'core' },
  { id: 'value-formatters', title: 'Value Formatters', description: 'Format cell values (currency, dates, percentages)', category: 'core' },
  { id: 'custom-renderers', title: 'Custom Renderers', description: 'Custom HTML cell and header renderers', category: 'interaction' },
  { id: 'column-resize', title: 'Column Resize', description: 'Drag column borders to resize columns', category: 'column' },
  { id: 'column-pinning', title: 'Column Pinning', description: 'Pin columns to left or right edges while scrolling', category: 'column' },
  { id: 'column-reorder', title: 'Column Reorder', description: 'Drag-and-drop columns to reorder', category: 'column' },
  { id: 'row-reorder', title: 'Row Reorder', description: 'Drag-and-drop rows to reorder with visual indicators', category: 'interaction' },
  { id: 'editing', title: 'Cell Editing', description: 'Click a cell, then edit values inline', category: 'interaction' },
  { id: 'context-menu', title: 'Context Menu', description: 'Right-click context menus with custom actions', category: 'interaction' },
  { id: 'grouping', title: 'Row Grouping', description: 'Group rows by column values with expand/collapse', category: 'data' },
  { id: 'aggregation', title: 'Aggregation', description: 'Sum, avg, min, max, count functions on grouped data', category: 'enterprise' },
  { id: 'clipboard', title: 'Clipboard', description: 'Copy/Cut/Paste cells with Ctrl+C/X/V', category: 'enterprise' },
  { id: 'infinite-scroll', title: 'Infinite Scroll', description: 'Scroll through 100K rows seamlessly', category: 'data' },
  { id: 'status-badges', title: 'Status Badges', description: 'Professional cell renderers with badges, progress bars, and icons', category: 'interaction' },
  { id: 'full-featured', title: 'Full Featured', description: 'All features combined in one grid', category: 'enterprise' },
];

// ── Pre-generated Data (BEFORE any usage) ──

const EMPLOYEES_50 = generateEmployees(50);
const EMPLOYEES_200 = generateEmployees(200);
const EMPLOYEES_1K = generateEmployees(1000);
const EMPLOYEES_100K = generateEmployees(100_000);
const PRODUCTS_100 = generateProducts(100);

// ── Shared grid height ──
const GRID_HEIGHT = 500;

// ── Feature Grid Components ──

function SortingDemo() {
  const plugins = useMemo(() => [SortingPlugin({ multiSort: true }), ColumnResizePlugin()], []);
  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70, sortable: true },
    { field: 'name', headerName: 'Name', width: 180, sortable: true },
    { field: 'department', headerName: 'Department', width: 140, sortable: true },
    { field: 'salary', headerName: 'Salary', width: 120, sortable: true,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    { field: 'city', headerName: 'City', width: 130, sortable: true },
    { field: 'rating', headerName: 'Rating', width: 90, sortable: true },
  ], []);
  return (
    <>
      <p style={hintStyle}>Click column headers to sort. Hold Shift for multi-column sort.</p>
      <GridStorm columns={columns} rowData={EMPLOYEES_200} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT} ariaLabel="Sorting Demo" />
    </>
  );
}

function FilteringDemo() {
  const [filterText, setFilterText] = useState('');
  const apiRef = useRef<GridApi | null>(null);
  const plugins = useMemo(() => [SortingPlugin(), FilteringPlugin({ caseSensitive: false }), ColumnResizePlugin()], []);
  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70, sortable: true, filterable: true },
    { field: 'name', headerName: 'Name', width: 180, sortable: true, filterable: true },
    { field: 'department', headerName: 'Department', width: 140, sortable: true, filterable: true },
    { field: 'email', headerName: 'Email', width: 220, filterable: true },
    { field: 'city', headerName: 'City', width: 130, filterable: true },
    { field: 'status', headerName: 'Status', width: 100, filterable: true },
  ], []);

  const onGridReady = useCallback((api: GridApi) => { apiRef.current = api; }, []);
  const handleFilter = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setFilterText(text);
    apiRef.current?.setQuickFilter(text);
  }, []);

  return (
    <>
      <p style={hintStyle}>Per-column floating filter inputs below the header. Also supports quick-filter search across all columns.</p>
      <div style={{ marginBottom: 8 }}>
        <input
          type="text" placeholder="Quick filter across all columns..." value={filterText} onChange={handleFilter}
          style={inputStyle}
        />
      </div>
      <GridStorm columns={columns} rowData={EMPLOYEES_200} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT}
        floatingFilter floatingFilterDebounce={200}
        onGridReady={onGridReady} ariaLabel="Filtering Demo" />
    </>
  );
}

function SelectionDemo() {
  const [selectedCount, setSelectedCount] = useState(0);
  const plugins = useMemo(() => [SelectionPlugin({ mode: 'multiple' }), SortingPlugin(), ColumnResizePlugin()], []);
  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', width: 180, sortable: true },
    { field: 'department', headerName: 'Department', width: 140 },
    { field: 'role', headerName: 'Role', width: 150 },
    { field: 'salary', headerName: 'Salary', width: 120,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    { field: 'active', headerName: 'Active', width: 80,
      valueFormatter: (p: any) => p.value ? 'Yes' : 'No' },
  ], []);

  const onSelectionChanged = useCallback((e: any) => {
    setSelectedCount(e.selectedNodes?.length ?? 0);
  }, []);

  return (
    <>
      <p style={hintStyle}>Checkbox column with select-all header. Click checkboxes or rows. Ctrl+Click to toggle. Selected: <strong>{selectedCount}</strong></p>
      <GridStorm columns={columns} rowData={EMPLOYEES_50} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT} rowSelection="multiple"
        checkboxSelection onSelectionChanged={onSelectionChanged} ariaLabel="Selection Demo" />
    </>
  );
}

function EditingDemo() {
  const [data, setData] = useState(() => generateProducts(50));
  const [lastEdit, setLastEdit] = useState('');
  const plugins = useMemo(() => [
    SortingPlugin(),
    SelectionPlugin({ mode: 'single' }),
    EditingPlugin(),
    ColumnResizePlugin(),
  ], []);
  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 60, editable: false },
    { field: 'name', headerName: 'Product', width: 160, editable: true, cellEditor: 'text' },
    { field: 'category', headerName: 'Category', width: 130, editable: true, cellEditor: 'select',
      cellEditorParams: { values: ['Electronics', 'Clothing', 'Home', 'Sports', 'Books', 'Food', 'Toys', 'Office'] } },
    { field: 'price', headerName: 'Price ($)', width: 100, editable: true, cellEditor: 'number',
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    { field: 'quantity', headerName: 'Qty', width: 80, editable: true, cellEditor: 'number' },
    { field: 'supplier', headerName: 'Supplier', width: 130, editable: true, cellEditor: 'text' },
    { field: 'sku', headerName: 'SKU', width: 120, editable: false },
  ], []);

  const onCellValueChanged = useCallback((e: any) => {
    setLastEdit(`${e.colId}: ${e.oldValue} → ${e.newValue}`);
    setData(prev => prev.map(row => {
      const rowId = String(row.id);
      const nodeId = e.node?.id ?? '';
      if (rowId === nodeId || `row-${row.id - 1}` === nodeId) {
        return { ...row, [e.colId]: e.newValue };
      }
      return row;
    }));
  }, []);

  return (
    <>
      <p style={hintStyle}>
        Double-click a cell to edit inline. Enter commits, Escape cancels, Tab moves to next cell.
        ID and SKU are read-only. Category uses a dropdown editor.
        {lastEdit && <span> Last edit: <strong>{lastEdit}</strong></span>}
      </p>
      <GridStorm columns={columns} rowData={data} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT}
        enableCellEditing onCellValueChanged={onCellValueChanged}
        ariaLabel="Editing Demo" />
    </>
  );
}

function PaginationDemo() {
  const plugins = useMemo(() => [
    SortingPlugin(),
    PaginationPlugin({ pageSize: 25 }),
    ColumnResizePlugin(),
  ], []);
  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70, sortable: true },
    { field: 'name', headerName: 'Name', width: 180, sortable: true },
    { field: 'email', headerName: 'Email', width: 220, sortable: true },
    { field: 'department', headerName: 'Department', width: 140, sortable: true },
    { field: 'salary', headerName: 'Salary', width: 120, sortable: true,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    { field: 'startDate', headerName: 'Start Date', width: 120 },
  ], []);

  return (
    <>
      <p style={hintStyle}>Native pagination bar with navigation buttons and page size selector. {EMPLOYEES_1K.length} total rows.</p>
      <GridStorm columns={columns} rowData={EMPLOYEES_1K} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT}
        enablePagination pageSizeOptions={[10, 25, 50, 100]}
        ariaLabel="Pagination Demo" />
    </>
  );
}

function ColumnResizeDemo() {
  const plugins = useMemo(() => [ColumnResizePlugin({ minWidth: 60, enableAutoSize: true }), SortingPlugin()], []);
  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70, resizable: true },
    { field: 'name', headerName: 'Name', width: 180, resizable: true },
    { field: 'email', headerName: 'Email', width: 220, resizable: true },
    { field: 'department', headerName: 'Department', width: 140, resizable: true },
    { field: 'role', headerName: 'Role', width: 150, resizable: true },
    { field: 'city', headerName: 'City', width: 130, resizable: true },
  ], []);
  return (
    <>
      <p style={hintStyle}>Drag the right edge of column headers to resize. Double-click the border to auto-fit. Min width: 60px.</p>
      <GridStorm columns={columns} rowData={EMPLOYEES_50} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT} ariaLabel="Column Resize Demo" />
    </>
  );
}

function ColumnPinningDemo() {
  const plugins = useMemo(() => [ColumnPinningPlugin(), ColumnResizePlugin(), SortingPlugin()], []);
  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70, pinned: 'left' as const },
    { field: 'name', headerName: 'Name', width: 180, pinned: 'left' as const, sortable: true },
    { field: 'email', headerName: 'Email', width: 260 },
    { field: 'department', headerName: 'Department', width: 160 },
    { field: 'role', headerName: 'Role', width: 180 },
    { field: 'salary', headerName: 'Salary', width: 140,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    { field: 'city', headerName: 'City', width: 150 },
    { field: 'startDate', headerName: 'Start Date', width: 140 },
    { field: 'rating', headerName: 'Rating', width: 100 },
    { field: 'status', headerName: 'Status', width: 120, pinned: 'right' as const },
  ], []);
  return (
    <>
      <p style={hintStyle}>ID and Name are pinned left. Status is pinned right. Scroll horizontally to see pinned columns stay visible.</p>
      <GridStorm columns={columns} rowData={EMPLOYEES_200} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT} ariaLabel="Column Pinning Demo" />
    </>
  );
}

function ColumnReorderDemo() {
  const plugins = useMemo(() => [ColumnReorderPlugin(), ColumnResizePlugin(), SortingPlugin()], []);
  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'department', headerName: 'Department', width: 140 },
    { field: 'role', headerName: 'Role', width: 150 },
    { field: 'salary', headerName: 'Salary', width: 120,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    { field: 'city', headerName: 'City', width: 130 },
  ], []);
  return (
    <>
      <p style={hintStyle}>Drag column headers to reorder them. Drop at the desired position.</p>
      <GridStorm columns={columns} rowData={EMPLOYEES_50} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT} ariaLabel="Column Reorder Demo" />
    </>
  );
}

function RowReorderDemo() {
  const [lastMove, setLastMove] = useState('');
  const plugins = useMemo(() => [
    RowReorderPlugin({ showDragHandle: true }),
    ColumnResizePlugin(),
    SelectionPlugin({ mode: 'single' }),
  ], []);
  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'department', headerName: 'Department', width: 140 },
    { field: 'role', headerName: 'Role', width: 150 },
    { field: 'salary', headerName: 'Salary', width: 120,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    { field: 'city', headerName: 'City', width: 130 },
  ], []);

  const onRowMoved = useCallback((e: any) => {
    setLastMove(`Row moved from index ${e.fromIndex} to ${e.toIndex}`);
  }, []);

  return (
    <>
      <p style={hintStyle}>
        Hover over the left edge of any row to see the drag handle. Drag rows to reorder them.
        {lastMove && <span> <strong>{lastMove}</strong></span>}
      </p>
      <GridStorm columns={columns} rowData={EMPLOYEES_50} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT}
        onRowMoved={onRowMoved}
        ariaLabel="Row Reorder Demo" />
    </>
  );
}

function GroupingDemo() {
  const plugins = useMemo(() => [
    SortingPlugin(),
    GroupingPlugin(),
    ColumnResizePlugin(),
  ], []);
  const columns: ColumnDef[] = useMemo(() => [
    { field: 'name', headerName: 'Employee', width: 250, sortable: true },
    { field: 'department', headerName: 'Department', width: 150, rowGroup: true, rowGroupIndex: 0 },
    { field: 'role', headerName: 'Role', width: 160 },
    { field: 'salary', headerName: 'Salary', width: 130,
      valueFormatter: (p: any) => p.value ? `$${Number(p.value).toLocaleString()}` : '' },
    { field: 'city', headerName: 'City', width: 130 },
  ], []);
  return (
    <>
      <p style={hintStyle}>Native row grouping by Department. Click chevrons to expand/collapse groups. {EMPLOYEES_200.length} total employees.</p>
      <GridStorm columns={columns} rowData={EMPLOYEES_200} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT}
        enableGrouping ariaLabel="Grouping Demo" />
    </>
  );
}

function AggregationDemo() {
  const plugins = useMemo(() => [
    SortingPlugin(),
    GroupingPlugin(),
    AggregationPlugin(),
    ColumnResizePlugin(),
  ], []);
  const columns: ColumnDef[] = useMemo(() => [
    { field: 'name', headerName: 'Employee', width: 200 },
    { field: 'department', headerName: 'Department', width: 140, rowGroup: true, rowGroupIndex: 0 },
    { field: 'salary', headerName: 'Salary', width: 150, aggFunc: 'sum',
      valueFormatter: (p: any) => p.value != null ? `$${Number(p.value).toLocaleString()}` : '' },
    { field: 'rating', headerName: 'Rating', width: 130, aggFunc: 'avg' },
    { field: 'city', headerName: 'City', width: 130 },
  ], []);
  return (
    <>
      <p style={hintStyle}>Native grouping by Department with aggregations: Sum(Salary), Avg(Rating). Expand groups to see leaf rows.</p>
      <GridStorm columns={columns} rowData={EMPLOYEES_200} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT}
        enableGrouping ariaLabel="Aggregation Demo" />
    </>
  );
}

function ContextMenuDemo() {
  const [lastAction, setLastAction] = useState('');
  const plugins = useMemo(() => [
    ContextMenuPlugin(),
    SortingPlugin({ multiSort: true }),
    SelectionPlugin({ mode: 'multiple' }),
    ColumnResizePlugin(),
    ColumnPinningPlugin(),
    GroupingPlugin(),
  ], []);
  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70, sortable: true },
    { field: 'name', headerName: 'Name', width: 180, sortable: true },
    { field: 'department', headerName: 'Department', width: 140, sortable: true },
    { field: 'salary', headerName: 'Salary', width: 120, sortable: true,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    { field: 'city', headerName: 'City', width: 130, sortable: true },
  ], []);
  return (
    <>
      <p style={hintStyle}>Right-click any cell for the rich context menu: sort, pin, group by, copy, and export. {lastAction && <span>Last action: <strong>{lastAction}</strong></span>}</p>
      <GridStorm columns={columns} rowData={EMPLOYEES_50} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT} ariaLabel="Context Menu Demo"
        enableGrouping
        onCellClicked={(e: any) => setLastAction(`Clicked: ${e.colId} = ${e.value}`)} />
    </>
  );
}

function ClipboardDemo() {
  const plugins = useMemo(() => [ClipboardPlugin({ copyHeaders: true }), SelectionPlugin({ mode: 'multiple' }), SortingPlugin(), ColumnResizePlugin()], []);
  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 60 },
    { field: 'name', headerName: 'Product', width: 160 },
    { field: 'category', headerName: 'Category', width: 130 },
    { field: 'price', headerName: 'Price', width: 100,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    { field: 'quantity', headerName: 'Qty', width: 80 },
    { field: 'sku', headerName: 'SKU', width: 120 },
  ], []);
  return (
    <>
      <p style={hintStyle}>Select rows by clicking, then use Ctrl+C to copy. Paste into a spreadsheet or text editor.</p>
      <GridStorm columns={columns} rowData={PRODUCTS_100} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT} rowSelection="multiple" ariaLabel="Clipboard Demo" />
    </>
  );
}

function VirtualScrollDemo() {
  const plugins = useMemo(() => [SortingPlugin(), ColumnResizePlugin()], []);
  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 80, sortable: true },
    { field: 'name', headerName: 'Name', width: 180, sortable: true },
    { field: 'email', headerName: 'Email', width: 240 },
    { field: 'department', headerName: 'Department', width: 140, sortable: true },
    { field: 'salary', headerName: 'Salary', width: 120, sortable: true,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    { field: 'city', headerName: 'City', width: 130 },
  ], []);
  return (
    <>
      <p style={hintStyle}>100,000 rows rendered at 60fps. Only visible rows exist in the DOM. Scroll to see virtual rendering.</p>
      <GridStorm columns={columns} rowData={EMPLOYEES_100K} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT} ariaLabel="Virtual Scroll Demo" />
    </>
  );
}

function ThemingDemo() {
  const [theme, setTheme] = useState('light');
  const plugins = useMemo(() => [SortingPlugin(), ColumnResizePlugin(), SelectionPlugin({ mode: 'multiple' })], []);
  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70, sortable: true },
    { field: 'name', headerName: 'Name', width: 180, sortable: true },
    { field: 'department', headerName: 'Department', width: 140, sortable: true },
    { field: 'salary', headerName: 'Salary', width: 120,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    { field: 'city', headerName: 'City', width: 130 },
  ], []);
  return (
    <>
      <div style={{ padding: '8px 0', display: 'flex', gap: 8 }}>
        {['light', 'dark', 'high-contrast'].map(t => (
          <button key={t} onClick={() => setTheme(t)} style={{ ...chipBtn, background: theme === t ? '#2563eb' : '#e5e7eb', color: theme === t ? '#fff' : '#333' }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div data-theme={theme}>
        <GridStorm columns={columns} rowData={EMPLOYEES_50} plugins={plugins}
          rowHeight={40} headerHeight={44} height={GRID_HEIGHT - 50} rowSelection="multiple" ariaLabel="Theming Demo" />
      </div>
    </>
  );
}

function ValueFormattersDemo() {
  const plugins = useMemo(() => [SortingPlugin(), ColumnResizePlugin()], []);
  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'salary', headerName: 'Salary (Currency)', width: 160, sortable: true,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    { field: 'startDate', headerName: 'Start Date (Formatted)', width: 180,
      valueFormatter: (p: any) => {
        try { return new Date(p.value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
        catch { return String(p.value); }
      }},
    { field: 'rating', headerName: 'Rating (Stars)', width: 130,
      valueFormatter: (p: any) => '\u2605'.repeat(p.value) + '\u2606'.repeat(5 - p.value) },
    { field: 'active', headerName: 'Active (Yes/No)', width: 130,
      valueFormatter: (p: any) => p.value ? 'Yes' : 'No' },
  ], []);
  return (
    <>
      <p style={hintStyle}>Value formatters transform raw data for display: Currency, dates, star ratings, and booleans.</p>
      <GridStorm columns={columns} rowData={EMPLOYEES_50} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT} ariaLabel="Value Formatters Demo" />
    </>
  );
}

function CustomRenderersDemo() {
  const plugins = useMemo(() => [SortingPlugin(), ColumnResizePlugin()], []);
  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'status', headerName: 'Status (Badge)', width: 140,
      cellRenderer: (p: any) => {
        const colors: Record<string, string> = { Active: '#22c55e', Inactive: '#ef4444', 'On Leave': '#f59e0b', Probation: '#3b82f6' };
        const color = colors[p.value] || '#888';
        return `<span style="display:inline-flex;align-items:center;gap:6px;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;background:${color}20;color:${color}"><span style="width:6px;height:6px;border-radius:50%;background:${color}"></span>${p.value}</span>`;
      }},
    { field: 'salary', headerName: 'Salary (Bar)', width: 200,
      cellRenderer: (p: any) => {
        const pct = Math.min(100, ((p.value - 45000) / 105000) * 100);
        return `<div style="display:flex;align-items:center;gap:8px;width:100%"><div style="flex:1;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden"><div style="width:${pct}%;height:100%;background:#2563eb;border-radius:4px"></div></div><span style="font-size:11px;font-family:monospace;min-width:60px">$${Number(p.value).toLocaleString()}</span></div>`;
      }},
    { field: 'rating', headerName: 'Rating (Stars)', width: 140,
      cellRenderer: (p: any) => {
        return `<span style="color:#f59e0b;font-size:16px;letter-spacing:2px">${'\u2605'.repeat(p.value)}${'<span style="color:#d1d5db">\u2605</span>'.repeat(5 - p.value)}</span>`;
      }},
    { field: 'department', headerName: 'Department', width: 140 },
  ], []);
  return (
    <>
      <p style={hintStyle}>Custom cell renderers: Status badges, salary progress bars, and star ratings using HTML templates.</p>
      <GridStorm columns={columns} rowData={EMPLOYEES_50} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT} ariaLabel="Custom Renderers Demo" />
    </>
  );
}

function InfiniteScrollDemo() {
  const plugins = useMemo(() => [SortingPlugin(), ColumnResizePlugin()], []);
  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 80, sortable: true },
    { field: 'name', headerName: 'Name', width: 180, sortable: true },
    { field: 'email', headerName: 'Email', width: 240 },
    { field: 'department', headerName: 'Department', width: 140, sortable: true },
    { field: 'salary', headerName: 'Salary', width: 120, sortable: true,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    { field: 'role', headerName: 'Role', width: 150 },
    { field: 'city', headerName: 'City', width: 130 },
    { field: 'startDate', headerName: 'Start Date', width: 130 },
  ], []);
  return (
    <>
      <p style={hintStyle}>Scroll through 100K rows. Virtual scrolling keeps only visible rows in the DOM for 60fps performance.</p>
      <GridStorm columns={columns} rowData={EMPLOYEES_100K} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT} ariaLabel="Infinite Scroll Demo" />
    </>
  );
}

function StatusBadgesDemo() {
  const plugins = useMemo(() => [SortingPlugin(), ColumnResizePlugin()], []);

  const data = useMemo(() => {
    const names = [
      'Alice Johnson', 'Bob Smith', 'Carol Williams', 'David Brown', 'Emma Davis',
      'Frank Miller', 'Grace Wilson', 'Henry Moore', 'Iris Taylor', 'Jack Anderson',
      'Karen Thomas', 'Liam Jackson', 'Mia White', 'Noah Harris', 'Olivia Martin',
      'Paul Garcia', 'Quinn Robinson', 'Rachel Clark', 'Sam Lewis', 'Tina Walker',
      'Uma Hall', 'Victor Young', 'Wendy King', 'Xavier Wright', 'Yara Scott',
    ];
    const statuses = ['Active', 'Inactive', 'Pending'];
    const priorities = ['High', 'Medium', 'Low'];
    return Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      name: names[i],
      status: statuses[i % 3],
      priority: priorities[i % 3],
      progress: Math.round((Math.sin(i * 0.7) + 1) * 50),
      rating: (i % 5) + 1,
      verified: i % 3 !== 1,
      change: parseFloat(((Math.sin(i * 1.3) * 15)).toFixed(2)),
    }));
  }, []);

  const columns: ColumnDef[] = useMemo(() => [
    // 7. Avatar + name — Colored circle with initials + name text
    { field: 'name', headerName: 'Employee', width: 200,
      cellRenderer: (p: any) => {
        const name = String(p.value || '');
        const initials = name.split(' ').map((n: string) => n[0]).join('').slice(0, 2);
        const hue = name.charCodeAt(0) * 7 % 360;

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex;align-items:center;gap:10px';

        const avatar = document.createElement('div');
        avatar.style.cssText = `width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;background:hsl(${hue},60%,50%)`;
        avatar.textContent = initials;

        const label = document.createElement('span');
        label.style.cssText = 'font-weight:500';
        label.textContent = name;

        wrapper.appendChild(avatar);
        wrapper.appendChild(label);
        return wrapper;
      }},
    // 1. Status pills — "Active" (green), "Inactive" (red), "Pending" (amber)
    { field: 'status', headerName: 'Status', width: 130, sortable: true,
      cellRenderer: (p: any) => {
        const colors: Record<string, string> = { Active: '#22c55e', Inactive: '#ef4444', Pending: '#f59e0b' };
        const color = colors[p.value] || '#94a3b8';

        const pill = document.createElement('span');
        pill.style.cssText = `display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;background:${color}20;color:${color}`;

        const dot = document.createElement('span');
        dot.style.cssText = `width:6px;height:6px;border-radius:50%;background:${color}`;
        pill.appendChild(dot);
        pill.appendChild(document.createTextNode(p.value));
        return pill;
      }},
    // 2. Priority flags — "High" / "Medium" / "Low" with colored left border
    { field: 'priority', headerName: 'Priority', width: 120, sortable: true,
      cellRenderer: (p: any) => {
        const colors: Record<string, string> = { High: '#ef4444', Medium: '#f59e0b', Low: '#22c55e' };
        const color = colors[p.value] || '#94a3b8';

        const flag = document.createElement('span');
        flag.style.cssText = `display:inline-block;padding:3px 10px;border-left:3px solid ${color};background:${color}10;font-size:12px;font-weight:600;color:${color};border-radius:0 4px 4px 0`;
        flag.textContent = p.value;
        return flag;
      }},
    // 3. Progress bars — width based on percentage value
    { field: 'progress', headerName: 'Progress', width: 200, sortable: true,
      cellRenderer: (p: any) => {
        const pct = Math.max(0, Math.min(100, Number(p.value) || 0));
        const hue = pct > 66 ? 142 : pct > 33 ? 45 : 0; // green/yellow/red

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'display:flex;align-items:center;gap:8px;width:100%';

        const track = document.createElement('div');
        track.style.cssText = 'flex:1;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden';

        const bar = document.createElement('div');
        bar.style.cssText = `width:${pct}%;height:100%;border-radius:4px;background:hsl(${hue},72%,50%);transition:width 0.3s ease`;
        track.appendChild(bar);

        const label = document.createElement('span');
        label.style.cssText = 'font-size:11px;font-family:monospace;min-width:32px;text-align:right';
        label.textContent = `${pct}%`;

        wrapper.appendChild(track);
        wrapper.appendChild(label);
        return wrapper;
      }},
    // 4. Star ratings — ★★★☆☆
    { field: 'rating', headerName: 'Rating', width: 140, sortable: true,
      cellRenderer: (p: any) => {
        const rating = Math.max(0, Math.min(5, Number(p.value) || 0));

        const wrapper = document.createElement('span');
        wrapper.style.cssText = 'font-size:16px;letter-spacing:2px';

        for (let i = 1; i <= 5; i++) {
          const star = document.createElement('span');
          star.textContent = '\u2605';
          star.style.color = i <= rating ? '#f59e0b' : '#d1d5db';
          wrapper.appendChild(star);
        }
        return wrapper;
      }},
    // 5. Boolean toggles — ✓ (green) / ✗ (red)
    { field: 'verified', headerName: 'Verified', width: 100, sortable: true,
      cellRenderer: (p: any) => {
        const yes = !!p.value;
        const badge = document.createElement('span');
        badge.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;font-size:14px;font-weight:700;background:${yes ? '#22c55e' : '#ef4444'}15;color:${yes ? '#22c55e' : '#ef4444'}`;
        badge.textContent = yes ? '\u2713' : '\u2717';
        return badge;
      }},
    // 6. Trend arrows — ▲ (green) / ▼ (red) / — (gray)
    { field: 'change', headerName: 'Change %', width: 130, sortable: true,
      cellRenderer: (p: any) => {
        const val = Number(p.value) || 0;
        const icon = val > 0 ? '\u25B2' : val < 0 ? '\u25BC' : '\u2014';
        const color = val > 0 ? '#22c55e' : val < 0 ? '#ef4444' : '#94a3b8';

        const wrapper = document.createElement('span');
        wrapper.style.cssText = `display:inline-flex;align-items:center;gap:4px;font-weight:600;color:${color}`;

        const arrow = document.createElement('span');
        arrow.textContent = icon;
        arrow.style.fontSize = '10px';

        const num = document.createElement('span');
        num.style.cssText = 'font-size:12px;font-family:monospace';
        num.textContent = `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;

        wrapper.appendChild(arrow);
        wrapper.appendChild(num);
        return wrapper;
      }},
  ], []);

  return (
    <>
      <p style={hintStyle}>
        7 professional cell renderer patterns: avatar, status pills, priority flags, progress bars, star ratings, boolean toggles, and trend arrows.
        All renderers return DOM elements (not innerHTML strings) for CSP safety.
      </p>
      <GridStorm columns={columns} rowData={data} plugins={plugins}
        rowHeight={44} headerHeight={44} height={GRID_HEIGHT} ariaLabel="Status Badges Demo" />
    </>
  );
}

function FullFeaturedDemo() {
  const [filterText, setFilterText] = useState('');
  const [selectedCount, setSelectedCount] = useState(0);
  const apiRef = useRef<GridApi | null>(null);

  const plugins = useMemo<GridPlugin[]>(() => [
    SortingPlugin({ multiSort: true }),
    FilteringPlugin(),
    SelectionPlugin({ mode: 'multiple' }),
    EditingPlugin(),
    PaginationPlugin({ pageSize: 50 }),
    ColumnResizePlugin(),
    ColumnPinningPlugin(),
    ColumnReorderPlugin(),
    ContextMenuPlugin(),
    ClipboardPlugin(),
  ], []);
  const columns: ColumnDef[] = useMemo(() => [
    { headerName: 'Employee', children: [
      { field: 'id', headerName: 'ID', width: 70, sortable: true, pinned: 'left' as const, filterable: true },
      { field: 'name', headerName: 'Name', width: 180, sortable: true, resizable: true, editable: true, filterable: true, cellEditor: 'text' },
    ]} as any,
    { headerName: 'Contact', children: [
      { field: 'email', headerName: 'Email', width: 240, sortable: true, resizable: true, filterable: true },
    ]} as any,
    { headerName: 'Work', children: [
      { field: 'department', headerName: 'Department', width: 150, sortable: true, resizable: true, filterable: true },
      { field: 'role', headerName: 'Role', width: 160, sortable: true, resizable: true, editable: true, filterable: true, cellEditor: 'text' },
      { field: 'salary', headerName: 'Salary', width: 130, sortable: true, resizable: true, editable: true, filterable: true, cellEditor: 'number',
        valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    ]} as any,
    { field: 'city', headerName: 'City', width: 130, sortable: true, resizable: true, filterable: true },
    { field: 'startDate', headerName: 'Start Date', width: 130, sortable: true, resizable: true },
    { field: 'status', headerName: 'Status', width: 120, pinned: 'right' as const, filterable: true,
      cellRenderer: (p: any) => {
        const colors: Record<string, string> = { Active: '#22c55e', Inactive: '#ef4444', 'On Leave': '#f59e0b', Probation: '#3b82f6' };
        const c = colors[p.value] || '#888';
        return `<span style="padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:${c}20;color:${c}">${p.value}</span>`;
      }},
  ], []);

  return (
    <>
      <p style={hintStyle}>
        All features: sort, filter (per-column + quick), checkbox select, inline edit, paginate, resize, reorder, pin, clipboard.
        Selected: <strong>{selectedCount}</strong>
      </p>
      <div style={{ marginBottom: 8 }}>
        <input type="text" placeholder="Quick filter..." value={filterText}
          onChange={e => { setFilterText(e.target.value); apiRef.current?.setQuickFilter(e.target.value); }}
          style={inputStyle} />
      </div>
      <GridStorm columns={columns} rowData={EMPLOYEES_1K} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT} rowSelection="multiple"
        checkboxSelection floatingFilter enableCellEditing enablePagination
        pageSizeOptions={[25, 50, 100, 250]}
        onGridReady={(api: any) => { apiRef.current = api; }}
        onSelectionChanged={(e: any) => setSelectedCount(e.selectedNodes?.length ?? 0)}
        ariaLabel="Full Featured Demo" />
    </>
  );
}

// ── Demo Renderer Map ──

const DEMO_MAP: Record<string, () => JSX.Element> = {
  'sorting': SortingDemo,
  'filtering': FilteringDemo,
  'selection': SelectionDemo,
  'editing': EditingDemo,
  'pagination': PaginationDemo,
  'column-resize': ColumnResizeDemo,
  'column-pinning': ColumnPinningDemo,
  'column-reorder': ColumnReorderDemo,
  'row-reorder': RowReorderDemo,
  'grouping': GroupingDemo,
  'aggregation': AggregationDemo,
  'context-menu': ContextMenuDemo,
  'clipboard': ClipboardDemo,
  'virtual-scroll': VirtualScrollDemo,
  'theming': ThemingDemo,
  'value-formatters': ValueFormattersDemo,
  'custom-renderers': CustomRenderersDemo,
  'infinite-scroll': InfiniteScrollDemo,
  'status-badges': StatusBadgesDemo,
  'full-featured': FullFeaturedDemo,
};

const CATEGORIES: Record<string, string> = {
  core: 'Core Features',
  column: 'Column Features',
  data: 'Data Features',
  interaction: 'Interaction',
  enterprise: 'Enterprise',
};

// ── Main App ──

export function App() {
  const [activeDemo, setActiveDemo] = useState('sorting');
  const feature = FEATURES.find(f => f.id === activeDemo)!;
  const DemoComponent = DEMO_MAP[activeDemo];

  const groupedFeatures = useMemo(() => {
    const groups: Record<string, FeatureDemo[]> = {};
    for (const f of FEATURES) {
      if (!groups[f.category]) groups[f.category] = [];
      groups[f.category].push(f);
    }
    return groups;
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* ── Sidebar ── */}
      <aside style={sidebarStyle}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #e5e7eb' }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
            <span style={{ color: '#2563eb' }}>GridStorm</span>{' '}
            <span style={{ fontWeight: 400, color: '#666' }}>Features</span>
          </h1>
          <p style={{ fontSize: 11, color: '#999', marginTop: 4 }}>20 interactive demos</p>
        </div>
        <nav style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
          {Object.entries(groupedFeatures).map(([cat, features]) => (
            <div key={cat}>
              <div style={categoryLabelStyle}>{CATEGORIES[cat] || cat}</div>
              {features.map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveDemo(f.id)}
                  style={{
                    ...navBtnStyle,
                    background: activeDemo === f.id ? '#eff6ff' : 'transparent',
                    color: activeDemo === f.id ? '#2563eb' : '#374151',
                    fontWeight: activeDemo === f.id ? 600 : 400,
                    borderLeft: activeDemo === f.id ? '3px solid #2563eb' : '3px solid transparent',
                  }}
                >
                  {f.title}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* ── Main Content ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        {/* Header */}
        <header style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb', background: '#fafafa', flexShrink: 0 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{feature.title}</h2>
          <p style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{feature.description}</p>
        </header>

        {/* Grid Area */}
        <div style={{ flex: 1, padding: 16, minHeight: 0 }}>
          {DemoComponent ? <DemoComponent /> : <div>Select a demo</div>}
        </div>
      </main>
    </div>
  );
}

// ── Styles ──

const sidebarStyle: React.CSSProperties = {
  width: 220,
  borderRight: '1px solid #e5e7eb',
  background: '#fff',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
};

const categoryLabelStyle: React.CSSProperties = {
  padding: '8px 16px 4px',
  fontSize: 10,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: 1,
  color: '#9ca3af',
};

const navBtnStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '7px 16px',
  fontSize: 13,
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: 'inherit',
  transition: 'background 0.15s',
};

const hintStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#6b7280',
  marginBottom: 8,
  padding: '6px 10px',
  background: '#f9fafb',
  borderRadius: 6,
  border: '1px solid #e5e7eb',
};

const chipBtn: React.CSSProperties = {
  padding: '5px 14px',
  fontSize: 12,
  border: 'none',
  borderRadius: 20,
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: 13,
  border: '1px solid #d1d5db',
  borderRadius: 6,
  width: 300,
  outline: 'none',
  fontFamily: 'inherit',
};

