// ─── Grid State Accessor ───
// Provides direct access to the grid store state via a selector function.

import type { GridState } from '@gridstorm/core';
import { getGridApi } from './useGridApi';

/**
 * Read a slice of the grid store state using a selector function.
 *
 * Returns `undefined` if the grid has not been initialized yet.
 * This function reads state synchronously (snapshot) and does not
 * set up a reactive subscription. For reactive state in Svelte 5,
 * subscribe to grid events or use `$effect` with periodic polling.
 *
 * @typeParam T - The type of the selected state slice.
 * @param selector - A function that extracts a value from the grid state.
 * @returns The selected state value, or `undefined` if not available.
 *
 * @example
 * ```ts
 * import { getGridState } from '@gridstorm/svelte';
 *
 * const sortModel = getGridState((state) => state.sortModel);
 * ```
 */
export function getGridState<T>(selector: (state: GridState) => T): T | undefined {
  const api = getGridApi();
  if (!api) return undefined;
  const state = api.getState();
  if (!state) return undefined;
  return selector(state);
}
