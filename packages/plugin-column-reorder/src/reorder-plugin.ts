// ─── Column Reorder Plugin ───
// Provides column reordering via commands and drag-and-drop DOM interaction.

import type { GridPlugin, PluginContext, ColumnState } from '@gridstorm/core';

export interface ColumnReorderPluginOptions {
  /** Enable drag-and-drop reordering. Default: true. */
  enableDragDrop?: boolean;
  /** Prevent dragging columns across pin zones. Default: true. */
  lockPinnedColumns?: boolean;
  /** CSS class for the drag indicator. */
  dragIndicatorClass?: string;
}

export function ColumnReorderPlugin(options: ColumnReorderPluginOptions = {}): GridPlugin {
  const {
    enableDragDrop: _enableDragDrop = true,
    lockPinnedColumns = true,
    dragIndicatorClass: _dragIndicatorClass = 'gs-column-drag-indicator',
  } = options;

  return {
    id: 'column-reorder',
    name: 'Column Reorder',
    version: '0.1.0',

    install(ctx: PluginContext) {
      // ── Move column to index ──
      const unregMove = ctx.commandBus.registerHandler(
        'column:move',
        (payload: { colId: string; toIndex: number }) => {
          const state = ctx.store.getState();
          const col = state.columns.find((c: ColumnState) => c.colId === payload.colId);
          if (!col) return;

          // Respect lockPosition
          if (col.originalDef.lockPosition) return;

          // Prevent cross-zone drag if lockPinnedColumns
          if (lockPinnedColumns) {
            const targetCol = state.columns[payload.toIndex];
            if (targetCol && col.pinned !== targetCol.pinned) return;
          }

          ctx.api.moveColumn(payload.colId, payload.toIndex);
        },
      );

      // ── Swap two columns ──
      const unregSwap = ctx.commandBus.registerHandler(
        'column:swap',
        (payload: { colIdA: string; colIdB: string }) => {
          const state = ctx.store.getState();
          const indexA = state.columns.findIndex((c: ColumnState) => c.colId === payload.colIdA);
          const indexB = state.columns.findIndex((c: ColumnState) => c.colId === payload.colIdB);
          if (indexA === -1 || indexB === -1) return;

          const cols = [...state.columns];
          [cols[indexA], cols[indexB]] = [cols[indexB]!, cols[indexA]!];

          ctx.store.setState((prev) => ({ ...prev, columns: cols }));
          ctx.eventBus.emit('column:moved', {
            column: cols[indexB]!,
            fromIndex: indexA,
            toIndex: indexB,
          });
        },
      );

      // ── Drag start (DOM interaction) ──
      const unregDragStart = ctx.commandBus.registerHandler(
        'column:dragStart',
        (payload: { colId: string; startX: number }) => {
          const state = ctx.store.getState();
          const startIndex = state.columns.findIndex((c: ColumnState) => c.colId === payload.colId);
          if (startIndex === -1) return;

          const col = state.columns[startIndex]!;
          if (col.originalDef.lockPosition) return;

          // Create ghost element
          const ghost = document.createElement('div');
          ghost.className = 'gs-column-drag-ghost';
          ghost.textContent = col.headerName;
          ghost.style.cssText = `
            position:fixed;pointer-events:none;z-index:9999;
            padding:4px 12px;background:var(--gs-color-primary,#1976d2);
            color:white;border-radius:4px;font-size:13px;opacity:0.9;
          `;
          document.body.appendChild(ghost);

          const onMouseMove = (e: MouseEvent) => {
            ghost.style.left = `${e.clientX + 10}px`;
            ghost.style.top = `${e.clientY + 10}px`;
          };

          const onMouseUp = (e: MouseEvent) => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = '';
            ghost.remove();

            // Find drop target column
            const target = (e.target as HTMLElement).closest<HTMLElement>('.gs-header-cell');
            if (target) {
              const targetColId = target.getAttribute('data-col-id');
              if (targetColId && targetColId !== payload.colId) {
                const targetIndex = ctx.store.getState().columns.findIndex(
                  (c: ColumnState) => c.colId === targetColId,
                );
                if (targetIndex !== -1) {
                  ctx.commandBus.dispatch('column:move', {
                    colId: payload.colId,
                    toIndex: targetIndex,
                  });
                }
              }
            }
          };

          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
          document.body.style.cursor = 'grabbing';
        },
      );

      return () => {
        unregMove();
        unregSwap();
        unregDragStart();
      };
    },
  };
}
