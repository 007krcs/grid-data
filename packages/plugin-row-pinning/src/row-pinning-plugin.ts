// ─── Row Pinning Plugin ───
// Allows pinning rows to the top or bottom of the grid (floating rows).
// Pinned rows remain visible outside the normal scroll area and are
// managed through commands and plugin state.

import type { GridPlugin, PluginContext } from '@gridstorm/core';

// ─── Types ───

export interface PinnedRowNode {
  /** Unique identifier for the pinned row. */
  id: string;
  /** The row data object. */
  data: unknown;
  /** Whether this row is pinned to the top or bottom. */
  position: 'top' | 'bottom';
  /** Original index in the row data array before pinning, if applicable. */
  originalIndex?: number;
}

export interface RowPinningState {
  /** Rows pinned to the top of the grid. */
  pinnedTopRows: PinnedRowNode[];
  /** Rows pinned to the bottom of the grid. */
  pinnedBottomRows: PinnedRowNode[];
}

export interface RowPinningPluginOptions {
  /** Initial data for rows pinned to the top. */
  pinnedTopRowData?: unknown[];
  /** Initial data for rows pinned to the bottom. */
  pinnedBottomRowData?: unknown[];
  /** Maximum total number of pinned rows (top + bottom). Default: 20. */
  maxPinnedRows?: number;
}

// ─── Constants ───

const STATE_KEY = 'rowPinning';
const DEFAULT_MAX_PINNED_ROWS = 20;

// ─── Helpers ───

function createPinnedNode(
  id: string,
  data: unknown,
  position: 'top' | 'bottom',
  originalIndex?: number,
): PinnedRowNode {
  return { id, data, position, originalIndex };
}

function buildInitialState(options: RowPinningPluginOptions): RowPinningState {
  const pinnedTopRows: PinnedRowNode[] = (options.pinnedTopRowData ?? []).map(
    (data, i) => createPinnedNode(`pinned-top-${i}`, data, 'top'),
  );
  const pinnedBottomRows: PinnedRowNode[] = (options.pinnedBottomRowData ?? []).map(
    (data, i) => createPinnedNode(`pinned-bottom-${i}`, data, 'bottom'),
  );
  return { pinnedTopRows, pinnedBottomRows };
}

function totalPinned(state: RowPinningState): number {
  return state.pinnedTopRows.length + state.pinnedBottomRows.length;
}

// ─── Plugin Factory ───

