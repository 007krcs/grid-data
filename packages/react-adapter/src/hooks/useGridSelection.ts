// ─── useGridSelection Hook ───
// Selection state and actions.

import { useSyncExternalStore, useCallback } from 'react';
import type { RowNode } from '@gridstorm/core';
import { useGridContext } from '../context';

interface GridSelectionResult<TData = any> {
  /** Set of selected row IDs. */
  selectedRowIds: Set<string>;
  /** Number of selected rows. */
  selectedCount: number;
  /** Get selected row data objects. */
  getSelectedRows: () => TData[];
  /** Get selected RowNode objects. */
  getSelectedNodes: () => RowNode<TData>[];
  /** Check if a specific row is selected. */
  isRowSelected: (rowId: string) => boolean;
  /** Select all visible rows. */
  selectAll: () => void;
  /** Deselect all rows. */
  deselectAll: () => void;
}

/**
 * Access selection state and actions.
 *
 * @example
 * ```tsx
 * const { selectedCount, selectAll, deselectAll, isRowSelected } = useGridSelection();
 * ```
 */
export function useGridSelection<TData = any>(): GridSelectionResult<TData> {
  const { engine, api } = useGridContext<TData>();

  const selectedRowIds = useSyncExternalStore(
    (cb) => engine.store.subscribe(cb),
    () => engine.store.getState().selection.selectedRowIds,
  );

  const selectedCount = selectedRowIds.size;

  const isRowSelected = useCallback(
    (rowId: string) => selectedRowIds.has(rowId),
    [selectedRowIds],
  );

  const getSelectedRows = useCallback(() => api.getSelectedRows(), [api]);
  const getSelectedNodes = useCallback(() => api.getSelectedNodes(), [api]);
  const selectAll = useCallback(() => api.selectAll(), [api]);
  const deselectAll = useCallback(() => api.deselectAll(), [api]);

  return {
    selectedRowIds,
    selectedCount,
    getSelectedRows,
    getSelectedNodes,
    isRowSelected,
    selectAll,
    deselectAll,
  };
}
