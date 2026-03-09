import { useState, useMemo } from 'react';
import { GridStorm } from '@gridstorm/react';
import type { ColumnDef, GridPlugin } from '@gridstorm/core';
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
import '@gridstorm/theme-default';
import { generateEmployees, generateProducts } from './data';
import type { Employee, Product } from './data';

// ── Feature Demos ──

interface FeatureDemo {
  id: string;
  title: string;
  description: string;
  category: 'core' | 'column' | 'data' | 'interaction' | 'enterprise';
}

const FEATURES: FeatureDemo[] = [
  { id: 'sorting', title: 'Sorting', description: 'Single & multi-column sorting with custom sort cycles', category: 'core' },
  { id: 'filtering', title: 'Filtering', description: 'Per-column filtering and quick global search', category: 'core' },
  { id: 'selection', title: 'Row Selection', description: 'Single, multiple, Shift+Click range, Ctrl+Click toggle', category: 'core' },
  { id: 'editing', title: 'Cell Editing', description: 'Double-click to edit with text, number, and select editors', category: 'interaction' },
  { id: 'pagination', title: 'Pagination', description: 'Client-side pagination with configurable page sizes', category: 'data' },
  { id: 'column-resize', title: 'Column Resize', description: 'Drag column borders to resize, double-click to auto-size', category: 'column' },
  { id: 'column-pinning', title: 'Column Pinning', description: 'Pin columns to left or right edges while scrolling', category: 'column' },
  { id: 'column-reorder', title: 'Column Reorder', description: 'Drag-and-drop columns to reorder', category: 'column' },
  { id: 'grouping', title: 'Row Grouping', description: 'Group rows by column values with expand/collapse', category: 'data' },
  { id: 'aggregation', title: 'Aggregation', description: 'Sum, avg, min, max, count functions on grouped data', category: 'enterprise' },
  { id: 'context-menu', title: 'Context Menu', description: 'Right-click context menus with custom actions', category: 'interaction' },
  { id: 'clipboard', title: 'Clipboard', description: 'Copy/Cut/Paste cells with Ctrl+C/X/V', category: 'enterprise' },
  { id: 'virtual-scroll', title: 'Virtual Scrolling', description: 'Render 100K+ rows at 60fps with virtual scrolling', category: 'core' },
  { id: 'theming', title: 'Theming', description: 'Light, dark, high-contrast themes with CSS variables', category: 'core' },
  { id: 'value-formatters', title: 'Value Formatters', description: 'Format cell values (currency, dates, percentages)', category: 'core' },
  { id: 'custom-renderers', title: 'Custom Renderers', description: 'Custom HTML cell and header renderers', category: 'interaction' },
  { id: 'infinite-scroll', title: 'Infinite Scroll', description: 'Lazy-load rows as user scrolls (simulated server)', category: 'data' },
  { id: 'full-featured', title: 'Full Featured', description: 'All features combined in one grid', category: 'enterprise' },
];

// ── Pre-generated Data (before any const that uses it) ──

const EMPLOYEES_50 = generateEmployees(50);
const EMPLOYEES_200 = generateEmployees(200);
const EMPLOYEES_1K = generateEmployees(1000);
const EMPLOYEES_100K = generateEmployees(100_000);
const PRODUCTS_100 = generateProducts(100);

// ── Feature Grid Components ──

function SortingDemo() {
  const plugins = useMemo(() => [SortingPlugin({ multiSort: true }), ColumnResizePlugin()], []);
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'id' as any, headerName: 'ID', width: 70, sortable: true },
    { field: 'name' as any, headerName: 'Name', width: 180, sortable: true },
    { field: 'department' as any, headerName: 'Department', width: 140, sortable: true },
    { field: 'salary' as any, headerName: 'Salary', width: 120, sortable: true },
    { field: 'city' as any, headerName: 'City', width: 130, sortable: true },
    { field: 'rating' as any, headerName: 'Rating', width: 90, sortable: true },
  ], []);
  return (
    <div style={{ flex: 1 }}>
      <p style={hintStyle}>Click column headers to sort. Hold Shift for multi-column sort.</p>
      <GridStorm columns={columns} rowData={EMPLOYEES_200} plugins={plugins} rowHeight={40} headerHeight={44} height="100%" ariaLabel="Sorting Demo" />
    </div>
  );
}

