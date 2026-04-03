// ─── GridStorm Cookbook ───
// Comprehensive feature cookbook with individual, focused examples.
// Each example is self-contained and easy to copy-paste.

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GridSkeleton, GridError } from '../../shared/GridSkeleton';
import {
  GridStorm,
  useGridState,
  useGridSort,
  useGridFilter,
  useGridPagination,
  useGridSelection,
  useGridColumn,
  useGridApi,
  reactCellRenderer,
} from '@gridstorm/react';
import type { GridApi, ColumnDef, GridPlugin } from '@gridstorm/core';
import { createGrid } from '@gridstorm/core';
import { DomRenderer } from '@gridstorm/dom-renderer';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { FilteringPlugin } from '@gridstorm/plugin-filtering';
import { SelectionPlugin } from '@gridstorm/plugin-selection';
import { EditingPlugin } from '@gridstorm/plugin-editing';
import { PaginationPlugin } from '@gridstorm/plugin-pagination';
import { ColumnPinningPlugin } from '@gridstorm/plugin-column-pinning';
import { ColumnResizePlugin } from '@gridstorm/plugin-column-resize';
import { ColumnReorderPlugin } from '@gridstorm/plugin-column-reorder';
import { ContextMenuPlugin } from '@gridstorm/plugin-context-menu';
import { GroupingPlugin } from '@gridstorm/plugin-grouping';
import { AggregationPlugin } from '@gridstorm/plugin-aggregation';
import { PivotPlugin } from '@gridstorm/plugin-pivoting';
import { ClipboardPlugin } from '@gridstorm/plugin-clipboard';
import { MasterDetailPlugin } from '@gridstorm/plugin-master-detail';
import { SSRMPlugin } from '@gridstorm/plugin-ssrm';
import { RowReorderPlugin } from '@gridstorm/plugin-row-reorder';
import { ExcelExportPlugin } from '@gridstorm/plugin-excel-export';
import { TreeDataPlugin } from '@gridstorm/plugin-tree-data';
import { SparklinePlugin } from '@gridstorm/plugin-sparklines';
import { ChartsPlugin } from '@gridstorm/plugin-charts';
import { StatusBarPlugin } from '@gridstorm/plugin-status-bar';
import { StatePersistencePlugin } from '@gridstorm/plugin-state-persistence';
import { ColumnAutoSizePlugin } from '@gridstorm/plugin-column-autosize';
import { RowPinningPlugin } from '@gridstorm/plugin-row-pinning';
import { ConditionalFormattingPlugin } from '@gridstorm/plugin-conditional-formatting';
import { StreamingPlugin } from '@gridstorm/plugin-streaming';
import { AIPlugin } from '@gridstorm/plugin-ai';
import { FormulaPlugin } from '@gridstorm/plugin-formula';
import { TimeTravelPlugin } from '@gridstorm/plugin-time-travel';
import { CellRangePlugin } from '@gridstorm/plugin-cell-range';
import { ValidationPlugin } from '@gridstorm/plugin-validation';
import '@gridstorm/theme-default';
import {
  generateEmployees,
  generateOrders,
  type Employee,
  type Order,
  departments,
  roles,
  statuses,
} from './data';

// ── Pre-generated Data ──

const EMPLOYEES_20 = generateEmployees(20);
const EMPLOYEES_50 = generateEmployees(50);
const EMPLOYEES_200 = generateEmployees(200);
const EMPLOYEES_1K = generateEmployees(1000);
const EMPLOYEES_100K = generateEmployees(100_000);
const ORDERS_50 = generateOrders(50);
const ORDERS_200 = generateOrders(200);

// ─────────────────────────────────────────────────────────────
// SIDEBAR CONFIGURATION
// ─────────────────────────────────────────────────────────────

interface ExampleItem {
  id: string;
  title: string;
}

interface ExampleCategory {
  label: string;
  items: ExampleItem[];
}

const CATEGORIES: ExampleCategory[] = [
  {
    label: 'Getting Started',
    items: [
      { id: 'basic-grid', title: 'Basic Grid' },
      { id: 'column-definitions', title: 'Column Definitions' },
      { id: 'row-data', title: 'Row Data' },
    ],
  },
  {
    label: 'Core Features',
    items: [
      { id: 'sorting', title: 'Sorting' },
      { id: 'filtering', title: 'Filtering' },
      { id: 'selection', title: 'Selection' },
      { id: 'editing', title: 'Editing' },
      { id: 'pagination', title: 'Pagination' },
    ],
  },
  {
    label: 'Column Operations',
    items: [
      { id: 'pinning', title: 'Pinning' },
      { id: 'resize', title: 'Resize' },
      { id: 'reorder', title: 'Reorder' },
    ],
  },
  {
    label: 'Advanced',
    items: [
      { id: 'grouping', title: 'Grouping' },
      { id: 'aggregation', title: 'Aggregation' },
      { id: 'pivoting', title: 'Pivoting' },
      { id: 'master-detail', title: 'Master-Detail' },
      { id: 'ssrm', title: 'SSRM' },
    ],
  },
  {
    label: 'Interaction',
    items: [
      { id: 'context-menu', title: 'Context Menu' },
      { id: 'clipboard', title: 'Clipboard' },
      { id: 'row-reorder', title: 'Row Reorder' },
      { id: 'excel-export', title: 'Excel Export' },
    ],
  },
  {
    label: 'Customization',
    items: [
      { id: 'value-getters', title: 'Value Getters' },
      { id: 'value-formatters', title: 'Value Formatters' },
      { id: 'cell-renderers', title: 'Cell Renderers' },
      { id: 'theming', title: 'Theming' },
      { id: 'dark-mode', title: 'Dark Mode' },
    ],
  },
  {
    label: 'React Hooks',
    items: [
      { id: 'hook-use-grid-state', title: 'useGridState' },
      { id: 'hook-use-grid-sort', title: 'useGridSort' },
      { id: 'hook-use-grid-filter', title: 'useGridFilter' },
      { id: 'hook-use-grid-pagination', title: 'useGridPagination' },
      { id: 'hook-use-grid-selection', title: 'useGridSelection' },
      { id: 'hook-use-grid-column', title: 'useGridColumn' },
    ],
  },
  {
    label: 'Performance',
    items: [
      { id: 'virtual-scrolling', title: 'Virtual Scrolling' },
      { id: 'large-dataset', title: 'Large Dataset' },
    ],
  },
  {
    label: 'Vanilla JS',
    items: [
      { id: 'vanilla-js', title: 'No-Framework Example' },
    ],
  },
  {
    label: 'Enterprise',
    items: [
      { id: 'tree-data', title: 'Tree Data' },
      { id: 'sparklines', title: 'Sparklines' },
      { id: 'charts', title: 'Charts' },
      { id: 'conditional-formatting', title: 'Conditional Formatting' },
      { id: 'streaming', title: 'Streaming Data' },
    ],
  },
  {
    label: 'Next-Gen',
    items: [
      { id: 'status-bar', title: 'Status Bar' },
      { id: 'state-persistence', title: 'State Persistence' },
      { id: 'column-autosize', title: 'Column AutoSize' },
      { id: 'row-pinning', title: 'Row Pinning' },
      { id: 'ai-integration', title: 'AI Integration' },
      { id: 'formula-engine', title: 'Formula Engine' },
      { id: 'time-travel', title: 'Time Travel' },
      { id: 'cell-range', title: 'Cell Range' },
      { id: 'data-validation', title: 'Data Validation' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// EXAMPLE WRAPPER
// ─────────────────────────────────────────────────────────────

function ExampleWrapper({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginBottom: 8, fontSize: 22, fontWeight: 600 }}>{title}</h2>
      <p style={{ marginBottom: 20, color: '#666', fontSize: 14, lineHeight: 1.5 }}>
        {description}
      </p>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// GETTING STARTED EXAMPLES
// ─────────────────────────────────────────────────────────────

function BasicGridExample() {
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'department', headerName: 'Department', width: 140 },
    { field: 'role', headerName: 'Role', width: 160 },
    { field: 'salary', headerName: 'Salary', width: 120 },
    { field: 'active', headerName: 'Active', width: 100 },
  ], []);

  return (
    <ExampleWrapper
      title="Basic Grid"
      description="The simplest possible grid. Pass column definitions and row data to render a grid."
    >
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_20}
        height={400}
      />
    </ExampleWrapper>
  );
}

function ColumnDefinitionsExample() {
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Full Name', width: 180, sortable: true },
    { field: 'email', headerName: 'Email Address', width: 250 },
    { field: 'department', headerName: 'Dept', width: 130 },
    { field: 'salary', headerName: 'Annual Salary', width: 140 },
    { field: 'startDate', headerName: 'Start Date', width: 120 },
    { field: 'city', headerName: 'City', width: 130 },
    { field: 'country', headerName: 'Country', width: 120 },
    { field: 'rating', headerName: 'Rating', width: 100 },
  ], []);

  return (
    <ExampleWrapper
      title="Column Definitions"
      description="Configure columns with field mapping, headerName, width, and other options. Each column binds to a property on the row data object."
    >
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_50}
        height={400}
      />
    </ExampleWrapper>
  );
}

