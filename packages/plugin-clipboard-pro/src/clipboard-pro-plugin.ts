// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Clipboard Pro Plugin ───
// Enhanced Excel-compatible copy/paste for GridStorm.

import type { GridPlugin, PluginContext } from '@gridstorm/core';
import type { ClipboardProPluginOptions, ClipboardProState, PasteOperation, PastedCell, CutRange } from './types';
import { serializeRangeToTSV, parseTSVAdvanced } from './range-serializer';
import { coerceValue } from './type-coercion';
import { validatePastedValues } from './paste-validator';
import { snapshotBeforePaste, snapshotAfterPaste } from './undo-integration';

const STATE_KEY = 'clipboard-pro';

export function ClipboardProPlugin(options: ClipboardProPluginOptions = {}): GridPlugin {
  const enableTypeCoercion = options.typeCoercion !== false;
  const enableValidation = options.pasteValidation !== false;
  const enableFormulaAware = options.formulaAwarePaste !== false;
  const enableUndo = options.undoSupport !== false;
  const delimiter = options.delimiter ?? '\t';

  return {
    id: 'clipboard',
    name: 'Clipboard Pro (Excel-Compatible)',
    version: '0.1.2',
    dependencies: ['selection'],

    install(ctx: PluginContext) {
      // Register state
      ctx.registerState<ClipboardProState>(STATE_KEY, {
        lastOperation: null,
        lastPasteResult: null,
        cutRange: null,
      });

      // ── Helper: Resolve colId to column index ──
      function colIdToIndex(colId: string): number {
        const state = ctx.store.getState();
        return state.columns.findIndex((c) => c.colId === colId || c.field === colId);
      }

      // ── Helper: Get copy range (as numeric indices) ──
      function getCopyRange(): { startRow: number; endRow: number; startCol: number; endCol: number } | null {
        const state = ctx.store.getState();

        // Priority 1: Cell range selections (from cell-range plugin or core)
        const ranges = state.selection.rangeSelections;
        if (ranges && ranges.length > 0) {
          const range = ranges[0]!;
          const startCol = colIdToIndex(range.startColId);
          const endCol = colIdToIndex(range.endColId);
          if (startCol >= 0 && endCol >= 0) {
            return {
              startRow: range.startRow,
              endRow: range.endRow,
              startCol,
              endCol,
            };
          }
        }

        // Priority 2: Selected rows → all visible columns
        const selectedIds = state.selection.selectedRowIds;
        if (selectedIds && selectedIds.size > 0) {
          const displayIds = state.displayedRowIds;
          let minRow = Infinity, maxRow = -1;
          for (let i = 0; i < displayIds.length; i++) {
            const id = displayIds[i];
            if (id !== undefined && selectedIds.has(id)) {
              minRow = Math.min(minRow, i);
              maxRow = Math.max(maxRow, i);
            }
          }
          if (minRow <= maxRow) {
            return {
              startRow: minRow,
              endRow: maxRow,
              startCol: 0,
              endCol: state.columns.filter((c) => !(c as any).hide).length - 1,
            };
          }
        }

        // Priority 3: Focused cell → single cell
        if (state.focusedCell) {
          const rowIdx = state.focusedCell.rowIndex;
          const colIdx = colIdToIndex(state.focusedCell.colId);
          if (rowIdx >= 0 && colIdx >= 0) {
            return { startRow: rowIdx, endRow: rowIdx, startCol: colIdx, endCol: colIdx };
          }
        }

        return null;
      }

      // ── Helper: Get paste origin ──
      function getPasteOrigin(): { rowIndex: number; colIndex: number } | null {
        const state = ctx.store.getState();

        // Use focused cell
        if (state.focusedCell) {
          const colIdx = colIdToIndex(state.focusedCell.colId);
          if (state.focusedCell.rowIndex >= 0 && colIdx >= 0) {
            return { rowIndex: state.focusedCell.rowIndex, colIndex: colIdx };
          }
        }

        // Use first selected range
        const ranges = state.selection.rangeSelections;
        if (ranges && ranges.length > 0) {
          const r = ranges[0]!;
          const colIdx = colIdToIndex(r.startColId);
          return {
            rowIndex: r.startRow,
            colIndex: colIdx >= 0 ? colIdx : 0,
          };
        }

        return null;
      }

      // ── Helper: Write clipboard ──
      async function writeClipboard(text: string): Promise<void> {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        }
      }

      // ── Helper: Read clipboard ──
      async function readClipboard(): Promise<string> {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
          return navigator.clipboard.readText();
        }
        return '';
      }

      // ── Command: clipboard:copy ──
      const unregCopy = ctx.commandBus.registerHandler(
        'clipboard:copy' as any,
        async (_payload: unknown) => {
          const range = getCopyRange();
          if (!range) return;

          const text = serializeRangeToTSV(
            () => ctx.store.getState(),
            range,
            options,
          );

          await writeClipboard(text);

          ctx.setState<ClipboardProState>(STATE_KEY, (prev) => ({
            ...prev,
            lastOperation: 'copy',
            cutRange: null,
          }));

          (ctx.eventBus as any).emit('clipboard:copy', {
            text,
            rowCount: range.endRow - range.startRow + 1,
            colCount: range.endCol - range.startCol + 1,
          });
        },
      );

      // ── Command: clipboard:copyWithHeaders ──
      const unregCopyHeaders = ctx.commandBus.registerHandler(
        'clipboard:copyWithHeaders' as any,
        async (_payload: unknown) => {
          const range = getCopyRange();
          if (!range) return;

          const text = serializeRangeToTSV(
            () => ctx.store.getState(),
            range,
            { ...options, includeHeaders: true },
          );

          await writeClipboard(text);

          (ctx.eventBus as any).emit('clipboard:copy', {
            text,
            withHeaders: true,
          });
        },
      );

      // ── Command: clipboard:paste ──
      const unregPaste = ctx.commandBus.registerHandler(
        'clipboard:paste' as any,
        async (payload: { text?: string } | unknown) => {
          const rawText = (payload as any)?.text ?? await readClipboard();
          if (!rawText) return;

          const origin = getPasteOrigin();
          if (!origin) return;

          // Parse TSV
          const parsed = parseTSVAdvanced(rawText, delimiter);
          if (parsed.length === 0) return;

          // Coerce types
          const coerced: unknown[][] = enableTypeCoercion
            ? parsed.map((row) => row.map((cell) => coerceValue(cell)))
            : parsed;

          // Snapshot for undo
          if (enableUndo) {
            snapshotBeforePaste(ctx, 'paste');
          }

          // Validate
          let validCells: { rowIndex: number; colIndex: number; value: unknown }[];
          let rejectedCells: { rowIndex: number; colIndex: number; value: string; reason: string }[] = [];

          if (enableValidation) {
            const result = validatePastedValues(ctx, coerced, origin.rowIndex, origin.colIndex);
            validCells = result.valid;
            rejectedCells = result.rejected;
          } else {
            validCells = [];
            for (let r = 0; r < coerced.length; r++) {
              const row = coerced[r]!;
              for (let c = 0; c < row.length; c++) {
                validCells.push({
                  rowIndex: origin.rowIndex + r,
                  colIndex: origin.colIndex + c,
                  value: row[c],
                });
              }
            }
          }

          // Apply values
          const pastedCells: PastedCell[] = [];
          const state = ctx.store.getState();

          ctx.store.batch(() => {
            for (const cell of validCells) {
              const rowId = state.displayedRowIds[cell.rowIndex];
              const col = state.columns[cell.colIndex];
              if (!rowId || !col) continue;

              const node = state.rowNodes.get(rowId);
              if (!node?.data || !col.field) continue;

              const oldValue = node.data[col.field];
              let newValue = cell.value;

              // Formula-aware paste
              if (enableFormulaAware && typeof newValue === 'string' && newValue.startsWith('=')) {
                try {
                  ctx.commandBus.dispatch('formula:set' as any, {
                    rowId,
                    colId: col.colId,
                    formula: newValue,
                  });
                  pastedCells.push({ rowId, colId: col.colId, oldValue, newValue });
                  continue;
                } catch {
                  // Formula plugin not available, paste as text
                }
              }

              // Apply value
              if (options.processCellFromClipboard) {
                newValue = options.processCellFromClipboard({
                  value: newValue,
                  node,
                  column: col,
                  rowIndex: cell.rowIndex,
                  colIndex: cell.colIndex,
                });
              }

              node.data[col.field] = newValue;
              (node as any).version = ((node as any).version ?? 0) + 1;
              pastedCells.push({ rowId, colId: col.colId, oldValue, newValue });

              (ctx.eventBus as any).emit('cell:valueChanged', {
                node,
                colId: col.field,
                oldValue,
                newValue,
              });
            }
          });

          // Snapshot after
          if (enableUndo) {
            snapshotAfterPaste(ctx, 'paste');
          }

          const startCol = state.columns[origin.colIndex];
          const pasteOp: PasteOperation = {
            rawText,
            parsed,
            startRowIndex: origin.rowIndex,
            startColId: startCol?.colId ?? '',
            pastedCells,
            rejectedCells,
          };

          ctx.setState<ClipboardProState>(STATE_KEY, (prev) => ({
            ...prev,
            lastOperation: 'paste',
            lastPasteResult: pasteOp,
          }));

          (ctx.eventBus as any).emit('clipboard:paste', {
            pastedCells: pastedCells.length,
            rejectedCells: rejectedCells.length,
            operation: pasteOp,
          });
        },
      );

      // ── Command: clipboard:cut ──
      const unregCut = ctx.commandBus.registerHandler(
        'clipboard:cut' as any,
        async (_payload: unknown) => {
          const range = getCopyRange();
          if (!range) return;

          const state = ctx.store.getState();
          const text = serializeRangeToTSV(() => state, range, options);
          await writeClipboard(text);

          // Store cut data and clear cells
          const cutData = new Map<string, Map<string, unknown>>();

          if (enableUndo) {
            snapshotBeforePaste(ctx, 'cut');
          }

          ctx.store.batch(() => {
            for (let r = range.startRow; r <= range.endRow; r++) {
              const rowId = state.displayedRowIds[r];
              if (!rowId) continue;
              const node = state.rowNodes.get(rowId);
              if (!node?.data) continue;

              const rowData = new Map<string, unknown>();
              for (let c = range.startCol; c <= range.endCol; c++) {
                const col = state.columns[c];
                if (!col?.field) continue;

                const isEditable = typeof col.editable === 'function'
                  ? (col.editable as any)({ value: node.data[col.field], colDef: col.originalDef })
                  : col.editable !== false;

                if (!isEditable) continue;

                rowData.set(col.field, node.data[col.field]);
                node.data[col.field] = null;
                (node as any).version = ((node as any).version ?? 0) + 1;

                (ctx.eventBus as any).emit('cell:valueChanged', {
                  node,
                  colId: col.field,
                  oldValue: rowData.get(col.field),
                  newValue: null,
                });
              }
              cutData.set(rowId, rowData);
            }
          });

          const cutRange: CutRange = {
            startRowIndex: range.startRow,
            endRowIndex: range.endRow,
            columns: state.columns.slice(range.startCol, range.endCol + 1).map((c) => c.colId),
            data: cutData,
          };

          ctx.setState<ClipboardProState>(STATE_KEY, (prev) => ({
            ...prev,
            lastOperation: 'cut',
            cutRange,
          }));

          (ctx.eventBus as any).emit('clipboard:cut', {
            text,
            range: cutRange,
          });
        },
      );

      // ── Command: clipboard:pasteSpecial ──
      const unregPasteSpecial = ctx.commandBus.registerHandler(
        'clipboard:pasteSpecial' as any,
        async (payload: { mode: 'values' | 'formulas'; text?: string }) => {
          // Paste special dispatches regular paste with modified options
          const text = payload.text ?? await readClipboard();
          if (!text) return;

          if (payload.mode === 'values') {
            // Paste as plain values, strip any formulas
            const parsed = parseTSVAdvanced(text, delimiter);
            const origin = getPasteOrigin();
            if (!origin) return;

            const state = ctx.store.getState();
            ctx.store.batch(() => {
              for (let r = 0; r < parsed.length; r++) {
                const row = parsed[r]!;
                for (let c = 0; c < row.length; c++) {
                  const rowIdx = origin.rowIndex + r;
                  const colIdx = origin.colIndex + c;
                  const rowId = state.displayedRowIds[rowIdx];
                  const col = state.columns[colIdx];
                  if (!rowId || !col?.field) continue;

                  const node = state.rowNodes.get(rowId);
                  if (!node?.data) continue;

                  let value: unknown = row[c];
                  if (enableTypeCoercion && typeof value === 'string') value = coerceValue(value);

                  node.data[col.field] = value;
                  (node as any).version = ((node as any).version ?? 0) + 1;
                }
              }
            });
          } else {
            // formulas mode — dispatch normal paste which handles formula detection
            ctx.commandBus.dispatch('clipboard:paste' as any, { text });
          }
        },
      );

      // ── Keyboard Shortcuts ──
      function handleKeyboard(e: KeyboardEvent): void {
        const ctrl = e.ctrlKey || e.metaKey;
        if (!ctrl) return;

        if (e.key === 'c' || e.key === 'C') {
          e.preventDefault();
          ctx.commandBus.dispatch('clipboard:copy' as any, {});
        } else if (e.key === 'x' || e.key === 'X') {
          e.preventDefault();
          ctx.commandBus.dispatch('clipboard:cut' as any, {});
        } else if (e.key === 'v' || e.key === 'V') {
          e.preventDefault();
          ctx.commandBus.dispatch('clipboard:paste' as any, {});
        }
      }

      const rootEl = (ctx.api as any).__gsRootEl as HTMLElement | undefined;
      rootEl?.addEventListener('keydown', handleKeyboard);

      // ── Disposer ──

      return () => {
        unregCopy();
        unregCopyHeaders();
        unregPaste();
        unregCut();
        unregPasteSpecial();
        rootEl?.removeEventListener('keydown', handleKeyboard);
      };
    },
  };
}
