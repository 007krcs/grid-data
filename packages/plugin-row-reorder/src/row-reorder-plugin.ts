// ─── Row Reorder Plugin ───
// Provides row reordering via commands and drag-and-drop DOM interaction.
// Uses event delegation + CSS pseudo-elements for virtual-scroll compatibility.

import type { GridPlugin, PluginContext } from '@gridstorm/core';

export interface RowReorderPluginOptions {
  /** Enable drag-and-drop reordering. Default: true. */
  enableDragDrop?: boolean;
  /** Show a drag handle on hover (left edge of row). Default: true. */
  showDragHandle?: boolean;
  /** Prevent dragging rows across group boundaries. Default: true. */
  lockGroupedRows?: boolean;
  /** Width of the drag handle hit area in pixels. Default: 24. */
  dragHandleWidth?: number;
}

export function RowReorderPlugin(options: RowReorderPluginOptions = {}): GridPlugin {
  const {
    enableDragDrop = true,
    showDragHandle = true,
    lockGroupedRows = true,
    dragHandleWidth = 24,
  } = options;

  return {
    id: 'row-reorder',
    name: 'Row Reorder',
    version: '0.1.0',

    install(ctx: PluginContext) {
      const disposers: (() => void)[] = [];

      // ── Move row to index ──
      disposers.push(
        ctx.commandBus.registerHandler(
          'row:move',
          (payload: { rowId: string; toIndex: number }) => {
            const state = ctx.store.getState();
            const ids = [...state.displayedRowIds];
            const fromIndex = ids.indexOf(payload.rowId);
            if (fromIndex === -1) return;

            const node = state.rowNodes.get(payload.rowId);
            if (!node) return;

            // Cannot move group rows
            if (node.group) return;

            // Respect group boundaries
            if (lockGroupedRows && node.parent) {
              const targetId = ids[payload.toIndex];
              if (targetId) {
                const targetNode = state.rowNodes.get(targetId);
                if (targetNode && targetNode.parent !== node.parent) return;
              }
            }

            // Clamp toIndex to valid range
            const toIndex = Math.max(0, Math.min(payload.toIndex, ids.length - 1));

            // Remove from source and insert at target (same pattern as moveColumn)
            ids.splice(fromIndex, 1);
            ids.splice(toIndex, 0, payload.rowId);

            ctx.store.setState((prev) => ({ ...prev, displayedRowIds: ids }));
            ctx.eventBus.emit('row:moved', {
              rowId: payload.rowId,
              fromIndex,
              toIndex,
            });
          },
        ),
      );

      // ── Swap two rows ──
      disposers.push(
        ctx.commandBus.registerHandler(
          'row:swap',
          (payload: { rowIdA: string; rowIdB: string }) => {
            const state = ctx.store.getState();
            const ids = [...state.displayedRowIds];
            const indexA = ids.indexOf(payload.rowIdA);
            const indexB = ids.indexOf(payload.rowIdB);
            if (indexA === -1 || indexB === -1) return;

            [ids[indexA], ids[indexB]] = [ids[indexB]!, ids[indexA]!];

            ctx.store.setState((prev) => ({ ...prev, displayedRowIds: ids }));
            ctx.eventBus.emit('row:moved', {
              rowId: payload.rowIdA,
              fromIndex: indexA,
              toIndex: indexB,
            });
          },
        ),
      );

      // ── DOM drag-and-drop via event delegation ──
      if (enableDragDrop) {
        const DRAG_THRESHOLD = 5;
        let styleEl: HTMLStyleElement | null = null;

        // Inject CSS for drag handle visual
        const injectStyles = () => {
          if (styleEl) return;
          styleEl = document.createElement('style');
          styleEl.textContent = showDragHandle
            ? `
              [data-gs-row-reorder] .gs-row {
                position: relative;
              }
              [data-gs-row-reorder] .gs-row::before {
                content: '\\2630';
                position: absolute;
                left: 0;
                top: 0;
                bottom: 0;
                width: ${dragHandleWidth}px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: grab;
                opacity: 0;
                transition: opacity 0.15s;
                font-size: 12px;
                color: var(--gs-color-muted, #94a3b8);
                z-index: 1;
                background: var(--gs-color-background, #fff);
              }
              [data-gs-row-reorder] .gs-row:hover::before {
                opacity: 0.7;
              }
              [data-gs-row-reorder] .gs-group-row::before {
                display: none;
              }
            `
            : `
              [data-gs-row-reorder] .gs-row {
                cursor: grab;
              }
              [data-gs-row-reorder] .gs-group-row {
                cursor: default;
              }
            `;
          document.head.appendChild(styleEl);
        };

        // Mark the grid root for CSS targeting
        const markRoot = () => {
          const root = document.querySelector('.gs-root');
          root?.setAttribute('data-gs-row-reorder', '');
        };

        // Find the body viewport element
        const getBodyViewport = (): HTMLElement | null => {
          return document.querySelector('.gs-body-viewport');
        };

        const getBodyContainer = (): HTMLElement | null => {
          return document.querySelector('.gs-body');
        };

        // Start drag interaction
        const startDrag = (rowId: string, startX: number, startY: number) => {
          const state = ctx.store.getState();
          const node = state.rowNodes.get(rowId);
          if (!node || node.group) return;

          let ghost: HTMLElement | null = null;
          let indicator: HTMLElement | null = null;
          let dragging = false;

          const onMouseMove = (e: MouseEvent) => {
            if (!dragging) {
              const dx = e.clientX - startX;
              const dy = e.clientY - startY;
              if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;
              dragging = true;

              ctx.eventBus.emit('row:dragStarted' , { rowId });

              // Create ghost element
              ghost = document.createElement('div');
              ghost.className = 'gs-row-drag-ghost';
              const preview = node.data
                ? Object.values(node.data as Record<string, unknown>)
                    .slice(0, 3)
                    .join(' | ')
                : `Row ${rowId}`;
              ghost.textContent = String(preview);
              ghost.style.cssText = `
                position:fixed;pointer-events:none;z-index:9999;
                padding:4px 12px;background:var(--gs-color-primary,#1976d2);
                color:white;border-radius:4px;font-size:13px;opacity:0.9;
                max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
              `;
              document.body.appendChild(ghost);

              // Create drop indicator line
              indicator = document.createElement('div');
              indicator.className = 'gs-row-drop-indicator';
              indicator.style.cssText = `
                position:absolute;left:0;right:0;height:2px;
                background:var(--gs-color-primary,#1976d2);
                z-index:8;pointer-events:none;display:none;
              `;
              const bodyContainer = getBodyContainer();
              bodyContainer?.appendChild(indicator);

              document.body.style.cursor = 'grabbing';
            }

            if (ghost) {
              ghost.style.left = `${e.clientX + 12}px`;
              ghost.style.top = `${e.clientY + 12}px`;
            }

            // Update drop indicator position
            if (indicator) {
              const target = (e.target as HTMLElement).closest<HTMLElement>('[data-row-id]');
              if (target) {
                const targetRowId = target.getAttribute('data-row-id');
                const targetNode = targetRowId
                  ? ctx.store.getState().rowNodes.get(targetRowId)
                  : null;

                // Don't show indicator on group rows or cross-group targets
                if (targetNode?.group) {
                  indicator.style.display = 'none';
                  return;
                }

                if (lockGroupedRows && node.parent && targetNode && targetNode.parent !== node.parent) {
                  indicator.style.display = 'none';
                  return;
                }

                const rect = target.getBoundingClientRect();
                const bodyContainer = getBodyContainer();
                if (bodyContainer) {
                  const containerRect = bodyContainer.getBoundingClientRect();
                  const midY = rect.top + rect.height / 2;
                  const isAbove = e.clientY < midY;
                  const indicatorY = isAbove
                    ? rect.top - containerRect.top
                    : rect.bottom - containerRect.top;
                  indicator.style.top = `${indicatorY}px`;
                  indicator.style.display = 'block';
                }
              } else {
                indicator.style.display = 'none';
              }
            }
          };

          const onMouseUp = (e: MouseEvent) => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = '';
            ghost?.remove();
            indicator?.remove();

            if (!dragging) return;

            ctx.eventBus.emit('row:dragEnded' , { rowId });

            // Find drop target row
            const target = (e.target as HTMLElement).closest<HTMLElement>('[data-row-id]');
            if (target) {
              const targetRowId = target.getAttribute('data-row-id');
              if (targetRowId && targetRowId !== rowId) {
                const ids = ctx.store.getState().displayedRowIds;
                const targetIndex = ids.indexOf(targetRowId);
                if (targetIndex !== -1) {
                  // Determine insert above or below based on mouse position
                  const rect = target.getBoundingClientRect();
                  const midY = rect.top + rect.height / 2;
                  const insertIndex = e.clientY < midY ? targetIndex : targetIndex + 1;

                  ctx.commandBus.dispatch('row:move', {
                    rowId,
                    toIndex: insertIndex,
                  });
                }
              }
            }
          };

          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
        };

        // Event delegation handler on body viewport
        const onMouseDown = (e: MouseEvent) => {
          if (e.button !== 0) return;

          // Don't initiate drag on interactive elements
          const target = e.target as HTMLElement;
          if (target.closest('input, button, select, textarea, a, .gs-resize-handle, .gs-group-cell')) {
            return;
          }

          const rowEl = target.closest<HTMLElement>('[data-row-id]');
          if (!rowEl) return;

          const rowId = rowEl.getAttribute('data-row-id');
          if (!rowId) return;

          // Skip group rows
          const node = ctx.store.getState().rowNodes.get(rowId);
          if (!node || node.group) return;

          // If showDragHandle, only start drag from handle area
          if (showDragHandle) {
            const rect = rowEl.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            if (offsetX > dragHandleWidth) return;
          }

          e.preventDefault();
          startDrag(rowId, e.clientX, e.clientY);
        };

        // Set up on grid ready
        const unsubReady = ctx.eventBus.on('grid:ready', () => {
          requestAnimationFrame(() => {
            injectStyles();
            markRoot();
            const viewport = getBodyViewport();
            viewport?.addEventListener('mousedown', onMouseDown);
          });
        });
        disposers.push(unsubReady);

        // Cleanup
        disposers.push(() => {
          const viewport = getBodyViewport();
          viewport?.removeEventListener('mousedown', onMouseDown);
          styleEl?.remove();
          styleEl = null;
          const root = document.querySelector('.gs-root');
          root?.removeAttribute('data-gs-row-reorder');
        });
      }

      return () => {
        for (const dispose of disposers) dispose();
      };
    },
  };
}
