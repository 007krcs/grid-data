// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── useGridColumn Hook ───
// Column state and manipulation actions.

import { useSyncExternalStore, useCallback, useMemo } from 'react';
import type { ColumnState, PinnedPosition } from '@gridstorm/core';
import { useGridContext } from '../context';

interface GridColumnResult {
  /** All columns (including hidden). */
  allColumns: ColumnState[];
  /** Only visible columns. */
  visibleColumns: ColumnState[];
  /** Set a column's visibility. */
  setColumnVisible: (colId: string, visible: boolean) => void;
  /** Set a column's width. */
  setColumnWidth: (colId: string, width: number) => void;
  /** Move a column to a new index. */
  moveColumn: (colId: string, toIndex: number) => void;
  /** Pin a column. */
  setColumnPinned: (colId: string, pinned: PinnedPosition) => void;
  /** Get a single column by ID. */
  getColumn: (colId: string) => ColumnState | undefined;
}

/**
 * Access column state and actions.
 *
 * @example
 * ```tsx
 * const { visibleColumns, setColumnVisible, setColumnWidth } = useGridColumn();
 * ```
 */
export function useGridColumn(): GridColumnResult {
  const { engine, api } = useGridContext();

  const getColumnsSnapshot = useCallback(() => engine.store.getState().columns, [engine]);
  const subscribe = useCallback((cb: () => void) => engine.store.subscribe(cb), [engine]);

  const allColumns = useSyncExternalStore(
    subscribe,
    getColumnsSnapshot,
    getColumnsSnapshot,
  );

  const visibleColumns = useMemo(
    () => allColumns.filter((c) => !c.hide),
    [allColumns],
  );

  const setColumnVisible = useCallback(
    (colId: string, visible: boolean) => api.setColumnVisible(colId, visible),
    [api],
  );

  const setColumnWidth = useCallback(
    (colId: string, width: number) => api.setColumnWidth(colId, width),
    [api],
  );

  const moveColumn = useCallback(
    (colId: string, toIndex: number) => api.moveColumn(colId, toIndex),
    [api],
  );

  const setColumnPinned = useCallback(
    (colId: string, pinned: PinnedPosition) =>
      api.setColumnPinned(colId, pinned),
    [api],
  );

  const getColumn = useCallback(
    (colId: string) => api.getColumn(colId),
    [api],
  );

  return {
    allColumns,
    visibleColumns,
    setColumnVisible,
    setColumnWidth,
    moveColumn,
    setColumnPinned,
    getColumn,
  };
}
