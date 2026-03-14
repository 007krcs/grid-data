// ─── useGridSort Hook ───
// Sort model state and actions.

import { useSyncExternalStore, useCallback } from 'react';
import type { SortModelItem } from '@gridstorm/core';
import { useGridContext } from '../context';

interface GridSortResult {
  /** Current sort model. */
  sortModel: SortModelItem[];
  /** Whether any sort is active. */
  isSorted: boolean;
  /** Set the sort model directly. */
  setSortModel: (model: SortModelItem[]) => void;
  /** Toggle sort on a column. */
  toggleSort: (colId: string, multiSort?: boolean) => void;
  /** Clear all sort. */
  clearSort: () => void;
}

/**
 * Access sort state and actions.
 *
 * @example
 * ```tsx
 * const { sortModel, isSorted, toggleSort, clearSort } = useGridSort();
 * ```
 */
export function useGridSort(): GridSortResult {
  const { engine, api } = useGridContext();

  const getSortSnapshot = useCallback(() => engine.store.getState().sortModel, [engine]);
  const subscribe = useCallback((cb: () => void) => engine.store.subscribe(cb), [engine]);

  const sortModel = useSyncExternalStore(
    subscribe,
    getSortSnapshot,
    getSortSnapshot,
  );

  const isSorted = sortModel.length > 0;

  const setSortModel = useCallback(
    (model: SortModelItem[]) => api.setSortModel(model),
    [api],
  );

  const toggleSort = useCallback(
    (colId: string, multiSort = false) => {
      engine.commandBus.dispatch('sort:toggle', { colId, multiSort });
    },
    [engine],
  );

  const clearSort = useCallback(() => api.setSortModel([]), [api]);

  return { sortModel, isSorted, setSortModel, toggleSort, clearSort };
}