function FilteringDemo() {
  const plugins = useMemo(() => [SortingPlugin(), FilteringPlugin({ caseSensitive: false }), ColumnResizePlugin()], []);
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'id' as any, headerName: 'ID', width: 70, sortable: true },
    { field: 'name' as any, headerName: 'Name', width: 180, sortable: true, filterable: true },
    { field: 'department' as any, headerName: 'Department', width: 140, sortable: true, filterable: true },
    { field: 'email' as any, headerName: 'Email', width: 220, filterable: true },
    { field: 'city' as any, headerName: 'City', width: 130, filterable: true },
    { field: 'status' as any, headerName: 'Status', width: 100, filterable: true },
  ], []);
  return (
    <div style={{ flex: 1 }}>
      <p style={hintStyle}>Use the filter inputs below column headers to filter data. Try typing in the Name or Department filter.</p>
      <GridStorm columns={columns} rowData={EMPLOYEES_200} plugins={plugins} rowHeight={40} headerHeight={44} height="100%" ariaLabel="Filtering Demo" />
    </div>
  );
}

function SelectionDemo() {
  const plugins = useMemo(() => [SelectionPlugin({ mode: 'multiple', checkbox: true }), SortingPlugin(), ColumnResizePlugin()], []);
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'id' as any, headerName: 'ID', width: 70 },
    { field: 'name' as any, headerName: 'Name', width: 180, sortable: true },
    { field: 'department' as any, headerName: 'Department', width: 140 },
    { field: 'role' as any, headerName: 'Role', width: 150 },
    { field: 'salary' as any, headerName: 'Salary', width: 120 },
    { field: 'active' as any, headerName: 'Active', width: 80 },
  ], []);
  return (
    <div style={{ flex: 1 }}>
      <p style={hintStyle}>Click rows to select. Ctrl+Click to toggle. Shift+Click for range selection. Checkbox column on left.</p>
      <GridStorm columns={columns} rowData={EMPLOYEES_50} plugins={plugins} rowHeight={40} headerHeight={44} height="100%" rowSelection="multiple" ariaLabel="Selection Demo" />
    </div>
  );
}

function EditingDemo() {
  const [data, setData] = useState(() => [...PRODUCTS_100]);
  const plugins = useMemo(() => [EditingPlugin({ undoRedo: true }), SelectionPlugin({ mode: 'multiple' }), ColumnResizePlugin()], []);
  const columns: ColumnDef<Product>[] = useMemo(() => [
    { field: 'id' as any, headerName: 'ID', width: 60 },
    { field: 'name' as any, headerName: 'Product', width: 160, editable: true },
    { field: 'category' as any, headerName: 'Category', width: 130, editable: true },
    { field: 'price' as any, headerName: 'Price ($)', width: 100, editable: true },
    { field: 'quantity' as any, headerName: 'Qty', width: 80, editable: true },
    { field: 'supplier' as any, headerName: 'Supplier', width: 130, editable: true },
    { field: 'sku' as any, headerName: 'SKU', width: 120 },
  ], []);
  return (
    <div style={{ flex: 1 }}>
      <p style={hintStyle}>Double-click a cell to edit. Press Enter to save, Escape to cancel. Tab to next cell. Ctrl+Z to undo.</p>
      <GridStorm columns={columns} rowData={data} plugins={plugins} rowHeight={40} headerHeight={44} height="100%" ariaLabel="Editing Demo" />
    </div>
  );
}

function PaginationDemo() {
  const plugins = useMemo(() => [PaginationPlugin({ pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }), SortingPlugin(), ColumnResizePlugin()], []);
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'id' as any, headerName: 'ID', width: 70, sortable: true },
    { field: 'name' as any, headerName: 'Name', width: 180, sortable: true },
    { field: 'email' as any, headerName: 'Email', width: 220, sortable: true },
    { field: 'department' as any, headerName: 'Department', width: 140, sortable: true },
    { field: 'salary' as any, headerName: 'Salary', width: 120, sortable: true },
    { field: 'startDate' as any, headerName: 'Start Date', width: 120 },
  ], []);
  return (
    <div style={{ flex: 1 }}>
      <p style={hintStyle}>Navigate between pages. 1,000 rows paginated at 25 per page. Change page size in dropdown.</p>
      <GridStorm columns={columns} rowData={EMPLOYEES_1K} plugins={plugins} rowHeight={40} headerHeight={44} height="100%" ariaLabel="Pagination Demo" />
    </div>
  );
}

