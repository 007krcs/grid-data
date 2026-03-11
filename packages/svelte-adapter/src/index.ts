// ─── @gridstorm/svelte — Public API ───

// Main Svelte action
export { gridstormAction } from './gridstorm-action';
export type { GridStormActionParams } from './gridstorm-action';

// Svelte adapter types
export type {
  GridStormProps,
  GridStormContext,
  GridStormEventHandlers,
} from './types';

// API store
export { setGridApi, getGridApi, onGridApiChange } from './composables/useGridApi';

// State accessor
export { getGridState } from './composables/useGridState';

// Event subscription
export { subscribeToGridEvent } from './composables/useGridEvent';

// Selection helpers
export { getSelectedRows, selectAll, deselectAll } from './composables/useGridSelection';

// Sort helpers
export { getSortModel, setSortModel } from './composables/useGridSort';

// Filter helpers
export { getFilterModel, setFilterModel, setQuickFilter } from './composables/useGridFilter';

// Pagination helpers
export { getPaginationState, goToPage } from './composables/useGridPagination';
export type { PaginationState } from './composables/useGridPagination';

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
