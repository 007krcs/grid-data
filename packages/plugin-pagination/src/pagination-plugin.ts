// ─── Pagination Plugin ───
// Provides client-side pagination with page navigation commands.
// Manages the pagination state slice and renders a pagination bar.

import type {
  GridPlugin,
  PluginContext,
} from '@gridstorm/core';

export interface PaginationPluginOptions {
  /** Number of rows per page. Default: 100. */
  pageSize?: number;
  /** Available page size options for the page size selector. Default: [25, 50, 100, 250]. */
  pageSizeOptions?: number[];
  /** Show page size selector. Default: true. */
  showPageSizeSelector?: boolean;
}

export function PaginationPlugin(options: PaginationPluginOptions = {}): GridPlugin {
  const {
    pageSize = 100,
    pageSizeOptions: _pageSizeOptions = [25, 50, 100, 250],
    showPageSizeSelector: _showPageSizeSelector = true,
  } = options;

  return {
    id: 'pagination',
    name: 'Pagination',
    version: '0.1.0',

    install(ctx: PluginContext) {
      // Set initial page size from options, but only if the engine hasn't already
      // configured a page size from the `paginationPageSize` grid option. The engine
      // initialises pagination.pageSize from config.paginationPageSize (defaulting to
      // 100), so only override when the plugin was explicitly given a pageSize option
      // that differs from the default of 100.
      const currentPageSize = ctx.store.getState().pagination.pageSize;
      const pluginHasExplicitPageSize = options.pageSize != null;
      const effectivePageSize = pluginHasExplicitPageSize ? pageSize : currentPageSize;

      if (effectivePageSize !== currentPageSize) {
        ctx.store.setState((prev) => ({
          ...prev,
          pagination: {
            ...prev.pagination,
            pageSize: effectivePageSize,
          },
        }));
      }

      // ── Register pagination:goToPage command ──
      const unregisterGoTo = ctx.commandBus.registerHandler(
        'pagination:goToPage',
        (payload: { page: number }) => {
          ctx.api.paginationGoToPage(payload.page);
        },
      );

      // ── Register pagination:nextPage command ──
      const unregisterNext = ctx.commandBus.registerHandler(
        'pagination:nextPage',
        () => {
          const current = ctx.api.paginationGetCurrentPage();
          const total = ctx.api.paginationGetTotalPages();
          if (current < total - 1) {
            ctx.api.paginationGoToPage(current + 1);
          }
        },
      );

      // ── Register pagination:prevPage command ──
      const unregisterPrev = ctx.commandBus.registerHandler(
        'pagination:prevPage',
        () => {
          const current = ctx.api.paginationGetCurrentPage();
          if (current > 0) {
            ctx.api.paginationGoToPage(current - 1);
          }
        },
      );

      // ── Register pagination:firstPage command ──
      const unregisterFirst = ctx.commandBus.registerHandler(
        'pagination:firstPage',
        () => {
          ctx.api.paginationGoToPage(0);
        },
      );

      // ── Register pagination:lastPage command ──
      const unregisterLast = ctx.commandBus.registerHandler(
        'pagination:lastPage',
        () => {
          const total = ctx.api.paginationGetTotalPages();
          ctx.api.paginationGoToPage(total - 1);
        },
      );

      // ── Register pagination:setPageSize command ──
      const unregisterPageSize = ctx.commandBus.registerHandler(
        'pagination:setPageSize',
        (payload: { pageSize: number }) => {
          ctx.store.setState((prev) => ({
            ...prev,
            pagination: {
              ...prev.pagination,
              pageSize: payload.pageSize,
              currentPage: 0,
            },
          }));

          // Trigger reprocess to apply new page size
          ctx.api.paginationGoToPage(0);
        },
      );

      return () => {
        unregisterGoTo();
        unregisterNext();
        unregisterPrev();
        unregisterFirst();
        unregisterLast();
        unregisterPageSize();
      };
    },
  };
}
