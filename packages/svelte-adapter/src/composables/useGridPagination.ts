// ─── Grid Pagination Helpers ───
// Convenience functions for managing pagination in Svelte components.

import { getGridApi } from './useGridApi';

/**
 * Pagination state snapshot.
 */
export interface PaginationState {
  /** Current page (zero-based). */
  currentPage: number;
  /** Rows per page. */
  pageSize: number;
  /** Total number of pages. */
  totalPages: number;
  /** Total row count. */
  totalRows: number;
}

/**
 * Get the current pagination state.
 *
 * @returns A snapshot of pagination state, or defaults if not available.
 */
export function getPaginationState(): PaginationState {
  const api = getGridApi();
  if (!api) {
    return { currentPage: 0, pageSize: 10, totalPages: 0, totalRows: 0 };
  }

  const state = api.getState();
  const pagination = state.pagination;
  const totalPages = Math.max(
    1,
    Math.ceil(pagination.totalRows / pagination.pageSize),
  );

  return {
    currentPage: pagination.currentPage,
    pageSize: pagination.pageSize,
    totalPages,
    totalRows: pagination.totalRows,
  };
}

/**
 * Navigate to a specific page (zero-based index).
 *
 * @param page - The zero-based page number to navigate to.
 */
export function goToPage(page: number): void {
  const api = getGridApi();
  if (!api) return;
  api.paginationGoToPage(page);
}
