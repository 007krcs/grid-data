// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── useGridFilter Hook ───
// Filter model state and actions.

import { useSyncExternalStore, useCallback } from 'react';
import type { FilterModel } from '@gridstorm/core';
import { useGridContext } from '../context';

interface GridFilterResult {
  /** Current filter model (keyed by column ID). */
  filterModel: Record<string, FilterModel>;
  /** Current quick filter text. */
  quickFilterText: string;
  /** Whether any filter is active. */
  isFiltered: boolean;
  /** Set the filter model. */
  setFilterModel: (model: Record<string, FilterModel>) => void;
  /** Set quick filter text. */
  setQuickFilter: (text: string) => void;
  /** Clear all filters. */
  clearFilters: () => void;
}

/**
 * Access filter state and actions.
 *
 * @example
 * ```tsx
 * const { isFiltered, setQuickFilter, clearFilters } = useGridFilter();
 * ```
 */
export function useGridFilter(): GridFilterResult {
  const { engine, api } = useGridContext();

  const getFilterSnapshot = useCallback(() => engine.store.getState().filterModel, [engine]);
  const getQuickFilterSnapshot = useCallback(() => engine.store.getState().quickFilterText, [engine]);
  const subscribe = useCallback((cb: () => void) => engine.store.subscribe(cb), [engine]);

  const filterModel = useSyncExternalStore(
    subscribe,
    getFilterSnapshot,
    getFilterSnapshot,
  );

  const quickFilterText = useSyncExternalStore(
    subscribe,
    getQuickFilterSnapshot,
    getQuickFilterSnapshot,
  );

  const isFiltered =
    Object.keys(filterModel).length > 0 || quickFilterText.length > 0;

  const setFilterModel = useCallback(
    (model: Record<string, FilterModel>) => api.setFilterModel(model),
    [api],
  );

  const setQuickFilter = useCallback(
    (text: string) => api.setQuickFilter(text),
    [api],
  );

  const clearFilters = useCallback(() => {
    api.setFilterModel({});
    api.setQuickFilter('');
  }, [api]);

  return {
    filterModel,
    quickFilterText,
    isFiltered,
    setFilterModel,
    setQuickFilter,
    clearFilters,
  };
}
