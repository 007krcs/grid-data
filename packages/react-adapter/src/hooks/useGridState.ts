// ─── useGridState Hook ───
// Selector-based reactive state subscription via useSyncExternalStore.

import { useSyncExternalStore } from 'react';
import type { GridState } from '@gridstorm/core';
import { useGridContext } from '../context';

/**
 * Subscribe to grid state changes with a selector.
 * Re-renders only when the selected value changes (reference equality).
 *
 * @example
 * ```tsx
 * const rowCount = useGridState(state => state.displayedRowIds.length);
 * const sortModel = useGridState(state => state.sortModel);
 * ```
 */
export function useGridState<TData = any, TResult = any>(
  selector: (state: GridState<TData>) => TResult,
): TResult {
  const { engine } = useGridContext<TData>();

  return useSyncExternalStore(
    (onStoreChange) => engine.store.subscribe(onStoreChange),
    () => selector(engine.store.getState() as GridState<TData>),
  );
}
