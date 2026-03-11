// ─── Grid Filter Helpers ───
// Convenience functions for managing filter state in Svelte components.

import type { FilterModel } from '@gridstorm/core';
import { getGridApi } from './useGridApi';

/**
 * Get the current filter model for all columns.
 *
 * @returns Object keyed by column ID with active filter models,
 *          or an empty object if not available.
 */
export function getFilterModel(): Record<string, FilterModel> {
  const api = getGridApi();
  if (!api) return {};
  return api.getFilterModel();
}

/**
 * Set the filter model, replacing all active filters.
 *
 * @param model - Object keyed by column ID with filter models.
 */
export function setFilterModel(model: Record<string, FilterModel>): void {
  const api = getGridApi();
  if (!api) return;
  api.setFilterModel(model);
}

/**
 * Apply a quick filter across all columns.
 *
 * @param text - The filter text. Pass an empty string to clear.
 */
export function setQuickFilter(text: string): void {
  const api = getGridApi();
  if (!api) return;
  api.setQuickFilter(text);
}