function RowDataExample() {
  const [rowData, setRowData] = useState(EMPLOYEES_20);

  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'department', headerName: 'Department', width: 140 },
    { field: 'role', headerName: 'Role', width: 160 },
    { field: 'salary', headerName: 'Salary', width: 120 },
  ], []);

  return (
    <ExampleWrapper
      title="Row Data"
      description="Row data can be updated dynamically. Click the buttons to change the dataset."
    >
      <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        <button onClick={() => setRowData(EMPLOYEES_20)}>20 Rows</button>
        <button onClick={() => setRowData(EMPLOYEES_50)}>50 Rows</button>
        <button onClick={() => setRowData(EMPLOYEES_200)}>200 Rows</button>
      </div>
      <GridStorm<Employee>
        columns={columns}
        rowData={rowData}
        height={400}
      />
    </ExampleWrapper>
  );
}

// ─────────────────────────────────────────────────────────────
// CORE FEATURES
// ─────────────────────────────────────────────────────────────

function SortingExample() {
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180, sortable: true },
    { field: 'department', headerName: 'Department', width: 140, sortable: true },
    { field: 'salary', headerName: 'Salary', width: 130, sortable: true },
    { field: 'age', headerName: 'Age', width: 90, sortable: true },
    { field: 'rating', headerName: 'Rating', width: 100, sortable: true },
    { field: 'startDate', headerName: 'Start Date', width: 130, sortable: true },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    SortingPlugin(),
  ], []);

  return (
    <ExampleWrapper
      title="Sorting"
      description="Click column headers to sort. Hold Shift and click to multi-sort. Click again to cycle through ascending, descending, and none."
    >
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_50}
        plugins={plugins}
        height={400}
      />
    </ExampleWrapper>
  );
}

function FilteringExample() {
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180, filterable: true },
    { field: 'department', headerName: 'Department', width: 140, filterable: true },
    { field: 'role', headerName: 'Role', width: 160, filterable: true },
    { field: 'city', headerName: 'City', width: 130, filterable: true },
    { field: 'salary', headerName: 'Salary', width: 130 },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    FilteringPlugin(),
  ], []);

  return (
    <ExampleWrapper
      title="Filtering"
      description="Use the floating filter inputs below the headers to filter rows. Type in any column filter to narrow results."
    >
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_200}
        plugins={plugins}
        floatingFilter
        height={400}
      />
    </ExampleWrapper>
  );
}

function SelectionExample() {
  const [selectedInfo, setSelectedInfo] = useState('No rows selected');

  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'department', headerName: 'Department', width: 140 },
    { field: 'role', headerName: 'Role', width: 160 },
    { field: 'salary', headerName: 'Salary', width: 130 },
    { field: 'active', headerName: 'Active', width: 100 },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    SelectionPlugin({ mode: 'multiple' }),
  ], []);

  return (
    <ExampleWrapper
      title="Selection"
      description="Click rows to select. Hold Ctrl/Cmd for multi-select, Shift for range select. Checkboxes appear in the first column."
    >
      <p style={{ marginBottom: 12, fontSize: 13, fontWeight: 500 }}>{selectedInfo}</p>
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_50}
        plugins={plugins}
        rowSelection="multiple"
        checkboxSelection
        height={400}
        onSelectionChanged={(e) => {
          const count = e.selectedNodes?.length ?? 0;
          setSelectedInfo(count > 0 ? `${count} row(s) selected` : 'No rows selected');
        }}
      />
    </ExampleWrapper>
  );
}

function EditingExample() {
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180, editable: true },
    { field: 'department', headerName: 'Department', width: 140, editable: true },
    { field: 'role', headerName: 'Role', width: 160, editable: true },
    { field: 'salary', headerName: 'Salary', width: 130, editable: true },
    { field: 'email', headerName: 'Email', width: 220, editable: true },
    { field: 'active', headerName: 'Active', width: 100 },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    EditingPlugin(),
  ], []);

  return (
    <ExampleWrapper
      title="Editing"
      description="Double-click any editable cell to start editing. Press Enter to confirm, Escape to cancel. Tab moves to the next cell."
    >
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_20}
        plugins={plugins}
        enableCellEditing
        height={400}
        onCellValueChanged={(e) => {
          console.log('Cell value changed:', e);
        }}
      />
    </ExampleWrapper>
  );
}

function PaginationExample() {
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'department', headerName: 'Department', width: 140 },
    { field: 'role', headerName: 'Role', width: 160 },
    { field: 'salary', headerName: 'Salary', width: 130 },
    { field: 'city', headerName: 'City', width: 130 },
    { field: 'country', headerName: 'Country', width: 120 },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    PaginationPlugin({ pageSize: 25, pageSizeOptions: [10, 25, 50, 100] }),
  ], []);

  return (
    <ExampleWrapper
      title="Pagination"
      description="Client-side pagination with configurable page sizes. Navigate with the pagination bar at the bottom."
    >
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_200}
        plugins={plugins}
        pagination
        paginationPageSize={25}
        enablePagination
        pageSizeOptions={[10, 25, 50, 100]}
        height={500}
      />
    </ExampleWrapper>
  );
}

// ─────────────────────────────────────────────────────────────
// COLUMN OPERATIONS
// ─────────────────────────────────────────────────────────────

function PinningExample() {
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70, pinned: 'left' },
    { field: 'name', headerName: 'Name', width: 180, pinned: 'left' },
    { field: 'department', headerName: 'Department', width: 140 },
    { field: 'role', headerName: 'Role', width: 160 },
    { field: 'salary', headerName: 'Salary', width: 130 },
    { field: 'email', headerName: 'Email', width: 250 },
    { field: 'city', headerName: 'City', width: 130 },
    { field: 'country', headerName: 'Country', width: 120 },
    { field: 'rating', headerName: 'Rating', width: 100, pinned: 'right' },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    ColumnPinningPlugin(),
  ], []);

  return (
    <ExampleWrapper
      title="Column Pinning"
      description="ID and Name are pinned to the left, Rating is pinned to the right. Scroll horizontally to see pinned columns stay in place."
    >
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_50}
        plugins={plugins}
        height={400}
      />
    </ExampleWrapper>
  );
}

function ResizeExample() {
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180, minWidth: 100, maxWidth: 400 },
    { field: 'department', headerName: 'Department', width: 140, minWidth: 80 },
    { field: 'role', headerName: 'Role', width: 160, minWidth: 100 },
    { field: 'salary', headerName: 'Salary', width: 130, minWidth: 80 },
    { field: 'email', headerName: 'Email', width: 250, minWidth: 150 },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    ColumnResizePlugin(),
  ], []);

  return (
    <ExampleWrapper
      title="Column Resize"
      description="Drag the right edge of a column header to resize. Columns have minimum and maximum width constraints."
    >
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_50}
        plugins={plugins}
        height={400}
      />
    </ExampleWrapper>
  );
}

function ReorderExample() {
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'department', headerName: 'Department', width: 140 },
    { field: 'role', headerName: 'Role', width: 160 },
    { field: 'salary', headerName: 'Salary', width: 130 },
    { field: 'city', headerName: 'City', width: 130 },
    { field: 'country', headerName: 'Country', width: 120 },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    ColumnReorderPlugin(),
  ], []);

  return (
    <ExampleWrapper
      title="Column Reorder"
      description="Drag a column header to reorder columns. Drop it in a new position to rearrange the grid layout."
    >
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_50}
        plugins={plugins}
        height={400}
      />
    </ExampleWrapper>
  );
}

// ─────────────────────────────────────────────────────────────
// ADVANCED
// ─────────────────────────────────────────────────────────────

function GroupingExample() {
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 200 },
    { field: 'department', headerName: 'Department', width: 140, rowGroup: true },
    { field: 'role', headerName: 'Role', width: 160 },
    { field: 'salary', headerName: 'Salary', width: 130 },
    { field: 'city', headerName: 'City', width: 130 },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    GroupingPlugin(),
    SortingPlugin(),
  ], []);

  return (
    <ExampleWrapper
      title="Row Grouping"
      description="Rows are grouped by the Department column. Click the chevron to expand or collapse groups. Combine with sorting for organized views."
    >
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_200}
        plugins={plugins}
        enableGrouping
        height={500}
      />
    </ExampleWrapper>
  );
}

function AggregationExample() {
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 200 },
    { field: 'department', headerName: 'Department', width: 140, rowGroup: true },
    { field: 'salary', headerName: 'Salary', width: 140, aggFunc: 'avg' },
    { field: 'age', headerName: 'Age', width: 100, aggFunc: 'avg' },
    { field: 'rating', headerName: 'Rating', width: 120, aggFunc: 'avg' },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    GroupingPlugin(),
    AggregationPlugin(),
  ], []);

  return (
    <ExampleWrapper
      title="Aggregation"
      description="Group rows by Department and apply aggregate functions. Salary, Age, and Rating show averages for each group. Supports sum, avg, min, max, count."
    >
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_200}
        plugins={plugins}
        enableGrouping
        height={500}
      />
    </ExampleWrapper>
  );
}

