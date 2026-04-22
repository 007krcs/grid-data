// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── React Adapter Types ───
// Central type definitions for all React-specific interfaces.

import type { ComponentType, ReactNode } from 'react';
import type {
  ColumnDef,
  ColumnState,
  SortModelItem,
  SortDirection,
  FilterModel,
  GridApi,
  GridConfig,
  GridEventMap,
  RowNode,
  CellPosition,
  EditingState,
  SelectionSource,
} from '@gridstorm/core';

// ── Cell Renderer ──

/** Props passed to React cell renderer components. */
export interface CellRendererProps<TData = any, TValue = any> {
  /** The cell's current value (after valueGetter). */
  value: TValue;
  /** The formatted display value (after valueFormatter). */
  formattedValue: string;
  /** The row data object. */
  data: TData | undefined;
  /** The RowNode for this row. */
  node: RowNode<TData>;
  /** Column definition. */
  colDef: ColumnDef<TData, TValue>;
  /** Column ID. */
  colId: string;
  /** Display row index. */
  rowIndex: number;
  /** Grid API reference. */
  api: GridApi<TData>;
}

/** A React component used as a cell renderer. */
export type ReactCellRenderer<TData = any, TValue = any> =
  ComponentType<CellRendererProps<TData, TValue>>;

// ── Header Renderer ──

/** Props passed to React header renderer components. */
export interface HeaderRendererProps<TData = any> {
  /** Column definition. */
  colDef: ColumnDef<TData>;
  /** Column ID. */
  colId: string;
  /** Display name for the header. */
  displayName: string;
  /** Current sort direction for this column. */
  sortDirection: SortDirection;
  /** Sort priority index (for multi-sort). */
  sortIndex: number | null;
  /** Grid API reference. */
  api: GridApi<TData>;
  /** Function to request sort toggle. */
  onSortRequested: (multiSort: boolean) => void;
}

/** A React component used as a header renderer. */
export type ReactHeaderRenderer<TData = any> =
  ComponentType<HeaderRendererProps<TData>>;

// ── Cell Editor ──

/** Props passed to React cell editor components. */
export interface CellEditorProps<TData = any, TValue = any> {
  /** Current cell value. */
  value: TValue;
  /** Row data. */
  data: TData;
  /** Column ID. */
  colId: string;
  /** Row ID. */
  rowId: string;
  /** Column state. */
  column: ColumnState;
  /** Additional editor params from column def. */
  editorParams: Record<string, unknown>;
  /** Callback to update the value while editing. */
  onValueChange: (value: TValue) => void;
  /** Callback to stop editing. */
  stopEditing: (cancel?: boolean) => void;
  /** Grid API reference. */
  api: GridApi<TData>;
}

/** A React component used as a cell editor. */
export type ReactCellEditor<TData = any, TValue = any> =
  ComponentType<CellEditorProps<TData, TValue>>;

// ── Context Menu ──

/** Props passed to a context menu component. */
export interface ContextMenuProps<TData = any> {
  /** The cell position that was right-clicked. */
  position: CellPosition;
  /** The row node. */
  node: RowNode<TData>;
  /** Column ID. */
  colId: string;
  /** Cell value. */
  value: any;
  /** Grid API. */
  api: GridApi<TData>;
  /** Close the menu. */
  closeMenu: () => void;
}

/** A React component used as a context menu. */
export type ReactContextMenu<TData = any> = ComponentType<ContextMenuProps<TData>>;

// ── Extended Column Definition ──

/**
 * Column definition that supports React component renderers.
 * Extends the core ColumnDef to accept React components for
 * cellRenderer, headerRenderer, and cellEditorComponent.
 */
export interface ReactColumnDef<TData = any, TValue = any>
  extends Omit<ColumnDef<TData, TValue>, 'cellRenderer' | 'headerRenderer'> {
  /** Original string/HTMLElement renderer OR React component. */
  cellRenderer?:
    | ColumnDef<TData, TValue>['cellRenderer']
    | ReactCellRenderer<TData, TValue>;
  /** Original string/HTMLElement header renderer OR React component. */
  headerRenderer?:
    | ColumnDef<TData>['headerRenderer']
    | ReactHeaderRenderer<TData>;
  /** React component cell editor (alternative to cellEditor string name). */
  cellEditorComponent?: ReactCellEditor<TData, TValue>;
}

// ── Controlled State Props ──

