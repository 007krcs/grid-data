// ─── Svelte Adapter Types ───
// Central type definitions for the Svelte 5 GridStorm adapter.

import type { ColumnDef, GridPlugin, GridApi, GridEngine, RowNode } from '@gridstorm/core';

/**
 * Props for the GridStorm Svelte action.
 *
 * Defines column structure, row data, plugins, and behavioral options
 * for configuring a GridStorm instance within a Svelte component.
 *
 * @typeParam TData - The type of each row data object.
 */
export interface GridStormProps<TData = any> {
  /** Column definitions. */
  columns: ColumnDef<TData>[];
  /** Row data array. */
  rowData: TData[];
  /** Plugins to install. */
  plugins?: GridPlugin<TData>[];
  /** Row ID getter function. */
  getRowId?: (data: TData) => string;
  /** Row height in pixels. */
  rowHeight?: number;
  /** Header height in pixels. */
  headerHeight?: number;
  /** Theme identifier (e.g., 'light', 'dark'). */
  theme?: string;
  /** Density mode. */
  density?: 'compact' | 'normal' | 'comfortable';
  /** Container height. */
  height?: string | number;
  /** Container width. */
  width?: string | number;
  /** Additional CSS class for the container. */
  containerClass?: string;

  // ── Renderer feature options ──

  /** Enable inline cell editing overlay. */
  enableCellEditing?: boolean;
  /** Enable row grouping visual (chevron, indent, group label). */
  enableGrouping?: boolean;
  /** Show floating filter inputs below the header. */
  floatingFilter?: boolean;
  /** Show pagination bar below the grid. */
  enablePagination?: boolean;
  /** Number of rows per page when pagination is enabled. */
  paginationPageSize?: number;
}

/**
 * Context value exposing the grid engine and API.
 *
 * @typeParam TData - The type of each row data object.
 */
export interface GridStormContext<TData = any> {
  /** Get the GridApi instance, or null if not yet initialized. */
  getApi(): GridApi<TData> | null;
  /** Get the GridEngine instance, or null if not yet initialized. */
  getEngine(): GridEngine<TData> | null;
}

/**
 * Event handler callbacks for the GridStorm Svelte action.
 *
 * @typeParam TData - The type of each row data object.
 */
export interface GridStormEventHandlers<TData = any> {
  /** Fired when the grid engine is ready and the API is available. */
  onGridReady?: (api: GridApi<TData>) => void;
  /** Fired when the selection changes. */
  onSelectionChanged?: (selectedNodes: RowNode<TData>[]) => void;
  /** Fired when the sort model changes. */
  onSortChanged?: (sortModel: any[]) => void;
  /** Fired when the filter model changes. */
  onFilterChanged?: (filterModel: Record<string, any>) => void;
  /** Fired when a cell value is changed via editing. */
  onCellValueChanged?: (params: {
    rowId: string;
    field: string;
    oldValue: any;
    newValue: any;
  }) => void;
  /** Fired when a row is clicked. */
  onRowClicked?: (node: RowNode<TData>) => void;
  /** Fired when pagination state changes. */
  onPaginationChanged?: (params: {
    currentPage: number;
    pageSize: number;
    totalRows: number;
  }) => void;
  /** Fired when a column is resized. */
  onColumnResized?: (params: { colId: string; width: number }) => void;
}
