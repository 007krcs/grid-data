// ─── Column Pinning Plugin ───
// Provides commands for pinning/unpinning columns to left or right edges.
// Enforces max pinned limits and reorders columns for proper rendering.

import type { GridPlugin, PluginContext, ColumnState } from '@gridstorm/core';

export interface ColumnPinningPluginOptions {
  /** Maximum number of columns that can be pinned left. Default: Infinity. */
  maxPinnedLeft?: number;
  /** Maximum number of columns that can be pinned right. Default: Infinity. */
  maxPinnedRight?: number;
}

export function ColumnPinningPlugin(options: ColumnPinningPluginOptions = {}): GridPlugin {
  const {
    maxPinnedLeft = Infinity,
    maxPinnedRight = Infinity,
  } = options;

  return {
    id: 'column-pinning',
    name: 'Column Pinning',
    version: '0.1.0',

    install(ctx: PluginContext) {
      // ── Pin a column ──
      const unregPin = ctx.commandBus.registerHandler(
        'column:pin',
        (payload: { colId: string; pinned: 'left' | 'right' | null }) => {
          const state = ctx.store.getState();
          const col = state.columns.find((c: ColumnState) => c.colId === payload.colId);
          if (!col) return;

          // Enforce limits
          if (payload.pinned === 'left') {
            const currentLeft = state.columns.filter((c: ColumnState) => c.pinned === 'left').length;
            if (currentLeft >= maxPinnedLeft && col.pinned !== 'left') return;
          }
          if (payload.pinned === 'right') {
            const currentRight = state.columns.filter((c: ColumnState) => c.pinned === 'right').length;
            if (currentRight >= maxPinnedRight && col.pinned !== 'right') return;
          }

          ctx.api.setColumnPinned(payload.colId, payload.pinned);

          // Reorder: left-pinned first, center, right-pinned last
          reorderColumns(ctx);
        },
      );

      // ── Unpin all columns ──
      const unregUnpinAll = ctx.commandBus.registerHandler(
        'column:unpinAll',
        () => {
          const state = ctx.store.getState();
          ctx.store.batch(() => {
            for (const col of state.columns) {
              if (col.pinned) {
                ctx.api.setColumnPinned(col.colId, null);
              }
            }
          });
        },
      );

      return () => {
        unregPin();
        unregUnpinAll();
      };
    },
  };
}

function reorderColumns(ctx: PluginContext): void {
  const cols = ctx.store.getState().columns;
  const left = cols.filter((c: ColumnState) => c.pinned === 'left');
  const center = cols.filter((c: ColumnState) => !c.pinned);
  const right = cols.filter((c: ColumnState) => c.pinned === 'right');
  const reordered = [...left, ...center, ...right];

  ctx.store.setState((prev) => ({
    ...prev,
    columns: reordered,
  }));
}