export function RowPinningPlugin(options: RowPinningPluginOptions = {}): GridPlugin {
  const { maxPinnedRows = DEFAULT_MAX_PINNED_ROWS } = options;

  return {
    id: 'row-pinning',
    name: 'Row Pinning',
    version: '0.1.0',

    install(ctx: PluginContext) {
      // ── Register plugin state ──
      const initialState = buildInitialState(options);
      ctx.registerState<RowPinningState>(STATE_KEY, initialState);

      // Emit initial event if we have pre-populated pinned rows
      if (initialState.pinnedTopRows.length > 0 || initialState.pinnedBottomRows.length > 0) {
        ctx.eventBus.emit('rowPinning:changed' as any, {
          pinnedTopRows: initialState.pinnedTopRows,
          pinnedBottomRows: initialState.pinnedBottomRows,
        });
      }

      // ── Helper: emit change event ──
      function emitChanged(): void {
        const current = ctx.getState<RowPinningState>(STATE_KEY);
        ctx.eventBus.emit('rowPinning:changed' as any, {
          pinnedTopRows: current.pinnedTopRows,
          pinnedBottomRows: current.pinnedBottomRows,
        });
      }

      // ── Helper: check max capacity ──
      function canPin(state: RowPinningState, count: number): boolean {
        return totalPinned(state) + count <= maxPinnedRows;
      }

      // ── Helper: check if row is already pinned ──
      function isPinned(state: RowPinningState, rowId: string): boolean {
        return (
          state.pinnedTopRows.some((r) => r.id === rowId) ||
          state.pinnedBottomRows.some((r) => r.id === rowId)
        );
      }

      // ── Command: rowPinning:pinTop ──
      const unregPinTop = ctx.commandBus.registerHandler(
        'rowPinning:pinTop',
        (payload: { rowIds: string[] }) => {
          const state = ctx.getState<RowPinningState>(STATE_KEY);
          const gridState = ctx.store.getState();

          // Filter out already-pinned rows
          const newIds = payload.rowIds.filter((id) => !isPinned(state, id));
          if (newIds.length === 0) return;

          // Enforce max limit
          if (!canPin(state, newIds.length)) return;

          const newNodes: PinnedRowNode[] = [];
          for (const rowId of newIds) {
            const rowNode = gridState.rowNodes.get(rowId);
            if (rowNode) {
              newNodes.push(
                createPinnedNode(rowId, rowNode.data, 'top', rowNode.sourceIndex),
              );
            }
          }

          if (newNodes.length === 0) return;

          ctx.setState<RowPinningState>(STATE_KEY, (prev) => ({
            ...prev,
            pinnedTopRows: [...prev.pinnedTopRows, ...newNodes],
          }));
          emitChanged();
        },
      );

      // ── Command: rowPinning:pinBottom ──
      const unregPinBottom = ctx.commandBus.registerHandler(
        'rowPinning:pinBottom',
        (payload: { rowIds: string[] }) => {
          const state = ctx.getState<RowPinningState>(STATE_KEY);
          const gridState = ctx.store.getState();

          const newIds = payload.rowIds.filter((id) => !isPinned(state, id));
          if (newIds.length === 0) return;

          if (!canPin(state, newIds.length)) return;

          const newNodes: PinnedRowNode[] = [];
          for (const rowId of newIds) {
            const rowNode = gridState.rowNodes.get(rowId);
            if (rowNode) {
              newNodes.push(
                createPinnedNode(rowId, rowNode.data, 'bottom', rowNode.sourceIndex),
              );
            }
          }

          if (newNodes.length === 0) return;

          ctx.setState<RowPinningState>(STATE_KEY, (prev) => ({
            ...prev,
            pinnedBottomRows: [...prev.pinnedBottomRows, ...newNodes],
          }));
          emitChanged();
        },
      );

      // ── Command: rowPinning:unpin ──
      const unregUnpin = ctx.commandBus.registerHandler(
        'rowPinning:unpin',
        (payload: { rowIds: string[] }) => {
          const idsToUnpin = new Set(payload.rowIds);

          ctx.setState<RowPinningState>(STATE_KEY, (prev) => ({
            pinnedTopRows: prev.pinnedTopRows.filter((r) => !idsToUnpin.has(r.id)),
            pinnedBottomRows: prev.pinnedBottomRows.filter((r) => !idsToUnpin.has(r.id)),
          }));
          emitChanged();
        },
      );

      // ── Command: rowPinning:unpinAll ──
      const unregUnpinAll = ctx.commandBus.registerHandler(
        'rowPinning:unpinAll',
        (_payload: unknown) => {
          ctx.setState<RowPinningState>(STATE_KEY, (_prev) => ({
            pinnedTopRows: [],
            pinnedBottomRows: [],
          }));
          emitChanged();
        },
      );

      // ── Command: rowPinning:setTopData ──
      const unregSetTop = ctx.commandBus.registerHandler(
        'rowPinning:setTopData',
        (payload: { data: unknown[] }) => {
          const newTopRows: PinnedRowNode[] = payload.data.map((data, i) =>
            createPinnedNode(`pinned-top-${i}`, data, 'top'),
          );

          // Check against max (preserve bottom rows)
          const currentState = ctx.getState<RowPinningState>(STATE_KEY);
          if (newTopRows.length + currentState.pinnedBottomRows.length > maxPinnedRows) return;

          ctx.setState<RowPinningState>(STATE_KEY, (prev) => ({
            ...prev,
            pinnedTopRows: newTopRows,
          }));
          emitChanged();
        },
      );

      // ── Command: rowPinning:setBottomData ──
      const unregSetBottom = ctx.commandBus.registerHandler(
        'rowPinning:setBottomData',
        (payload: { data: unknown[] }) => {
          const newBottomRows: PinnedRowNode[] = payload.data.map((data, i) =>
            createPinnedNode(`pinned-bottom-${i}`, data, 'bottom'),
          );

          // Check against max (preserve top rows)
          const currentState = ctx.getState<RowPinningState>(STATE_KEY);
          if (currentState.pinnedTopRows.length + newBottomRows.length > maxPinnedRows) return;

          ctx.setState<RowPinningState>(STATE_KEY, (prev) => ({
            ...prev,
            pinnedBottomRows: newBottomRows,
          }));
          emitChanged();
        },
      );

      // ── Return disposer ──
      return () => {
        unregPinTop();
        unregPinBottom();
        unregUnpin();
        unregUnpinAll();
        unregSetTop();
        unregSetBottom();
      };
    },
  };
}
