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
      // Cached root element for scoped DOM queries
      let cachedRoot: HTMLElement | null = null;
      const getRoot = (): HTMLElement | null => {
        if (cachedRoot && cachedRoot.isConnected) return cachedRoot;
        cachedRoot = document.querySelector<HTMLElement>('.gs-root');
        return cachedRoot;
      };

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

      // ── Inject drag handlers into header cells ──
      const injectDragHandlers = () => {
        if (!_enableDragDrop) return;
        const root = getRoot();
        const scope = root ?? document;
        const headers = scope.querySelectorAll('.gs-header-cell');
        for (const header of headers) {
          const el = header as HTMLElement;
          const colId = el.getAttribute('data-col-id');
          if (!colId) continue;
          // Skip if already has a drag handler
          if (el.getAttribute('data-gs-draggable')) continue;
          // Skip locked columns
          const col = ctx.store.getState().columns.find((c: ColumnState) => c.colId === colId);
          if (col?.originalDef.lockPosition) continue;

          el.setAttribute('data-gs-draggable', 'true');
          el.style.cursor = 'grab';
          el.addEventListener('mousedown', (e: MouseEvent) => {
            // Ignore right-click and clicks on resize handles
            if (e.button !== 0) return;
            if ((e.target as HTMLElement).classList.contains('gs-resize-handle')) return;
            e.preventDefault();
            ctx.commandBus.dispatch('column:dragStart', {
              colId,
              startX: e.clientX,
              startY: e.clientY,
            });
          });
        }
      };

      // Re-inject after every header re-render
      const unsubHeaderRendered = ctx.eventBus.on('dom:headerRendered', () => {
        injectDragHandlers();
      });

      // Also inject on grid ready (fallback for initial mount)
      const unsubReady = ctx.eventBus.on('grid:ready', () => {
        requestAnimationFrame(() => injectDragHandlers());
      });

      // ── Drag start (DOM interaction) ──
      // Uses a movement threshold (5px) before showing the ghost element.
      // This prevents a visual flash when the user simply clicks a header
      // (e.g. for sorting) without intending to drag.
      const DRAG_THRESHOLD = 5;
      const unregDragStart = ctx.commandBus.registerHandler(
        'column:dragStart',
        (payload: { colId: string; startX: number; startY?: number }) => {
          const state = ctx.store.getState();
          const startIndex = state.columns.findIndex((c: ColumnState) => c.colId === payload.colId);
          if (startIndex === -1) return;

          const col = state.columns[startIndex]!;
          if (col.originalDef.lockPosition) return;

          let ghost: HTMLElement | null = null;
          let dragging = false;
          const startX = payload.startX;
          const startY = payload.startY ?? 0;

          const onMouseMove = (e: MouseEvent) => {
            // Don't activate drag until mouse moves beyond threshold
            if (!dragging) {
              const dx = e.clientX - startX;
              const dy = e.clientY - startY;
              if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;
              dragging = true;

              // Create ghost element now that we know it's a real drag
              ghost = document.createElement('div');
              ghost.className = 'gs-column-drag-ghost';
              ghost.textContent = col.headerName;
              ghost.style.cssText = `
                position:fixed;pointer-events:none;z-index:9999;
                padding:4px 12px;background:var(--gs-color-primary,#1976d2);
                color:white;border-radius:4px;font-size:13px;opacity:0.9;
              `;
              document.body.appendChild(ghost);
              document.body.style.cursor = 'grabbing';
            }

            if (ghost) {
              ghost.style.left = `${e.clientX + 10}px`;
              ghost.style.top = `${e.clientY + 10}px`;
            }
          };

          const onMouseUp = (e: MouseEvent) => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = '';
            if (ghost) ghost.remove();

            // Only process drop if we actually started dragging
            if (!dragging) return;

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
        },
      );

      return () => {
        unregMove();
        unregSwap();
        unregDragStart();
        unsubHeaderRendered();
        unsubReady();
      };
    },
  };
}
