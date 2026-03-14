// ─── useGridPagination Hook ───
// Pagination state and navigation actions.

import { useSyncExternalStore, useCallback, useMemo } from 'react';
import { useGridContext } from '../context';

interface GridPaginationResult {
  /** Current page (0-indexed). */
  currentPage: number;
  /** Total number of pages. */
  totalPages: number;
  /** Rows per page. */
  pageSize: number;
  /** Total row count (after filtering). */
  totalRows: number;
  /** Is there a next page? */
  hasNextPage: boolean;
  /** Is there a previous page? */
  hasPreviousPage: boolean;
  /** Go to a specific page. */
  goToPage: (page: number) => void;
  /** Go to next page. */
  nextPage: () => void;
  /** Go to previous page. */
  previousPage: () => void;
  /** Go to first page. */
  firstPage: () => void;
  /** Go to last page. */
  lastPage: () => void;
}

/**
 * Access pagination state and actions.
 *
 * @example
 * ```tsx
 * const { currentPage, totalPages, nextPage, previousPage } = useGridPagination();
 * ```
 */
export function useGridPagination(): GridPaginationResult {
  const { engine, api } = useGridContext();

  const getPaginationSnapshot = () => engine.store.getState().pagination;

  const paginationState = useSyncExternalStore(
    (cb) => engine.store.subscribe(cb),
    getPaginationSnapshot,
    getPaginationSnapshot,
  );

  const { currentPage, pageSize, totalRows } = paginationState;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const hasNextPage = currentPage < totalPages - 1;
  const hasPreviousPage = currentPage > 0;

  const goToPage = useCallback(
    (page: number) => api.paginationGoToPage(page),
    [api],
  );

  const nextPage = useCallback(() => {
    if (hasNextPage) api.paginationGoToPage(currentPage + 1);
  }, [api, currentPage, hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) api.paginationGoToPage(currentPage - 1);
  }, [api, currentPage, hasPreviousPage]);

  const firstPage = useCallback(() => api.paginationGoToPage(0), [api]);

  const lastPage = useCallback(
    () => api.paginationGoToPage(totalPages - 1),
    [api, totalPages],
  );

  return useMemo(
    () => ({
      currentPage,
      totalPages,
      pageSize,
      totalRows,
      hasNextPage,
      hasPreviousPage,
      goToPage,
      nextPage,
      previousPage,
      firstPage,
      lastPage,
    }),
    [
      currentPage,
      totalPages,
      pageSize,
      totalRows,
      hasNextPage,
      hasPreviousPage,
      goToPage,
      nextPage,
      previousPage,
      firstPage,
      lastPage,
    ],
  );
}