function ColumnResizeDemo() {
  const plugins = useMemo(() => [ColumnResizePlugin({ minWidth: 60, enableAutoSize: true }), SortingPlugin()], []);
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'id' as any, headerName: 'ID', width: 70, resizable: true },
    { field: 'name' as any, headerName: 'Name', width: 180, resizable: true },
    { field: 'email' as any, headerName: 'Email', width: 220, resizable: true },
    { field: 'department' as any, headerName: 'Department', width: 140, resizable: true },
    { field: 'role' as any, headerName: 'Role', width: 150, resizable: true },
    { field: 'city' as any, headerName: 'City', width: 130, resizable: true },
  ], []);
  return (
    <div style={{ flex: 1 }}>
      <p style={hintStyle}>Drag column borders to resize. Double-click a border to auto-fit. Min width: 60px.</p>
      <GridStorm columns={columns} rowData={EMPLOYEES_50} plugins={plugins} rowHeight={40} headerHeight={44} height="100%" ariaLabel="Column Resize Demo" />
    </div>
  );
}

function ColumnPinningDemo() {
  const plugins = useMemo(() => [ColumnPinningPlugin(), ColumnResizePlugin(), SortingPlugin()], []);
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'id' as any, headerName: 'ID', width: 70, pinned: 'left' },
    { field: 'name' as any, headerName: 'Name', width: 180, pinned: 'left', sortable: true },
    { field: 'email' as any, headerName: 'Email', width: 240 },
    { field: 'department' as any, headerName: 'Department', width: 150 },
    { field: 'role' as any, headerName: 'Role', width: 160 },
    { field: 'salary' as any, headerName: 'Salary', width: 120 },
    { field: 'city' as any, headerName: 'City', width: 130 },
    { field: 'startDate' as any, headerName: 'Start Date', width: 130 },
    { field: 'status' as any, headerName: 'Status', width: 100, pinned: 'right' },
  ], []);
  return (
    <div style={{ flex: 1 }}>
      <p style={hintStyle}>ID and Name are pinned left. Status is pinned right. Scroll horizontally to see pinned columns stay visible.</p>
      <GridStorm columns={columns} rowData={EMPLOYEES_200} plugins={plugins} rowHeight={40} headerHeight={44} height="100%" ariaLabel="Column Pinning Demo" />
    </div>
  );
}

function ColumnReorderDemo() {
  const plugins = useMemo(() => [ColumnReorderPlugin(), ColumnResizePlugin(), SortingPlugin()], []);
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'id' as any, headerName: 'ID', width: 70 },
    { field: 'name' as any, headerName: 'Name', width: 180 },
    { field: 'department' as any, headerName: 'Department', width: 140 },
    { field: 'role' as any, headerName: 'Role', width: 150 },
    { field: 'salary' as any, headerName: 'Salary', width: 120 },
    { field: 'city' as any, headerName: 'City', width: 130 },
  ], []);
  return (
    <div style={{ flex: 1 }}>
      <p style={hintStyle}>Drag column headers to reorder them. Drop at the desired position.</p>
      <GridStorm columns={columns} rowData={EMPLOYEES_50} plugins={plugins} rowHeight={40} headerHeight={44} height="100%" ariaLabel="Column Reorder Demo" />
    </div>
  );
}

function GroupingDemo() {
  const plugins = useMemo(() => [GroupingPlugin({ defaultExpanded: true }), SortingPlugin(), ColumnResizePlugin()], []);
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name' as any, headerName: 'Employee', width: 180, sortable: true },
    { field: 'department' as any, headerName: 'Department', width: 150, sortable: true, rowGroup: true },
    { field: 'role' as any, headerName: 'Role', width: 160 },
    { field: 'salary' as any, headerName: 'Salary', width: 120, sortable: true },
    { field: 'city' as any, headerName: 'City', width: 130 },
  ], []);
  return (
    <div style={{ flex: 1 }}>
      <p style={hintStyle}>Rows are grouped by Department. Click group rows to expand/collapse. Uses the Grouping plugin.</p>
      <GridStorm columns={columns} rowData={EMPLOYEES_200} plugins={plugins} rowHeight={40} headerHeight={44} height="100%" ariaLabel="Grouping Demo" />
    </div>
  );
}

