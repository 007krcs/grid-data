// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Master-Detail Types ───

import type { RowNode } from '@gridstorm/core';

export interface MasterDetailOptions {
  /**
   * Returns grid configuration options for the detail grid.
   * Called when a master row is expanded to configure the nested detail view.
   */
  detailGridOptions?: (params: DetailGridParams) => any;

  /**
   * Fetches the detail row data for a given master row.
   * Can return data synchronously or use the successCallback for async loading.
   */
  getDetailRowData: (params: DetailDataParams) => any[] | Promise<any[]>;

  /**
   * Height of the detail row in pixels, or a function that returns height per row.
   * Default: 200.
   */
  detailRowHeight?: number | ((params: DetailHeightParams) => number);

  /**
   * When true, keeps detail grids alive (cached) when collapsed.
   * Default: false.
   */
  keepDetailRows?: boolean;

  /**
   * When true, detail rows span the full width of the grid.
   * Default: true.
   */
  embedFullWidthRows?: boolean;
}

export interface DetailGridParams {
  /** The master row node. */
  node: RowNode;
  /** The master row data. */
  data: any;
}

export interface DetailDataParams {
  /** The master row node. */
  node: RowNode;
  /** The master row data. */
  data: any;
  /** Callback for async data loading. */
  successCallback: (rowData: any[]) => void;
}

export interface DetailHeightParams {
  /** The master row node. */
  node: RowNode;
  /** The master row data. */
  data: any;
}

export interface DetailState {
  /** Set of expanded master row IDs. */
  expandedMasterIds: Set<string>;
  /** Cache of detail row data keyed by master row ID. */
  detailCache: Map<string, any[]>;
}