function PivotingExample() {
  const columns: ColumnDef<Order>[] = useMemo(() => [
    { field: 'region', headerName: 'Region', width: 150, rowGroup: true },
    { field: 'status', headerName: 'Status', width: 130, pivot: true },
    { field: 'price', headerName: 'Revenue', width: 130, aggFunc: 'sum' },
    { field: 'quantity', headerName: 'Qty', width: 100, aggFunc: 'sum' },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    GroupingPlugin({ defaultExpanded: true }),
    AggregationPlugin(),
    PivotPlugin(),
  ], []);

  return (
    <ExampleWrapper
      title="Pivoting"
      description="Pivot transforms rows into columns. Status values become column headers, with Revenue and Quantity aggregated within each cell. Each row shows its value under the matching status column."
    >
      <GridStorm<Order>
        columns={columns}
        rowData={ORDERS_200}
        plugins={plugins}
        enableGrouping
        height={500}
      />
    </ExampleWrapper>
  );
}

function MasterDetailExample() {
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 200 },
    { field: 'department', headerName: 'Department', width: 140 },
    { field: 'role', headerName: 'Role', width: 160 },
    { field: 'salary', headerName: 'Salary', width: 130 },
    { field: 'city', headerName: 'City', width: 130 },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    MasterDetailPlugin({
      detailGridOptions: () => ({
        columns: [
          { field: 'product', headerName: 'Product', width: 180 },
          { field: 'quantity', headerName: 'Qty', width: 100 },
          { field: 'price', headerName: 'Price', width: 120 },
          { field: 'status', headerName: 'Status', width: 120 },
        ],
      }),
      getDetailRowData: (_params) => {
        return generateOrders(5);
      },
    }),
  ], []);

  return (
    <ExampleWrapper
      title="Master-Detail"
      description="Click the expand arrow on any row to reveal a detail grid with related order data. Each master row can have its own nested grid."
    >
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_20}
        plugins={plugins}
        height={500}
      />
    </ExampleWrapper>
  );
}

function SSRMExample() {
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'department', headerName: 'Department', width: 140 },
    { field: 'role', headerName: 'Role', width: 160 },
    { field: 'salary', headerName: 'Salary', width: 130 },
    { field: 'city', headerName: 'City', width: 130 },
  ], []);

  const allData = useMemo(() => EMPLOYEES_1K, []);

  const dataSource = useMemo(() => ({
    getRows: (params: { startRow: number; endRow: number; sortModel?: any[]; filterModel?: any }) => {
      return new Promise<{ rowData: Employee[]; rowCount: number }>((resolve) => {
        setTimeout(() => {
          const rows = allData.slice(params.startRow, params.endRow);
          resolve({ rowData: rows, rowCount: allData.length });
        }, 200);
      });
    },
  }), [allData]);

  const plugins = useMemo<GridPlugin[]>(() => [
    SSRMPlugin({ dataSource }),
    SortingPlugin(),
  ], [dataSource]);

  return (
    <ExampleWrapper
      title="Server-Side Row Model (SSRM)"
      description="Data is fetched from a simulated server in pages. The grid requests rows as you scroll, loading data on demand."
    >
      <GridStorm<Employee>
        columns={columns}
        rowData={[]}
        plugins={plugins}
        height={400}
      />
    </ExampleWrapper>
  );
}

// ─────────────────────────────────────────────────────────────
// INTERACTION
// ─────────────────────────────────────────────────────────────

function ContextMenuExample() {
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'department', headerName: 'Department', width: 140 },
    { field: 'role', headerName: 'Role', width: 160 },
    { field: 'salary', headerName: 'Salary', width: 130 },
    { field: 'email', headerName: 'Email', width: 250 },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    ContextMenuPlugin({
      menuItems: [
        { id: 'copy-cell', label: 'Copy Cell', action: (params) => { navigator.clipboard.writeText(String(params.value)); } },
        { id: 'sep1', label: '', separator: true },
        { id: 'alert-row', label: 'Alert Row', action: (params) => { alert(`Row: ${params.node?.data?.name}`); } },
      ],
      hideDefaultItems: true,
    }),
  ], []);

  return (
    <ExampleWrapper
      title="Context Menu"
      description="Right-click any cell to see a custom context menu with Copy Cell and Alert Row actions."
    >
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_50}
        plugins={plugins}
        height={400}
      />
    </ExampleWrapper>
  );
}

function ClipboardExample() {
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'department', headerName: 'Department', width: 140 },
    { field: 'role', headerName: 'Role', width: 160 },
    { field: 'salary', headerName: 'Salary', width: 130 },
    { field: 'email', headerName: 'Email', width: 250 },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    SelectionPlugin({ mode: 'multiple' }),
    ClipboardPlugin(),
  ], []);

  return (
    <ExampleWrapper
      title="Clipboard"
      description="Select cells and use Ctrl+C to copy, Ctrl+X to cut, and Ctrl+V to paste. Data is copied in tab-separated format compatible with spreadsheets."
    >
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_50}
        plugins={plugins}
        rowSelection="multiple"
        height={400}
      />
    </ExampleWrapper>
  );
}

function RowReorderExample() {
  const apiRef = useRef<GridApi | null>(null);

  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'department', headerName: 'Department', width: 140 },
    { field: 'role', headerName: 'Role', width: 160 },
    { field: 'salary', headerName: 'Salary', width: 130 },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    RowReorderPlugin(),
  ], []);

  return (
    <ExampleWrapper
      title="Row Reorder"
      description="Drag the row handle (☰) on the left side of each row to reorder. Or use the buttons to move the first row."
    >
      <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        <button onClick={() => apiRef.current?.dispatchCommand?.('row:move', { rowId: 'row-0', toIndex: 2 })}>
          Move Row 1 → Position 3
        </button>
        <button onClick={() => apiRef.current?.dispatchCommand?.('row:swap', { rowIdA: 'row-0', rowIdB: 'row-1' })}>
          Swap Row 1 &amp; Row 2
        </button>
      </div>
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_20}
        plugins={plugins}
        height={400}
        onGridReady={(api) => { apiRef.current = api; }}
      />
    </ExampleWrapper>
  );
}

function ExcelExportExample() {
  const apiRef = useRef<GridApi | null>(null);

  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'department', headerName: 'Department', width: 140 },
    { field: 'role', headerName: 'Role', width: 160 },
    { field: 'salary', headerName: 'Salary', width: 130 },
    { field: 'city', headerName: 'City', width: 130 },
    { field: 'country', headerName: 'Country', width: 120 },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    ExcelExportPlugin(),
  ], []);

  return (
    <ExampleWrapper
      title="Excel Export"
      description="Click the Export button to download grid data as a CSV/Excel file. The export respects current column order and visibility."
    >
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => apiRef.current?.dispatchCommand?.('excel:exportCsv', {})}>
          Export to CSV
        </button>
      </div>
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_50}
        plugins={plugins}
        height={400}
        onGridReady={(api) => { apiRef.current = api; }}
      />
    </ExampleWrapper>
  );
}

// ─────────────────────────────────────────────────────────────
// CUSTOMIZATION
// ─────────────────────────────────────────────────────────────

function ValueGettersExample() {
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'salary', headerName: 'Base Salary', width: 140 },
    {
      colId: 'bonus',
      headerName: 'Bonus (10%)',
      width: 130,
      valueGetter: ({ data }) => data ? Math.round(data.salary * 0.1) : 0,
    },
    {
      colId: 'total',
      headerName: 'Total Comp',
      width: 140,
      valueGetter: ({ data }) => data ? Math.round(data.salary * 1.1) : 0,
    },
    {
      colId: 'fullInfo',
      headerName: 'Full Info',
      width: 280,
      valueGetter: ({ data }) => data ? `${data.name} (${data.department} - ${data.role})` : '',
    },
  ], []);

  return (
    <ExampleWrapper
      title="Value Getters"
      description="Computed columns using valueGetter. Bonus is calculated as 10% of salary, Total Comp adds them together, and Full Info concatenates multiple fields."
    >
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_50}
        height={400}
      />
    </ExampleWrapper>
  );
}

function ValueFormattersExample() {
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180 },
    {
      field: 'salary',
      headerName: 'Salary',
      width: 140,
      valueFormatter: ({ value }) => `$${Number(value).toLocaleString()}`,
    },
    {
      field: 'startDate',
      headerName: 'Start Date',
      width: 160,
      valueFormatter: ({ value }) => {
        const d = new Date(value as string);
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      },
    },
    {
      field: 'rating',
      headerName: 'Rating',
      width: 120,
      valueFormatter: ({ value }) => `${Number(value).toFixed(1)} / 5.0`,
    },
    {
      field: 'active',
      headerName: 'Status',
      width: 120,
      valueFormatter: ({ value }) => value ? 'Active' : 'Inactive',
    },
  ], []);

  return (
    <ExampleWrapper
      title="Value Formatters"
      description="Format display values without changing underlying data. Salary is formatted as currency, dates are human-readable, and booleans show as status text."
    >
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_50}
        height={400}
      />
    </ExampleWrapper>
  );
}

