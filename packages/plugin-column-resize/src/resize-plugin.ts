// ─── Column Resize Plugin ───
// Adds drag-to-resize handles on column header borders.
// Dispatches column width changes through the API.
// Supports min/max width constraints and double-click auto-size.

import type {
  GridPlugin,
  PluginContext,
  ColumnState,
} from '@gridstorm/core';

export interface ColumnResizePluginOptions {
  /** Minimum column width in pixels. Default: 50. */
  minWidth?: number;
  /** Maximum column width in pixels. Default: Infinity. */
  maxWidth?: number;
  /** Enable double-click to auto-size. Default: true. */
  enableAutoSize?: boolean;
  /** Resize mode: 'onChange' updates during drag, 'onDragEnd' updates on release. Default: 'onChange'. */
  resizeMode?: 'onChange' | 'onDragEnd';
}

export function ColumnResizePlugin(options: ColumnResizePluginOptions = {}): GridPlugin {
  const {
    minWidth: globalMinWidth = 50,
    maxWidth: globalMaxWidth = Infinity,
    enableAutoSize = true,
    resizeMode = 'onChange',
  } = options;

  return {
    id: 'column-resize',
    name: 'Column Resize',
    version: '0.1.0',

    install(ctx: PluginContext) {
      // Cached root element for scoped DOM queries
      let cachedRoot: HTMLElement | null = null;
      const getRoot = (): HTMLElement | null => {
        if (cachedRoot && cachedRoot.isConnected) return cachedRoot;
        cachedRoot = document.querySelector<HTMLElement>('.gs-root');
        return cachedRoot;
      };

      // ── Register column:resize command ──
      const unregisterResize = ctx.commandBus.registerHandler(
        'column:resize',
        (payload: { colId: string; delta: number }) => {
          const col = ctx.store
            .getState()
            .columns.find((c: ColumnState) => c.colId === payload.colId);
          if (!col || !col.resizable) return;

          const min = Math.max(col.minWidth, globalMinWidth);
          const max = Math.min(col.maxWidth, globalMaxWidth);
          const newWidth = Math.max(min, Math.min(max, col.width + payload.delta));

          ctx.api.setColumnWidth(payload.colId, newWidth);
        },
      );

      // ── Register column:resizeStart command ──
      const unregisterResizeStart = ctx.commandBus.registerHandler(
        'column:resizeStart',
        (payload: { colId: string; startX: number }) => {
          const col = ctx.store
            .getState()
            .columns.find((c: ColumnState) => c.colId === payload.colId);
          if (!col || !col.resizable) return;

          const startWidth = col.width;
          const min = Math.max(col.minWidth, globalMinWidth);
          const max = Math.min(col.maxWidth, globalMaxWidth);

          const onMouseMove = (e: MouseEvent) => {
            const delta = e.clientX - payload.startX;
            const newWidth = Math.max(min, Math.min(max, startWidth + delta));
            if (resizeMode === 'onChange') {
              ctx.api.setColumnWidth(payload.colId, newWidth);
            }
          };

          const onMouseUp = (e: MouseEvent) => {
            if (resizeMode === 'onDragEnd') {
              const delta = e.clientX - payload.startX;
              const newWidth = Math.max(min, Math.min(max, startWidth + delta));
              ctx.api.setColumnWidth(payload.colId, newWidth);
            }
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
          };

          document.addEventListener('mousemove', onMouseMove);
          document.addEventListener('mouseup', onMouseUp);
          document.body.style.cursor = 'col-resize';
          document.body.style.userSelect = 'none';
        },
      );

      // ── Register column:autoSize command ──
      const unregisterAutoSize = ctx.commandBus.registerHandler(
        'column:autoSize',
        (payload: { colId: string }) => {
          if (!enableAutoSize) return;
          autoSizeColumn(ctx, payload.colId, globalMinWidth, globalMaxWidth, getRoot());
        },
      );

      // ── Register column:autoSizeAll command ──
      const unregisterAutoSizeAll = ctx.commandBus.registerHandler(
        'column:autoSizeAll',
        () => {
          if (!enableAutoSize) return;
          const cols = ctx.store.getState().columns.filter((c: ColumnState) => !c.hide && c.resizable);
          const root = getRoot();
          for (const col of cols) {
            autoSizeColumn(ctx, col.colId, globalMinWidth, globalMaxWidth, root);
          }
        },
      );

      // ── Inject resize handles into header cells ──
      // Listen to dom:headerRendered so handles are re-injected every time
      // the renderer rebuilds headers (sort, filter, column changes, etc.)
      const unsubHeaderRendered = ctx.eventBus.on('dom:headerRendered', () => {
        injectResizeHandles(ctx, getRoot());
      });

      // Also inject on grid ready (fallback for initial mount)
      const unsubReady = ctx.eventBus.on('grid:ready', () => {
        // Defer to allow DOM to be built
        requestAnimationFrame(() => injectResizeHandles(ctx, getRoot()));
      });

      return () => {
        unregisterResize();
        unregisterResizeStart();
        unregisterAutoSize();
        unregisterAutoSizeAll();
        unsubHeaderRendered();
        unsubReady();
      };
    },
  };
}

