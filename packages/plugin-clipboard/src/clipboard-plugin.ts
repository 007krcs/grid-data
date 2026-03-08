// ─── Clipboard Plugin ───
// Provides copy, cut, paste operations with keyboard shortcuts.

import type { GridPlugin, PluginContext, ColumnState } from '@gridstorm/core';
import type { ClipboardPluginOptions } from './types';
import { serializeToTSV, parseTSV } from './formatters';

export function ClipboardPlugin(options: ClipboardPluginOptions = {}): GridPlugin {
  const {
    copyHeaders = false,
    delimiter = '\t',
    processCellForClipboard,
    processCellFromClipboard,
    suppressPaste = false,
    suppressCut = false,
  } = options;

  return {
    id: 'clipboard',
    name: 'Clipboard',
    version: '0.1.0',
    dependencies: ['selection'],

    install(ctx: PluginContext) {
      // ── Copy selected rows ──
      const unregCopy = ctx.commandBus.registerHandler('clipboard:copy', () => {
        const data = getSelectionAsText(ctx);
        if (data) {
          navigator.clipboard.writeText(data).catch(() => {});
          ctx.eventBus.emit('clipboard:copy', { data });
        }
      });

      // ── Cut selected rows ──
      const unregCut = ctx.commandBus.registerHandler('clipboard:cut', () => {
        if (suppressCut) return;
        const data = getSelectionAsText(ctx);
        if (data) {
          navigator.clipboard.writeText(data).catch(() => {});
          // Clear selected cell values
          clearSelectedCells(ctx);
          ctx.eventBus.emit('clipboard:cut', { data });
        }
      });

      // ── Paste from clipboard ──
      const unregPaste = ctx.commandBus.registerHandler('clipboard:paste', () => {
        if (suppressPaste) return;
        navigator.clipboard.readText().then((text) => {
          if (!text) return;
          pasteText(ctx, text);
          ctx.eventBus.emit('clipboard:paste', { data: text });
        }).catch(() => {});
      });

      // ── Copy specific range ──
      const unregCopyRange = ctx.commandBus.registerHandler(
        'clipboard:copyRange',
        (payload: { startRow: number; endRow: number; startCol: string; endCol: string }) => {
          const state = ctx.store.getState();
          const visibleCols = state.columns.filter((c: ColumnState) => !c.hide);
          const startColIdx = visibleCols.findIndex((c: ColumnState) => c.colId === payload.startCol);
          const endColIdx = visibleCols.findIndex((c: ColumnState) => c.colId === payload.endCol);
          if (startColIdx === -1 || endColIdx === -1) return;

          const cols = visibleCols.slice(
            Math.min(startColIdx, endColIdx),
            Math.max(startColIdx, endColIdx) + 1,
          );

          const rows = [];
          for (let i = payload.startRow; i <= payload.endRow; i++) {
            const rowId = state.displayedRowIds[i];
            if (rowId) {
              const node = state.rowNodes.get(rowId);
              if (node) rows.push(node);
            }
          }

          const data = serializeToTSV(rows, cols, { delimiter, copyHeaders, processCellForClipboard });
          navigator.clipboard.writeText(data).catch(() => {});
          ctx.eventBus.emit('clipboard:copy', { data });
        },
      );

      // ── Keyboard shortcuts ──
      const onKeyDown = (e: KeyboardEvent) => {
        const isCtrl = e.ctrlKey || e.metaKey;
        if (!isCtrl) return;

        if (e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          ctx.commandBus.dispatch('clipboard:copy', {});
        } else if (e.key === 'x' || e.key === 'X') {
          e.preventDefault();
          ctx.commandBus.dispatch('clipboard:cut', {});
        } else if (e.key === 'v' || e.key === 'V') {
          e.preventDefault();
          ctx.commandBus.dispatch('clipboard:paste', {});
        }
      };

      let rootEl: HTMLElement | null = null;
      const unsubReady = ctx.eventBus.on('grid:ready', () => {
        requestAnimationFrame(() => {
          rootEl = document.querySelector('.gs-root');
          rootEl?.addEventListener('keydown', onKeyDown);
        });
      });

      function getSelectionAsText(context: PluginContext): string | null {
        const selectedNodes = context.api.getSelectedNodes();
        if (selectedNodes.length === 0) return null;

        const visibleCols = context.store.getState().columns.filter((c: ColumnState) => !c.hide);
        return serializeToTSV(selectedNodes, visibleCols, { delimiter, copyHeaders, processCellForClipboard });
      }

      function clearSelectedCells(context: PluginContext): void {
        const state = context.store.getState();
        const selectedNodes = context.api.getSelectedNodes();
        const visibleCols = state.columns.filter((c: ColumnState) => !c.hide);

        for (const node of selectedNodes) {
          for (const col of visibleCols) {
            const field = col.field ?? col.colId;
            if (node.data && field in (node.data as any)) {
              (node.data as any)[field] = null;
            }
          }
          node.version++;
        }
        context.commandBus.dispatch('rows:reprocess', {});
      }

      function pasteText(context: PluginContext, text: string): void {
        const parsed = parseTSV(text, delimiter);
        if (parsed.length === 0) return;

        const state = context.store.getState();
        const focusedCell = state.focusedCell;
        if (!focusedCell) return;

        const visibleCols = state.columns.filter((c: ColumnState) => !c.hide);
        const startColIdx = visibleCols.findIndex((c: ColumnState) => c.colId === focusedCell.colId);
        if (startColIdx === -1) return;

        for (let rowOffset = 0; rowOffset < parsed.length; rowOffset++) {
          const rowIdx = focusedCell.rowIndex + rowOffset;
          const rowId = state.displayedRowIds[rowIdx];
          if (!rowId) continue;

          const node = state.rowNodes.get(rowId);
          if (!node?.data) continue;

          const cells = parsed[rowOffset]!;
          for (let colOffset = 0; colOffset < cells.length; colOffset++) {
            const col = visibleCols[startColIdx + colOffset];
            if (!col) continue;

            const field = col.field ?? col.colId;
            let value: any = cells[colOffset];

            if (processCellFromClipboard) {
              value = processCellFromClipboard({ value, column: col });
            }

            (node.data as any)[field] = value;
          }
          node.version++;
        }
        context.commandBus.dispatch('rows:reprocess', {});
      }

      return () => {
        unregCopy();
        unregCut();
        unregPaste();
        unregCopyRange();
        unsubReady();
        rootEl?.removeEventListener('keydown', onKeyDown);
      };
    },
  };
}