function CellRenderersExample() {
  const RatingRenderer = reactCellRenderer<Employee, number>(({ value }) => {
    const stars = Math.round(value ?? 0);
    return (
      <span style={{ color: '#f59e0b', fontSize: 16 }}>
        {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
      </span>
    );
  });

  const StatusRenderer = reactCellRenderer<Employee, boolean>(({ value }) => (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: 12,
        fontWeight: 600,
        background: value ? '#dcfce7' : '#fee2e2',
        color: value ? '#166534' : '#991b1b',
      }}
    >
      {value ? 'Active' : 'Inactive'}
    </span>
  ));

  const SalaryRenderer = reactCellRenderer<Employee, number>(({ value }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          height: 6,
          width: `${Math.min(100, ((value ?? 0) / 200000) * 100)}%`,
          background: (value ?? 0) > 100000 ? '#22c55e' : '#3b82f6',
          borderRadius: 3,
          minWidth: 20,
        }}
      />
      <span style={{ fontSize: 12 }}>${(value ?? 0).toLocaleString()}</span>
    </div>
  ));

  const columns = useMemo(() => [
    { field: 'name' as const, headerName: 'Name', width: 180 },
    { field: 'department' as const, headerName: 'Department', width: 140 },
    { field: 'salary' as const, headerName: 'Salary', width: 220, cellRenderer: SalaryRenderer },
    { field: 'rating' as const, headerName: 'Rating', width: 150, cellRenderer: RatingRenderer },
    { field: 'active' as const, headerName: 'Status', width: 120, cellRenderer: StatusRenderer },
  ], []);

  return (
    <ExampleWrapper
      title="Cell Renderers"
      description="Custom React cell renderers for rich cell content. Rating shows stars, Status shows colored badges, and Salary shows a progress bar."
    >
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_50}
        height={400}
      />
    </ExampleWrapper>
  );
}

function ThemingExample() {
  const [density, setDensity] = useState<'comfortable' | 'compact' | 'spacious'>('comfortable');

  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'department', headerName: 'Department', width: 140 },
    { field: 'role', headerName: 'Role', width: 160 },
    { field: 'salary', headerName: 'Salary', width: 130 },
    { field: 'city', headerName: 'City', width: 130 },
  ], []);

  const densityHeight = density === 'compact' ? 32 : density === 'spacious' ? 56 : 42;

  return (
    <ExampleWrapper
      title="Theming"
      description="GridStorm uses CSS custom properties for theming. Switch between density modes to see row height change. Customize colors by overriding CSS variables."
    >
      <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        <button
          onClick={() => setDensity('compact')}
          style={{ fontWeight: density === 'compact' ? 700 : 400 }}
        >
          Compact
        </button>
        <button
          onClick={() => setDensity('comfortable')}
          style={{ fontWeight: density === 'comfortable' ? 700 : 400 }}
        >
          Comfortable
        </button>
        <button
          onClick={() => setDensity('spacious')}
          style={{ fontWeight: density === 'spacious' ? 700 : 400 }}
        >
          Spacious
        </button>
      </div>
      <GridStorm<Employee>
        key={density}
        columns={columns}
        rowData={EMPLOYEES_50}
        rowHeight={densityHeight}
        height={400}
      />
    </ExampleWrapper>
  );
}

function DarkModeExample() {
  const [dark, setDark] = useState(false);

  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'department', headerName: 'Department', width: 140 },
    { field: 'role', headerName: 'Role', width: 160 },
    { field: 'salary', headerName: 'Salary', width: 130 },
    { field: 'city', headerName: 'City', width: 130 },
    { field: 'rating', headerName: 'Rating', width: 100 },
  ], []);

  return (
    <ExampleWrapper
      title="Dark Mode"
      description="Toggle between light and dark themes. GridStorm's default theme supports both via CSS custom properties and a data-theme attribute."
    >
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => setDark(!dark)}>
          Switch to {dark ? 'Light' : 'Dark'} Mode
        </button>
      </div>
      <div data-theme={dark ? 'dark' : 'light'}>
        <GridStorm<Employee>
          columns={columns}
          rowData={EMPLOYEES_50}
          theme={dark ? 'dark' : 'light'}
          height={400}
        />
      </div>
    </ExampleWrapper>
  );
}

// ─────────────────────────────────────────────────────────────
// REACT HOOKS
// ─────────────────────────────────────────────────────────────

function HookUseGridStatePanel() {
  const rowCount = useGridState((s) => s.displayedRowIds.length);
  const totalRows = useGridState((s) => s.rowNodes.size);
  return (
    <div style={{ padding: 12, background: '#f0f9ff', borderRadius: 8, marginBottom: 12 }}>
      <strong>useGridState:</strong> Displaying {rowCount} of {totalRows} rows
    </div>
  );
}

function HookUseGridStateExample() {
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180, sortable: true },
    { field: 'department', headerName: 'Department', width: 140, filterable: true },
    { field: 'salary', headerName: 'Salary', width: 130 },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    SortingPlugin(),
    FilteringPlugin(),
  ], []);

  return (
    <ExampleWrapper
      title="useGridState"
      description="Subscribe to grid state with a selector. The panel above the grid re-renders only when the selected value changes."
    >
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_50}
        plugins={plugins}
        floatingFilter
        height={350}
      >
        <HookUseGridStatePanel />
      </GridStorm>
    </ExampleWrapper>
  );
}

function HookUseGridSortPanel() {
  const { sortModel, isSorted, clearSort, toggleSort } = useGridSort();
  return (
    <div style={{ padding: 12, background: '#f0fdf4', borderRadius: 8, marginBottom: 12 }}>
      <strong>useGridSort:</strong>{' '}
      {isSorted
        ? `Sorted by: ${sortModel.map((s) => `${s.colId} (${s.sort})`).join(', ')}`
        : 'Not sorted'}
      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <button onClick={() => toggleSort('salary')}>Toggle Salary Sort</button>
        <button onClick={() => clearSort()} disabled={!isSorted}>Clear Sort</button>
      </div>
    </div>
  );
}

function HookUseGridSortExample() {
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180, sortable: true },
    { field: 'department', headerName: 'Department', width: 140, sortable: true },
    { field: 'salary', headerName: 'Salary', width: 130, sortable: true },
    { field: 'rating', headerName: 'Rating', width: 100, sortable: true },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [SortingPlugin()], []);

  return (
    <ExampleWrapper
      title="useGridSort"
      description="Access sort state and programmatically control sorting. Use toggleSort, clearSort, and read the current sort model."
    >
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_50}
        plugins={plugins}
        height={350}
      >
        <HookUseGridSortPanel />
      </GridStorm>
    </ExampleWrapper>
  );
}

function HookUseGridFilterPanel() {
  const { isFiltered, quickFilterText, setQuickFilter, clearFilters } = useGridFilter();
  return (
    <div style={{ padding: 12, background: '#fffbeb', borderRadius: 8, marginBottom: 12 }}>
      <strong>useGridFilter:</strong> {isFiltered ? 'Filters active' : 'No filters'}
      <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Quick filter..."
          value={quickFilterText}
          onChange={(e) => setQuickFilter(e.target.value)}
          style={{ padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4 }}
        />
        <button onClick={() => clearFilters()} disabled={!isFiltered}>Clear Filters</button>
      </div>
    </div>
  );
}

function HookUseGridFilterExample() {
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180, filterable: true },
    { field: 'department', headerName: 'Department', width: 140, filterable: true },
    { field: 'role', headerName: 'Role', width: 160, filterable: true },
    { field: 'salary', headerName: 'Salary', width: 130 },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [FilteringPlugin()], []);

  return (
    <ExampleWrapper
      title="useGridFilter"
      description="Programmatic filter control with quick filter text input and filter state inspection."
    >
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_200}
        plugins={plugins}
        height={350}
      >
        <HookUseGridFilterPanel />
      </GridStorm>
    </ExampleWrapper>
  );
}

function HookUseGridPaginationPanel() {
  const {
    currentPage, totalPages, pageSize, totalRows,
    hasNextPage, hasPreviousPage,
    nextPage, previousPage, firstPage, lastPage,
  } = useGridPagination();

  return (
    <div style={{ padding: 12, background: '#faf5ff', borderRadius: 8, marginBottom: 12 }}>
      <strong>useGridPagination:</strong> Page {currentPage + 1} of {totalPages} ({totalRows} total rows, {pageSize}/page)
      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <button onClick={firstPage} disabled={!hasPreviousPage}>First</button>
        <button onClick={previousPage} disabled={!hasPreviousPage}>Previous</button>
        <button onClick={nextPage} disabled={!hasNextPage}>Next</button>
        <button onClick={lastPage} disabled={!hasNextPage}>Last</button>
      </div>
    </div>
  );
}

