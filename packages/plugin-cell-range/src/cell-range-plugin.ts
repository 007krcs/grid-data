// ─── Cell Range Selection Plugin ───
// Provides Excel-like cell range selection with fill handle and pattern detection.

import type { GridPlugin, PluginContext } from '@gridstorm/core';
import type { CellRangePluginOptions, CellRangeState, RangeSelection } from './types';
import { createRange, expandRange, getRangeCells, resetRangeCounter } from './range-model';
import { detectPattern } from './pattern-detector';
import { generateFillValues } from './fill-engine';

const INITIAL_STATE: CellRangeState = {
  ranges: [],
  activeRangeId: null,
  fillDragging: false,
};

export function CellRangePlugin(options: CellRangePluginOptions = {}): GridPlugin {
  const {
    multiRange = true,
    fillHandle: _fillHandle = true,
    maxRanges = 10,
  } = options;

  return {
    id: 'cell-range',
    name: 'Cell Range Selection',
    version: '0.1.0',

    install(ctx: PluginContext) {
      // Register plugin state
      ctx.registerState<CellRangeState>('cellRange', { ...INITIAL_STATE });

      // Reset range counter on install for predictable IDs in tests
      resetRangeCounter();

      const disposers: Array<() => void> = [];

      // ── range:select ──
      disposers.push(
        ctx.commandBus.registerHandler(
          'range:select',
          (payload: {
            startRow: number;
            startCol: number;
            endRow: number;
            endCol: number;
            append?: boolean;
          }) => {
            const range = createRange(
              { rowIndex: payload.startRow, colIndex: payload.startCol },
              { rowIndex: payload.endRow, colIndex: payload.endCol },
            );

            ctx.setState<CellRangeState>('cellRange', (prev) => {
              let ranges: RangeSelection[];
              if (payload.append && multiRange) {
                ranges = [...prev.ranges, range];
                // Trim to max
                if (ranges.length > maxRanges) {
                  ranges = ranges.slice(ranges.length - maxRanges);
                }
              } else {
                ranges = [range];
              }
              return {
                ...prev,
                ranges,
                activeRangeId: range.id,
              };
            });

            (ctx.eventBus as any).emit('cellRange:changed', {
              ranges: ctx.getState<CellRangeState>('cellRange').ranges,
            });
          },
        ),
      );

      // ── range:clear ──
      disposers.push(
        ctx.commandBus.registerHandler('range:clear', () => {
          ctx.setState<CellRangeState>('cellRange', (prev) => ({
            ...prev,
            ranges: [],
            activeRangeId: null,
          }));

          (ctx.eventBus as any).emit('cellRange:changed', { ranges: [] });
        }),
      );

      // ── range:expand ──
      disposers.push(
        ctx.commandBus.registerHandler(
          'range:expand',
          (payload: { endRow: number; endCol: number }) => {
            ctx.setState<CellRangeState>('cellRange', (prev) => {
              if (!prev.activeRangeId) return prev;

              const ranges = prev.ranges.map((r) => {
                if (r.id === prev.activeRangeId) {
                  return expandRange(r, {
                    rowIndex: payload.endRow,
                    colIndex: payload.endCol,
                  });
                }
                return r;
              });

              return { ...prev, ranges };
            });

            (ctx.eventBus as any).emit('cellRange:changed', {
              ranges: ctx.getState<CellRangeState>('cellRange').ranges,
            });
          },
        ),
      );

      // ── range:fill ──
      disposers.push(
        ctx.commandBus.registerHandler(
          'range:fill',
          (payload: { direction: 'down' | 'up' | 'left' | 'right'; count: number }) => {
            const state = ctx.getState<CellRangeState>('cellRange');
            if (!state.activeRangeId) return;

            const activeRange = state.ranges.find((r) => r.id === state.activeRangeId);
            if (!activeRange) return;

            const gridState = ctx.store.getState();
            const { bounds } = activeRange;
            const { direction, count } = payload;

            // For each column (down/up) or each row (left/right), extract source values,
            // detect pattern, generate fill values, and apply.
            const updates: Array<{ rowIndex: number; colIndex: number; value: unknown }> = [];

            if (direction === 'down' || direction === 'up') {
              // Iterate over each column in the range
              for (let col = bounds.startCol; col <= bounds.endCol; col++) {
                const sourceValues: unknown[] = [];
                for (let row = bounds.startRow; row <= bounds.endRow; row++) {
                  sourceValues.push(getCellValue(gridState, row, col));
                }

                const pattern = detectPattern(sourceValues);
                const fillValues = generateFillValues(pattern, count, sourceValues.length);

                for (let i = 0; i < count; i++) {
                  const targetRow =
                    direction === 'down' ? bounds.endRow + 1 + i : bounds.startRow - 1 - i;
                  updates.push({ rowIndex: targetRow, colIndex: col, value: fillValues[i] });
                }
              }
            } else {
              // left or right — iterate over each row
              for (let row = bounds.startRow; row <= bounds.endRow; row++) {
                const sourceValues: unknown[] = [];
                for (let col = bounds.startCol; col <= bounds.endCol; col++) {
                  sourceValues.push(getCellValue(gridState, row, col));
                }

                const pattern = detectPattern(sourceValues);
                const fillValues = generateFillValues(pattern, count, sourceValues.length);

                for (let i = 0; i < count; i++) {
                  const targetCol =
                    direction === 'right' ? bounds.endCol + 1 + i : bounds.startCol - 1 - i;
                  updates.push({ rowIndex: row, colIndex: targetCol, value: fillValues[i] });
                }
              }
            }

            // Apply updates to the grid
            applyUpdates(ctx, updates);

            (ctx.eventBus as any).emit('cellRange:filled', {
              cellsUpdated: updates.length,
              values: updates,
            });
          },
        ),
      );

      // ── range:copy ──
      disposers.push(
        ctx.commandBus.registerHandler('range:copy', () => {
          const state = ctx.getState<CellRangeState>('cellRange');
          if (state.ranges.length === 0) return;

          const gridState = ctx.store.getState();
          const tsvRows: string[] = [];

          for (const range of state.ranges) {
            const { bounds } = range;
            for (let row = bounds.startRow; row <= bounds.endRow; row++) {
              const cells: string[] = [];
              for (let col = bounds.startCol; col <= bounds.endCol; col++) {
                const val = getCellValue(gridState, row, col);
                cells.push(val == null ? '' : String(val));
              }
              tsvRows.push(cells.join('\t'));
            }
          }

          (ctx.eventBus as any).emit('cellRange:copy', {
            tsv: tsvRows.join('\n'),
          });
        }),
      );

      // ── range:delete ──
      disposers.push(
        ctx.commandBus.registerHandler('range:delete', () => {
          const state = ctx.getState<CellRangeState>('cellRange');
          if (state.ranges.length === 0) return;

          const updates: Array<{ rowIndex: number; colIndex: number; value: unknown }> = [];

          for (const range of state.ranges) {
            const cells = getRangeCells(range);
            for (const cell of cells) {
              updates.push({ rowIndex: cell.rowIndex, colIndex: cell.colIndex, value: null });
            }
          }

          applyUpdates(ctx, updates);

          (ctx.eventBus as any).emit('cellRange:deleted', {
            cellsCleared: updates.length,
          });
        }),
      );

      // ── range:selectAll ──
      disposers.push(
        ctx.commandBus.registerHandler('range:selectAll', () => {
          const gridState = ctx.store.getState();
          const rowCount = gridState.displayedRowIds.length;
          const colCount = gridState.columns.length;

          if (rowCount === 0 || colCount === 0) return;

          const range = createRange(
            { rowIndex: 0, colIndex: 0 },
            { rowIndex: rowCount - 1, colIndex: colCount - 1 },
          );

          ctx.setState<CellRangeState>('cellRange', (prev) => ({
            ...prev,
            ranges: [range],
            activeRangeId: range.id,
          }));

          (ctx.eventBus as any).emit('cellRange:changed', {
            ranges: ctx.getState<CellRangeState>('cellRange').ranges,
          });
        }),
      );

      // ── range:getCells ──
      disposers.push(
        ctx.commandBus.registerHandler('range:getCells', () => {
          const state = ctx.getState<CellRangeState>('cellRange');
          const allCells = state.ranges.flatMap(getRangeCells);

          (ctx.eventBus as any).emit('cellRange:cells', {
            cells: allCells,
          });
        }),
      );

      // Return disposer
      return () => {
        for (const dispose of disposers) {
          dispose();
        }
      };
    },
  };
}

