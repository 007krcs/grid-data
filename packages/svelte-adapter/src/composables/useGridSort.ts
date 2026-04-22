// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Grid Sort Helpers ───
// Convenience functions for managing sort state in Svelte components.

import type { SortModelItem } from '@gridstorm/core';
import { getGridApi } from './useGridApi';

/**
 * Get the current sort model.
 *
 * @returns Array of active sort items, or an empty array if not available.
 */
export function getSortModel(): SortModelItem[] {
  const api = getGridApi();
  if (!api) return [];
  return api.getSortModel();
}

/**
 * Set the sort model, replacing any existing sort configuration.
 *
 * @param model - Array of sort items specifying column and direction.
 */
export function setSortModel(model: SortModelItem[]): void {
  const api = getGridApi();
  if (!api) return;
  api.setSortModel(model);
}