function HookUseGridPaginationExample() {
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'department', headerName: 'Department', width: 140 },
    { field: 'role', headerName: 'Role', width: 160 },
    { field: 'salary', headerName: 'Salary', width: 130 },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [PaginationPlugin()], []);

  return (
    <ExampleWrapper
      title="useGridPagination"
      description="Navigate pages programmatically with custom controls. Access currentPage, totalPages, and navigation functions."
    >
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_200}
        plugins={plugins}
        pagination
        paginationPageSize={10}
        height={350}
      >
        <HookUseGridPaginationPanel />
      </GridStorm>
    </ExampleWrapper>
  );
}

function HookUseGridSelectionPanel() {
  const { selectedCount, selectAll, deselectAll } = useGridSelection();
  return (
    <div style={{ padding: 12, background: '#fff1f2', borderRadius: 8, marginBottom: 12 }}>
      <strong>useGridSelection:</strong> {selectedCount} row(s) selected
      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <button onClick={selectAll}>Select All</button>
        <button onClick={deselectAll} disabled={selectedCount === 0}>Deselect All</button>
      </div>
    </div>
  );
}

function HookUseGridSelectionExample() {
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'department', headerName: 'Department', width: 140 },
    { field: 'role', headerName: 'Role', width: 160 },
    { field: 'salary', headerName: 'Salary', width: 130 },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    SelectionPlugin({ mode: 'multiple' }),
  ], []);

  return (
    <ExampleWrapper
      title="useGridSelection"
      description="Programmatic selection control. Select all, deselect all, and check selected count with the useGridSelection hook."
    >
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_50}
        plugins={plugins}
        rowSelection="multiple"
        checkboxSelection
        height={350}
      >
        <HookUseGridSelectionPanel />
      </GridStorm>
    </ExampleWrapper>
  );
}

function HookUseGridColumnPanel() {
  const { visibleColumns, setColumnVisible, allColumns } = useGridColumn();
  const hiddenCount = allColumns.length - visibleColumns.length;
  return (
    <div style={{ padding: 12, background: '#ecfdf5', borderRadius: 8, marginBottom: 12 }}>
      <strong>useGridColumn:</strong> {visibleColumns.length} visible, {hiddenCount} hidden
      <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {allColumns.map((col) => (
          <label key={col.colId} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={col.visible !== false}
              onChange={(e) => setColumnVisible(col.colId, e.target.checked)}
            />
            {col.headerName || col.colId}
          </label>
        ))}
      </div>
    </div>
  );
}

function HookUseGridColumnExample() {
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'department', headerName: 'Department', width: 140 },
    { field: 'role', headerName: 'Role', width: 160 },
    { field: 'salary', headerName: 'Salary', width: 130 },
    { field: 'city', headerName: 'City', width: 130 },
    { field: 'country', headerName: 'Country', width: 120 },
    { field: 'email', headerName: 'Email', width: 250 },
  ], []);

  return (
    <ExampleWrapper
      title="useGridColumn"
      description="Toggle column visibility with checkboxes. The useGridColumn hook provides access to column state and manipulation methods."
    >
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_50}
        height={350}
      >
        <HookUseGridColumnPanel />
      </GridStorm>
    </ExampleWrapper>
  );
}

// ─────────────────────────────────────────────────────────────
// PERFORMANCE
// ─────────────────────────────────────────────────────────────

function VirtualScrollingExample() {
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 80 },
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'department', headerName: 'Department', width: 140 },
    { field: 'role', headerName: 'Role', width: 160 },
    { field: 'salary', headerName: 'Salary', width: 130 },
    { field: 'city', headerName: 'City', width: 130 },
  ], []);

  return (
    <ExampleWrapper
      title="Virtual Scrolling"
      description="10,000 rows rendered with virtual scrolling. Only visible rows exist in the DOM. Scroll quickly to see the grid maintain smooth 60fps performance."
    >
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_1K.concat(EMPLOYEES_1K).concat(EMPLOYEES_1K).concat(EMPLOYEES_1K).concat(EMPLOYEES_1K).concat(EMPLOYEES_1K).concat(EMPLOYEES_1K).concat(EMPLOYEES_1K).concat(EMPLOYEES_1K).concat(EMPLOYEES_1K)}
        height={500}
      />
    </ExampleWrapper>
  );
}

function LargeDatasetExample() {
  const [loaded, setLoaded] = useState(false);

  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 80 },
    { field: 'name', headerName: 'Name', width: 180, sortable: true },
    { field: 'department', headerName: 'Department', width: 140, sortable: true },
    { field: 'role', headerName: 'Role', width: 160 },
    { field: 'salary', headerName: 'Salary', width: 130, sortable: true },
    { field: 'city', headerName: 'City', width: 130 },
    { field: 'country', headerName: 'Country', width: 120 },
    { field: 'email', headerName: 'Email', width: 250 },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    SortingPlugin(),
  ], []);

  return (
    <ExampleWrapper
      title="Large Dataset (100K Rows)"
      description="Load and render 100,000 rows with full sorting support. Virtual scrolling ensures the DOM stays lightweight."
    >
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => setLoaded(true)} disabled={loaded}>
          {loaded ? 'Loaded 100K Rows' : 'Load 100,000 Rows'}
        </button>
      </div>
      {loaded && (
        <GridStorm<Employee>
          columns={columns}
          rowData={EMPLOYEES_100K}
          plugins={plugins}
          height={500}
        />
      )}
    </ExampleWrapper>
  );
}

// ─────────────────────────────────────────────────────────────
// VANILLA JS EXAMPLE
// ─────────────────────────────────────────────────────────────

function VanillaJsExample() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || engineRef.current) return;

    const engine = createGrid({
      columns: [
        { field: 'name', headerName: 'Name', width: 180, sortable: true },
        { field: 'department', headerName: 'Department', width: 140, sortable: true },
        { field: 'role', headerName: 'Role', width: 160 },
        { field: 'salary', headerName: 'Salary', width: 130 },
        { field: 'city', headerName: 'City', width: 130 },
      ],
      rowData: EMPLOYEES_50,
      plugins: [SortingPlugin()],
    });

    const renderer = new DomRenderer({
      container: containerRef.current,
      engine,
    });
    renderer.mount();

    engineRef.current = { engine, renderer };

    return () => {
      renderer.destroy();
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  return (
    <ExampleWrapper
      title="Vanilla JS (No Framework)"
      description="GridStorm works without any framework. Use createGrid() from @gridstorm/core and DomRenderer from @gridstorm/dom-renderer directly. This example creates a grid imperatively."
    >
      <pre style={{
        padding: 16,
        background: '#f8f9fa',
        borderRadius: 8,
        fontSize: 12,
        marginBottom: 16,
        overflow: 'auto',
        border: '1px solid #e5e7eb',
      }}>
{`import { createGrid } from '@gridstorm/core';
import { DomRenderer } from '@gridstorm/dom-renderer';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import '@gridstorm/theme-default';

const engine = createGrid({
  columns: [
    { field: 'name', headerName: 'Name', width: 180, sortable: true },
    { field: 'department', headerName: 'Department', width: 140 },
  ],
  rowData: myData,
  plugins: [SortingPlugin()],
});

const renderer = new DomRenderer({
  container: document.getElementById('grid')!,
  engine,
});
renderer.mount();`}
      </pre>
      <div ref={containerRef} style={{ height: 400, width: '100%' }} />
    </ExampleWrapper>
  );
}

// ─────────────────────────────────────────────────────────────
// ENTERPRISE EXAMPLES
// ─────────────────────────────────────────────────────────────

interface TreeEmployee {
  name: string;
  role: string;
  salary: number;
  children?: TreeEmployee[];
}

function TreeDataExample() {
  const columns: ColumnDef<TreeEmployee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 260 },
    { field: 'role', headerName: 'Role', width: 180 },
    { field: 'salary', headerName: 'Salary', width: 130 },
  ], []);

  const treeData: TreeEmployee[] = useMemo(() => [
    { name: 'CEO Jane', role: 'CEO', salary: 250000, children: [
      { name: 'VP Engineering', role: 'VP', salary: 180000, children: [
        { name: 'Engineering Manager', role: 'Manager', salary: 145000, children: [
          { name: 'Alice', role: 'Senior Dev', salary: 120000, children: [
            { name: 'Dev Intern A', role: 'Intern', salary: 45000, children: [
              { name: 'Trainee X', role: 'Trainee', salary: 35000, children: [
                { name: 'Shadow Y', role: 'Shadow', salary: 30000 },
              ]},
            ]},
          ]},
          { name: 'Bob', role: 'Senior Dev', salary: 115000 },
          { name: 'Charlie', role: 'Dev', salary: 95000 },
        ]},
      ]},
      { name: 'VP Sales', role: 'VP', salary: 170000, children: [
        { name: 'Sales Manager', role: 'Manager', salary: 135000, children: [
          { name: 'Diana', role: 'Account Exec', salary: 95000 },
          { name: 'Eve', role: 'Account Exec', salary: 92000 },
        ]},
      ]},
      { name: 'VP Marketing', role: 'VP', salary: 160000, children: [
        { name: 'Frank', role: 'Marketing Lead', salary: 110000 },
        { name: 'Grace', role: 'Designer', salary: 100000 },
      ]},
    ]},
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    TreeDataPlugin({ childrenField: 'children', defaultExpanded: true }),
    SortingPlugin(),
  ], []);

  return (
    <ExampleWrapper
      title="Tree Data"
      description="Hierarchical org chart data with expandable parent-child rows. Click the chevron to expand/collapse tree nodes."
    >
      <GridStorm<TreeEmployee>
        columns={columns}
        rowData={treeData}
        plugins={plugins}
        height={400}
      />
    </ExampleWrapper>
  );
}

