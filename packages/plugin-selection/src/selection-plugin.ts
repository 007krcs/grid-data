// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Selection Plugin ───
// Provides row selection (single, multiple), keyboard-driven selection,
// Shift+Click range selection, and Ctrl+Click toggle.
// Manages the selection slice of GridState.

import type {
  GridPlugin,
  PluginContext,
  RowNode,
  CellPosition,
  SelectionSource,
} from '@gridstorm/core';

export interface SelectionPluginOptions {
  /** Selection mode. Default: 'multiple'. */
  mode?: 'single' | 'multiple';
  /** Enable checkbox column as first column. Default: false. */
  checkbox?: boolean;
  /** Allow deselecting by clicking selected row. Default: true. */
  enableDeselection?: boolean;
  /** Suppress row click selection (use checkbox only). Default: false. */
  suppressRowClickSelection?: boolean;
}

export function SelectionPlugin(options: SelectionPluginOptions = {}): GridPlugin {
  const {
    mode = 'multiple',
    checkbox: _checkbox = false,
    enableDeselection = true,
    suppressRowClickSelection = false,
  } = options;

  return {
    id: 'selection',
    name: 'Row Selection',
    version: '0.1.0',

    install(ctx: PluginContext) {
      // ── Register selection:select command ──
      const unregisterSelect = ctx.commandBus.registerHandler(
        'selection:select',
        (payload: {
          rowId: string;
          multiSelect?: boolean;
          rangeSelect?: boolean;
          source?: SelectionSource;
        }) => {
          const state = ctx.store.getState();
          const node = state.rowNodes.get(payload.rowId);
          if (!node || !node.selectable) return;

          const source = payload.source ?? 'click';
          const currentSelected = state.selection.selectedRowIds;

          if (payload.rangeSelect && mode === 'multiple') {
            // Range selection: select all rows between last selected and this one
            const lastSelectedId = [...currentSelected].pop();
            if (lastSelectedId) {
              const displayedIds = state.displayedRowIds;
              const fromIdx = displayedIds.indexOf(lastSelectedId);
              const toIdx = displayedIds.indexOf(payload.rowId);

              if (fromIdx >= 0 && toIdx >= 0) {
                const start = Math.min(fromIdx, toIdx);
                const end = Math.max(fromIdx, toIdx);
                const newSelected = new Set(currentSelected);

                for (let i = start; i <= end; i++) {
                  const id = displayedIds[i]!;
                  const n = state.rowNodes.get(id);
                  if (n?.selectable) {
                    newSelected.add(id);
                    n.selected = true;
                    n.version++;
                  }
                }

                ctx.store.setState((prev) => ({
                  ...prev,
                  selection: { ...prev.selection, selectedRowIds: newSelected },
                }));

                emitSelectionChanged(ctx, source);
                return;
              }
            }
          }

          if (payload.multiSelect && mode === 'multiple') {
            // Toggle: add or remove this row
            const newSelected = new Set(currentSelected);
            if (newSelected.has(payload.rowId) && enableDeselection) {
              newSelected.delete(payload.rowId);
              node.selected = false;
            } else {
              newSelected.add(payload.rowId);
              node.selected = true;
            }
            node.version++;

            ctx.store.setState((prev) => ({
              ...prev,
              selection: { ...prev.selection, selectedRowIds: newSelected },
            }));
          } else {
            // Single selection: clear others, select this one
            if (
              currentSelected.size === 1 &&
              currentSelected.has(payload.rowId) &&
              enableDeselection
            ) {
              // Deselect
              for (const id of currentSelected) {
                const n = state.rowNodes.get(id);
                if (n) { n.selected = false; n.version++; }
              }
              ctx.store.setState((prev) => ({
                ...prev,
                selection: { ...prev.selection, selectedRowIds: new Set() },
              }));
            } else {
              // Clear old, select new
              for (const id of currentSelected) {
                const n = state.rowNodes.get(id);
                if (n) { n.selected = false; n.version++; }
              }
              node.selected = true;
              node.version++;
              ctx.store.setState((prev) => ({
                ...prev,
                selection: {
                  ...prev.selection,
                  selectedRowIds: new Set([payload.rowId]),
                },
              }));
            }
          }

          emitSelectionChanged(ctx, source);
        },
      );

      // ── Register selection:set command (for controlled selection from React adapter) ──
      const unregisterSet = ctx.commandBus.registerHandler(
        'selection:set',
        (payload: { selectedRowIds: Set<string> | string[]; source?: SelectionSource }) => {
          const rawIds = payload.selectedRowIds instanceof Set
            ? payload.selectedRowIds
            : new Set(payload.selectedRowIds);
          const source = payload.source ?? 'api';
          const state = ctx.store.getState();

          // Filter to only selectable IDs
          const newIds = new Set<string>();
          for (const id of rawIds) {
            const n = state.rowNodes.get(id);
            if (n && n.selectable) {
              newIds.add(id);
            }
          }

          // Clear old selection flags
          for (const id of state.selection.selectedRowIds) {
            const n = state.rowNodes.get(id);
            if (n) { n.selected = false; n.version++; }
          }

          // Apply new selection flags
          for (const id of newIds) {
            const n = state.rowNodes.get(id);
            if (n) {
              n.selected = true;
              n.version++;
            }
          }

          ctx.store.setState((prev) => ({
            ...prev,
            selection: { ...prev.selection, selectedRowIds: newIds },
          }));

          emitSelectionChanged(ctx, source);
        },
      );

      // ── Register selection:selectAll command ──
      const unregisterSelectAll = ctx.commandBus.registerHandler(
        'selection:selectAll',
        () => {
          if (mode !== 'multiple') return;
          ctx.api.selectAll();
        },
      );

      // ── Register selection:deselectAll command ──
      const unregisterDeselectAll = ctx.commandBus.registerHandler(
        'selection:deselectAll',
        () => {
          ctx.api.deselectAll();
        },
      );

      // ── Listen for row clicks if not suppressed ──
      let unsubRowClick: (() => void) | undefined;
      if (!suppressRowClickSelection) {
        unsubRowClick = ctx.eventBus.on(
          'row:clicked',
          ({ node, event }: { node: RowNode; event: MouseEvent | null }) => {
            ctx.commandBus.dispatch('selection:select', {
              rowId: node.id,
              multiSelect: event?.ctrlKey || event?.metaKey,
              rangeSelect: event?.shiftKey,
              source: 'click' as SelectionSource,
            });
          },
        );
      }

      // ── Register focus:set command for keyboard nav ──
      const unregisterFocus = ctx.commandBus.registerHandler(
        'focus:set',
        (payload: { position: CellPosition | null }) => {
          const prev = ctx.store.getState().focusedCell;
          ctx.store.setState((s) => ({
            ...s,
            focusedCell: payload.position,
          }));
          ctx.eventBus.emit('cell:focused', {
            position: payload.position,
            previousPosition: prev,
          });
        },
      );

      return () => {
        unregisterSelect();
        unregisterSet();
        unregisterSelectAll();
        unregisterDeselectAll();
        unregisterFocus();
        unsubRowClick?.();
      };
    },
  };
}

function emitSelectionChanged(ctx: PluginContext, source: SelectionSource): void {
  ctx.eventBus.emit('selection:changed', {
    selectedNodes: ctx.api.getSelectedNodes(),
    source,
  });
}
