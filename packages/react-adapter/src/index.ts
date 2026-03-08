// ─── @gridstorm/react — Public API ───

// Main component
export { GridStorm } from './GridStorm';
export { GridErrorBoundary } from './ErrorBoundary';

// Context
export { GridContext, useGridContext } from './context';
export type { GridContextValue } from './context';

// Hooks
export { useGridApi } from './hooks/useGridApi';
export { useGridState } from './hooks/useGridState';
export { useGridSelection } from './hooks/useGridSelection';
export { useGridSort } from './hooks/useGridSort';
export { useGridFilter } from './hooks/useGridFilter';
export { useGridPagination } from './hooks/useGridPagination';
export { useGridEvent } from './hooks/useGridEvent';
export { useGridColumn } from './hooks/useGridColumn';

// Renderer wrappers (for creating React cell/header renderers)
export { reactCellRenderer, isReactCellRenderer } from './renderers/ReactCellRenderer';
export { reactHeaderRenderer, isReactHeaderRenderer } from './renderers/ReactHeaderRenderer';

// React-specific types
export type {
  CellRendererProps,
  ReactCellRenderer,
  HeaderRendererProps,
  ReactHeaderRenderer,
  CellEditorProps,
  ReactCellEditor,
  ContextMenuProps,
  ReactContextMenu,
  ReactColumnDef,
  ControlledStateProps,
  GridStormEventProps,
  GridStormProps,
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