function SparklineExample() {
  const data = useMemo(() => EMPLOYEES_20.map(e => ({
    ...e,
    revenue: Array.from({ length: 12 }, () => Math.round(Math.random() * 10000)),
  })), []);

  const columns = useMemo(() => [
    { field: 'name' as const, headerName: 'Name', width: 180 },
    { field: 'department' as const, headerName: 'Dept', width: 130 },
    {
      colId: 'trend',
      headerName: 'Revenue Trend',
      width: 200,
      cellRenderer: 'sparkline' as const,
      cellRendererParams: { type: 'line' },
      valueGetter: ({ data: d }: { data: any }) => d?.revenue,
    },
    { field: 'salary' as const, headerName: 'Salary', width: 120 },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    SparklinePlugin(),
    SortingPlugin(),
  ], []);

  return (
    <ExampleWrapper
      title="Sparklines"
      description="Inline sparkline charts inside grid cells. Each row displays a 12-month revenue trend as a line sparkline."
    >
      <GridStorm columns={columns as any} rowData={data} plugins={plugins} height={400} />
    </ExampleWrapper>
  );
}

function ChartsExample() {
  const data = useMemo(() => EMPLOYEES_20.map(e => ({
    ...e,
    metrics: [e.salary / 1000, e.age, e.rating * 20],
  })), []);

  const columns = useMemo(() => [
    { field: 'name' as const, headerName: 'Name', width: 180 },
    { field: 'department' as const, headerName: 'Dept', width: 130 },
    {
      colId: 'chart',
      headerName: 'Metrics Chart',
      width: 200,
      cellRenderer: 'chart' as const,
      valueGetter: ({ data: d }: { data: any }) => d?.metrics,
    },
    { field: 'salary' as const, headerName: 'Salary', width: 120 },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    ChartsPlugin(),
    SortingPlugin(),
  ], []);

  return (
    <ExampleWrapper
      title="Charts"
      description="Inline chart renderers inside grid cells. Each row shows a mini bar chart of salary, age, and rating metrics."
    >
      <GridStorm columns={columns as any} rowData={data} plugins={plugins} height={400} />
    </ExampleWrapper>
  );
}

function ConditionalFormattingExample() {
  // Use 'condFormat' cell renderer on the columns that have formatting rules.
  // The ConditionalFormattingPlugin registers a 'condFormat' renderer that reads
  // computed styles from the plugin state and applies them as inline styles.
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'department', headerName: 'Department', width: 140 },
    { field: 'salary', headerName: 'Salary', width: 140, cellRenderer: 'condFormat' as any },
    { field: 'rating', headerName: 'Rating', width: 120 },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    ConditionalFormattingPlugin({
      rules: [
        {
          id: 'high-salary',
          columns: ['salary'],
          condition: { type: 'greaterThan', value: 100000 },
          style: { backgroundColor: '#dcfce7', color: '#166534' },
        },
        {
          id: 'low-salary',
          columns: ['salary'],
          condition: { type: 'lessThan', value: 60000 },
          style: { backgroundColor: '#fee2e2', color: '#991b1b' },
        },
      ],
    }),
    SortingPlugin(),
  ], []);

  return (
    <ExampleWrapper
      title="Conditional Formatting"
      description="Cells are dynamically styled based on value rules. Salary > $100K shows green, salary < $60K shows red."
    >
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_50}
        plugins={plugins}
        height={400}
      />
    </ExampleWrapper>
  );
}

function StreamingExample() {
  const [data, setData] = useState(() =>
    EMPLOYEES_20.map(e => ({ ...e, price: Math.round(Math.random() * 500 * 100) / 100 }))
  );

  const columns = useMemo(() => [
    { field: 'name' as const, headerName: 'Name', width: 180 },
    { field: 'department' as const, headerName: 'Dept', width: 130 },
    { field: 'price' as const, headerName: 'Price', width: 120 },
    { field: 'salary' as const, headerName: 'Salary', width: 120 },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    StreamingPlugin({ batchInterval: 500 }),
    SortingPlugin(),
  ], []);

  useEffect(() => {
    const interval = setInterval(() => {
      setData(prev => prev.map(row => ({
        ...row,
        price: Math.round((row.price + (Math.random() - 0.5) * 10) * 100) / 100,
      })));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ExampleWrapper
      title="Streaming Data"
      description="Live-updating grid data. Prices change every second simulating a real-time data feed with batched updates."
    >
      <GridStorm columns={columns} rowData={data} plugins={plugins} height={400} />
    </ExampleWrapper>
  );
}

// ─────────────────────────────────────────────────────────────
// NEXT-GEN EXAMPLES
// ─────────────────────────────────────────────────────────────

function StatusBarExample() {
  const data = EMPLOYEES_50;
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'department', headerName: 'Department', width: 140 },
    { field: 'salary', headerName: 'Salary', width: 140 },
    { field: 'age', headerName: 'Age', width: 100 },
    { field: 'rating', headerName: 'Rating', width: 120 },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    StatusBarPlugin({ defaultAggregations: ['sum', 'avg', 'count'], showForAllRows: true }),
    SelectionPlugin({ mode: 'multiple' }),
    SortingPlugin(),
  ], []);

  // Compute aggregations directly from data for display
  const aggs = useMemo(() => {
    const fields = ['salary', 'age', 'rating'] as const;
    const result: Record<string, { sum: number; avg: number; count: number }> = {};
    for (const f of fields) {
      const vals = data.map(d => (d as any)[f]).filter((v: any) => typeof v === 'number');
      const sum = vals.reduce((a: number, b: number) => a + b, 0);
      result[f] = { sum, avg: vals.length ? sum / vals.length : 0, count: vals.length };
    }
    return result;
  }, [data]);

  return (
    <ExampleWrapper
      title="Status Bar"
      description="Aggregation summary footer showing sum, average, and count. The StatusBarPlugin calculates these automatically for all rows or selected rows."
    >
      <GridStorm<Employee>
        columns={columns}
        rowData={data}
        plugins={plugins}
        rowSelection="multiple"
        height={350}
      />
      <div style={{ display: 'flex', gap: 16, padding: '8px 12px', background: '#f0f4f8', borderRadius: 6, marginTop: 4, fontSize: 13, flexWrap: 'wrap', border: '1px solid #dde3ea' }}>
        {Object.entries(aggs).map(([f, a]) => (
          <div key={f} style={{ display: 'flex', gap: 8 }}>
            <strong style={{ textTransform: 'capitalize' }}>{f}:</strong>
            <span>Sum: {a.sum.toLocaleString()}</span>
            <span>Avg: {a.avg.toFixed(1)}</span>
            <span>Count: {a.count}</span>
          </div>
        ))}
      </div>
    </ExampleWrapper>
  );
}

function StatePersistenceExample() {
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180, sortable: true },
    { field: 'department', headerName: 'Department', width: 140, filterable: true },
    { field: 'role', headerName: 'Role', width: 160, sortable: true },
    { field: 'salary', headerName: 'Salary', width: 130, sortable: true },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    StatePersistencePlugin({ storageKey: 'cookbook-state', autoSave: true, debounceMs: 300 }),
    SortingPlugin(),
    FilteringPlugin(),
  ], []);

  const [status, setStatus] = useState(() => {
    const saved = localStorage.getItem('cookbook-state');
    return saved ? 'Restored from localStorage' : 'No saved state';
  });

  const handleClear = useCallback(() => {
    localStorage.removeItem('cookbook-state');
    setStatus('Cleared! Sort or filter, then reload.');
  }, []);

  return (
    <ExampleWrapper
      title="State Persistence"
      description="Sort or filter the grid, then reload the page — your state is automatically restored from localStorage."
    >
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
        <button onClick={() => window.location.reload()}>Reload Page</button>
        <button onClick={handleClear}>Clear Saved State</button>
        <span style={{ fontSize: 13, color: '#666' }}>{status}</span>
      </div>
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_50}
        plugins={plugins}
        floatingFilter
        height={380}
      />
    </ExampleWrapper>
  );
}