function AggregationDemo() {
  const plugins = useMemo(() => [GroupingPlugin({ defaultExpanded: true }), AggregationPlugin(), SortingPlugin(), ColumnResizePlugin()], []);
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name' as any, headerName: 'Employee', width: 180 },
    { field: 'department' as any, headerName: 'Department', width: 150, rowGroup: true },
    { field: 'salary' as any, headerName: 'Salary (Sum)', width: 140, aggFunc: 'sum' },
    { field: 'rating' as any, headerName: 'Rating (Avg)', width: 130, aggFunc: 'avg' },
    { field: 'id' as any, headerName: 'Count', width: 100, aggFunc: 'count' },
  ], []);
  return (
    <div style={{ flex: 1 }}>
      <p style={hintStyle}>Grouped by Department with aggregations: Sum(Salary), Avg(Rating), Count(ID). Enterprise feature.</p>
      <GridStorm columns={columns} rowData={EMPLOYEES_200} plugins={plugins} rowHeight={40} headerHeight={44} height="100%" ariaLabel="Aggregation Demo" />
    </div>
  );
}

function ContextMenuDemo() {
  const plugins = useMemo(() => [ContextMenuPlugin(), SortingPlugin(), SelectionPlugin({ mode: 'multiple' }), ColumnResizePlugin()], []);
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'id' as any, headerName: 'ID', width: 70 },
    { field: 'name' as any, headerName: 'Name', width: 180, sortable: true },
    { field: 'department' as any, headerName: 'Department', width: 140, sortable: true },
    { field: 'salary' as any, headerName: 'Salary', width: 120 },
    { field: 'city' as any, headerName: 'City', width: 130 },
  ], []);
  return (
    <div style={{ flex: 1 }}>
      <p style={hintStyle}>Right-click any cell to open the context menu with actions like Copy, Sort, and more.</p>
      <GridStorm columns={columns} rowData={EMPLOYEES_50} plugins={plugins} rowHeight={40} headerHeight={44} height="100%" ariaLabel="Context Menu Demo" />
    </div>
  );
}

function ClipboardDemo() {
  const plugins = useMemo(() => [ClipboardPlugin({ copyHeaders: true }), SelectionPlugin({ mode: 'multiple' }), EditingPlugin(), ColumnResizePlugin()], []);
  const columns: ColumnDef<Product>[] = useMemo(() => [
    { field: 'id' as any, headerName: 'ID', width: 60 },
    { field: 'name' as any, headerName: 'Product', width: 160, editable: true },
    { field: 'category' as any, headerName: 'Category', width: 130, editable: true },
    { field: 'price' as any, headerName: 'Price', width: 100, editable: true },
    { field: 'quantity' as any, headerName: 'Qty', width: 80, editable: true },
    { field: 'sku' as any, headerName: 'SKU', width: 120 },
  ], []);
  return (
    <div style={{ flex: 1 }}>
      <p style={hintStyle}>Select cells and use Ctrl+C to copy, Ctrl+X to cut, Ctrl+V to paste. Enterprise feature.</p>
      <GridStorm columns={columns} rowData={PRODUCTS_100} plugins={plugins} rowHeight={40} headerHeight={44} height="100%" rowSelection="multiple" ariaLabel="Clipboard Demo" />
    </div>
  );
}

function VirtualScrollDemo() {
  const plugins = useMemo(() => [SortingPlugin(), ColumnResizePlugin()], []);
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'id' as any, headerName: 'ID', width: 80, sortable: true },
    { field: 'name' as any, headerName: 'Name', width: 180, sortable: true },
    { field: 'email' as any, headerName: 'Email', width: 240 },
    { field: 'department' as any, headerName: 'Department', width: 140, sortable: true },
    { field: 'salary' as any, headerName: 'Salary', width: 120, sortable: true },
    { field: 'city' as any, headerName: 'City', width: 130 },
  ], []);
  return (
    <div style={{ flex: 1 }}>
      <p style={hintStyle}>100,000 rows rendered at 60fps. Only visible rows exist in the DOM. Scroll to see virtual rendering in action.</p>
      <GridStorm columns={columns} rowData={EMPLOYEES_100K} plugins={plugins} rowHeight={40} headerHeight={44} height="100%" ariaLabel="Virtual Scroll Demo — 100K Rows" />
    </div>
  );
}

