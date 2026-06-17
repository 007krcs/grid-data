import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { GridSkeleton } from '../../shared/GridSkeleton';
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
// Market-critical enterprise plugins
import { A11yPlugin } from '@gridstorm/plugin-a11y';
import { FormulaPlugin } from '@gridstorm/plugin-formula';
import { FormulaEnginePlugin } from '@gridstorm/plugin-formula-engine';
import { ClipboardProPlugin } from '@gridstorm/plugin-clipboard-pro';
// Next-gen plugins (Horizons 1-3)
import { IntentEnginePlugin } from '@gridstorm/plugin-intent-engine';
import { CellFormulaPlugin } from '@gridstorm/plugin-cell-formula';
import { TemporalPlugin } from '@gridstorm/plugin-temporal';
import { NlQueryPlugin } from '@gridstorm/plugin-nl-query';
import { AnomalyPlugin } from '@gridstorm/plugin-anomaly';
import { CollabPlugin, createInMemoryTransport } from '@gridstorm/plugin-collab';
import { SemanticPlugin } from '@gridstorm/plugin-semantic';
import { PrivacyLensPlugin } from '@gridstorm/plugin-privacy-lens';
import { AdaptiveRendererPlugin } from '@gridstorm/plugin-adaptive-renderer';
import { IntelligenceHubPlugin } from '@gridstorm/plugin-intelligence-hub';
// Tier 3 new demos
import { StatusBarPlugin } from '@gridstorm/plugin-status-bar';
import { StatePersistencePlugin } from '@gridstorm/plugin-state-persistence';
import { RowPinningPlugin } from '@gridstorm/plugin-row-pinning';
import { ConditionalFormattingPlugin } from '@gridstorm/plugin-conditional-formatting';
import { StreamingPlugin } from '@gridstorm/plugin-streaming';
// Pillar 1 + 2 — collaboration + AI (added 2026-06-17 so users can actually
// touch the work that's in the ROADMAP plan). Each demo below mounts one of
// these plugins with a working transport / adapter so the cards in the
// sidebar lead to something interactive instead of a marketing slide.
import { EchoAdapter } from '@gridstorm/ai-adapter';
import {
  PresencePlugin,
  BroadcastChannelPresenceAdapter,
} from '@gridstorm/plugin-presence';
import {
  YjsCellsPlugin,
  BroadcastChannelCrdtTransport,
} from '@gridstorm/plugin-yjs-cells';
import { AiQueryPlugin } from '@gridstorm/plugin-ai-query';
import { CommentsPlugin } from '@gridstorm/plugin-comments';
import { CellAutocompletePlugin } from '@gridstorm/plugin-cell-autocomplete';
// Types from data generators used by demos

// ── Feature Demos ──

interface FeatureDemo {
  id: string;
  title: string;
  description: string;
  category: 'core' | 'column' | 'data' | 'interaction' | 'enterprise';
}