function ColumnAutoSizeExample() {
  const apiRef = useRef<GridApi | null>(null);

  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 100 },
    { field: 'email', headerName: 'Email', width: 100 },
    { field: 'department', headerName: 'Department', width: 100 },
    { field: 'role', headerName: 'Role', width: 100 },
    { field: 'city', headerName: 'City', width: 100 },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    ColumnAutoSizePlugin(),
    SortingPlugin(),
  ], []);

  return (
    <ExampleWrapper
      title="Column AutoSize"
      description="Columns start narrow. Click Auto-Size All to fit columns to their content width using character-width estimation."
    >
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => apiRef.current?.dispatchCommand?.('autoSize:all', {})}>
          Auto-Size All
        </button>
      </div>
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_20}
        plugins={plugins}
        height={400}
        onGridReady={(api) => { apiRef.current = api; }}
      />
    </ExampleWrapper>
  );
}

function RowPinningExample() {
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'department', headerName: 'Department', width: 140 },
    { field: 'role', headerName: 'Role', width: 160 },
    { field: 'salary', headerName: 'Salary', width: 130 },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    RowPinningPlugin(),
    SortingPlugin(),
    SelectionPlugin({ mode: 'multiple' }),
  ], []);

  const apiRef = useRef<GridApi | null>(null);
  const [pinnedTop, setPinnedTop] = useState<any[]>([]);
  const [pinnedBottom, setPinnedBottom] = useState<any[]>([]);

  const refreshPinned = useCallback(() => {
    const state = apiRef.current?.getState?.();
    const rp = (state?.pluginState as any)?.rowPinning;
    setPinnedTop(rp?.pinnedTopRows?.map((n: any) => n.data) || []);
    setPinnedBottom(rp?.pinnedBottomRows?.map((n: any) => n.data) || []);
  }, []);

  const pinnedRowStyle = { display: 'flex', padding: '6px 0', borderBottom: '1px solid #e2e8f0', fontSize: 14 };
  const pinnedCellStyle = { flex: 1, padding: '2px 8px' };

  const renderPinnedRows = (rows: any[], label: string, bg: string) => {
    if (!rows.length) return null;
    return (
      <div style={{ background: bg, borderRadius: 4, padding: '4px 8px', marginBottom: label === 'Top' ? 4 : 0, marginTop: label === 'Bottom' ? 4 : 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#4a5568', marginBottom: 2 }}>📌 Pinned {label} ({rows.length})</div>
        {rows.map((row, i) => (
          <div key={i} style={pinnedRowStyle}>
            <span style={pinnedCellStyle}>{row?.name}</span>
            <span style={pinnedCellStyle}>{row?.department}</span>
            <span style={pinnedCellStyle}>{row?.role}</span>
            <span style={pinnedCellStyle}>{row?.salary?.toLocaleString()}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <ExampleWrapper
      title="Row Pinning"
      description="Select rows with checkboxes, then click Pin Top/Bottom. Pinned rows appear above or below the grid."
    >
      <div style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
        <button onClick={() => {
          const state = apiRef.current?.getState?.();
          const selected = state?.selection?.selectedRowIds;
          if (selected?.size) {
            const rowData = Array.from(selected).map(id => state?.rowNodes?.get(id)?.data).filter(Boolean);
            apiRef.current?.dispatchCommand?.('rowPinning:setTopData', { data: rowData });
            refreshPinned();
          }
        }}>Pin Selected Top</button>
        <button onClick={() => {
          const state = apiRef.current?.getState?.();
          const selected = state?.selection?.selectedRowIds;
          if (selected?.size) {
            const rowData = Array.from(selected).map(id => state?.rowNodes?.get(id)?.data).filter(Boolean);
            apiRef.current?.dispatchCommand?.('rowPinning:setBottomData', { data: rowData });
            refreshPinned();
          }
        }}>Pin Selected Bottom</button>
        <button onClick={() => {
          apiRef.current?.dispatchCommand?.('rowPinning:unpinAll', {});
          refreshPinned();
        }}>Unpin All</button>
      </div>
      {renderPinnedRows(pinnedTop, 'Top', '#ebf8ff')}
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_50}
        plugins={plugins}
        rowSelection="multiple"
        checkboxSelection
        height={320}
        onGridReady={(api) => { apiRef.current = api; }}
      />
      {renderPinnedRows(pinnedBottom, 'Bottom', '#fefcbf')}
    </ExampleWrapper>
  );
}

function AIExample() {
  const [query, setQuery] = useState('');
  const apiRef = useRef<GridApi | null>(null);

  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180, sortable: true, filterable: true },
    { field: 'department', headerName: 'Department', width: 140, sortable: true, filterable: true },
    { field: 'salary', headerName: 'Salary', width: 130, sortable: true },
    { field: 'city', headerName: 'City', width: 130, filterable: true },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    AIPlugin(),
    SortingPlugin(),
    FilteringPlugin(),
    GroupingPlugin(),
  ], []);

  return (
    <ExampleWrapper
      title="AI Integration"
      description="Type a natural language query like 'sort by salary descending' or 'show Engineering department' and press Enter."
    >
      <div style={{ marginBottom: 12, display: 'flex', gap: 8 }}>
        <input
          type="text"
          placeholder="Try: sort by salary descending..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim()) {
              apiRef.current?.dispatchCommand?.('ai:query', { query });
            }
          }}
          style={{ flex: 1, padding: '6px 10px', border: '1px solid #ccc', borderRadius: 4 }}
        />
      </div>
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_50}
        plugins={plugins}
        floatingFilter
        height={400}
        onGridReady={(api) => { apiRef.current = api; }}
      />
    </ExampleWrapper>
  );
}

function FormulaExample() {
  const data = useMemo(() => [
    { id: '1', a: 10, b: 20, c: 0 },
    { id: '2', a: 30, b: 40, c: 0 },
    { id: '3', a: 50, b: 60, c: 0 },
    { id: '4', a: 70, b: 80, c: 0 },
    { id: '5', a: 15, b: 25, c: 0 },
  ], []);

  const columns = useMemo(() => [
    { field: 'id' as const, headerName: 'ID', width: 70 },
    { field: 'a' as const, headerName: 'A', width: 100, editable: true },
    { field: 'b' as const, headerName: 'B', width: 100, editable: true },
    {
      field: 'c' as const,
      headerName: 'C (=A+B)',
      width: 140,
      valueGetter: ({ data: d }: { data: any }) => d ? (Number(d.a) || 0) + (Number(d.b) || 0) : 0,
    },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    FormulaPlugin(),
    SortingPlugin(),
    EditingPlugin(),
  ], []);

  return (
    <ExampleWrapper
      title="Formula Engine"
      description="Spreadsheet-style formula support. Column C computes A+B automatically. Edit columns A and B to see results update."
    >
      <GridStorm
        columns={columns}
        rowData={data}
        plugins={plugins}
        enableCellEditing
        getRowId={(row: any) => String(row.id)}
        height={300}
      />
    </ExampleWrapper>
  );
}

function TimeTravelExample() {
  const apiRef = useRef<GridApi | null>(null);
  const [status, setStatus] = useState('Snapshots: 1 | Position: 1/1');

  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180, editable: true },
    { field: 'department', headerName: 'Department', width: 140, editable: true },
    { field: 'salary', headerName: 'Salary', width: 130, editable: true },
    { field: 'role', headerName: 'Role', width: 160 },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    TimeTravelPlugin({ maxSnapshots: 50 }),
    SortingPlugin(),
    EditingPlugin(),
  ], []);

  const refreshStatus = useCallback(() => {
    const state = apiRef.current?.getState?.();
    const tt = (state?.pluginState as any)?.timeTravel;
    if (tt) {
      const branch = tt.branches?.get?.(tt.currentBranchId);
      const total = branch?.snapshots?.length ?? tt.totalSnapshots ?? 0;
      const pos = (tt.currentSnapshotIndex ?? 0) + 1;
      setStatus(`Snapshots: ${total} | Position: ${pos}/${total}`);
    }
  }, []);

  return (
    <ExampleWrapper
      title="Time Travel"
      description="Double-click a cell to edit, then use Undo/Redo. Click Snapshot to save a named checkpoint."
    >
      <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => {
          apiRef.current?.dispatchCommand?.('timeTravel:undo', {});
          setTimeout(refreshStatus, 50);
        }}>Undo</button>
        <button onClick={() => {
          apiRef.current?.dispatchCommand?.('timeTravel:redo', {});
          setTimeout(refreshStatus, 50);
        }}>Redo</button>
        <button onClick={() => {
          apiRef.current?.dispatchCommand?.('timeTravel:snapshot', { name: 'Checkpoint ' + new Date().toLocaleTimeString() });
          setTimeout(refreshStatus, 50);
        }}>Snapshot</button>
        <span style={{ fontSize: 13, color: '#555', marginLeft: 8 }}>{status}</span>
      </div>
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_20}
        plugins={plugins}
        enableCellEditing
        height={380}
        onGridReady={(api) => {
          apiRef.current = api;
          // Listen to cell edits to auto-update status
          api.addEventListener('cell:valueChanged', () => setTimeout(refreshStatus, 100));
        }}
      />
    </ExampleWrapper>
  );
}