function autoSizeColumn(
  ctx: PluginContext,
  colId: string,
  globalMinWidth: number,
  globalMaxWidth: number,
  rootEl: HTMLElement | null,
): void {
  const col = ctx.store.getState().columns.find((c: ColumnState) => c.colId === colId);
  if (!col || !col.resizable) return;

  // Measure the max content width by scanning visible cells for this column (scoped to grid root)
  const scope = rootEl ?? document;
  const cells = scope.querySelectorAll(`.gs-cell[data-col-id="${colId}"]`);
  const headerCell = scope.querySelector(`.gs-header-cell[data-col-id="${colId}"]`);

  let maxContentWidth = 0;

  // Measure header width
  if (headerCell) {
    const headerText = headerCell.querySelector('.gs-header-text, .gs-header-cell-label');
    if (headerText) {
      maxContentWidth = Math.max(maxContentWidth, (headerText as HTMLElement).scrollWidth + 16);
    } else {
      maxContentWidth = Math.max(maxContentWidth, (headerCell as HTMLElement).scrollWidth);
    }
  }

  // Measure cell content widths
  for (const cell of cells) {
    const el = cell as HTMLElement;
    // Create a temporary measurement span
    const measureSpan = document.createElement('span');
    measureSpan.style.cssText = 'visibility:hidden;position:absolute;white-space:nowrap;';
    measureSpan.textContent = el.textContent;
    document.body.appendChild(measureSpan);
    maxContentWidth = Math.max(maxContentWidth, measureSpan.offsetWidth + 20); // +20 for padding
    document.body.removeChild(measureSpan);
  }

  if (maxContentWidth === 0) return;

  const min = Math.max(col.minWidth, globalMinWidth);
  const max = Math.min(col.maxWidth, globalMaxWidth);
  const newWidth = Math.max(min, Math.min(max, maxContentWidth));

  ctx.api.setColumnWidth(colId, newWidth);
}

function injectResizeHandles(ctx: PluginContext, rootEl: HTMLElement | null): void {
  // Find all header cells and add resize handles (scoped to grid root)
  const scope = rootEl ?? document;
  const headers = scope.querySelectorAll('.gs-header-cell');

  for (const header of headers) {
    const el = header as HTMLElement;
    const colId = el.getAttribute('data-col-id');
    if (!colId) continue;

    // Skip if already has a handle
    if (el.querySelector('.gs-resize-handle')) continue;

    const col = ctx.store
      .getState()
      .columns.find((c: ColumnState) => c.colId === colId);
    if (!col?.resizable) continue;

    const handle = document.createElement('div');
    handle.className = 'gs-resize-handle';
    handle.style.cssText =
      'position:absolute;right:0;top:0;bottom:0;width:6px;cursor:col-resize;z-index:1;';

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      ctx.commandBus.dispatch('column:resizeStart', {
        colId,
        startX: e.clientX,
      });
    });

    // Double-click to auto-size
    handle.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      ctx.commandBus.dispatch('column:autoSize', { colId });
    });

    // Make header cell positioned for the absolute handle.
    // Preserve 'sticky' for pinned columns.
    if (el.style.position !== 'sticky') {
      el.style.position = 'relative';
    }
    el.appendChild(handle);
  }
}
