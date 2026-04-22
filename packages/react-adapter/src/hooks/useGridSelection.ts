// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
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

  const getSelectionSnapshot = useCallback(() => engine.store.getState().selection.selectedRowIds, [engine]);
  const subscribe = useCallback((cb: () => void) => engine.store.subscribe(cb), [engine]);

  const selectedRowIds = useSyncExternalStore(
    subscribe,
    getSelectionSnapshot,
    getSelectionSnapshot,
  );

  const selectedCount = selectedRowIds.size;

  const isRowSelected = useCallback(
    (rowId: string) =>
      engine.store.getState().selection.selectedRowIds.has(rowId),
    [engine],
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
