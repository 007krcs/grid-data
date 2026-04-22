// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Angular-Specific Types for GridStorm ───

import type { GridApi, GridConfig, ColumnDef, GridPlugin } from '@gridstorm/core';

/**
 * Input configuration for the GridStorm Angular component.
 *
 * Maps GridConfig properties to Angular `@Input()` bindings.
 * All properties are optional and match the core GridConfig interface.
 *
 * @typeParam TData - The type of each row data object.
 */
export interface GridStormInputs<TData = any> {
  /** Column definitions describing each column's structure and behavior. */
  columns: ColumnDef<TData>[];

  /** Client-side row data array. */
  rowData: TData[];

  /** Array of plugins to install during grid initialization. */
  plugins: GridPlugin<TData>[];

  /** Callback to generate a unique string ID for each row. */
  getRowId?: GridConfig<TData>['getRowId'];

  /** Height of each data row in pixels. */
  rowHeight: number;

  /** Theme identifier: 'light', 'dark', or custom theme name. */
  theme: string;

  /** Density mode: 'compact', 'normal', or 'comfortable'. */
  density: string;

  /** Default column definition applied to all columns as fallback. */
  defaultColDef?: Partial<ColumnDef<TData>>;

  /** Number of rows per page when pagination is enabled. */
  paginationPageSize?: number;

  /** Height of the header row in pixels. */
  headerHeight?: number;

  /** Controls how the grid's DOM height is determined. */
  domLayout?: GridConfig<TData>['domLayout'];

  /** Row selection mode: 'single', 'multiple', or false. */
  rowSelection?: GridConfig<TData>['rowSelection'];

  /** When true, enables client-side pagination. */
  pagination?: boolean;

  /** ARIA label for the grid root element. */
  ariaLabel?: string;
}

/**
 * Event payloads emitted by the GridStorm Angular component.
 *
 * These are emitted through Angular `@Output()` EventEmitter bindings,
 * bridging core engine events to Angular's event system.
 *
 * @typeParam TData - The type of each row data object.
 */
export interface GridStormOutputs<TData = any> {
  /** Emitted when the grid engine is fully initialized and the API is ready. */
  gridReady: GridApi<TData>;

  /** Emitted when row data changes. */
  rowDataChanged: { rowData: TData[] };

  /** Emitted when the selection state changes. */
  selectionChanged: { selectedNodes: any[]; source: string };

  /** Emitted when the sort model changes. */
  sortChanged: { sortModel: any[] };

  /** Emitted when the filter model changes. */
  filterChanged: { filterModel: Record<string, any> };

  /** Emitted when a cell value is changed through editing. */
  cellValueChanged: { node: any; colId: string; oldValue: any; newValue: any };
}

/**
 * Options for the GridStormService `registerApi` call.
 */
export interface GridRegistration {
  /** Unique identifier for this grid instance. */
  id: string;

  /** The grid API instance. */
  api: GridApi;
}