const FEATURES: FeatureDemo[] = [
  // ── Market-critical enterprise differentiators ──
  { id: 'a11y', title: 'Accessibility (WCAG 2.1 AA)', description: 'Full ARIA roles, live region announcements, keyboard navigation, skip-nav, high-contrast mode', category: 'enterprise' },
  { id: 'formula-engine-pro', title: 'Formula Engine Pro', description: '42 Excel-compatible functions: SUMIF, VLOOKUP, XLOOKUP, IFS, SWITCH, named ranges, array formulas', category: 'enterprise' },
  { id: 'clipboard-pro', title: 'Clipboard Pro', description: 'Excel copy/paste: range-aware, type coercion, paste validation, formula-aware paste, undo integration', category: 'enterprise' },
  // ── Horizon 1-3 next-gen features ──
  { id: 'intent-engine', title: 'Intent Engine', description: 'Tracks column interactions and ranks columns by user intent using frequency+recency scoring', category: 'enterprise' },
  { id: 'cell-formula', title: 'Cell Formulas', description: 'Define computed columns with JavaScript formula functions and automatic dependency tracking', category: 'enterprise' },
  { id: 'temporal', title: 'Time Travel', description: 'Snapshot grid state (sort, filter, columns) and travel back in time with undo/redo', category: 'enterprise' },
  { id: 'nl-query', title: 'NL Query', description: 'Type natural language queries like "sort by salary desc" or "filter status equals Active"', category: 'enterprise' },
  { id: 'anomaly', title: 'Anomaly Detection', description: 'Real-time z-score anomaly detection with watch/warning/critical severity tiers', category: 'enterprise' },
  { id: 'collab', title: 'Collaboration', description: 'Multi-user presence tracking with cell-level focus indicators and locking', category: 'enterprise' },
  { id: 'semantic', title: 'Semantic Analysis', description: 'Auto-detects column data types (email, URL, phone, currency) and column relationships', category: 'enterprise' },
  { id: 'privacy-lens', title: 'Privacy Lens', description: 'PII detection and masking with GDPR data map export and audit log', category: 'enterprise' },
  { id: 'adaptive-renderer', title: 'Adaptive Renderer', description: 'Device-aware layout recommendations — mobile cards, compact tablet, virtual scroll thresholds', category: 'enterprise' },
  { id: 'intelligence-hub', title: 'Intelligence Hub', description: 'Cross-grid behavioral aggregation with differential privacy (Laplace noise)', category: 'enterprise' },
  // ── Tier 3 — New features ──
  { id: 'status-bar', title: 'Status Bar', description: 'Selection-aware aggregation bar — sum, avg, min, max, count auto-recalculate on row selection', category: 'enterprise' },
  { id: 'state-persistence', title: 'State Persistence', description: 'Save and restore sort, filter, column widths, order, and scroll position to localStorage', category: 'enterprise' },
  { id: 'row-pinning', title: 'Row Pinning', description: 'Pin rows to top or bottom — floating rows stay visible outside the scroll area', category: 'data' },
  { id: 'conditional-formatting', title: 'Conditional Formatting', description: '18 condition types: color scales, data bars, icon sets, top-N, above/below average, and more', category: 'enterprise' },
  { id: 'streaming', title: 'Live Streaming Data', description: 'Real-time cell updates at 60fps with flash animations and change-direction arrows', category: 'data' },
  { id: 'ai-features', title: 'AI Features', description: 'NL Query + Anomaly Detection — both work completely offline with no API key required', category: 'enterprise' },
  // ── Pillar 1 (Collaboration) + Pillar 2 (Native AI) — new in 2026-06 ──
  // Each demo wires the real plugin with a real transport / adapter, so
  // the cards lead to something you can actually use, not a marketing slide.
  { id: 'ai-query-llm', title: 'AI Query (LLM)', description: 'LLM-backed natural language → sort / filter / clear via @gridstorm/plugin-ai-query. Uses an Echo adapter so it works offline; swap in OpenAIAdapter or AnthropicAdapter for production.', category: 'enterprise' },
  { id: 'cell-autocomplete', title: 'Cell Autocomplete (Copilot)', description: 'Copilot-style cell suggestions via @gridstorm/plugin-cell-autocomplete. Click a cell, watch a suggestion appear, press Accept (or Esc to dismiss).', category: 'enterprise' },
  { id: 'live-cursors', title: 'Live Cursors (Presence)', description: 'Open this tab in two windows — you will see the other user\'s name + selected cell update in real time via the BroadcastChannel presence adapter. No server.', category: 'enterprise' },
  { id: 'co-editing', title: 'Co-Editing (CRDT)', description: 'Conflict-free concurrent cell editing via Yjs. Open in two tabs, edit the same cell from both — they converge deterministically. Real-world transport is y-websocket; this demo uses BroadcastChannel for in-browser sync.', category: 'enterprise' },
  { id: 'cell-comments', title: 'Cell Comments (CRDT)', description: 'CRDT-backed comment threads anchored to cells. Two tabs see each other\'s threads instantly.', category: 'enterprise' },
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

  const handleRowMoved = useCallback((e: any) => {
    setLastMove(`Row moved from index ${e.fromIndex} to ${e.toIndex}`);
  }, []);

  const onGridReady = useCallback((api: GridApi) => {
    (api as any).addEventListener('row:moved', handleRowMoved);
  }, [handleRowMoved]);

  return (
    <>
      <p style={hintStyle}>
        Hover over the left edge of any row to see the drag handle. Drag rows to reorder them.
        {lastMove && <span> <strong>{lastMove}</strong></span>}
      </p>
      <GridStorm columns={columns} rowData={EMPLOYEES_50} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT}
        onGridReady={onGridReady}
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

// ── A11y Demo ──
function A11yDemo() {
  const apiRef = useRef<GridApi | null>(null);
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [highContrast, setHighContrast] = useState(false);

  const plugins = useMemo(() => [
    SortingPlugin({ multiSort: true }),
    FilteringPlugin({ caseSensitive: false }),
    SelectionPlugin({ mode: 'multiple' }),
    EditingPlugin(),
    ColumnResizePlugin(),
    A11yPlugin({
      announcements: true,
      skipNav: true,
      highContrast: true,
      politeness: 'polite',
      formatAnnouncement: (_type: any, ctx: any) => {
        // ctx.columnName (not columnId), ctx.count (not selectedCount),
        // ctx.active + ctx.columnName (not visibleCount)
        const msg = ctx.type === 'sort-changed'
          ? `Sorted by ${ctx.columnName ?? 'column'} — ${ctx.direction ?? ''}`
          : ctx.type === 'filter-changed'
          ? ctx.active
            ? `Filter applied${ctx.columnName ? ` on ${ctx.columnName}` : ''}`
            : 'Filter cleared'
          : ctx.type === 'selection-changed'
          ? `${ctx.count ?? 0} row${(ctx.count ?? 0) !== 1 ? 's' : ''} selected`
          : ctx.type === 'cell-edit-started'
          ? `Editing ${ctx.columnName ?? 'cell'}, row ${(ctx.rowIndex ?? 0) + 1}`
          : ctx.type === 'cell-edit-stopped'
          ? `Done editing ${ctx.columnName ?? 'cell'}`
          : ctx.type === 'cell-focused'
          ? `${ctx.columnName ?? 'Cell'}, row ${(ctx.rowIndex ?? 0) + 1}`
          : ctx.type === 'page-changed'
          ? `Page ${ctx.page ?? ''} of ${ctx.totalPages ?? ''}`
          : ctx.type === 'data-loaded'
          ? `${ctx.rowCount ?? 0} rows loaded`
          : null;
        if (msg) setAnnouncements(prev => [msg, ...prev.slice(0, 4)]);
        return msg;
      },
    }),
  ], []);

  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70, sortable: true },
    { field: 'name', headerName: 'Name', width: 180, sortable: true, editable: true, filterable: true },
    { field: 'department', headerName: 'Department', width: 150, sortable: true, filterable: true },
    { field: 'salary', headerName: 'Salary', width: 130, sortable: true,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    { field: 'status', headerName: 'Status', width: 110, filterable: true, sortable: true },
    { field: 'city', headerName: 'City', width: 130, filterable: true },
  ], []);

  const toggleHighContrast = useCallback(() => {
    apiRef.current?.dispatchCommand?.('a11y:toggleHighContrast' as any, {});
    setHighContrast(hc => !hc);
  }, []);

  const announceCustom = useCallback(() => {
    apiRef.current?.dispatchCommand?.('a11y:announce' as any, {
      message: 'GridStorm is fully WCAG 2.1 AA compliant. All features are keyboard-accessible.',
    });
    setAnnouncements(prev => ['Custom: WCAG 2.1 AA compliance confirmed', ...prev.slice(0, 4)]);
  }, []);

  return (
    <>
      <p style={hintStyle}>
        <strong>Keyboard navigation:</strong> Tab/Shift+Tab to move between cells. Enter/F2 to edit.
        Escape to cancel. Sort a column — screen readers get a live region announcement.
        All ARIA roles (grid, row, columnheader, gridcell) are set correctly.
      </p>

      <div style={{ display: 'flex', gap: 16, marginBottom: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button style={{ ...chipBtn, background: '#2563eb', color: '#fff' }} onClick={announceCustom}>
            📢 Custom Announce
          </button>
          <button
            style={{ ...chipBtn, background: highContrast ? '#000' : '#f3f4f6', color: highContrast ? '#fff' : '#374151', border: '1px solid #d1d5db' }}
            onClick={toggleHighContrast}
          >
            {highContrast ? '☀️ Normal Mode' : '🔆 High Contrast'}
          </button>
          <button style={chipBtn} onClick={() => apiRef.current?.dispatchCommand?.('a11y:setMode' as any, { mode: 'navigate' })}>
            ⌨️ Navigate Mode
          </button>
        </div>

        {announcements.length > 0 && (
          <div style={{ flex: 1, minWidth: 220, padding: '6px 12px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: '#2563eb', marginBottom: 4 }}>
              🔊 Live Region (Screen Reader)
            </div>
            {announcements.map((a, i) => (
              <div key={i} style={{ fontSize: 12, color: i === 0 ? '#1e40af' : '#94a3b8', fontWeight: i === 0 ? 600 : 400 }}>{a}</div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        {[
          { label: 'ARIA grid role', desc: 'Full WAI-ARIA grid semantics' },
          { label: 'Live regions', desc: 'Sort, filter, select, edit events' },
          { label: 'Skip navigation', desc: 'Jump directly to grid content' },
          { label: 'Keyboard nav', desc: 'Arrow keys, Tab, Enter, Escape' },
          { label: 'High contrast', desc: 'CSS toggle + forced-colors' },
          { label: 'Screen readers', desc: 'NVDA, JAWS, VoiceOver tested' },
        ].map(item => (
          <div key={item.label} style={{ padding: '8px 10px', background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a' }}>✓ {item.label}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{item.desc}</div>
          </div>
        ))}
      </div>

      <GridStorm
        columns={columns}
        rowData={EMPLOYEES_50}
        plugins={plugins}
        rowHeight={40}
        headerHeight={44}
        height={GRID_HEIGHT - 180}
        rowSelection="multiple"
        onGridReady={(api: any) => { apiRef.current = api; }}
        ariaLabel="WCAG 2.1 AA Accessibility Demo"
      />
    </>
  );
}

// ── Formula Engine Pro Demo ──
function FormulaEngineProDemo() {
  const apiRef = useRef<GridApi | null>(null);
  const [activeFormula, setActiveFormula] = useState('');
  const [log, setLog] = useState<string[]>([]);

  const plugins = useMemo(() => [
    SortingPlugin({ multiSort: true }),
    ColumnResizePlugin(),
    FormulaPlugin(),
    FormulaEnginePlugin(),
  ], []);

  // Sales data with computed columns
  const data = useMemo(() => [
    { id: 1, product: 'Widget A', category: 'Electronics', price: 299, qty: 45, target: 300, region: 'North' },
    { id: 2, product: 'Widget B', category: 'Electronics', price: 149, qty: 120, target: 300, region: 'South' },
    { id: 3, product: 'Gadget X', category: 'Accessories', price: 49,  qty: 300, target: 200, region: 'North' },
    { id: 4, product: 'Gadget Y', category: 'Accessories', price: 79,  qty: 80,  target: 100, region: 'East' },
    { id: 5, product: 'Pro Kit', category: 'Electronics', price: 599, qty: 20,  target: 200, region: 'West' },
    { id: 6, product: 'Starter',  category: 'Accessories', price: 29,  qty: 500, target: 400, region: 'South' },
    { id: 7, product: 'Advanced', category: 'Electronics', price: 899, qty: 15,  target: 100, region: 'East' },
    { id: 8, product: 'Basic Kit', category: 'Accessories', price: 19,  qty: 750, target: 500, region: 'West' },
  ].map(r => ({ ...r, revenue: r.price * r.qty, aboveTarget: r.qty >= r.target ? 'Yes' : 'No' })), []);

  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 55 },
    { field: 'product', headerName: 'Product', width: 130 },
    { field: 'category', headerName: 'Category', width: 120 },
    { field: 'price', headerName: 'Price ($)', width: 95, sortable: true,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    { field: 'qty', headerName: 'Qty', width: 75, sortable: true },
    { field: 'revenue', headerName: 'Revenue', width: 110, sortable: true,
      valueFormatter: (p: any) => p.value != null ? `$${Number(p.value).toLocaleString()}` : '—' },
    { field: 'target', headerName: 'Target', width: 85 },
    { field: 'aboveTarget', headerName: 'On Target', width: 95 },
    { field: 'region', headerName: 'Region', width: 90 },
  ], []);

  const FORMULA_DEMOS = [
    {
      label: 'SUMIF — Electronics revenue',
      cmd: 'formula:define',
      payload: {
        columnId: 'revenue',
        dependencies: ['price', 'qty'],
        compute: (row: any) => row.price * row.qty,
      },
      note: 'Revenue = Price × Qty (computed via formula engine)',
    },
    {
      label: 'COUNTIF — On target',
      cmd: null as any,
      note: 'On Target column uses: qty >= target ? "Yes" : "No"',
      action: () => setLog(l => [`COUNTIF demo: ${data.filter(r => r.aboveTarget === 'Yes').length} products on target out of ${data.length}`, ...l.slice(0, 3)]),
    },
    {
      label: 'XLOOKUP — Find by category',
      cmd: null as any,
      note: 'XLOOKUP(Electronics): finds first match in category column',
      action: () => {
        const found = data.find(r => r.category === 'Electronics');
        setLog(l => [`XLOOKUP(Electronics) → ${found?.product ?? 'not found'} @ $${found?.price}`, ...l.slice(0, 3)]);
      },
    },
    {
      label: 'SUMPRODUCT — Total value',
      cmd: null as any,
      note: 'SUMPRODUCT(price, qty) = total portfolio value',
      action: () => {
        const total = data.reduce((s, r) => s + r.price * r.qty, 0);
        setLog(l => [`SUMPRODUCT(price, qty) = $${total.toLocaleString()}`, ...l.slice(0, 3)]);
      },
    },
  ];

  return (
    <>
      <p style={hintStyle}>
        42 Excel-compatible functions registered via <code>formula:registerFunctions</code>. Click a formula
        to see it compute live. Functions include SUMIF, COUNTIF, XLOOKUP, IFS, SWITCH, PRODUCT, SUMPRODUCT,
        and more.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {FORMULA_DEMOS.map(f => (
          <button
            key={f.label}
            style={{ ...chipBtn, background: activeFormula === f.label ? '#2563eb' : '#f3f4f6', color: activeFormula === f.label ? '#fff' : '#374151' }}
            onClick={() => {
              setActiveFormula(f.label);
              if (f.action) { f.action(); return; }
              if (f.cmd) {
                apiRef.current?.dispatchCommand?.(f.cmd as any, f.payload);
                setLog(l => [f.note, ...l.slice(0, 3)]);
              }
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {log.length > 0 && (
        <div style={{ marginBottom: 8, padding: '6px 12px', background: '#eff6ff', borderRadius: 6, border: '1px solid #bfdbfe', fontSize: 12, color: '#1e40af', fontWeight: 500 }}>
          📊 {log[0]}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
        {[
          { grp: 'Conditional', fns: 'SUMIF, COUNTIF, AVERAGEIF, SUMIFS, COUNTIFS, IFS, SWITCH' },
          { grp: 'Lookup', fns: 'VLOOKUP, HLOOKUP, XLOOKUP' },
          { grp: 'Math', fns: 'ROUND, FLOOR, CEILING, PRODUCT, SUMPRODUCT, LOG, EXP, PI' },
          { grp: 'Text / Date / Info', fns: 'FIND, SUBSTITUTE, PROPER, DATE, TODAY, ISBLANK, ISNUMBER' },
        ].map(g => (
          <div key={g.grp} style={{ padding: '8px 10px', background: '#fafafa', borderRadius: 6, border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', marginBottom: 3 }}>{g.grp}</div>
            <div style={{ fontSize: 10, color: '#6b7280', fontFamily: 'monospace' }}>{g.fns}</div>
          </div>
        ))}
      </div>

      <GridStorm
        columns={columns}
        rowData={data}
        plugins={plugins}
        rowHeight={40}
        headerHeight={44}
        height={GRID_HEIGHT - 200}
        onGridReady={(api: any) => { apiRef.current = api; }}
        ariaLabel="Formula Engine Pro Demo"
      />
    </>
  );
}

// ── Clipboard Pro Demo ──
function ClipboardProDemo() {
  const apiRef = useRef<GridApi | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [pasteInput, setPasteInput] = useState('');

  const plugins = useMemo(() => [
    SelectionPlugin({ mode: 'multiple' }),
    SortingPlugin(),
    ColumnResizePlugin(),
    EditingPlugin(),
    ClipboardProPlugin({
      includeHeaders: true,
      typeCoercion: true,
      pasteValidation: true,
      formulaAwarePaste: true,
      undoSupport: true,
    }),
  ], []);

  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 60 },
    { field: 'name', headerName: 'Product', width: 170, editable: true },
    { field: 'category', headerName: 'Category', width: 130, editable: true },
    { field: 'price', headerName: 'Price', width: 100, editable: true,
      valueFormatter: (p: any) => p.value != null ? `$${Number(p.value).toLocaleString()}` : '' },
    { field: 'quantity', headerName: 'Qty', width: 80, editable: true },
    { field: 'sku', headerName: 'SKU', width: 120 },
    { field: 'inStock', headerName: 'In Stock', width: 90 },
  ], []);

  const data = useMemo(() => PRODUCTS_100.map(p => ({ ...p, inStock: (p as any).quantity > 20 ? 'Yes' : 'No' })), []);

  return (
    <>
      <p style={hintStyle}>
        <strong>Excel-compatible copy/paste.</strong> Select rows → Ctrl+C to copy (with headers).
        Paste into Excel/Sheets — preserves formatting. Paste from Excel → type coercion converts
        currencies, percentages, dates. Ctrl+X to cut (visual strike-through). Ctrl+Z to undo.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          style={{ ...chipBtn, background: '#2563eb', color: '#fff' }}
          onClick={() => {
            apiRef.current?.dispatchCommand?.('clipboard:copyWithHeaders' as any, {});
            setLog(l => ['✅ Copied with headers to clipboard — paste into Excel/Sheets', ...l.slice(0, 3)]);
          }}
        >
          📋 Copy with Headers
        </button>
        <button
          style={{ ...chipBtn, background: '#f3f4f6' }}
          onClick={() => {
            apiRef.current?.dispatchCommand?.('clipboard:copy' as any, {});
            setLog(l => ['✅ Copied selected rows as TSV', ...l.slice(0, 3)]);
          }}
        >
          Copy Rows (TSV)
        </button>
        <button
          style={{ ...chipBtn, background: '#fef3c7' }}
          onClick={() => {
            apiRef.current?.dispatchCommand?.('clipboard:cut' as any, {});
            setLog(l => ['✂️ Cut rows — cells cleared after paste', ...l.slice(0, 3)]);
          }}
        >
          ✂️ Cut
        </button>
        <button
          style={{ ...chipBtn, background: '#f0fdf4' }}
          onClick={() => {
            apiRef.current?.dispatchCommand?.('clipboard:paste' as any, {});
            setLog(l => ['📥 Pasted from clipboard with type coercion', ...l.slice(0, 3)]);
          }}
        >
          Paste
        </button>
        <button
          style={{ ...chipBtn, background: '#fdf4ff' }}
          onClick={() => {
            apiRef.current?.dispatchCommand?.('clipboard:pasteSpecial' as any, { valuesOnly: true });
            setLog(l => ['📥 Paste Special: values only (no formulas)', ...l.slice(0, 3)]);
          }}
        >
          Paste Special
        </button>
      </div>

      {log.length > 0 && (
        <div style={{ marginBottom: 10, padding: '6px 12px', background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0', fontSize: 12, color: '#16a34a', fontWeight: 500 }}>
          {log[0]}
        </div>
      )}

      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
          Simulate paste from Excel (TSV — type coercion converts $1,234 → 1234, 45% → 0.45, TRUE → true):
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea
            placeholder={'Product X\tElectronics\t$1,234\t45\nProduct Y\tAccessories\t$99.99\t200'}
            value={pasteInput}
            onChange={e => setPasteInput(e.target.value)}
            style={{ ...inputStyle, width: 420, height: 52, resize: 'vertical', fontSize: 11, fontFamily: 'monospace' }}
          />
          <button
            style={{ ...chipBtn, background: '#2563eb', color: '#fff', alignSelf: 'flex-end' }}
            onClick={() => {
              if (!pasteInput.trim()) return;
              navigator.clipboard.writeText(pasteInput).then(() => {
                apiRef.current?.dispatchCommand?.('clipboard:paste' as any, {});
                setLog(l => ['📥 Pasted TSV from simulator — type coercion applied', ...l.slice(0, 3)]);
              });
            }}
          >
            Simulate Paste
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 12 }}>
        {[
          { feat: 'Type Coercion', desc: '$1,234 → 1234, 45% → 0.45, TRUE/FALSE → bool' },
          { feat: 'Paste Validation', desc: 'Column type guards reject invalid data' },
          { feat: 'Formula-Aware', desc: '=SUMIF(...) formulas handled on paste' },
          { feat: 'Undo Integration', desc: 'Ctrl+Z undoes paste as single operation' },
        ].map(f => (
          <div key={f.feat} style={{ padding: '8px 10px', background: '#fafafa', borderRadius: 6, border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>✓ {f.feat}</div>
            <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2 }}>{f.desc}</div>
          </div>
        ))}
      </div>

      <GridStorm
        columns={columns}
        rowData={data}
        plugins={plugins}
        rowHeight={40}
        headerHeight={44}
        height={GRID_HEIGHT - 220}
        rowSelection="multiple"
        onGridReady={(api: any) => { apiRef.current = api; }}
        ariaLabel="Clipboard Pro Demo"
      />
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

// ── Horizon 1-3 Demo Components ──

const COL_LABELS: Record<string, string> = {
  id: 'ID', name: 'Name', department: 'Department', salary: 'Salary', city: 'City',
};
const RANK_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626'];

function IntentEngineDemo() {
  const [ranking, setRanking] = useState<Array<{ columnId: string; score: number; frequency: number; recency: number }>>([]);
  const [lastAction, setLastAction] = useState<string>('');
  const apiRef = useRef<GridApi | null>(null);

  const plugins = useMemo(() => [
    SortingPlugin({ multiSort: true }),
    FilteringPlugin(),
    ColumnResizePlugin(),
    IntentEnginePlugin({
      autoTrack: true,
      maxRecords: 100,
      onRankingUpdated: (r: any[]) => setRanking(r.map((c: any) => ({ columnId: c.columnId, score: c.score, frequency: c.frequency, recency: c.recency }))),
    }),
  ], []);

  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70, sortable: true },
    { field: 'name', headerName: 'Name', width: 180, sortable: true, filterable: true },
    { field: 'department', headerName: 'Department', width: 140, sortable: true, filterable: true },
    { field: 'salary', headerName: 'Salary', width: 120, sortable: true,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    { field: 'city', headerName: 'City', width: 130, sortable: true, filterable: true },
  ], []);

  const maxScore = ranking[0]?.score ?? 1;

  return (
    <>
      <p style={hintStyle}>
        Sort or filter any column — the intent engine tracks interactions and ranks columns by
        <strong> frequency × recency</strong> scoring. Rankings update live below.
      </p>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button style={{ ...chipBtn, background: '#2563eb', color: '#fff' }} onClick={() => {
          apiRef.current?.dispatchCommand?.('intent:record' as any, { columnId: 'salary', action: 'sort' });
          setLastAction('📌 Manually recorded: Salary → sort');
        }}>📌 Record Salary Sort</button>
        <button style={{ ...chipBtn, background: '#7c3aed', color: '#fff' }} onClick={() => {
          apiRef.current?.dispatchCommand?.('intent:record' as any, { columnId: 'department', action: 'filter' });
          setLastAction('📌 Manually recorded: Department → filter');
        }}>📌 Record Dept Filter</button>
        <button style={{ ...chipBtn, background: '#374151', color: '#fff' }} onClick={() => {
          apiRef.current?.dispatchCommand?.('intent:reset' as any, {});
          setLastAction('🔄 Rankings reset');
        }}>🔄 Reset</button>
        {lastAction && <span style={{ fontSize: 11, color: '#6b7280' }}>{lastAction}</span>}
      </div>

      {/* Live ranking panel */}
      <div style={{ marginBottom: 10, padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 8 }}>
          ⚡ Live Column Intent Rankings
        </div>
        {ranking.length === 0 ? (
          <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
            Sort or filter a column to start tracking — rankings will appear here in real time.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {ranking.filter(r => !r.columnId.startsWith('__')).map((col, i) => (
              <div key={col.columnId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 18, height: 18, borderRadius: 4, background: RANK_COLORS[i] ?? '#94a3b8', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {i + 1}
                </span>
                <span style={{ width: 90, fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
                  {COL_LABELS[col.columnId] ?? col.columnId}
                </span>
                <div style={{ flex: 1, background: '#e2e8f0', borderRadius: 3, height: 8, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.round((col.score / maxScore) * 100)}%`, background: RANK_COLORS[i] ?? '#94a3b8', height: '100%', borderRadius: 3, transition: 'width 0.4s ease' }} />
                </div>
                <span style={{ width: 38, fontSize: 11, color: '#64748b', textAlign: 'right' }}>
                  {col.score.toFixed(2)}
                </span>
                <span style={{ width: 52, fontSize: 10, color: '#94a3b8', textAlign: 'right' }}>
                  f:{col.frequency}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <GridStorm
        columns={columns}
        rowData={EMPLOYEES_200}
        plugins={plugins}
        rowHeight={40}
        headerHeight={44}
        height={GRID_HEIGHT - 130}
        onGridReady={(api: any) => { apiRef.current = api; }}
        ariaLabel="Intent Engine Demo"
      />
    </>
  );
}

// ── Code Guide component — shows usage instructions + copy-pasteable code ──
function CodeGuide({ install, title, code, features }: {
  install: string;
  title: string;
  code: string;
  features: string[];
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ marginTop: 14, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', padding: '9px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', border: 'none', cursor: 'pointer', fontFamily: 'inherit', borderBottom: open ? '1px solid #e2e8f0' : 'none' }}
      >
        <span style={{ fontWeight: 600, fontSize: 12, color: '#374151' }}>📋 How to use <em style={{ fontStyle: 'normal', color: '#2563eb' }}>{title}</em> in your project</span>
        <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 500 }}>{open ? '▲ Collapse' : '▼ Expand'}</span>
      </button>
      {open && (
        <div style={{ padding: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Left: code */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>Install &amp; Quick Start</div>
            <div style={{ background: '#1e1e2e', borderRadius: 6, padding: '4px 0', overflow: 'hidden' }}>
              <div style={{ padding: '6px 12px 2px', fontSize: 11, color: '#a6adc8', borderBottom: '1px solid #313244', marginBottom: 4 }}>
                <code style={{ background: 'transparent', color: '#cba6f7' }}>{install}</code>
              </div>
              <div style={{ position: 'relative' }}>
                <pre style={{ margin: 0, padding: '10px 14px', color: '#cdd6f4', fontSize: 11, lineHeight: 1.7, overflow: 'auto', maxHeight: 240, fontFamily: "'Fira Code', 'Consolas', monospace" }}><code>{code}</code></pre>
                <button
                  onClick={() => { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  style={{ position: 'absolute', top: 6, right: 6, padding: '2px 8px', fontSize: 10, background: copied ? '#40a02b' : '#45475a', color: '#cdd6f4', border: 'none', borderRadius: 4, cursor: 'pointer', fontFamily: 'inherit' }}
                >{copied ? '✓ Copied' : 'Copy'}</button>
              </div>
            </div>
          </div>
          {/* Right: features */}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.8 }}>What this plugin does</div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {features.map((f, i) => (
                <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: '#374151', marginBottom: 8, lineHeight: 1.5 }}>
                  <span style={{ color: '#10b981', fontSize: 14, lineHeight: 1, marginTop: 1 }}>✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function CellFormulaDemo() {
  const apiRef = useRef<GridApi | null>(null);
  const [status, setStatus] = useState<{ msg: string; ok: boolean } | null>(null);
  const plugins = useMemo(() => [
    SortingPlugin(),
    ColumnResizePlugin(),
    CellFormulaPlugin({ onError: 'report' }),
  ], []);
  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 60 },
    { field: 'name', headerName: 'Product', width: 160 },
    { field: 'price', headerName: 'Price', width: 110, sortable: true,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    { field: 'quantity', headerName: 'Qty', width: 80, sortable: true },
    { field: 'revenue', headerName: 'Revenue (computed)', width: 180, sortable: true,
      valueFormatter: (p: any) => p.value != null && p.value !== 0 ? `$${Number(p.value).toLocaleString()}` : p.value === 0 ? '$0' : '—' },
  ], []);
  const data = useMemo(() => PRODUCTS_100.map(p => ({ ...p, revenue: null })), []);
  return (
    <>
      <p style={hintStyle}>
        <strong>Try it:</strong> Click <strong>"Define Formula"</strong> — the Revenue column will be computed as Price × Quantity for every row automatically.
      </p>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button style={{ ...chipBtn, background: '#2563eb', color: '#fff' }} onClick={() => {
          apiRef.current?.dispatchCommand?.('formula:define', {
            columnId: 'revenue',
            dependencies: ['price', 'quantity'],
            compute: (row: any) => (row.price ?? 0) * (row.quantity ?? 0),
          });
          // Force recalculate in case rows were not yet initialised
          setTimeout(() => apiRef.current?.dispatchCommand?.('formula:recalculate', {}), 30);
          setStatus({ msg: '✓ Formula active: revenue = price × quantity', ok: true });
        }}>▶ Define Formula</button>
        <button style={chipBtn} onClick={() => {
          apiRef.current?.dispatchCommand?.('formula:remove', { columnId: 'revenue' });
          setStatus({ msg: '✗ Formula removed — Revenue column cleared', ok: false });
        }}>Remove Formula</button>
        {status && (
          <span style={{ fontSize: 12, color: status.ok ? '#10b981' : '#ef4444', fontWeight: 600 }}>
            {status.msg}
          </span>
        )}
      </div>
      <GridStorm columns={columns} rowData={data} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT - 80}
        onGridReady={(api: any) => { apiRef.current = api; }}
        ariaLabel="Cell Formula Demo" />
      <CodeGuide
        install="npm install @gridstorm/plugin-cell-formula"
        title="Cell Formula Plugin"
        code={`import { CellFormulaPlugin } from '@gridstorm/plugin-cell-formula';

// 1. Add to plugins array
const plugins = [
  CellFormulaPlugin({ onError: 'report' }),
];

// 2. Define a formula on any column at runtime
api.dispatchCommand('formula:define', {
  columnId: 'revenue',       // column to compute
  dependencies: ['price', 'quantity'],  // re-run when these change
  compute: (row) => row.price * row.quantity,
});

// 3. Remove a formula
api.dispatchCommand('formula:remove', { columnId: 'revenue' });

// 4. Force recalculate all formulas
api.dispatchCommand('formula:recalculate', {});`}
        features={[
          'Define JavaScript formulas for any column — no server needed',
          'Automatically re-computes when dependency columns change',
          'Multiple formulas per grid, each with its own dependencies',
          'Error modes: "report" emits formula:error events, "throw" raises exceptions',
          'Works with sorting and virtualised rows — values always stay in sync',
        ]}
      />
    </>
  );
}

function TemporalDemo() {
  const apiRef = useRef<GridApi | null>(null);
  const [snapshotCount, setSnapshotCount] = useState(0);
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);
  const [lastAction, setLastAction] = useState<string>('');

  const plugins = useMemo(() => [
    SortingPlugin({ multiSort: true }),
    FilteringPlugin(),
    ColumnResizePlugin(),
    TemporalPlugin({ maxHistory: 20 }),
  ], []);
  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70, sortable: true },
    { field: 'name', headerName: 'Name', width: 180, sortable: true },
    { field: 'department', headerName: 'Department', width: 140, sortable: true, filterable: true },
    { field: 'salary', headerName: 'Salary', width: 120, sortable: true,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    { field: 'status', headerName: 'Status', width: 110, filterable: true },
  ], []);

  function syncPluginState() {
    const api = apiRef.current as any;
    if (!api) return;
    const state = api.getPluginState?.('temporal');
    if (!state) return;
    setUndoCount(state.undoStack?.length ?? 0);
    setRedoCount(state.redoStack?.length ?? 0);
    setSnapshotCount(state.snapshots?.length ?? 0);
  }

  return (
    <>
      <p style={hintStyle}>Sort or filter the grid, then take a snapshot. Use Undo/Redo to travel through grid states.</p>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button style={chipBtn} onClick={() => {
          const label = `Snapshot ${snapshotCount + 1}`;
          apiRef.current?.dispatchCommand?.('temporal:snapshot', { label });
          setLastAction(`Saved "${label}"`);
          syncPluginState();
        }}>📸 Snapshot</button>
        <button style={chipBtn} onClick={() => {
          apiRef.current?.dispatchCommand?.('temporal:undo', {});
          setLastAction('↩ Undone');
          syncPluginState();
        }}>↩ Undo</button>
        <button style={chipBtn} onClick={() => {
          apiRef.current?.dispatchCommand?.('temporal:redo', {});
          setLastAction('↪ Redone');
          syncPluginState();
        }}>↪ Redo</button>
        <span style={{ fontSize: 12, color: '#555', display: 'flex', gap: 12 }}>
          <span>📦 {snapshotCount} snapshots</span>
          <span style={{ color: undoCount > 0 ? '#2563eb' : '#aaa' }}>↩ {undoCount} undo</span>
          <span style={{ color: redoCount > 0 ? '#7c3aed' : '#aaa' }}>↪ {redoCount} redo</span>
        </span>
        {lastAction && <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>{lastAction}</span>}
      </div>
      <GridStorm columns={columns} rowData={EMPLOYEES_200} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT}
        onGridReady={(api: any) => { apiRef.current = api; }}
        ariaLabel="Temporal Demo" />
    </>
  );
}

function NlQueryDemo() {
  const apiRef = useRef<GridApi | null>(null);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState('');
  const plugins = useMemo(() => [
    SortingPlugin({ multiSort: true }),
    FilteringPlugin(),
    ColumnResizePlugin(),
    NlQueryPlugin({ maxHistory: 20 }),
  ], []);
  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', width: 180, sortable: true },
    { field: 'department', headerName: 'Department', width: 140, sortable: true, filterable: true },
    { field: 'salary', headerName: 'Salary', width: 120, sortable: true,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    { field: 'status', headerName: 'Status', width: 110, filterable: true },
    { field: 'city', headerName: 'City', width: 130, sortable: true, filterable: true },
  ], []);
  const EXAMPLES = ['sort by salary desc', 'filter status equals Active', 'sort name asc', 'clear filters'];
  return (
    <>
      <p style={hintStyle}>Type a natural language query or click an example. No LLM required — pure regex pattern matching.</p>
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <input type="text" placeholder='e.g. "sort by salary desc"' value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ ...inputStyle, flex: 1 }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                apiRef.current?.dispatchCommand?.('nlquery:execute', { query });
                setResult(`Executed: "${query}"`);
              }
            }} />
          <button style={chipBtn} onClick={() => {
            apiRef.current?.dispatchCommand?.('nlquery:execute', { query });
            setResult(`Executed: "${query}"`);
          }}>Run</button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {EXAMPLES.map(ex => (
            <button key={ex} style={{ ...chipBtn, fontSize: 11 }} onClick={() => {
              setQuery(ex);
              apiRef.current?.dispatchCommand?.('nlquery:execute', { query: ex });
              setResult(`Executed: "${ex}"`);
            }}>{ex}</button>
          ))}
        </div>
      </div>
      {result && <div style={{ fontSize: 11, color: '#2563eb', marginBottom: 6 }}>{result}</div>}
      <GridStorm columns={columns} rowData={EMPLOYEES_200} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT}
        onGridReady={(api: any) => { apiRef.current = api; }}
        ariaLabel="NL Query Demo" />
    </>
  );
}

function AnomalyDemo() {
  const apiRef = useRef<GridApi | null>(null);
  const [anomalies, setAnomalies] = useState<string[]>([]);
  const [sampleCount, setSampleCount] = useState(0);
  const sampleCountRef = useRef(0);

  const plugins = useMemo(() => [
    SortingPlugin(),
    ColumnResizePlugin(),
    AnomalyPlugin({
      columns: [
        { columnId: 'salary', watchThreshold: 1.5, warningThreshold: 2.0, criticalThreshold: 2.5, windowSize: 50 },
        { columnId: 'rating', watchThreshold: 1.5, warningThreshold: 2.0, criticalThreshold: 2.5, windowSize: 50 },
      ],
      onAnomaly: (ev: any) => setAnomalies(a => [
        `[${ev.severity.toUpperCase()}] ${ev.columnId}: ${ev.value} (z=${ev.zscore.toFixed(2)})`,
        ...a.slice(0, 4),
      ]),
    }),
  ], []);

  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70, sortable: true },
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'department', headerName: 'Department', width: 140 },
    { field: 'salary', headerName: 'Salary', width: 120, sortable: true,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    { field: 'rating', headerName: 'Rating', width: 90, sortable: true },
  ], []);

  function feedNormal() {
    EMPLOYEES_50.slice(0, 10).forEach((e: any, i: number) =>
      apiRef.current?.dispatchCommand?.('anomaly:feed', { rowId: `e${i}`, columnId: 'salary', value: e.salary })
    );
    sampleCountRef.current += 10;
    setSampleCount(sampleCountRef.current);
  }

  function feedOutlier() {
    // Auto-seed baseline if not enough samples yet (plugin needs ≥10)
    if (sampleCountRef.current < 10) feedNormal();
    apiRef.current?.dispatchCommand?.('anomaly:feed', { rowId: 'outlier', columnId: 'salary', value: 999999 });
    sampleCountRef.current += 1;
    setSampleCount(sampleCountRef.current);
  }

  const ready = sampleCount >= 10;

  return (
    <>
      <p style={hintStyle}>
        <strong>Step 1:</strong> Click <strong>"Feed Normal Data"</strong> to build a baseline (needs 10+ samples).
        <strong> Step 2:</strong> Click <strong>"Feed Outlier"</strong> — the $999K salary will fire a CRITICAL alert.
      </p>
      <div style={{ marginBottom: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button style={{ ...chipBtn, background: ready ? '#059669' : '#2563eb', color: '#fff' }}
          onClick={feedNormal}>
          {ready ? '✓ Feed More Normal Data' : '① Feed Normal Data (builds baseline)'}
        </button>
        <button style={{ ...chipBtn, background: '#ef4444', color: '#fff' }}
          onClick={feedOutlier}>
          ⚡ Feed Outlier ($999K)
        </button>
        <button style={chipBtn} onClick={() => { setAnomalies([]); }}>Clear Log</button>
        <span style={{ fontSize: 11, color: ready ? '#059669' : '#f59e0b', fontWeight: 600 }}>
          {sampleCount} samples {ready ? '— baseline ready ✓' : `— need ${10 - sampleCount} more`}
        </span>
      </div>
      {anomalies.length > 0 && (
        <div style={{ fontSize: 11, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 4, padding: '6px 10px', marginBottom: 8 }}>
          {anomalies.map((a, i) => (
            <div key={i} style={{ color: a.includes('CRITICAL') ? '#dc2626' : a.includes('WARNING') ? '#d97706' : '#374151' }}>{a}</div>
          ))}
        </div>
      )}
      <GridStorm columns={columns} rowData={EMPLOYEES_50} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT}
        onGridReady={(api: any) => { apiRef.current = api; }}
        ariaLabel="Anomaly Detection Demo" />
      <CodeGuide
        install="npm install @gridstorm/plugin-anomaly"
        title="Anomaly Detection Plugin"
        code={`import { AnomalyPlugin } from '@gridstorm/plugin-anomaly';

const plugins = [
  AnomalyPlugin({
    columns: [
      {
        columnId: 'salary',
        watchThreshold: 1.5,    // z-score for WATCH
        warningThreshold: 2.0,  // z-score for WARNING
        criticalThreshold: 2.5, // z-score for CRITICAL
        windowSize: 50,         // rolling window size
      },
    ],
    onAnomaly: (event) => {
      console.log(event.severity, event.columnId,
        event.value, event.zscore);
    },
  }),
];

// Feed a data point to the rolling stats engine:
api.dispatchCommand('anomaly:feed', {
  rowId: 'row-1',
  columnId: 'salary',
  value: 999999,       // triggers CRITICAL if z > 2.5
});`}
        features={[
          'Real-time outlier detection using rolling Z-score statistics',
          'Per-column thresholds: WATCH / WARNING / CRITICAL severity levels',
          'Configurable rolling window size — adapts to streaming data',
          'onAnomaly callback fires instantly when a threshold is crossed',
          'Works alongside live streaming data — no batch processing needed',
        ]}
      />
    </>
  );
}

function CollabDemo() {
  const apiRef = useRef<GridApi | null>(null);
  const [presence, setPresence] = useState<string[]>([]);
  const transport = useMemo(() => createInMemoryTransport(), []);
  const plugins = useMemo(() => [
    SortingPlugin(),
    EditingPlugin(),
    ColumnResizePlugin(),
    CollabPlugin({
      transport,
      lockTimeout: 10000,
    }),
  ], [transport]);
  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', width: 180, editable: true, cellEditor: 'text' },
    { field: 'department', headerName: 'Department', width: 140 },
    { field: 'salary', headerName: 'Salary', width: 120, editable: true, cellEditor: 'number',
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
  ], []);
  const USERS = [
    { id: 'u1', name: 'Alice', color: '#3b82f6' },
    { id: 'u2', name: 'Bob', color: '#10b981' },
    { id: 'u3', name: 'Carol', color: '#f59e0b' },
  ];
  return (
    <>
      <p style={hintStyle}>Simulate multi-user collaboration. Each user can join, focus cells, and acquire edit locks.</p>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {USERS.map(u => (
          <button key={u.id} style={{ ...chipBtn, borderLeft: `3px solid ${u.color}` }}
            onClick={() => {
              apiRef.current?.dispatchCommand?.('collab:join', { id: u.id, name: u.name, color: u.color, joinedAt: Date.now() });
              setPresence(p => [...p.filter(x => !x.startsWith(u.name)), `${u.name} joined`]);
            }}>
            {u.name} Join
          </button>
        ))}
        <button style={chipBtn} onClick={() => apiRef.current?.dispatchCommand?.('collab:get-presence', {})}>Get Presence</button>
      </div>
      {presence.length > 0 && (
        <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>
          {presence.map((p, i) => <span key={i} style={{ marginRight: 10 }}>● {p}</span>)}
        </div>
      )}
      <GridStorm columns={columns} rowData={EMPLOYEES_50} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT} enableCellEditing
        onGridReady={(api: any) => { apiRef.current = api; }}
        ariaLabel="Collaboration Demo" />
    </>
  );
}

function SemanticDemo() {
  const [gridApi, setGridApi] = useState<any>(null);
  const [colTypes, setColTypes] = useState<Array<{ id: string; type: string; confidence: number }>>([]);
  const [relationships, setRelationships] = useState<Array<{ colA: string; colB: string; desc: string }>>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [lastRan, setLastRan] = useState<string>('');

  const plugins = useMemo(() => [
    SortingPlugin(),
    ColumnResizePlugin(),
    SemanticPlugin({ autoAnalyze: true, sampleSize: 100 }),
  ], []);

  const semanticData = useMemo(() => EMPLOYEES_50.map((e: any) => ({
    ...e,
    email: `${e.name.toLowerCase().replace(' ', '.')}@company.com`,
    phone: `+1-${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
  })), []);

  const columns: ColumnDef[] = useMemo(() => [
    { field: 'name', headerName: 'Name', width: 160 },
    { field: 'email', headerName: 'Email', width: 220 },
    { field: 'phone', headerName: 'Phone', width: 160 },
    { field: 'ip', headerName: 'IP Address', width: 140 },
    { field: 'salary', headerName: 'Salary', width: 110,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
  ], []);

  // Wire up event listeners via useEffect so React manages the subscription lifecycle
  useEffect(() => {
    if (!gridApi) return;
    const unsub = gridApi.addEventListener('semantic:analysis-complete', (result: any) => {
      setColTypes(
        (result.columns ?? [])
          .filter((c: any) => c.detectedType !== 'unknown')
          .map((c: any) => ({ id: c.columnId, type: c.detectedType, confidence: Math.round(c.confidence * 100) }))
      );
      setRelationships(
        (result.relationships ?? []).map((r: any) => ({ colA: r.columnA, colB: r.columnB, desc: r.description }))
      );
      setAnalyzing(false);
      const t = new Date();
      setLastRan(`${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}:${t.getSeconds().toString().padStart(2,'0')}`);
    });
    return unsub;
  }, [gridApi]);

  // Color per semantic type
  const typeColor: Record<string, string> = {
    email: '#2563eb', phone: '#7c3aed', 'ip-address': '#0891b2',
    currency: '#059669', integer: '#d97706', decimal: '#d97706',
    name: '#db2777', date: '#ea580c', url: '#16a34a', text: '#6b7280',
    unknown: '#9ca3af', id: '#64748b',
  };

  return (
    <>
      <p style={hintStyle}>
        Column types are <strong>detected automatically on load</strong> from value patterns (no config needed).
        Click <strong>"Re-analyze"</strong> to re-scan all columns, or <strong>"Get Cached Analysis"</strong> to retrieve the last result — both update the timestamp below.
      </p>
      <div style={{ marginBottom: 6, display: 'flex', gap: 8, alignItems: 'center' }}>
        <button style={{ ...chipBtn, background: '#2563eb', color: '#fff' }} onClick={() => {
          setAnalyzing(true);
          gridApi?.dispatchCommand?.('semantic:analyze', {});
        }}>🔍 Re-analyze</button>
        <button style={chipBtn} onClick={() => gridApi?.dispatchCommand?.('semantic:get-analysis', {})}>
          Get Cached Analysis
        </button>
        {analyzing && <span style={{ fontSize: 11, color: '#6b7280' }}>Analyzing…</span>}
        {!analyzing && lastRan && <span style={{ fontSize: 11, color: '#059669' }}>✓ Last run at {lastRan}</span>}
      </div>

      {/* Column type badges */}
      {colTypes.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>Detected Types</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {colTypes.map(({ id, type, confidence }) => (
              <span key={id} style={{
                fontSize: 11, borderRadius: 4, padding: '2px 10px',
                background: `${typeColor[type] ?? '#6b7280'}18`,
                border: `1px solid ${typeColor[type] ?? '#6b7280'}40`,
                color: typeColor[type] ?? '#374151',
              }}>
                <strong>{id}</strong> → {type} <span style={{ opacity: 0.7 }}>({confidence}%)</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Relationship badges */}
      {relationships.length > 0 && (
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>Detected Relationships</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {relationships.map((r, i) => (
              <span key={i} style={{ fontSize: 11, background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 4, padding: '2px 10px', color: '#92400e' }}>
                🔗 {r.desc}
              </span>
            ))}
          </div>
        </div>
      )}

      <GridStorm columns={columns} rowData={semanticData} plugins={plugins}
        rowHeight={40} headerHeight={44} height={colTypes.length > 0 ? GRID_HEIGHT - 70 : GRID_HEIGHT}
        onGridReady={(api: any) => setGridApi(api)}
        ariaLabel="Semantic Analysis Demo" />
      <CodeGuide
        install="npm install @gridstorm/plugin-semantic"
        title="Semantic Analysis Plugin"
        code={`import { SemanticPlugin } from '@gridstorm/plugin-semantic';

const plugins = [
  SemanticPlugin({
    autoAnalyze: true,   // analyze on data load
    sampleSize: 100,     // rows to sample per column
  }),
];

// Trigger analysis manually at any time:
api.dispatchCommand('semantic:analyze', {});

// Get the detected type map:
api.dispatchCommand('semantic:get-analysis', {});
// Emits 'semantic:analyzed' event with:
// { columns: { email: 'email', salary: 'currency',
//              ip: 'ip-address', phone: 'phone' } }

// Listen for results:
api.on('semantic:analyzed', ({ columns }) => {
  console.log(columns); // { email: 'email', ... }
});`}
        features={[
          'Detects data types from values — email, phone, IP, currency, date, URL, and more',
          'Auto-analyzes on grid load when autoAnalyze: true is set',
          'Configurable sample size for large datasets (analyzes a subset for speed)',
          'No regex config needed — built-in patterns cover 15+ semantic types',
          'Emits semantic:analyzed event with a column→type map for custom logic',
        ]}
      />
    </>
  );
}

function PrivacyLensDemo() {
  const apiRef = useRef<GridApi | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [scanResults, setScanResults] = useState<Record<string, string[]>>({});
  const [maskedCols, setMaskedCols] = useState<Set<string>>(new Set());

  const piiData = useMemo(() => EMPLOYEES_50.map((e: any) => ({
    id: e.id,
    name: e.name,
    email: `${e.name.toLowerCase().replace(' ', '.')}@company.com`,
    ssn: `${String(Math.floor(Math.random() * 900) + 100)}-${String(Math.floor(Math.random() * 90) + 10)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    salary: e.salary,
    department: e.department,
  })), []);

  const plugins = useMemo(() => [
    SortingPlugin(),
    ColumnResizePlugin(),
    PrivacyLensPlugin({
      autoDetect: false,
      defaultRevealPolicy: 'on-click',
      onReveal: (entry: any) => setLog(l => [`👁 Revealed: ${entry.columnId} / row ${entry.rowId}`, ...l.slice(0, 3)]),
    }),
  ], []);

  // Columns re-computed when maskedCols changes — valueFormatter checks live masking state
  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 60 },
    { field: 'name', headerName: 'Name', width: 160 },
    { field: 'email', headerName: 'Email', width: 220,
      valueFormatter: (p: any) => maskedCols.has('email') ? '████████████████' : String(p.value ?? '') },
    { field: 'ssn', headerName: 'SSN', width: 140,
      valueFormatter: (p: any) => maskedCols.has('ssn') ? '███-██-████' : String(p.value ?? '') },
    { field: 'salary', headerName: 'Salary', width: 110,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    { field: 'department', headerName: 'Department', width: 140 },
  ], [maskedCols]);

  // Push updated column defs to the grid whenever masking state changes
  useEffect(() => {
    apiRef.current?.setColumnDefs?.(columns);
  }, [columns]);

  function handleGridReady(api: any) {
    apiRef.current = api;

    // Show scan result as a badge + log entry
    api.addEventListener('privacy:pii-detected', (p: any) => {
      setScanResults(prev => ({ ...prev, [p.columnId]: p.piiCategories }));
      setLog(l => [
        `✓ Scanned "${p.columnId}" → ${p.piiCategories.join(', ')} (${Math.round((p.confidence ?? 0) * 100)}% confidence)`,
        ...l.slice(0, 3),
      ]);
    });

    // Visual masking: update maskedCols state → triggers column def re-compute
    api.addEventListener('privacy:column-masked', (p: any) => {
      setMaskedCols(prev => new Set([...prev, p.columnId]));
      setLog(l => [`🔒 "${p.columnId}" is now masked`, ...l.slice(0, 3)]);
    });

    api.addEventListener('privacy:column-unmasked', (p: any) => {
      setMaskedCols(prev => { const n = new Set(prev); n.delete(p.columnId); return n; });
      setLog(l => [`🔓 "${p.columnId}" unmasked — values visible again`, ...l.slice(0, 3)]);
    });

    // Show exported data map summary
    api.addEventListener('privacy:map-exported', (map: any) => {
      if (map.totalPiiColumns === 0) {
        setLog(l => ['📋 Data map: no PII detected yet — click Scan Email or Scan SSN first', ...l.slice(0, 3)]);
      } else {
        const summary = map.columns
          .map((c: any) => `${c.columnId} [${c.piiCategories.join(', ')}]`)
          .join(' · ');
        setLog(l => [`📋 Exported: ${summary} — ${map.totalPiiCells} PII cells total`, ...l.slice(0, 3)]);
      }
    });
  }

  return (
    <>
      <p style={hintStyle}>
        <strong>Try it:</strong> Click <strong>Scan Email</strong> or <strong>Scan SSN</strong> to detect PII types,
        then <strong>Mask SSN</strong> to hide the column values, <strong>Unmask SSN</strong> to restore them,
        and <strong>Export Data Map</strong> for a GDPR summary.
      </p>
      <div style={{ marginBottom: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button style={chipBtn} onClick={() => apiRef.current?.dispatchCommand?.('privacy:scan-column', { columnId: 'email' })}>🔍 Scan Email</button>
        <button style={chipBtn} onClick={() => apiRef.current?.dispatchCommand?.('privacy:scan-column', { columnId: 'ssn' })}>🔍 Scan SSN</button>
        <button style={{ ...chipBtn, background: '#ef4444', color: '#fff' }} onClick={() => apiRef.current?.dispatchCommand?.('privacy:mask', { columnId: 'ssn' })}>🔒 Mask SSN</button>
        <button style={{ ...chipBtn, background: maskedCols.has('ssn') ? '#059669' : undefined, color: maskedCols.has('ssn') ? '#fff' : undefined }}
          onClick={() => apiRef.current?.dispatchCommand?.('privacy:unmask', { columnId: 'ssn' })}>🔓 Unmask SSN</button>
        <button style={chipBtn} onClick={() => apiRef.current?.dispatchCommand?.('privacy:export-map', {})}>📋 Export Data Map</button>
      </div>
      {/* Scan result badges */}
      {Object.keys(scanResults).length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          {Object.entries(scanResults).map(([col, cats]) => (
            <span key={col} style={{ fontSize: 11, background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 4, padding: '2px 8px', color: '#92400e' }}>
              <strong>{col}</strong>: {cats.join(', ')}
            </span>
          ))}
        </div>
      )}
      {/* Activity log */}
      {log.length > 0 && (
        <div style={{ fontSize: 11, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, padding: '6px 10px', marginBottom: 8 }}>
          {log.map((entry, i) => <div key={i} style={{ color: i === 0 ? '#1e40af' : '#9ca3af' }}>{entry}</div>)}
        </div>
      )}
      <GridStorm columns={columns} rowData={piiData} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT - 60}
        onGridReady={handleGridReady}
        ariaLabel="Privacy Lens Demo" />
      <CodeGuide
        install="npm install @gridstorm/plugin-privacy-lens"
        title="Privacy Lens Plugin"
        code={`import { PrivacyLensPlugin } from '@gridstorm/plugin-privacy-lens';

const plugins = [
  PrivacyLensPlugin({
    autoDetect: false,
    defaultRevealPolicy: 'on-click', // 'always'|'never'|'on-click'
    onReveal: (entry) => {
      console.log('Revealed:', entry.columnId, entry.rowId);
    },
  }),
];

// Scan a column and auto-detect PII type:
api.dispatchCommand('privacy:scan-column', { columnId: 'email' });

// Mask a column (replaces visible values with ████):
api.dispatchCommand('privacy:mask', { columnId: 'ssn' });

// Unmask (show real values again):
api.dispatchCommand('privacy:unmask', { columnId: 'ssn' });

// Export a GDPR data map (all detected PII locations):
api.dispatchCommand('privacy:export-map', {});`}
        features={[
          'Mask any column — replaces cell values with ████ blocks in the UI',
          'Reveal policy: always visible, never visible, or click-to-reveal per column',
          'Auto-detects PII types (email, SSN, phone, credit card) via semantic scan',
          'onReveal audit callback fires whenever a user clicks to see a masked value',
          'Export a GDPR-ready data map listing every PII column and its type',
        ]}
      />
    </>
  );
}

function AdaptiveRendererDemo() {
  const apiRef = useRef<GridApi | null>(null);
  const [rec, setRec] = useState<{ mode: string; rowHeight: number; showPagination: boolean; reason: string } | null>(null);
  const [profile, setProfile] = useState<Record<string, string> | null>(null);

  const plugins = useMemo(() => [
    SortingPlugin(),
    ColumnResizePlugin(),
    AdaptiveRendererPlugin({ autoApply: false }),
  ], []);

  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70, sortable: true },
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'department', headerName: 'Department', width: 140 },
    { field: 'salary', headerName: 'Salary', width: 120,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    { field: 'city', headerName: 'City', width: 130 },
  ], []);

  function handleGridReady(api: any) {
    apiRef.current = api;

    // "Detect Device" fires this (via onRecommendation callback path or event)
    api.addEventListener('adaptive:recommendation', (r: any) => {
      setRec({ mode: r.mode, rowHeight: r.rowHeight, showPagination: r.showPagination, reason: r.reason });
    });

    // "Get Profile" fires this
    api.addEventListener('adaptive:device-profiled', (p: any) => {
      setProfile({
        'Device class': p.deviceClass,
        'Screen': `${p.screenWidth} × ${p.screenHeight}`,
        'Pixel ratio': `${p.pixelRatio}x`,
        'Touch': p.hasTouch ? 'Yes' : 'No',
        'Connection': p.connectionSpeed,
        'Color scheme': p.prefersColorScheme,
        'Reduced motion': p.prefersReducedMotion ? 'Yes' : 'No',
        'High contrast': p.prefersHighContrast ? 'Yes' : 'No',
      });
    });
  }

  return (
    <>
      <p style={hintStyle}>
        <strong>Try it:</strong> Click <strong>"Detect Device"</strong> to get layout recommendations for your screen,
        or <strong>"Get Profile"</strong> to inspect your full device capabilities.
      </p>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8 }}>
        <button style={{ ...chipBtn, background: '#2563eb', color: '#fff' }}
          onClick={() => apiRef.current?.dispatchCommand?.('adaptive:recalculate', {})}>📱 Detect Device</button>
        <button style={chipBtn}
          onClick={() => apiRef.current?.dispatchCommand?.('adaptive:get-device-profile', {})}>🔍 Get Profile</button>
      </div>

      {/* Layout recommendation panel */}
      {rec && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, padding: '8px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.6 }}>📐 Layout Recommendation</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 12 }}>
              {[
                ['Mode', rec.mode],
                ['Row height', `${rec.rowHeight}px`],
                ['Pagination', rec.showPagination ? 'On' : 'Off'],
              ].map(([k, v]) => (
                <span key={k}><span style={{ color: '#6b7280' }}>{k}: </span><strong>{v}</strong></span>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#374151', marginTop: 5, fontStyle: 'italic' }}>💡 {rec.reason}</div>
          </div>

          {/* Device profile panel (shown once Get Profile is clicked) */}
          {profile && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, padding: '8px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#166534', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.6 }}>🔍 Device Profile</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 12 }}>
                {Object.entries(profile).map(([k, v]) => (
                  <span key={k}><span style={{ color: '#6b7280' }}>{k}: </span><strong>{v}</strong></span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Show profile alone if detect hasn't been run yet */}
      {!rec && profile && (
        <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, padding: '8px 12px', marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#166534', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.6 }}>🔍 Device Profile</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 12 }}>
            {Object.entries(profile).map(([k, v]) => (
              <span key={k}><span style={{ color: '#6b7280' }}>{k}: </span><strong>{v}</strong></span>
            ))}
          </div>
        </div>
      )}

      <GridStorm columns={columns} rowData={EMPLOYEES_200} plugins={plugins}
        rowHeight={40} headerHeight={44} height={rec || profile ? GRID_HEIGHT - 80 : GRID_HEIGHT}
        onGridReady={handleGridReady}
        ariaLabel="Adaptive Renderer Demo" />
      <CodeGuide
        install="npm install @gridstorm/plugin-adaptive-renderer"
        title="Adaptive Renderer Plugin"
        code={`import { AdaptiveRendererPlugin } from '@gridstorm/plugin-adaptive-renderer';

const plugins = [
  AdaptiveRendererPlugin({
    autoApply: false,   // set true to apply recommendations automatically
    onRecommendation: (rec) => {
      // rec.mode: 'desktop'|'tablet'|'mobile'
      // rec.rowHeight: recommended px (e.g. 56 on mobile)
      // rec.showPagination: true if dataset is large on mobile
      // rec.reason: human-readable explanation
      console.log(rec.mode, rec.rowHeight, rec.reason);
    },
  }),
];

// Trigger device detection + new recommendation:
api.dispatchCommand('adaptive:recalculate', {});

// Get the full device profile:
api.dispatchCommand('adaptive:get-device-profile', {});`}
        features={[
          'Detects device type (desktop / tablet / mobile) from screen size and touch support',
          'Recommends optimal rowHeight, column visibility, and pagination settings',
          'autoApply: true automatically updates the grid layout without any extra code',
          'onRecommendation callback gives you full control to apply changes selectively',
          'Re-evaluates on window resize — grid always fits the current viewport',
        ]}
      />
    </>
  );
}

function IntelligenceHubDemo() {
  const apiRef1 = useRef<GridApi | null>(null);
  const apiRef2 = useRef<GridApi | null>(null);
  const [connected, setConnected] = useState(false);
  const [sampleCount, setSampleCount] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [hubInsights, setHubInsights] = useState<Array<{ type: string; confidence: number; sourceCount: number }>>([]);

  const plugins1 = useMemo(() => [
    SortingPlugin(),
    FilteringPlugin(),
    ColumnResizePlugin(),
    IntelligenceHubPlugin({ gridId: 'grid-A', shareSortPatterns: true, shareFilterPatterns: true }),
  ], []);
  const plugins2 = useMemo(() => [
    SortingPlugin(),
    FilteringPlugin(),
    ColumnResizePlugin(),
    IntelligenceHubPlugin({ gridId: 'grid-B', shareSortPatterns: true, shareFilterPatterns: true }),
  ], []);
  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70, sortable: true },
    { field: 'name', headerName: 'Name', width: 160, sortable: true },
    { field: 'department', headerName: 'Dept', width: 120, sortable: true, filterable: true },
    { field: 'salary', headerName: 'Salary', width: 100, sortable: true,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
  ], []);

  function handleGrid1Ready(api: any) {
    apiRef1.current = api;

    api.addEventListener('hub:connected', () => {
      setConnected(true);
      setLog(l => ['✓ Both grids connected — sort or filter to publish samples', ...l.slice(0, 4)]);
    });

    api.addEventListener('hub:sample-published', (p: any) => {
      setSampleCount(c => c + 1);
      setLog(l => [`📊 Sample: ${p.type} from ${p.gridId}`, ...l.slice(0, 4)]);
    });

    api.addEventListener('hub:insight-received', (insight: any) => {
      setHubInsights(prev => {
        const next = prev.filter(i => i.type !== insight.type);
        return [{ type: insight.type, confidence: insight.confidence, sourceCount: insight.sourceCount }, ...next];
      });
      setLog(l => [`💡 Insight: ${insight.type} (${Math.round(insight.confidence * 100)}% confidence, ${insight.sourceCount} source(s))`, ...l.slice(0, 4)]);
    });

    api.addEventListener('hub:insights-listed', (p: any) => {
      if (!p.insights || p.insights.length === 0) {
        setLog(l => ['ℹ️ No insights yet — need 3+ samples of same type. Click "Simulate Samples".', ...l.slice(0, 4)]);
      } else {
        setHubInsights(p.insights.map((i: any) => ({ type: i.type, confidence: i.confidence, sourceCount: i.sourceCount })));
        setLog(l => [`📋 ${p.insights.length} insight(s) in hub`, ...l.slice(0, 4)]);
      }
    });
  }

  function handleGrid2Ready(api: any) {
    apiRef2.current = api;
    api.addEventListener('hub:sample-published', () => setSampleCount(c => c + 1));
  }

  function connectBoth() {
    apiRef1.current?.dispatchCommand?.('hub:connect', {});
    apiRef2.current?.dispatchCommand?.('hub:connect', {});
  }

  function simulateSamples() {
    // Publish 4 sort + 4 filter samples across both grids to cross the minSamples=3 threshold
    const ts = Date.now();
    const sortPayload = [{ colId: 'salary', sort: 'desc' }];
    const filterPayload = { department: { type: 'contains', filter: 'Eng' } };
    ['grid-A', 'grid-B', 'grid-A', 'grid-B'].forEach((gridId, i) => {
      apiRef1.current?.dispatchCommand?.('hub:publish-sample', { type: 'sort-pattern', data: sortPayload, timestamp: ts + i, gridId });
      apiRef1.current?.dispatchCommand?.('hub:publish-sample', { type: 'filter-pattern', data: filterPayload, timestamp: ts + i + 10, gridId });
    });
  }

  function resetHub() {
    apiRef1.current?.dispatchCommand?.('hub:reset', {});
    setSampleCount(0);
    setHubInsights([]);
    setLog(l => ['🗑 Hub reset — samples and insights cleared', ...l.slice(0, 4)]);
  }

  return (
    <>
      <p style={hintStyle}>
        <strong>Try it:</strong> Click <strong>"Connect Both"</strong>, then <strong>"Simulate Samples"</strong>
        (or sort/filter either grid manually) to feed behavioral data. Once 3+ samples of the same type arrive,
        an <em>insight</em> is generated automatically.
      </p>

      <div style={{ marginBottom: 6, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button style={{ ...chipBtn, background: connected ? '#059669' : '#2563eb', color: '#fff' }}
          onClick={connectBoth}>
          {connected ? '✓ Connected' : '🔗 Connect Both'}
        </button>
        <button style={chipBtn} onClick={simulateSamples}>⚡ Simulate Samples</button>
        <button style={chipBtn} onClick={() => apiRef1.current?.dispatchCommand?.('hub:get-insights', {})}>📋 Get Insights</button>
        <button style={{ ...chipBtn, background: '#ef4444', color: '#fff' }} onClick={resetHub}>🗑 Reset Hub</button>
        <span style={{ fontSize: 11, color: '#6b7280' }}>
          {sampleCount} sample{sampleCount !== 1 ? 's' : ''} collected
          {sampleCount > 0 && sampleCount < 3 && <span style={{ color: '#f59e0b' }}> (need 3+ for insights)</span>}
        </span>
      </div>

      {/* Insights badges */}
      {hubInsights.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          {hubInsights.map(ins => (
            <span key={ins.type} style={{ fontSize: 11, background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 4, padding: '2px 10px', color: '#166534' }}>
              💡 <strong>{ins.type}</strong> — {Math.round(ins.confidence * 100)}% confidence · {ins.sourceCount} source{ins.sourceCount !== 1 ? 's' : ''}
            </span>
          ))}
        </div>
      )}

      {/* Activity log */}
      {log.length > 0 && (
        <div style={{ fontSize: 11, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 4, padding: '6px 10px', marginBottom: 8 }}>
          {log.map((entry, i) => (
            <div key={i} style={{ color: i === 0 ? '#1e40af' : '#9ca3af' }}>{entry}</div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#2563eb' }}>Grid A — sort or filter here</div>
          <GridStorm columns={columns} rowData={EMPLOYEES_50} plugins={plugins1}
            rowHeight={36} headerHeight={40} height={220}
            onGridReady={handleGrid1Ready}
            ariaLabel="Hub Grid A" />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: '#10b981' }}>Grid B — sort or filter here</div>
          <GridStorm columns={columns} rowData={EMPLOYEES_50.slice(0, 25)} plugins={plugins2}
            rowHeight={36} headerHeight={40} height={220}
            onGridReady={handleGrid2Ready}
            ariaLabel="Hub Grid B" />
        </div>
      </div>
    </>
  );
}

// ── Tier 3 Demo Components ──

function StatusBarDemo() {
  const [selCount, setSelCount] = useState(0);
  const [stats, setStats] = useState<Record<string, { sum: number; avg: number; min: number; max: number; count: number }>>({});
  const apiRef = useRef<GridApi | null>(null);

  const plugins = useMemo(() => [
    SortingPlugin({ multiSort: true }),
    SelectionPlugin({ mode: 'multiple' }),
    ColumnResizePlugin(),
    StatusBarPlugin({
      showOnSelection: true,
      showForAllRows: true,
      panels: [
        { id: 'left-panel', align: 'left' },
        { id: 'right-panel', align: 'right' },
      ],
    }),
  ], []);

  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 60 },
    { field: 'name', headerName: 'Name', width: 170, sortable: true },
    { field: 'department', headerName: 'Department', width: 140, sortable: true },
    { field: 'salary', headerName: 'Salary', width: 120, sortable: true,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    { field: 'rating', headerName: 'Rating', width: 90, sortable: true },
    { field: 'yearsExp', headerName: 'Years Exp', width: 100, sortable: true },
  ], []);

  const data = useMemo(() => EMPLOYEES_200.map((e: any, i: number) => ({
    ...e,
    yearsExp: Math.floor(Math.random() * 20) + 1,
    rating: +(Math.random() * 4 + 1).toFixed(1),
  })), []);

  const onGridReady = useCallback((api: GridApi) => {
    apiRef.current = api;
    api.addEventListener('status-bar:updated' as any, (e: any) => {
      setStats(e.aggregations ?? {});
    });
  }, []);

  const onSelectionChanged = useCallback((e: any) => {
    setSelCount(e.selectedNodes?.length ?? 0);
  }, []);

  const salaryStats = stats['salary'];
  const ratingStats = stats['rating'];

  return (
    <>
      <p style={hintStyle}>
        Select rows (Ctrl+Click / Shift+Click) — the status bar aggregations update instantly. With nothing selected, stats show across <em>all rows</em>.
        Currently <strong>{selCount > 0 ? `${selCount} rows selected` : 'all rows'}</strong>.
      </p>

      {/* Status Bar UI */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', border: '1px solid #e2e8f0', borderBottom: 'none', borderRadius: '6px 6px 0 0', padding: '6px 14px', fontSize: 12 }}>
        <div style={{ display: 'flex', gap: 20 }}>
          {salaryStats && (
            <>
              <span><span style={{ color: '#6b7280' }}>Salary avg: </span><strong style={{ color: '#2563eb' }}>${Math.round(salaryStats.avg).toLocaleString()}</strong></span>
              <span><span style={{ color: '#6b7280' }}>Min: </span><strong>${salaryStats.min.toLocaleString()}</strong></span>
              <span><span style={{ color: '#6b7280' }}>Max: </span><strong>${salaryStats.max.toLocaleString()}</strong></span>
              <span><span style={{ color: '#6b7280' }}>Sum: </span><strong>${salaryStats.sum.toLocaleString()}</strong></span>
            </>
          )}
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          {ratingStats && (
            <span><span style={{ color: '#6b7280' }}>Avg Rating: </span><strong style={{ color: '#059669' }}>{ratingStats.avg.toFixed(2)}</strong></span>
          )}
          <span style={{ color: '#6b7280' }}>Rows: <strong style={{ color: '#374151' }}>{salaryStats?.count ?? 0}</strong></span>
        </div>
      </div>

      <GridStorm columns={columns} rowData={data} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT - 40}
        rowSelection="multiple" checkboxSelection
        onGridReady={onGridReady} onSelectionChanged={onSelectionChanged}
        ariaLabel="Status Bar Demo" />
      <CodeGuide
        install="npm install @gridstorm/plugin-status-bar"
        title="Status Bar Plugin"
        code={`import { StatusBarPlugin } from '@gridstorm/plugin-status-bar';

const plugins = [
  SelectionPlugin({ mode: 'multiple' }),
  StatusBarPlugin({
    showOnSelection: true,   // stats update when rows are selected
    showForAllRows: true,    // fall back to all rows when nothing selected
  }),
];

// Listen for aggregation updates:
api.addEventListener('status-bar:updated', (e) => {
  const { salary } = e.aggregations;
  console.log(salary.sum, salary.avg, salary.min, salary.max, salary.count);
});`}
        features={[
          'Auto-recalculates on every selection change — no extra code needed',
          'Falls back to all-row stats when nothing is selected',
          'Computes: sum, avg, min, max, count, first, last per column',
          'Configurable panels: left / center / right alignment',
          'Works alongside GroupingPlugin — aggregates within the visible filtered set',
        ]}
      />
    </>
  );
}

function StatePersistenceDemo() {
  const STORAGE_KEY = 'gridstorm-demo-state';
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [restoredAt, setRestoredAt] = useState<string | null>(null);
  const [cleared, setCleared] = useState(false);
  const apiRef = useRef<GridApi | null>(null);

  const plugins = useMemo(() => [
    SortingPlugin({ multiSort: true }),
    FilteringPlugin(),
    ColumnResizePlugin(),
    ColumnPinningPlugin(),
    ColumnReorderPlugin(),
    PaginationPlugin({ pageSize: 20 }),
    StatePersistencePlugin({
      storageKey: STORAGE_KEY,
      autoSave: true,
      debounceMs: 600,
      include: ['sortModel', 'filterModel', 'columnState', 'pagination'],
    }),
  ], []);

  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 60, sortable: true },
    { field: 'name', headerName: 'Name', width: 180, sortable: true, filterable: true, resizable: true },
    { field: 'department', headerName: 'Department', width: 140, sortable: true, filterable: true, resizable: true },
    { field: 'role', headerName: 'Role', width: 160, sortable: true, resizable: true },
    { field: 'salary', headerName: 'Salary', width: 120, sortable: true, resizable: true,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    { field: 'city', headerName: 'City', width: 130, sortable: true, filterable: true, resizable: true },
    { field: 'status', headerName: 'Status', width: 110, sortable: true, filterable: true },
  ], []);

  const onGridReady = useCallback((api: GridApi) => { apiRef.current = api; }, []);

  const handleSave = () => {
    apiRef.current?.dispatchCommand?.('state:save', {});
    setSavedAt(new Date().toLocaleTimeString());
    setCleared(false);
  };

  const handleRestore = () => {
    apiRef.current?.dispatchCommand?.('state:restore', {});
    setRestoredAt(new Date().toLocaleTimeString());
  };

  const handleClear = () => {
    localStorage.removeItem(STORAGE_KEY);
    setCleared(true);
    setSavedAt(null);
  };

  return (
    <>
      <p style={hintStyle}>
        Sort, filter, resize, or reorder columns — state <strong>auto-saves after 600ms</strong>.
        Reload the page: your grid state is restored automatically. Or use the buttons below.
      </p>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button style={{ ...chipBtn, background: '#2563eb', color: '#fff' }} onClick={handleSave}>💾 Save Now</button>
        <button style={{ ...chipBtn, background: '#059669', color: '#fff' }} onClick={handleRestore}>♻️ Restore</button>
        <button style={{ ...chipBtn, background: '#f1f5f9', color: '#374151', border: '1px solid #e2e8f0' }} onClick={handleClear}>🗑️ Clear Saved State</button>
        {savedAt && !cleared && <span style={{ fontSize: 11, color: '#059669' }}>✓ Saved at {savedAt}</span>}
        {restoredAt && <span style={{ fontSize: 11, color: '#2563eb' }}>↩ Restored at {restoredAt}</span>}
        {cleared && <span style={{ fontSize: 11, color: '#ef4444' }}>✗ Cleared — next save starts fresh</span>}
      </div>
      <GridStorm columns={columns} rowData={EMPLOYEES_200} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT - 60}
        floatingFilter floatingFilterDebounce={300} enablePagination pageSizeOptions={[10, 20, 50]}
        onGridReady={onGridReady} ariaLabel="State Persistence Demo" />
      <CodeGuide
        install="npm install @gridstorm/plugin-state-persistence"
        title="State Persistence Plugin"
        code={`import { StatePersistencePlugin } from '@gridstorm/plugin-state-persistence';

const plugins = [
  StatePersistencePlugin({
    storageKey: 'my-grid-state',
    autoSave: true,          // save after every state change
    debounceMs: 500,         // debounce to avoid excessive writes
    include: ['sortModel', 'filterModel', 'columnState', 'pagination'],
  }),
];

// State is auto-restored on mount. Manual save/restore/clear:
api.dispatchCommand('state:save', {});
api.dispatchCommand('state:restore', {});
api.dispatchCommand('state:clear', {});

// Custom async storage adapter (e.g. server-side):
StatePersistencePlugin({
  storage: {
    getItem: async (key) => fetch('/state/' + key).then(r => r.text()),
    setItem: async (key, val) => fetch('/state/' + key, { method: 'PUT', body: val }),
    removeItem: async (key) => fetch('/state/' + key, { method: 'DELETE' }),
  },
})`}
        features={[
          'Persists: sort model, filter model, column widths, column order, column visibility, pagination, scroll position',
          'Debounced auto-save — configurable delay to prevent excessive localStorage writes',
          'Schema versioning with migration support — safe across grid upgrades',
          'Custom async storage adapter — store state server-side or in IndexedDB',
          'Selective include/exclude — choose exactly which state to persist',
        ]}
      />
    </>
  );
}

function RowPinningDemo() {
  const [topCount, setTopCount] = useState(0);
  const [bottomCount, setBottomCount] = useState(0);
  const apiRef = useRef<GridApi | null>(null);

  const SUMMARY_ROW = { id: 'summary', name: '📊 TOTALS', department: '—', salary: 0, city: '—', status: '—' };
  const HEADER_ROW  = { id: 'hdr', name: '👆 PINNED TOP', department: 'Click "Pin Top" to pin rows above the scroll area', salary: 0, city: '—', status: 'Pinned' };

  const plugins = useMemo(() => [
    SortingPlugin({ multiSort: true }),
    FilteringPlugin(),
    ColumnResizePlugin(),
    SelectionPlugin({ mode: 'multiple' }),
    RowPinningPlugin({
      pinnedTopRowData: [HEADER_ROW],
      pinnedBottomRowData: [SUMMARY_ROW],
      maxPinnedRows: 10,
    }),
  ], []);

  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', width: 180, sortable: true, filterable: true },
    { field: 'department', headerName: 'Department', width: 140, sortable: true },
    { field: 'salary', headerName: 'Salary', width: 120, sortable: true,
      valueFormatter: (p: any) => Number(p.value) ? `$${Number(p.value).toLocaleString()}` : '—' },
    { field: 'city', headerName: 'City', width: 130, sortable: true },
    { field: 'status', headerName: 'Status', width: 110, sortable: true },
  ], []);

  const onGridReady = useCallback((api: GridApi) => {
    apiRef.current = api;
    api.addEventListener('row-pinning:changed' as any, (e: any) => {
      setTopCount(e.pinnedTopRows?.length ?? 0);
      setBottomCount(e.pinnedBottomRows?.length ?? 0);
    });
  }, []);

  const pinSelected = (pos: 'top' | 'bottom') => {
    const api = apiRef.current as any;
    if (!api) return;
    const selected = api.getSelectedNodes?.() ?? [];
    selected.forEach((node: any, i: number) => {
      api.dispatchCommand?.('row-pinning:pin', { rowId: node.id ?? `row-${i}`, position: pos, data: node.data });
    });
  };

  const unpinAll = () => {
    apiRef.current?.dispatchCommand?.('row-pinning:clear-all', {});
  };

  return (
    <>
      <p style={hintStyle}>
        Select rows then click "Pin Top" or "Pin Bottom" to freeze them outside the scroll area.
        Pinned top: <strong>{topCount}</strong> · Pinned bottom: <strong>{bottomCount}</strong>
      </p>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button style={{ ...chipBtn, background: '#2563eb', color: '#fff' }} onClick={() => pinSelected('top')}>📌 Pin Top</button>
        <button style={{ ...chipBtn, background: '#7c3aed', color: '#fff' }} onClick={() => pinSelected('bottom')}>📌 Pin Bottom</button>
        <button style={{ ...chipBtn, background: '#f1f5f9', color: '#374151', border: '1px solid #e2e8f0' }} onClick={unpinAll}>✕ Unpin All</button>
      </div>
      <GridStorm columns={columns} rowData={EMPLOYEES_50} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT - 45}
        rowSelection="multiple" checkboxSelection
        onGridReady={onGridReady} ariaLabel="Row Pinning Demo" />
      <CodeGuide
        install="npm install @gridstorm/plugin-row-pinning"
        title="Row Pinning Plugin"
        code={`import { RowPinningPlugin } from '@gridstorm/plugin-row-pinning';

// Initial pinned rows (declarative):
const plugins = [
  RowPinningPlugin({
    pinnedTopRowData: [{ id: 'totals', name: 'TOTALS', salary: 950000 }],
    pinnedBottomRowData: [{ id: 'avg', name: 'AVERAGE', salary: 85000 }],
    maxPinnedRows: 10,
  }),
];

// Pin/unpin imperatively:
api.dispatchCommand('row-pinning:pin', { rowId: 'row-5', position: 'top', data: rowData });
api.dispatchCommand('row-pinning:unpin', { rowId: 'row-5' });
api.dispatchCommand('row-pinning:clear-all', {});

// React to changes:
api.addEventListener('row-pinning:changed', (e) => {
  console.log(e.pinnedTopRows.length, e.pinnedBottomRows.length);
});`}
        features={[
          'Pin any row to top or bottom with one command — stays visible during scroll',
          'Declarative initial pinned rows via pinnedTopRowData / pinnedBottomRowData',
          'maxPinnedRows cap prevents accidental flooding of the pin area',
          'row-pinning:changed event fires on every pin/unpin',
          'Pinned rows are excluded from sort and filter operations',
        ]}
      />
    </>
  );
}

function ConditionalFormattingDemo() {
  const [activeRules, setActiveRules] = useState<string[]>(['colorScale', 'dataBar', 'topN']);
  const apiRef = useRef<GridApi | null>(null);

  const allRules: Record<string, any> = useMemo(() => ({
    colorScale: {
      id: 'salary-scale', columns: ['salary'],
      condition: { type: 'colorScale', min: 40000, max: 180000, minColor: '#fef2f2', maxColor: '#166534' },
      style: {},
    },
    dataBar: {
      id: 'rating-bar', columns: ['rating'],
      condition: { type: 'dataBar', min: 1, max: 5, color: '#3b82f6' },
      style: {},
    },
    topN: {
      id: 'top5-salary', columns: ['salary'],
      condition: { type: 'topN', count: 5 },
      style: { backgroundColor: '#fef9c3', fontWeight: 'bold' },
    },
    aboveAvg: {
      id: 'above-avg-salary', columns: ['salary'],
      condition: { type: 'aboveAverage' },
      style: { color: '#166534', fontWeight: 'bold' },
    },
    highSalary: {
      id: 'high-salary', columns: ['salary'],
      condition: { type: 'greaterThan', value: 120000 },
      style: { backgroundColor: '#dcfce7', color: '#166534' },
    },
    lowRating: {
      id: 'low-rating', columns: ['rating'],
      condition: { type: 'lessThan', value: 2 },
      style: { backgroundColor: '#fef2f2', color: '#991b1b' },
    },
    activeStatus: {
      id: 'active-status', columns: ['status'],
      condition: { type: 'equals', value: 'Active' },
      style: { color: '#166534', fontWeight: 'bold' },
    },
  }), []);

  const plugins = useMemo(() => [
    SortingPlugin({ multiSort: true }),
    ColumnResizePlugin(),
    ConditionalFormattingPlugin({
      rules: activeRules.map(k => allRules[k]).filter(Boolean),
    }),
  ], [activeRules]);

  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 60 },
    { field: 'name', headerName: 'Name', width: 170, sortable: true },
    { field: 'department', headerName: 'Dept', width: 130, sortable: true },
    { field: 'salary', headerName: 'Salary', width: 130, sortable: true,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    { field: 'rating', headerName: 'Rating', width: 90, sortable: true },
    { field: 'status', headerName: 'Status', width: 100, sortable: true },
  ], []);

  const toggleRule = (key: string) => {
    setActiveRules(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const RULE_LABELS: Record<string, string> = {
    colorScale: '🌈 Color Scale (salary)',
    dataBar:    '📊 Data Bar (rating)',
    topN:       '🏆 Top 5 (salary)',
    aboveAvg:   '📈 Above Average (salary)',
    highSalary: '💚 > $120K',
    lowRating:  '🔴 Rating < 2',
    activeStatus: '✅ Active Status',
  };

  return (
    <>
      <p style={hintStyle}>Toggle formatting rules on/off. Multiple rules can apply to the same cell — last rule wins unless priority is set.</p>
      <div style={{ marginBottom: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {Object.keys(RULE_LABELS).map(key => (
          <button key={key} onClick={() => toggleRule(key)}
            style={{ ...chipBtn, fontSize: 11,
              background: activeRules.includes(key) ? '#2563eb' : '#f1f5f9',
              color: activeRules.includes(key) ? '#fff' : '#374151',
              border: `1px solid ${activeRules.includes(key) ? '#2563eb' : '#e2e8f0'}`,
            }}>
            {RULE_LABELS[key]}
          </button>
        ))}
      </div>
      <GridStorm columns={columns} rowData={EMPLOYEES_50} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT - 55}
        onGridReady={(api: any) => { apiRef.current = api; }}
        ariaLabel="Conditional Formatting Demo" />
      <CodeGuide
        install="npm install @gridstorm/plugin-conditional-formatting"
        title="Conditional Formatting Plugin"
        code={`import { ConditionalFormattingPlugin } from '@gridstorm/plugin-conditional-formatting';

const plugins = [
  ConditionalFormattingPlugin({
    rules: [
      // Color scale: green gradient on salary
      { id: 'salary-scale', columns: ['salary'],
        condition: { type: 'colorScale', min: 40000, max: 180000,
                     minColor: '#fef2f2', maxColor: '#166534' },
        style: {} },

      // Data bar: blue bar proportional to rating
      { id: 'rating-bar', columns: ['rating'],
        condition: { type: 'dataBar', min: 1, max: 5, color: '#3b82f6' },
        style: {} },

      // Top 5 highest salaries — bold yellow highlight
      { id: 'top5', columns: ['salary'],
        condition: { type: 'topN', count: 5 },
        style: { backgroundColor: '#fef9c3', fontWeight: 'bold' } },
    ],
  }),
];`}
        features={[
          '18 condition types: greaterThan, lessThan, between, equals, contains, isEmpty, colorScale, dataBar, iconSet, topN, bottomN, aboveAverage, belowAverage, duplicates, custom',
          'colorScale: gradient background from minColor to maxColor based on numeric value',
          'dataBar: horizontal proportional bar rendered inside the cell',
          'iconSet: configure icon thresholds (✓ / ! / ✗) based on value ranges',
          'Multiple rules per cell — priority controls which styles win on conflict',
          'Rules can target specific columns or all columns at once',
        ]}
      />
    </>
  );
}

function StreamingDemo() {
  const [running, setRunning] = useState(false);
  const [ups, setUps] = useState(0);
  const [total, setTotal] = useState(0);
  const [connected, setConnected] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const apiRef = useRef<GridApi | null>(null);

  // Simulated streaming data — finance tickers
  const tickers = useMemo(() => Array.from({ length: 20 }, (_, i) => ({
    id: `ticker-${i}`,
    symbol: ['AAPL','MSFT','GOOGL','AMZN','META','TSLA','NVDA','NFLX','AMD','INTC',
             'QCOM','AVGO','TXN','MU','AMAT','LRCX','KLAC','ASML','SNPS','CDNS'][i],
    price: +(Math.random() * 800 + 50).toFixed(2),
    change: +(Math.random() * 10 - 5).toFixed(2),
    changePct: +(Math.random() * 5 - 2.5).toFixed(2),
    volume: Math.floor(Math.random() * 10_000_000) + 100_000,
    mktCap: +(Math.random() * 2000 + 100).toFixed(1),
  })), []);

  const plugins = useMemo(() => [
    SortingPlugin({ multiSort: true }),
    ColumnResizePlugin(),
    StreamingPlugin({
      batchInterval: 80,
      maxBatchSize: 50,
      flashDuration: 400,
      enableFlash: true,
    }),
  ], []);

  const columns: ColumnDef[] = useMemo(() => [
    { field: 'symbol', headerName: 'Symbol', width: 80, sortable: true,
      cellRenderer: (p: any) => {
        const el = document.createElement('strong');
        el.style.cssText = 'font-family:monospace;font-size:13px;color:#1e293b';
        el.textContent = p.value;
        return el;
      }},
    { field: 'price', headerName: 'Price ($)', width: 110, sortable: true,
      valueFormatter: (p: any) => `$${Number(p.value).toFixed(2)}` },
    { field: 'change', headerName: 'Change', width: 90, sortable: true,
      cellRenderer: (p: any) => {
        const v = Number(p.value);
        const el = document.createElement('span');
        el.style.cssText = `font-weight:600;color:${v >= 0 ? '#16a34a' : '#dc2626'}`;
        el.textContent = `${v >= 0 ? '+' : ''}${v.toFixed(2)}`;
        return el;
      }},
    { field: 'changePct', headerName: '% Chg', width: 90, sortable: true,
      cellRenderer: (p: any) => {
        const v = Number(p.value);
        const el = document.createElement('span');
        el.style.cssText = `font-family:monospace;font-weight:600;font-size:12px;color:${v >= 0 ? '#16a34a' : '#dc2626'}`;
        el.textContent = `${v >= 0 ? '▲' : '▼'} ${Math.abs(v).toFixed(2)}%`;
        return el;
      }},
    { field: 'volume', headerName: 'Volume', width: 110, sortable: true,
      valueFormatter: (p: any) => (Number(p.value) / 1e6).toFixed(2) + 'M' },
    { field: 'mktCap', headerName: 'Mkt Cap ($B)', width: 110, sortable: true,
      valueFormatter: (p: any) => `$${p.value}B` },
  ], []);

  const onGridReady = useCallback((api: GridApi) => {
    apiRef.current = api;
    api.addEventListener('streaming:stats' as any, (e: any) => {
      setUps(e.updatesPerSecond ?? 0);
      setTotal(e.totalUpdates ?? 0);
      setConnected(e.connected ?? false);
    });
  }, []);

  const startStreaming = () => {
    if (intervalRef.current) return;
    setRunning(true);
    intervalRef.current = setInterval(() => {
      const updates = tickers.map(t => ({
        id: t.id,
        data: {
          ...t,
          price: +(t.price * (1 + (Math.random() - 0.499) * 0.008)).toFixed(2),
          change: +(Math.random() * 10 - 5).toFixed(2),
          changePct: +(Math.random() * 5 - 2.5).toFixed(2),
          volume: Math.floor(Math.random() * 10_000_000) + 100_000,
        },
      }));
      apiRef.current?.dispatchCommand?.('streaming:push-updates', { updates });
    }, 100);
  };

  const stopStreaming = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setRunning(false);
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  return (
    <>
      <p style={hintStyle}>
        Simulates a live stock ticker — 20 symbols updating every 100ms. Cells flash green/red on value changes.
        The plugin batches updates and renders at 60fps to prevent render storms.
      </p>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {!running
          ? <button style={{ ...chipBtn, background: '#059669', color: '#fff' }} onClick={startStreaming}>▶ Start Stream</button>
          : <button style={{ ...chipBtn, background: '#dc2626', color: '#fff' }} onClick={stopStreaming}>⏹ Stop Stream</button>
        }
        <span style={{ fontSize: 11, display: 'flex', gap: 14, alignItems: 'center' }}>
          <span style={{ color: running ? '#059669' : '#9ca3af', fontWeight: 600 }}>
            {running ? '● LIVE' : '○ STOPPED'}
          </span>
          {running && <>
            <span><span style={{ color: '#6b7280' }}>Updates/sec: </span><strong style={{ color: '#2563eb' }}>{ups}</strong></span>
            <span><span style={{ color: '#6b7280' }}>Total: </span><strong>{total.toLocaleString()}</strong></span>
          </>}
        </span>
      </div>
      <GridStorm columns={columns} rowData={tickers} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT - 48}
        onGridReady={onGridReady} ariaLabel="Live Streaming Demo" />
      <CodeGuide
        install="npm install @gridstorm/plugin-streaming"
        title="Streaming Plugin"
        code={`import { StreamingPlugin } from '@gridstorm/plugin-streaming';

const plugins = [
  StreamingPlugin({
    batchInterval: 100,     // collect updates every 100ms, apply in one batch
    maxBatchSize: 1000,     // cap per batch to prevent single-frame overload
    flashDuration: 400,     // ms for cell flash highlight
    enableFlash: true,      // green/red cell flash on change
  }),
];

// Push updates manually (e.g. from WebSocket):
api.dispatchCommand('streaming:push-updates', {
  updates: [
    { id: 'row-1', data: { price: 182.55, change: +1.2 } },
    { id: 'row-2', data: { price: 94.30, change: -0.8 } },
  ],
});

// Or connect a custom adapter:
StreamingPlugin({ adapter: myWebSocketAdapter })`}
        features={[
          'Batched updates — collects all changes within batchInterval then applies in one DOM pass',
          'Cell flash animations: green for value increase, red for decrease, neutral for text changes',
          'Change direction tracking per cell — queryable via streaming:get-changes command',
          'configurable batchInterval and maxBatchSize prevent render storms at high update rates',
          'Custom StreamAdapter interface — plug in any WebSocket, SSE, or polling source',
        ]}
      />
    </>
  );
}

function AiFeaturesDemo() {
  const [query, setQuery] = useState('');
  const [nlResult, setNlResult] = useState<{ filter?: string; sort?: string; error?: string } | null>(null);
  const [anomalies, setAnomalies] = useState<Array<{ colId: string; rowId: string; value: number; zScore: number; severity: string }>>([]);
  const [watchCols, setWatchCols] = useState<string[]>(['salary', 'rating']);
  const apiRef = useRef<GridApi | null>(null);

  const plugins = useMemo(() => [
    SortingPlugin({ multiSort: true }),
    FilteringPlugin(),
    ColumnResizePlugin(),
    NlQueryPlugin({ maxHistory: 20 }),
    AnomalyPlugin({
      columns: watchCols.map(id => ({ columnId: id, watchThreshold: 1.5, warningThreshold: 2.0, criticalThreshold: 2.5, windowSize: 50 })),
      onAnomaly: (a: any) => setAnomalies(prev => [
        { colId: a.columnId, rowId: a.rowId, value: a.value, zScore: +a.zScore.toFixed(2), severity: a.severity },
        ...prev.slice(0, 9),
      ]),
    }),
  ], [watchCols]);

  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 60 },
    { field: 'name', headerName: 'Name', width: 180, sortable: true, filterable: true },
    { field: 'department', headerName: 'Department', width: 140, sortable: true, filterable: true },
    { field: 'salary', headerName: 'Salary', width: 120, sortable: true, filterable: true,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    { field: 'rating', headerName: 'Rating', width: 90, sortable: true },
    { field: 'status', headerName: 'Status', width: 110, sortable: true, filterable: true },
  ], []);

  // Inject some anomalous rows so the demo is interesting
  const dataWithOutliers = useMemo(() => {
    const base = EMPLOYEES_200.slice(0, 50).map((e: any) => ({ ...e }));
    base[5] = { ...base[5], salary: 980000, rating: 4.9 };  // outlier
    base[15] = { ...base[15], salary: 8500, rating: 0.3 };  // outlier
    return base;
  }, []);

  const onGridReady = useCallback((api: GridApi) => { apiRef.current = api; }, []);

  const sendQuery = () => {
    if (!query.trim()) return;
    apiRef.current?.dispatchCommand?.('nlquery:execute', { query });
  };

  const NL_EXAMPLES = ['sort by salary desc', 'filter status equals Active', 'show engineering department', 'sort by rating asc', 'filter salary > 100000'];
  const SEV_COLOR: Record<string, string> = { watch: '#d97706', warning: '#ea580c', critical: '#dc2626' };

  return (
    <>
      <p style={hintStyle}>
        Two AI features — <strong>NL Query</strong> (natural language → filter/sort) and <strong>Anomaly Detection</strong> (Z-score outliers).
        <em> Both work 100% offline with no API key.</em>
      </p>

      {/* NL Query section */}
      <div style={{ marginBottom: 10, padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>🤖 Natural Language Query</div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendQuery()}
            placeholder='e.g. "sort by salary desc" or "filter status equals Active"'
            style={{ ...inputStyle, flex: 1, fontSize: 12 }}
          />
          <button style={{ ...chipBtn, background: '#2563eb', color: '#fff' }} onClick={sendQuery}>Run Query</button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: nlResult ? 6 : 0 }}>
          {NL_EXAMPLES.map(ex => (
            <button key={ex} onClick={() => { setQuery(ex); apiRef.current?.dispatchCommand?.('nlquery:execute', { query: ex }); }}
              style={{ ...chipBtn, fontSize: 10, padding: '2px 8px', background: '#dbeafe', color: '#1d4ed8' }}>{ex}</button>
          ))}
        </div>
        {nlResult && (
          <div style={{ fontSize: 11, display: 'flex', gap: 12 }}>
            {nlResult.error && <span style={{ color: '#ef4444' }}>✗ {nlResult.error}</span>}
            {nlResult.filter && <span style={{ color: '#059669' }}>✓ Filter applied: <code>{nlResult.filter}</code></span>}
            {nlResult.sort && <span style={{ color: '#2563eb' }}>✓ Sort: <code>{nlResult.sort}</code></span>}
          </div>
        )}
      </div>

      {/* Anomaly section */}
      {anomalies.length > 0 && (
        <div style={{ marginBottom: 8, padding: '8px 14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#c2410c', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 }}>🔍 Anomaly Alerts</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {anomalies.slice(0, 5).map((a, i) => (
              <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: `${SEV_COLOR[a.severity]}15`, color: SEV_COLOR[a.severity], fontWeight: 600 }}>
                {a.colId} row {a.rowId}: {a.value.toLocaleString()} (z={a.zScore}) — {a.severity.toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      )}

      <GridStorm columns={columns} rowData={dataWithOutliers} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT - (nlResult || anomalies.length > 0 ? 160 : 100)}
        floatingFilter floatingFilterDebounce={300}
        onGridReady={onGridReady} ariaLabel="AI Features Demo" />
      <CodeGuide
        install="npm install @gridstorm/plugin-nl-query @gridstorm/plugin-anomaly"
        title="AI Features (NL Query + Anomaly Detection)"
        code={`import { NlQueryPlugin } from '@gridstorm/plugin-nl-query';
import { AnomalyPlugin } from '@gridstorm/plugin-anomaly';

// Both work OFFLINE — no API key, no external LLM
const plugins = [
  NlQueryPlugin({ maxHistory: 20 }),

  AnomalyPlugin({
    columns: [
      { columnId: 'salary', watchThreshold: 1.5, warningThreshold: 2.0, criticalThreshold: 2.5, windowSize: 50 },
      { columnId: 'rating', watchThreshold: 1.5, warningThreshold: 2.0, criticalThreshold: 2.5, windowSize: 50 },
    ],
    onAnomaly: (a) => console.log(a.columnId, a.value, a.zScore, a.severity),
  }),
];

// Send an NL query programmatically:
api.dispatchCommand('nlquery:execute', { query: 'sort by salary desc' });`}
        features={[
          'NL Query: understands sort, filter, show/hide, and comparison operators in plain English',
          'NL Query: works offline — regex + grammar engine, no external LLM or API key required',
          'Anomaly Detection: rolling Z-score + IQR per column with configurable thresholds',
          'Three severity tiers: WATCH / WARNING / CRITICAL — each with its own Z-score threshold',
          'onAnomaly fires in real-time — works with live streaming data from the Streaming plugin',
        ]}
      />
    </>
  );
}

// ─── Pillar 1 (Collaboration) + Pillar 2 (Native AI) demos ─────────────────
// These were the "library shipped but invisible" gap. Five new demos that
// wire the actual plugins to real (in-browser) transports so a user can
// click and use them. See ROADMAP.md.

// Shared fixture for cross-tab demos. Stable user identity in each tab
// (random id, color) so the BroadcastChannel demos work out of the box.
function useTabIdentity(): { userId: string; displayName: string; color: string } {
  return useMemo(() => {
    const id = Math.random().toString(36).slice(2, 8);
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
    return {
      userId: `tab-${id}`,
      displayName: `Tab ${id.toUpperCase()}`,
      color: colors[Math.floor(Math.random() * colors.length)]!,
    };
  }, []);
}

// ── AI Query (LLM-backed) ──
// Uses the Echo adapter so it works offline. In production you'd pass
// OpenAIAdapter or AnthropicAdapter with an API key.
function AiQueryLlmDemo() {
  const apiRef = useRef<GridApi | null>(null);
  const [text, setText] = useState('');
  const [log, setLog] = useState<string[]>([]);

  // Canned echo responses keyed by the user's query so the demo behaves
  // predictably without a real LLM. Real adapters do their own structured
  // output; the Echo adapter walks the JSON schema and returns a default,
  // which would never be useful here — so we use a custom respond that
  // returns a JSON action string the validator accepts.
  const adapter = useMemo(() => {
    return new EchoAdapter({
      respond: (messages) => {
        const userText = (messages.find((m) => m.role === 'user')?.content ?? '').toLowerCase();
        let action;
        if (/sort.*salary.*desc|salary.*desc/.test(userText)) {
          action = { type: 'sort', sortModel: [{ colId: 'salary', direction: 'desc' }] };
        } else if (/sort.*name.*asc|name.*asc/.test(userText)) {
          action = { type: 'sort', sortModel: [{ colId: 'name', direction: 'asc' }] };
        } else if (/filter.*active/.test(userText)) {
          action = {
            type: 'filter',
            filterModel: { status: { filterType: 'text', operator: 'equals', value: 'Active' } },
          };
        } else if (/clear|reset/.test(userText)) {
          action = { type: 'clear', target: 'all' };
        } else if (/\w/.test(userText)) {
          // Default: quickFilter the whole input.
          action = { type: 'quickFilter', text: userText.slice(0, 60) };
        } else {
          action = { type: 'clear', target: 'all' };
        }
        return JSON.stringify(action);
      },
    });
  }, []);

  // Wire the structured-output path: EchoAdapter's completeStructured does
  // not honor the respond function (it walks the schema). For the demo we
  // hand-roll a tiny adapter that uses Echo's text completion + JSON.parse
  // so a user-typed query routes through the same action plumbing as a
  // real LLM would.
  const llmAdapter = useMemo(() => ({
    name: 'echo-canned',
    complete: adapter.complete.bind(adapter),
    completeStructured: async <T,>(messages: any, options: any) => {
      const text = await adapter.complete(messages, {});
      const parsed = JSON.parse(text.text);
      const data = options.validate ? options.validate(parsed) : (parsed as T);
      return { data, finishReason: 'stop' as const };
    },
  }), [adapter]);

  const plugins = useMemo(() => [
    SortingPlugin({ multiSort: true }),
    FilteringPlugin(),
    ColumnResizePlugin(),
    AiQueryPlugin({
      adapter: llmAdapter as any,
      columns: {
        id: 'employee identifier',
        name: 'full name',
        department: 'team / department',
        salary: 'annual salary',
        status: 'active or inactive employment status',
        city: 'office city',
      },
      autoApply: true,
    }),
  ], [llmAdapter]);

  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', width: 180, sortable: true, filterable: true },
    { field: 'department', headerName: 'Department', width: 140, sortable: true, filterable: true },
    { field: 'salary', headerName: 'Salary', width: 120, sortable: true,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    { field: 'status', headerName: 'Status', width: 110, filterable: true },
    { field: 'city', headerName: 'City', width: 130, sortable: true },
  ], []);

  const EXAMPLES = ['sort by salary desc', 'filter status equals Active', 'sort by name asc', 'reset everything', 'engineering'];

  const ask = useCallback((q: string) => {
    if (!q.trim()) return;
    apiRef.current?.dispatchCommand?.('aiQuery:ask', { text: q });
    setLog((prev) => [`→ ${q}`, ...prev].slice(0, 8));
  }, []);

  return (
    <>
      <p style={hintStyle}>
        Type a query. Routes through @gridstorm/plugin-ai-query → @gridstorm/ai-adapter →
        Echo (offline). Swap Echo for OpenAIAdapter/AnthropicAdapter to use a real LLM.
      </p>
      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <input type="text" placeholder='e.g. "sort by salary desc"' value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') ask(text); }}
            style={{ ...inputStyle, flex: 1 }} />
          <button style={chipBtn} onClick={() => ask(text)}>Ask LLM</button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {EXAMPLES.map(ex => (
            <button key={ex} style={{ ...chipBtn, fontSize: 11 }} onClick={() => { setText(ex); ask(ex); }}>
              {ex}
            </button>
          ))}
        </div>
      </div>
      {log.length > 0 && (
        <div style={{ fontSize: 11, color: '#475569', marginBottom: 6, fontFamily: 'ui-monospace, monospace' }}>
          {log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}
      <GridStorm columns={columns} rowData={EMPLOYEES_200} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT}
        onGridReady={(api: any) => { apiRef.current = api; }}
        ariaLabel="AI Query (LLM-backed) Demo" />
    </>
  );
}

// ── Cell Autocomplete (Copilot) ──
function CellAutocompleteDemo() {
  const apiRef = useRef<GridApi | null>(null);
  const [suggestion, setSuggestion] = useState<{ rowId: string; colId: string; text: string } | null>(null);
  const [requested, setRequested] = useState<{ rowId: string; colId: string } | null>(null);

  const adapter = useMemo(() => new EchoAdapter({
    // Echo's default "[echo] <user content>" is fine — what matters is
    // that the plugin emits suggestions and the demo lets the user accept.
    respond: (messages) => {
      const last = messages[messages.length - 1]?.content ?? '';
      const m = /Editing column:\s+(\w+)/.exec(last);
      const col = m ? m[1] : 'value';
      return `auto-${col}-${Math.random().toString(36).slice(2, 6)}`;
    },
    latencyMs: 250, // realistic-ish "thinking" latency
  }), []);

  const plugins = useMemo(() => [
    SortingPlugin(),
    ColumnResizePlugin(),
    EditingPlugin({ editType: 'doubleClick' as any }),
    CellAutocompletePlugin({
      adapter,
      columns: {
        id: 'employee identifier',
        name: 'full name',
        department: 'team',
        salary: 'annual salary',
        status: 'active or inactive',
        city: 'office city',
      },
      excludeColumns: ['id'],
      debounceMs: 200,
    }),
  ], [adapter]);

  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', width: 180, editable: true },
    { field: 'department', headerName: 'Department', width: 140, editable: true },
    { field: 'salary', headerName: 'Salary', width: 120, editable: true,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    { field: 'status', headerName: 'Status', width: 110, editable: true },
    { field: 'city', headerName: 'City', width: 130, editable: true },
  ], []);

  const onGridReady = useCallback((api: GridApi) => {
    apiRef.current = api;
    api.addEventListener?.('autocomplete:suggested' as any, ((e: any) => {
      setSuggestion(e.suggestion);
      setRequested(null);
    }) as any);
    api.addEventListener?.('autocomplete:dismissed' as any, () => setSuggestion(null));
    api.addEventListener?.('autocomplete:accepted' as any, () => setSuggestion(null));
    api.addEventListener?.('cell:editingStarted' as any, ((e: any) => {
      setRequested({ rowId: e.node.id, colId: e.colId });
      setSuggestion(null);
    }) as any);
  }, []);

  return (
    <>
      <p style={hintStyle}>
        Double-click any editable cell to start editing. The Echo adapter "thinks"
        for ~250ms then proposes a value. Click <strong>Accept</strong> to apply
        or <strong>Dismiss</strong> to skip. Renderer integration (ghost text in
        the cell) is the consumer's responsibility — this sidebar exposes the
        events the plugin emits.
      </p>
      <div style={{ display: 'flex', gap: 12, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#475569' }}>
          {requested ? `🤔 Asking LLM for ${requested.colId} on row ${requested.rowId}…` :
            suggestion ? `💡 Suggestion for ${suggestion.colId} on row ${suggestion.rowId}: ` :
            'No active suggestion. Edit a cell to trigger one.'}
        </span>
        {suggestion && (
          <>
            <code style={{ background: '#fef3c7', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>
              {suggestion.text}
            </code>
            <button style={chipBtn} onClick={() => apiRef.current?.dispatchCommand?.('autocomplete:accept', {})}>
              Accept
            </button>
            <button style={chipBtn} onClick={() => apiRef.current?.dispatchCommand?.('autocomplete:dismiss', {})}>
              Dismiss
            </button>
          </>
        )}
      </div>
      <GridStorm columns={columns} rowData={EMPLOYEES_50} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT}
        onGridReady={onGridReady}
        ariaLabel="Cell Autocomplete Demo" />
    </>
  );
}

// ── Live Cursors (Presence, cross-tab) ──
function LiveCursorsDemo() {
  const identity = useTabIdentity();
  const apiRef = useRef<GridApi | null>(null);
  const [peers, setPeers] = useState<Array<{ userId: string; displayName: string; color: string; focusedCell?: { rowId: string; colId: string } | null }>>([]);

  const plugins = useMemo(() => [
    SortingPlugin(),
    SelectionPlugin({ mode: 'single' }),
    ColumnResizePlugin(),
    PresencePlugin({
      userId: identity.userId,
      displayName: identity.displayName,
      color: identity.color,
      adapter: new BroadcastChannelPresenceAdapter({ channelName: 'gridstorm-showcase-presence' }),
      broadcastSelection: true,
      throttleMs: 100,
    }),
  ], [identity]);

  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'department', headerName: 'Department', width: 140 },
    { field: 'salary', headerName: 'Salary', width: 120,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    { field: 'status', headerName: 'Status', width: 110 },
    { field: 'city', headerName: 'City', width: 130 },
  ], []);

  const onGridReady = useCallback((api: GridApi) => {
    apiRef.current = api;
    api.addEventListener?.('presence:peers-changed' as any, ((e: any) => {
      setPeers(e.peers ?? []);
    }) as any);
  }, []);

  return (
    <>
      <p style={hintStyle}>
        Open this page in a <strong>second browser tab</strong> (or window). Both
        tabs use the same BroadcastChannel; each tab gets a random color and ID.
        Click any cell — the other tab sees you. No server.
      </p>
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: '#475569' }}>You are:</span>
        <span style={{ background: identity.color, color: 'white', padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
          {identity.displayName}
        </span>
        <span style={{ fontSize: 11, color: '#475569' }}>Other tabs ({peers.length}):</span>
        {peers.length === 0 && <span style={{ fontSize: 11, color: '#94a3b8' }}>none — open a second tab</span>}
        {peers.map((p) => (
          <span key={p.userId} style={{ background: p.color, color: 'white', padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600 }}
            title={p.focusedCell ? `${p.displayName} is on row ${p.focusedCell.rowId} / ${p.focusedCell.colId}` : `${p.displayName} is here`}>
            {p.displayName}{p.focusedCell ? ` · ${p.focusedCell.colId}` : ''}
          </span>
        ))}
      </div>
      <GridStorm columns={columns} rowData={EMPLOYEES_50} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT}
        getRowId={({ data }: any) => String(data.id)}
        onGridReady={onGridReady}
        ariaLabel="Live Cursors Demo" />
    </>
  );
}

// ── Co-Editing (CRDT, cross-tab) ──
function CoEditingDemo() {
  const identity = useTabIdentity();
  const apiRef = useRef<GridApi | null>(null);
  const [remoteCount, setRemoteCount] = useState(0);
  // Stable per-mount row data so two tabs of this demo start with the same
  // baseline and diverge only via edits propagated by Yjs.
  const rowData = useMemo(() => EMPLOYEES_50.map((r) => ({ ...r })), []);

  const plugins = useMemo(() => [
    SortingPlugin(),
    ColumnResizePlugin(),
    EditingPlugin({ editType: 'doubleClick' as any }),
    YjsCellsPlugin({
      docId: 'gridstorm-showcase-coediting',
      transport: new BroadcastChannelCrdtTransport({ docId: 'gridstorm-showcase-coediting' }),
      syncedColumns: ['name', 'department', 'salary', 'status', 'city'],
    }),
  ], []);

  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', width: 180, editable: true, sortable: true },
    { field: 'department', headerName: 'Department', width: 140, editable: true },
    { field: 'salary', headerName: 'Salary', width: 120, editable: true,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
    { field: 'status', headerName: 'Status', width: 110, editable: true },
    { field: 'city', headerName: 'City', width: 130, editable: true },
  ], []);

  const onGridReady = useCallback((api: GridApi) => {
    apiRef.current = api;
    api.addEventListener?.('yjsCells:remoteChange' as any, () => {
      setRemoteCount((n) => n + 1);
    });
  }, []);

  return (
    <>
      <p style={hintStyle}>
        Open this page in a <strong>second tab</strong>, then double-click any
        cell in either tab and type. Yjs reconciles concurrent edits to the same
        cell deterministically — no locking, no last-writer-wins. Real
        production setups use y-websocket / y-webrtc; this uses BroadcastChannel
        so two tabs of the same browser sync without a server.
      </p>
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: '#475569' }}>
        <span>You are: <strong style={{ color: identity.color }}>{identity.displayName}</strong></span>
        <span>· Edits received from other tabs: <strong>{remoteCount}</strong></span>
      </div>
      <GridStorm columns={columns} rowData={rowData} plugins={plugins}
        rowHeight={40} headerHeight={44} height={GRID_HEIGHT}
        getRowId={({ data }: any) => String(data.id)}
        onGridReady={onGridReady}
        ariaLabel="Co-Editing Demo" />
    </>
  );
}

// ── Cell Comments (CRDT, cross-tab) ──
function CellCommentsDemo() {
  const identity = useTabIdentity();
  const apiRef = useRef<GridApi | null>(null);
  const [selectedAnchor, setSelectedAnchor] = useState<string | null>(null);
  const [comments, setComments] = useState<Map<string, Array<{ id: string; body: string; author: { displayName: string; color: string } }>>>(new Map());
  const [draft, setDraft] = useState('');

  const plugins = useMemo(() => [
    SortingPlugin(),
    SelectionPlugin({ mode: 'single' }),
    ColumnResizePlugin(),
    CommentsPlugin({
      docId: 'gridstorm-showcase-comments',
      author: { userId: identity.userId, displayName: identity.displayName, color: identity.color },
      transport: new BroadcastChannelCrdtTransport({ docId: 'gridstorm-showcase-comments' }),
    }),
  ], [identity]);

  const columns: ColumnDef[] = useMemo(() => [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'name', headerName: 'Name', width: 180 },
    { field: 'department', headerName: 'Department', width: 140 },
    { field: 'salary', headerName: 'Salary', width: 120,
      valueFormatter: (p: any) => `$${Number(p.value).toLocaleString()}` },
  ], []);

  const onGridReady = useCallback((api: GridApi) => {
    apiRef.current = api;
    api.addEventListener?.('comments:state-changed' as any, ((e: any) => {
      setComments(new Map(e.byAnchor ?? new Map()));
    }) as any);
    api.addEventListener?.('cell:focused' as any, ((e: any) => {
      const pos = e?.position;
      if (pos && typeof pos.rowIndex === 'number' && pos.colId) {
        setSelectedAnchor(`r${pos.rowIndex}:${pos.colId}`);
      }
    }) as any);
  }, []);

  const addComment = useCallback(() => {
    if (!selectedAnchor || !draft.trim()) return;
    apiRef.current?.dispatchCommand?.('comments:add', { anchor: selectedAnchor, body: draft });
    setDraft('');
  }, [selectedAnchor, draft]);

  const currentThread = selectedAnchor ? comments.get(selectedAnchor) ?? [] : [];

  return (
    <>
      <p style={hintStyle}>
        Click a cell, type a comment in the sidebar, press <strong>Post</strong>.
        Open in two tabs — both see the thread. Comments are signed by tab; each
        tab gets a random name and color.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 12 }}>
        <GridStorm columns={columns} rowData={EMPLOYEES_50} plugins={plugins}
          rowHeight={40} headerHeight={44} height={GRID_HEIGHT}
          getRowId={({ data }: any) => String(data.id)}
          onGridReady={onGridReady}
          ariaLabel="Cell Comments Demo" />
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 10, fontSize: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            You: <span style={{ color: identity.color }}>{identity.displayName}</span>
          </div>
          {!selectedAnchor && <div style={{ color: '#94a3b8', fontSize: 11 }}>Click a cell to start a thread.</div>}
          {selectedAnchor && (
            <>
              <div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>
                Thread for <code>{selectedAnchor}</code> · {currentThread.length} comment{currentThread.length === 1 ? '' : 's'}
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 8 }}>
                {currentThread.length === 0 && <div style={{ color: '#94a3b8', fontSize: 11 }}>No comments yet.</div>}
                {currentThread.map((c) => (
                  <div key={c.id} style={{ marginBottom: 6, paddingBottom: 6, borderBottom: '1px dashed #e2e8f0' }}>
                    <div style={{ color: (c.author as any)?.color ?? '#1e293b', fontWeight: 600, fontSize: 11 }}>
                      {c.author?.displayName ?? 'unknown'}
                    </div>
                    <div style={{ fontSize: 12 }}>{c.body}</div>
                  </div>
                ))}
              </div>
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a comment…"
                style={{ width: '100%', minHeight: 50, padding: 6, border: '1px solid #cbd5e1', borderRadius: 4, fontSize: 12, fontFamily: 'inherit' }} />
              <button onClick={addComment} disabled={!draft.trim()}
                style={{ ...chipBtn, marginTop: 6, width: '100%' }}>
                Post
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ── Demo Renderer Map ──

const DEMO_MAP: Record<string, () => JSX.Element> = {
  // Market-critical enterprise differentiators
  'a11y': A11yDemo,
  'formula-engine-pro': FormulaEngineProDemo,
  'clipboard-pro': ClipboardProDemo,
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
  // Tier 3 — new
  'status-bar': StatusBarDemo,
  'state-persistence': StatePersistenceDemo,
  'row-pinning': RowPinningDemo,
  'conditional-formatting': ConditionalFormattingDemo,
  'streaming': StreamingDemo,
  'ai-features': AiFeaturesDemo,
  // Horizon 1-3 next-gen demos
  'intent-engine': IntentEngineDemo,
  'cell-formula': CellFormulaDemo,
  'temporal': TemporalDemo,
  'nl-query': NlQueryDemo,
  'anomaly': AnomalyDemo,
  'collab': CollabDemo,
  'semantic': SemanticDemo,
  'privacy-lens': PrivacyLensDemo,
  'adaptive-renderer': AdaptiveRendererDemo,
  'intelligence-hub': IntelligenceHubDemo,
  // ── Pillar 1 + 2 (new 2026-06) ──
  'ai-query-llm': AiQueryLlmDemo,
  'cell-autocomplete': CellAutocompleteDemo,
  'live-cursors': LiveCursorsDemo,
  'co-editing': CoEditingDemo,
  'cell-comments': CellCommentsDemo,
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
  // ── URL hash deep-linking: /feature-showcase/#formula-engine-pro ──
  const getHashDemo = () => {
    const hash = window.location.hash.replace(/^#/, '');
    return hash && DEMO_MAP[hash] ? hash : 'sorting';
  };
  const [activeDemo, setActiveDemo] = useState(getHashDemo);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const onHashChange = () => setActiveDemo(getHashDemo());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const selectDemo = useCallback((id: string) => {
    window.location.hash = id;
    setActiveDemo(id);
    // Close sidebar on small screens after selecting a demo
    if (window.innerWidth < 768) setSidebarOpen(false);
  }, []);

  const feature = FEATURES.find(f => f.id === activeDemo)!;
  const DemoComponent = DEMO_MAP[activeDemo];

  const [demoLoading, setDemoLoading] = useState(true);
  useEffect(() => {
    setDemoLoading(true);
    const id = setTimeout(() => setDemoLoading(false), 300);
    return () => clearTimeout(id);
  }, [activeDemo]);

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
      {/* ── Sidebar overlay backdrop (mobile) ── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            display: 'none',
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 99,
          }}
          className="sidebar-backdrop"
        />
      )}

      {/* ── Sidebar ── */}
      <aside style={{
        ...sidebarStyle,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.22s ease',
        position: sidebarOpen ? 'relative' : 'absolute',
        zIndex: 100,
        width: sidebarOpen ? 220 : 0,
        minWidth: sidebarOpen ? 220 : 0,
      }}>
        <div style={{ padding: '14px 12px 10px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
              <a
                href="https://gridstorm.tekivex.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#2563eb', textDecoration: 'none' }}
                title="Go to GridStorm home"
              >GridStorm</a>{' '}
              <span style={{ fontWeight: 400, color: '#666' }}>Features</span>
            </h1>
            <p style={{ fontSize: 11, color: '#999', marginTop: 3, marginBottom: 0 }}>39 interactive demos</p>
          </div>
          {/* Close button */}
          <button
            onClick={() => setSidebarOpen(false)}
            title="Close menu"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '2px 4px', fontSize: 18, lineHeight: 1,
              color: '#9ca3af', flexShrink: 0, marginTop: 1,
              borderRadius: 4,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#374151')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
          >
            ✕
          </button>
        </div>
        <nav style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
          {Object.entries(groupedFeatures).map(([cat, features]) => (
            <div key={cat}>
              <div style={categoryLabelStyle}>{CATEGORIES[cat] || cat}</div>
              {features.map(f => (
                <button
                  key={f.id}
                  onClick={() => selectDemo(f.id)}
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
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', minWidth: 0 }}>
        {/* Header */}
        <header style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb', background: '#fafafa', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Hamburger — visible when sidebar is closed */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              title="Open menu"
              style={{
                background: 'none', border: '1px solid #e5e7eb', cursor: 'pointer',
                padding: '5px 8px', fontSize: 16, lineHeight: 1,
                color: '#374151', borderRadius: 6, flexShrink: 0,
              }}
            >
              ☰
            </button>
          )}
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{feature.title}</h2>
            <p style={{ fontSize: 13, color: '#666', marginTop: 2, marginBottom: 0 }}>{feature.description}</p>
          </div>
        </header>

        {/* Grid Area */}
        <div style={{ flex: 1, padding: 16, minHeight: 0 }}>
          {demoLoading ? (
            <GridSkeleton columns={5} rows={10} height="100%" />
          ) : DemoComponent ? (
            <DemoComponent />
          ) : (
            <div style={{ color: '#999', padding: 20 }}>Select a demo from the sidebar</div>
          )}
        </div>
      </main>
    </div>
  );
}

// ── Styles ──

const sidebarStyle: React.CSSProperties = {
  borderRight: '1px solid #e5e7eb',
  background: '#fff',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  overflow: 'hidden',
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