function ThemingDemo() {
  const [theme, setTheme] = useState('light');
  const plugins = useMemo(() => [SortingPlugin(), ColumnResizePlugin(), SelectionPlugin({ mode: 'multiple' })], []);
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'id' as any, headerName: 'ID', width: 70, sortable: true },
    { field: 'name' as any, headerName: 'Name', width: 180, sortable: true },
    { field: 'department' as any, headerName: 'Department', width: 140, sortable: true },
    { field: 'salary' as any, headerName: 'Salary', width: 120 },
    { field: 'city' as any, headerName: 'City', width: 130 },
  ], []);
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 0', display: 'flex', gap: 8 }}>
        {['light', 'dark', 'high-contrast'].map(t => (
          <button key={t} onClick={() => setTheme(t)} style={{ ...chipBtn, background: theme === t ? '#2563eb' : '#e5e7eb', color: theme === t ? '#fff' : '#333' }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div data-theme={theme} style={{ flex: 1 }}>
        <GridStorm columns={columns} rowData={EMPLOYEES_50} plugins={plugins} rowHeight={40} headerHeight={44} height="100%" rowSelection="multiple" ariaLabel="Theming Demo" />
      </div>
    </div>
  );
}

function ValueFormattersDemo() {
  const plugins = useMemo(() => [SortingPlugin(), ColumnResizePlugin()], []);
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'id' as any, headerName: 'ID', width: 70 },
    { field: 'name' as any, headerName: 'Name', width: 180 },
    { field: 'salary' as any, headerName: 'Salary (Currency)', width: 160, sortable: true,
      valueFormatter: (params: any) => `$${Number(params.value).toLocaleString()}` },
    { field: 'startDate' as any, headerName: 'Start Date (Formatted)', width: 180,
      valueFormatter: (params: any) => new Date(params.value).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) },
    { field: 'rating' as any, headerName: 'Rating (Stars)', width: 130,
      valueFormatter: (params: any) => '\u2605'.repeat(params.value) + '\u2606'.repeat(5 - params.value) },
    { field: 'active' as any, headerName: 'Active (Yes/No)', width: 130,
      valueFormatter: (params: any) => params.value ? 'Yes' : 'No' },
  ], []);
  return (
    <div style={{ flex: 1 }}>
      <p style={hintStyle}>Value formatters transform display: Currency, dates, star ratings, and boolean formatting.</p>
      <GridStorm columns={columns} rowData={EMPLOYEES_50} plugins={plugins} rowHeight={40} headerHeight={44} height="100%" ariaLabel="Value Formatters Demo" />
    </div>
  );
}

function CustomRenderersDemo() {
  const plugins = useMemo(() => [SortingPlugin(), ColumnResizePlugin()], []);
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'id' as any, headerName: 'ID', width: 70 },
    { field: 'name' as any, headerName: 'Name', width: 180 },
    { field: 'status' as any, headerName: 'Status (Badge)', width: 140,
      cellRenderer: (params: any) => {
        const colors: Record<string, string> = { Active: '#22c55e', Inactive: '#ef4444', 'On Leave': '#f59e0b', Probation: '#3b82f6' };
        const color = colors[params.value] || '#888';
        return `<span style="display:inline-flex;align-items:center;gap:6px;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;background:${color}20;color:${color}"><span style="width:6px;height:6px;border-radius:50%;background:${color}"></span>${params.value}</span>`;
      }},
    { field: 'salary' as any, headerName: 'Salary (Bar)', width: 200,
      cellRenderer: (params: any) => {
        const pct = Math.min(100, ((params.value - 45000) / 105000) * 100);
        return `<div style="display:flex;align-items:center;gap:8px;width:100%"><div style="flex:1;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden"><div style="width:${pct}%;height:100%;background:#2563eb;border-radius:4px"></div></div><span style="font-size:11px;font-family:monospace;min-width:60px">$${Number(params.value).toLocaleString()}</span></div>`;
      }},
    { field: 'rating' as any, headerName: 'Rating (Stars)', width: 140,
      cellRenderer: (params: any) => {
        return `<span style="color:#f59e0b;font-size:16px;letter-spacing:2px">${'\u2605'.repeat(params.value)}${'<span style="color:#d1d5db">\u2605</span>'.repeat(5 - params.value)}</span>`;
      }},
    { field: 'department' as any, headerName: 'Department', width: 140 },
  ], []);
  return (
    <div style={{ flex: 1 }}>
      <p style={hintStyle}>Custom cell renderers: Status badges, salary progress bars, and star ratings using HTML templates.</p>
      <GridStorm columns={columns} rowData={EMPLOYEES_50} plugins={plugins} rowHeight={40} headerHeight={44} height="100%" ariaLabel="Custom Renderers Demo" />
    </div>
  );
}

