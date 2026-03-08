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
          autoSizeColumn(ctx, payload.colId, globalMinWidth, globalMaxWidth);
        },
      );

      // ── Register column:autoSizeAll command ──
      const unregisterAutoSizeAll = ctx.commandBus.registerHandler(
        'column:autoSizeAll',
        () => {
          if (!enableAutoSize) return;
          const cols = ctx.store.getState().columns.filter((c: ColumnState) => !c.hide && c.resizable);
          for (const col of cols) {
            autoSizeColumn(ctx, col.colId, globalMinWidth, globalMaxWidth);
          }
        },
      );

      // ── Inject resize handles into header cells ──
      // This listens for column changes and adds handles via the DOM
      const unsubColumns = ctx.eventBus.on('columns:changed', () => {
        injectResizeHandles(ctx);
      });

      // Also inject on grid ready
      const unsubReady = ctx.eventBus.on('grid:ready', () => {
        // Defer to allow DOM to be built
        requestAnimationFrame(() => injectResizeHandles(ctx));
      });

      return () => {
        unregisterResize();
        unregisterResizeStart();
        unregisterAutoSize();
        unregisterAutoSizeAll();
        unsubColumns();
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
): void {
  const col = ctx.store.getState().columns.find((c: ColumnState) => c.colId === colId);
  if (!col || !col.resizable) return;

  // Measure the max content width by scanning visible cells for this column
  const cells = document.querySelectorAll(`.gs-cell[data-col-id="${colId}"]`);
  const headerCell = document.querySelector(`.gs-header-cell[data-col-id="${colId}"]`);

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

function injectResizeHandles(ctx: PluginContext): void {
  // Find all header cells and add resize handles
  const headers = document.querySelectorAll('.gs-header-cell');

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

    // Make header cell position relative for the absolute handle
    el.style.position = 'relative';
    el.appendChild(handle);
  }
}