/** Props for controlled mode — parent owns state. */
export interface ControlledStateProps<_TData = any> {
  /** Controlled sort model. When provided, grid won't update sort internally. */
  sortModel?: SortModelItem[];
  /** Called when user tries to change sort (controlled mode). */
  onSortModelChange?: (sortModel: SortModelItem[]) => void;
  /** Controlled filter model. */
  filterModel?: Record<string, FilterModel>;
  /** Called when user tries to change filters. */
  onFilterModelChange?: (filterModel: Record<string, FilterModel>) => void;
  /** Controlled selection (set of row IDs). */
  selectedRowIds?: Set<string>;
  /** Called when user tries to change selection. */
  onSelectedRowIdsChange?: (
    selectedRowIds: Set<string>,
    source: SelectionSource,
  ) => void;
  /** Controlled pagination page. */
  currentPage?: number;
  /** Called when user tries to change page. */
  onCurrentPageChange?: (page: number) => void;
}

// ── Event Callback Props ──

/** All supported event callback props for the GridStorm component. */
export interface GridStormEventProps<TData = any> {
  onGridReady?: (api: GridApi<TData>) => void;
  onRowDataChanged?: (event: GridEventMap<TData>['rowData:changed']) => void;
  onSelectionChanged?: (event: GridEventMap<TData>['selection:changed']) => void;
  onSortChanged?: (event: GridEventMap<TData>['column:sort:changed']) => void;
  onFilterChanged?: (event: GridEventMap<TData>['filter:changed']) => void;
  onCellValueChanged?: (event: GridEventMap<TData>['cell:valueChanged']) => void;
  onCellClicked?: (event: GridEventMap<TData>['cell:clicked']) => void;
  onCellDoubleClicked?: (event: GridEventMap<TData>['cell:doubleClicked']) => void;
  onRowClicked?: (event: GridEventMap<TData>['row:clicked']) => void;
  onCellEditingStarted?: (event: GridEventMap<TData>['cell:editingStarted']) => void;
  onCellEditingStopped?: (event: GridEventMap<TData>['cell:editingStopped']) => void;
  onPaginationChanged?: (event: GridEventMap<TData>['pagination:changed']) => void;
  onColumnResized?: (event: GridEventMap<TData>['column:resized']) => void;
}

// ── Portal Tracking ──

/** A portal entry for a cell renderer or header renderer. */
export interface PortalEntry {
  /** Unique key (rowId:colId). */
  key: string;
  /** Target DOM element to portal into. */
  container: HTMLElement;
  /** React element to render. */
  element: ReactNode;
}

/** State for the active editor portal. */
export interface EditorPortalState {
  /** The editing state from the core. */
  editing: EditingState;
  /** The target cell DOM element. */
  cellElement: HTMLElement;
  /** Bounding rect of the cell relative to grid root. */
  cellRect: DOMRect;
}

// ── GridStorm Props ──

// ── Renderer Config Props ──

/** Options forwarded to the DomRenderer for Tier 1 feature rendering. */
export interface RendererConfigProps {
  /** Enable inline cell editing overlay. Default: auto-detect EditingPlugin. */
  enableCellEditing?: boolean;
  /** Enable row grouping visual (chevron, indent, group label). Default: auto-detect GroupingPlugin. */
  enableGrouping?: boolean;
  /** Indentation per group level in pixels. Default: 24. */
  groupIndent?: number;
  /** Show checkbox selection column as the first column. Default: false. */
  checkboxSelection?: boolean;
  /** Width of the checkbox column in pixels. Default: 48. */
  checkboxColumnWidth?: number;
  /** Show floating filter inputs below the header. Default: false. */
  floatingFilter?: boolean;
  /** Debounce delay for filter input in ms. Default: 300. */
  floatingFilterDebounce?: number;
  /** Show pagination bar below the grid. Default: auto-detect PaginationPlugin. */
  enablePagination?: boolean;
  /** Available page size options for the page size selector. Default: [25, 50, 100, 250]. */
  pageSizeOptions?: number[];
}

/** Full props interface for the <GridStorm> component. */
export interface GridStormProps<TData = any>
  extends Omit<
      GridConfig<TData>,
      | 'columns'
      | 'onGridReady'
      | 'onRowDataChanged'
      | 'onSelectionChanged'
      | 'onSortChanged'
      | 'onFilterChanged'
      | 'onCellValueChanged'
    >,
    ControlledStateProps<TData>,
    GridStormEventProps<TData>,
    RendererConfigProps {
  /** Column definitions (supports React component renderers). */
  columns: ReactColumnDef<TData>[];
  /** Container height. Default: 400. */
  height?: number | string;
  /** Container width. Default: '100%'. */
  width?: number | string;
  /** Additional CSS class for the container. */
  containerClass?: string;
  /** Additional inline styles for the container. */
  containerStyle?: React.CSSProperties;
  /** Custom context menu component. */
  contextMenu?: ReactContextMenu<TData>;
  /** Children (rendered for context consumers). */
  children?: ReactNode;
}