// ── Helpers ──

/**
 * Get a cell value from the grid state by row display index and column index.
 */
function getCellValue(gridState: any, rowIndex: number, colIndex: number): unknown {
  const rowId = gridState.displayedRowIds[rowIndex];
  if (rowId == null) return undefined;

  const rowNode = gridState.rowNodes.get(rowId);
  if (!rowNode || !rowNode.data) return undefined;

  const column = gridState.columns[colIndex];
  if (!column) return undefined;

  const field = column.field || column.colId;
  return (rowNode.data as any)[field];
}

/**
 * Apply cell value updates to the grid.
 */
function applyUpdates(
  ctx: PluginContext,
  updates: Array<{ rowIndex: number; colIndex: number; value: unknown }>,
): void {
  const gridState = ctx.store.getState();

  ctx.store.batch(() => {
    for (const update of updates) {
      const rowId = gridState.displayedRowIds[update.rowIndex];
      if (rowId == null) continue;

      const rowNode = gridState.rowNodes.get(rowId);
      if (!rowNode || !rowNode.data) continue;

      const column = gridState.columns[update.colIndex];
      if (!column) continue;

      const field = column.field || column.colId;
      (rowNode.data as any)[field] = update.value;
    }

    // Trigger a refresh
    ctx.store.setState((s) => ({ ...s }));
  });
}