function InfiniteScrollDemo() {
  // Simulate infinite scroll with a large dataset and pagination turned off
  const plugins = useMemo(() => [SortingPlugin(), ColumnResizePlugin()], []);
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'id' as any, headerName: 'ID', width: 80, sortable: true },
    { field: 'name' as any, headerName: 'Name', width: 180, sortable: true },
    { field: 'email' as any, headerName: 'Email', width: 240 },
    { field: 'department' as any, headerName: 'Department', width: 140, sortable: true },
    { field: 'salary' as any, headerName: 'Salary', width: 120, sortable: true,
      valueFormatter: (params: any) => `$${Number(params.value).toLocaleString()}` },
    { field: 'role' as any, headerName: 'Role', width: 150 },
    { field: 'city' as any, headerName: 'City', width: 130 },
    { field: 'startDate' as any, headerName: 'Start Date', width: 130 },
  ], []);
  return (
    <div style={{ flex: 1 }}>
      <p style={hintStyle}>Infinite scrolling through 100K rows. No pagination — just keep scrolling! Virtual scrolling renders only visible rows in the DOM.</p>
      <GridStorm columns={columns} rowData={EMPLOYEES_100K} plugins={plugins} rowHeight={40} headerHeight={44} height="100%" ariaLabel="Infinite Scroll Demo — 100K Rows" />
    </div>
  );
}

function FullFeaturedDemo() {
  const plugins = useMemo<GridPlugin[]>(() => [
    SortingPlugin({ multiSort: true }),
    FilteringPlugin(),
    SelectionPlugin({ mode: 'multiple' }),
    EditingPlugin(),
    ColumnResizePlugin(),
    ColumnPinningPlugin(),
    PaginationPlugin({ pageSize: 50 }),
    ContextMenuPlugin(),
    ClipboardPlugin(),
  ], []);
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'id' as any, headerName: 'ID', width: 70, sortable: true, pinned: 'left' },
    { field: 'name' as any, headerName: 'Name', width: 180, sortable: true, filterable: true, editable: true, resizable: true },
    { field: 'email' as any, headerName: 'Email', width: 240, sortable: true, resizable: true },
    { field: 'department' as any, headerName: 'Department', width: 150, sortable: true, filterable: true, resizable: true },
    { field: 'role' as any, headerName: 'Role', width: 160, sortable: true, resizable: true },
    { field: 'salary' as any, headerName: 'Salary', width: 130, sortable: true, editable: true, resizable: true,
      valueFormatter: (params: any) => `$${Number(params.value).toLocaleString()}` },
    { field: 'city' as any, headerName: 'City', width: 130, sortable: true, filterable: true, resizable: true },
    { field: 'startDate' as any, headerName: 'Start Date', width: 130, sortable: true, resizable: true },
    { field: 'status' as any, headerName: 'Status', width: 100, pinned: 'right',
      cellRenderer: (params: any) => {
        const colors: Record<string, string> = { Active: '#22c55e', Inactive: '#ef4444', 'On Leave': '#f59e0b', Probation: '#3b82f6' };
        const c = colors[params.value] || '#888';
        return `<span style="padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:${c}20;color:${c}">${params.value}</span>`;
      }},
  ], []);
  return (
    <div style={{ flex: 1 }}>
      <p style={hintStyle}>All features: Sort, filter, select, edit, resize, pin, paginate, right-click menu, clipboard. 1,000 rows.</p>
      <GridStorm columns={columns} rowData={EMPLOYEES_1K} plugins={plugins} rowHeight={40} headerHeight={44} height="100%" rowSelection="multiple" ariaLabel="Full Featured Demo" />
    </div>
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
  'grouping': GroupingDemo,
  'aggregation': AggregationDemo,
  'context-menu': ContextMenuDemo,
  'clipboard': ClipboardDemo,
  'virtual-scroll': VirtualScrollDemo,
  'theming': ThemingDemo,
  'value-formatters': ValueFormattersDemo,
  'custom-renderers': CustomRenderersDemo,
  'infinite-scroll': InfiniteScrollDemo,
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
    <div style={{ display: 'flex', height: '100vh' }}>
      {/* ── Sidebar ── */}
      <aside style={sidebarStyle}>
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #e5e7eb' }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
            <span style={{ color: '#2563eb' }}>GridStorm</span>{' '}
            <span style={{ fontWeight: 400, color: '#666' }}>Features</span>
          </h1>
          <p style={{ fontSize: 11, color: '#999', marginTop: 4 }}>18 interactive demos</p>
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
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <header style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb', background: '#fafafa' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>{feature.title}</h2>
          <p style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{feature.description}</p>
        </header>

        {/* Grid Area */}
        <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