function CellRangeExample() {
  const apiRef = useRef<GridApi | null>(null);
  const [rangeInfo, setRangeInfo] = useState('No range selected');

  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'department', headerName: 'Department', width: 140 },
    { field: 'salary', headerName: 'Salary', width: 130 },
    { field: 'rating', headerName: 'Rating', width: 120 },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    CellRangePlugin(),
    SortingPlugin(),
  ], []);

  const refreshRange = useCallback(() => {
    const state = apiRef.current?.getState?.();
    const cr = (state?.pluginState as any)?.cellRange;
    const ranges = cr?.ranges;
    if (ranges && ranges.length > 0) {
      const total = ranges.reduce((sum: number, r: any) => {
        const rows = Math.abs(r.bounds.endRow - r.bounds.startRow) + 1;
        const cols = Math.abs(r.bounds.endCol - r.bounds.startCol) + 1;
        return sum + rows * cols;
      }, 0);
      setRangeInfo(`${ranges.length} range(s) | ${total} cells selected`);
    } else {
      setRangeInfo('No range selected');
    }
  }, []);

  return (
    <ExampleWrapper
      title="Cell Range"
      description="Use the buttons to select ranges programmatically. Select All selects every cell, Clear removes the selection."
    >
      <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => {
          apiRef.current?.dispatchCommand?.('range:selectAll', {});
          setTimeout(refreshRange, 50);
        }}>Select All</button>
        <button onClick={() => {
          apiRef.current?.dispatchCommand?.('range:select', {
            start: { rowIndex: 0, colIndex: 0 },
            end: { rowIndex: 4, colIndex: 2 },
          });
          setTimeout(refreshRange, 50);
        }}>Select Top 5×3</button>
        <button onClick={() => {
          apiRef.current?.dispatchCommand?.('range:clear', {});
          setTimeout(refreshRange, 50);
        }}>Clear Selection</button>
        <span style={{ fontSize: 13, color: '#555', marginLeft: 8 }}>{rangeInfo}</span>
      </div>
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_20}
        plugins={plugins}
        height={380}
        onGridReady={(api) => { apiRef.current = api; }}
      />
    </ExampleWrapper>
  );
}

function ValidationExample() {
  const columns: ColumnDef<Employee>[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 180, editable: true },
    { field: 'email', headerName: 'Email', width: 220, editable: true },
    { field: 'salary', headerName: 'Salary', width: 130, editable: true },
    { field: 'department', headerName: 'Department', width: 140 },
  ], []);

  const plugins = useMemo<GridPlugin[]>(() => [
    ValidationPlugin({
      rules: [
        { id: 'email-required', colId: 'email', type: 'required', params: { type: 'required' }, message: 'Email is required' },
        { id: 'email-format', colId: 'email', type: 'email', params: { type: 'email' }, message: 'Must be a valid email' },
        { id: 'salary-range', colId: 'salary', type: 'range', params: { type: 'range', min: 0, max: 500000 }, message: 'Salary must be 0-500,000' },
      ],
      validateOnEdit: true,
    }),
    EditingPlugin(),
    SortingPlugin(),
  ], []);

  return (
    <ExampleWrapper
      title="Data Validation"
      description="Edit cells to trigger validation. Email must be valid format, salary must be between 0 and 500,000. Invalid cells are highlighted."
    >
      <GridStorm<Employee>
        columns={columns}
        rowData={EMPLOYEES_20}
        plugins={plugins}
        enableCellEditing
        height={400}
      />
    </ExampleWrapper>
  );
}

// ─────────────────────────────────────────────────────────────
// EXAMPLE REGISTRY
// ─────────────────────────────────────────────────────────────

const EXAMPLES: Record<string, () => JSX.Element> = {
  // Getting Started
  'basic-grid': BasicGridExample,
  'column-definitions': ColumnDefinitionsExample,
  'row-data': RowDataExample,
  // Core Features
  'sorting': SortingExample,
  'filtering': FilteringExample,
  'selection': SelectionExample,
  'editing': EditingExample,
  'pagination': PaginationExample,
  // Column Operations
  'pinning': PinningExample,
  'resize': ResizeExample,
  'reorder': ReorderExample,
  // Advanced
  'grouping': GroupingExample,
  'aggregation': AggregationExample,
  'pivoting': PivotingExample,
  'master-detail': MasterDetailExample,
  'ssrm': SSRMExample,
  // Interaction
  'context-menu': ContextMenuExample,
  'clipboard': ClipboardExample,
  'row-reorder': RowReorderExample,
  'excel-export': ExcelExportExample,
  // Customization
  'value-getters': ValueGettersExample,
  'value-formatters': ValueFormattersExample,
  'cell-renderers': CellRenderersExample,
  'theming': ThemingExample,
  'dark-mode': DarkModeExample,
  // React Hooks
  'hook-use-grid-state': HookUseGridStateExample,
  'hook-use-grid-sort': HookUseGridSortExample,
  'hook-use-grid-filter': HookUseGridFilterExample,
  'hook-use-grid-pagination': HookUseGridPaginationExample,
  'hook-use-grid-selection': HookUseGridSelectionExample,
  'hook-use-grid-column': HookUseGridColumnExample,
  // Performance
  'virtual-scrolling': VirtualScrollingExample,
  'large-dataset': LargeDatasetExample,
  // Vanilla JS
  'vanilla-js': VanillaJsExample,
  // Enterprise
  'tree-data': TreeDataExample,
  'sparklines': SparklineExample,
  'charts': ChartsExample,
  'conditional-formatting': ConditionalFormattingExample,
  'streaming': StreamingExample,
  // Next-Gen
  'status-bar': StatusBarExample,
  'state-persistence': StatePersistenceExample,
  'column-autosize': ColumnAutoSizeExample,
  'row-pinning': RowPinningExample,
  'ai-integration': AIExample,
  'formula-engine': FormulaExample,
  'time-travel': TimeTravelExample,
  'cell-range': CellRangeExample,
  'data-validation': ValidationExample,
};

// ─────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────

function useHashRoute(defaultRoute: string): [string, (route: string) => void] {
  const [hash, setHash] = useState(() => {
    const h = window.location.hash.replace('#', '');
    return h || defaultRoute;
  });

  useEffect(() => {
    const onHashChange = () => {
      const h = window.location.hash.replace('#', '');
      setHash(h || defaultRoute);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [defaultRoute]);

  const navigate = useCallback((route: string) => {
    window.location.hash = route;
  }, []);

  return [hash, navigate];
}

export function App() {
  const [activeExample, navigate] = useHashRoute('basic-grid');
  const ExampleComponent = EXAMPLES[activeExample];

  const [exampleLoading, setExampleLoading] = useState(true);
  const [exampleError, setExampleError] = useState<string | null>(null);

  useEffect(() => {
    setExampleLoading(true);
    setExampleError(null);
    try {
      const id = setTimeout(() => setExampleLoading(false), 300);
      return () => clearTimeout(id);
    } catch (e) {
      setExampleError(e instanceof Error ? e.message : 'Failed to load example.');
      setExampleLoading(false);
    }
  }, [activeExample]);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <nav
        style={{
          width: 250,
          minWidth: 250,
          background: '#f8f9fa',
          borderRight: '1px solid #e5e7eb',
          overflowY: 'auto',
          padding: '16px 0',
        }}
      >
        <h1
          style={{
            fontSize: 16,
            fontWeight: 700,
            padding: '0 16px 12px',
            borderBottom: '1px solid #e5e7eb',
            margin: 0,
          }}
        >
          GridStorm Cookbook
        </h1>
        {CATEGORIES.map((cat) => (
          <div key={cat.label} style={{ marginTop: 12 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#6b7280',
                padding: '0 16px 4px',
              }}
            >
              {cat.label}
            </div>
            {cat.items.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(item.id)}
                style={{
                  padding: '6px 16px',
                  fontSize: 13,
                  cursor: 'pointer',
                  background: activeExample === item.id ? '#e0e7ff' : 'transparent',
                  color: activeExample === item.id ? '#3730a3' : '#374151',
                  fontWeight: activeExample === item.id ? 600 : 400,
                  borderLeft: activeExample === item.id ? '3px solid #4f46e5' : '3px solid transparent',
                }}
                onMouseEnter={(e) => {
                  if (activeExample !== item.id) {
                    (e.currentTarget as HTMLElement).style.background = '#f3f4f6';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeExample !== item.id) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }
                }}
              >
                {item.title}
              </div>
            ))}
          </div>
        ))}
      </nav>

      {/* Content */}
      <main style={{ flex: 1, overflow: 'auto', padding: exampleLoading || exampleError ? 16 : 0 }}>
        {exampleLoading ? (
          <GridSkeleton columns={5} rows={12} height="500px" />
        ) : exampleError ? (
          <GridError
            message={exampleError}
            onRetry={() => { setExampleError(null); setExampleLoading(true); }}
            height="500px"
          />
        ) : ExampleComponent ? (
          <ExampleComponent />
        ) : (
          <div style={{ padding: 40, color: '#999' }}>
            Example not found: {activeExample}
          </div>
        )}
      </main>
    </div>
  );
}
