// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── @gridstorm/vue — Public API ───

// Main component
export { GridStorm } from './GridStorm';

// Composables
export {
  GRID_CONTEXT_KEY,
  useGridApi,
  useGridEngine,
  useGridSort,
  useGridFilter,
  useGridSelection,
  useGridPagination,
  useGridEvent,
} from './composables';

// Vue adapter types
export type {
  GridContextValue,
  GridStormProps,
  GridStormEmits,
  GridStormExposed,
  GridSortResult,
  GridFilterResult,
  GridSelectionResult,
  GridPaginationResult,
} from './types';

// Re-export core types for convenience
export type {
  GridConfig,
  GridApi,
  GridState,
  ColumnDef,
  ColumnState,
  RowNode,
  GridPlugin,
  GridEventMap,
  SortModelItem,
  SortDirection,
  FilterModel,
  CellPosition,
  CellEditorDef,
  SelectionState,
  EditingState,
  PinnedPosition,
} from '@gridstorm/core';
