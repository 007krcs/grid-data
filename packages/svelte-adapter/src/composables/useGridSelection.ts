// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Grid Selection Helpers ───
// Convenience functions for managing row selection in Svelte components.

import type { RowNode } from '@gridstorm/core';
import { getGridApi } from './useGridApi';

/**
 * Get the currently selected row nodes.
 *
 * Returns an empty array if the grid has not been initialized yet.
 *
 * @typeParam TData - The type of each row data object.
 * @returns Array of selected RowNode objects.
 */
export function getSelectedRows<TData = any>(): RowNode<TData>[] {
  const api = getGridApi<TData>();
  if (!api) return [];
  return api.getSelectedNodes();
}

/**
 * Select all rows that pass the current filter.
 */
export function selectAll(): void {
  const api = getGridApi();
  if (!api) return;
  api.selectAll();
}

/**
 * Deselect all currently selected rows.
 */
export function deselectAll(): void {
  const api = getGridApi();
  if (!api) return;
  api.deselectAll();
}
