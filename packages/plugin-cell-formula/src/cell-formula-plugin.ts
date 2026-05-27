// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
//
// This plugin provides JavaScript-function-based COMPUTED COLUMNS, not
// spreadsheet-style cell formulas. It exists alongside `@gridstorm/plugin-
// formula` (which is the Excel-style `=A1+B1` engine). Historically the two
// shared the `formula:*` command namespace, which created a fatal collision
// on `formula:remove` — the CommandBus broadcasts every dispatch to every
// handler, so `formula:remove` with cell-formula's `{columnId}` payload would
// also call plugin-formula's handler expecting `{rowId, colId}` and vice
// versa.
//
// Current state (transitional):
//   • New, distinct commands `computedColumn:define`, `computedColumn:remove`,
//     and `computedColumn:recalculate` are the canonical API.
//   • The old `formula:*` commands are kept as deprecated aliases that emit
//     a one-time `console.warn` and then forward to the new handler. Plan to
//     remove the aliases two minor versions from now — see
//     PLUGIN_CONSOLIDATION_PLAN.md.
//   • Events follow the same pattern: `computedColumn:error` and
//     `computedColumn:computed` are the canonical events. The old
//     `formula:error` / `formula:computed` are emitted alongside for one
//     minor release so existing listeners keep working.

import type { GridPlugin } from '@gridstorm/core';
import type { FormulaDefinition, FormulaState, FormulaError, CellFormulaOptions } from './types';

const PLUGIN_STATE_KEY = 'cellFormula';

function computeForColumn(
  def: FormulaDefinition,
  rowNodes: Array<{ id: string; data: unknown }>,
  onError: NonNullable<CellFormulaOptions['onError']>,
): { values: Map<string, unknown>; errors: FormulaError[] } {
  const values = new Map<string, unknown>();
  const errors: FormulaError[] = [];

  for (const node of rowNodes) {
    try {
      const val = def.compute(node.data as Record<string, unknown>);
      values.set(node.id, val);
    } catch (e) {
      const err: FormulaError = {
        columnId: def.columnId,
        rowId: node.id,
        message: e instanceof Error ? e.message : String(e),
      };
      errors.push(err);
      if (onError === 'throw') throw e;
    }
  }
  return { values, errors };
}

// Module-level set of deprecated command names already warned about, so we
// don't spam a customer's console on every dispatch. The set lives for the
// lifetime of the process; reset is only needed in tests.
const _deprecationWarned = new Set<string>();
function warnDeprecatedAlias(oldName: string, newName: string): void {
  if (_deprecationWarned.has(oldName)) return;
  _deprecationWarned.add(oldName);
  console.warn(
    `[GridStorm] Command "${oldName}" is deprecated; use "${newName}" instead. ` +
      `The old name collides with @gridstorm/plugin-formula and will be removed ` +
      `in a future release. See PLUGIN_CONSOLIDATION_PLAN.md.`,
  );
}

/** @internal — test-only helper to reset the once-per-process warning set. */
export function _resetDeprecationWarningsForTests(): void {
  _deprecationWarned.clear();
}

export function CellFormulaPlugin(options: CellFormulaOptions = {}): GridPlugin {
  const errorMode = options.onError ?? 'report';

  return {
    id: 'cell-formula',
    name: 'Cell Formula',
    version: '0.1.0',
    install(ctx) {
      ctx.registerState(PLUGIN_STATE_KEY, {
        definitions: new Map(),
        errors: [],
        computedValues: new Map(),
      } as FormulaState);

      // Guard against re-entrant recompute triggered by our own rowNodes touch
      let isRecomputing = false;

      function getRows(): Array<{ id: string; data: unknown }> {
        const nodes: Array<{ id: string; data: unknown }> = [];
        ctx.api.forEachNode?.((node: { id: string; data: unknown }) => nodes.push(node));
        return nodes;
      }

      function recompute(columnId?: string) {
        if (isRecomputing) return;
        isRecomputing = true;

        try {
          ctx.setState(PLUGIN_STATE_KEY, (prev: unknown) => {
            const state = prev as FormulaState;
            const newComputedValues = new Map(state.computedValues);
            const allErrors: FormulaError[] = [];
            const rows = getRows();

            const defsToCompute = columnId
              ? ([state.definitions.get(columnId)].filter(Boolean) as FormulaDefinition[])
              : ([...state.definitions.values()] as FormulaDefinition[]);

            for (const def of defsToCompute) {
              const { values, errors } = computeForColumn(def, rows, errorMode);
              newComputedValues.set(def.columnId, values);
              allErrors.push(...errors);
              if (errors.length > 0 && errorMode === 'report') {
                ctx.eventBus.emit('computedColumn:error' as never, { errors } as never);
                // Deprecated alias for one release.
                ctx.eventBus.emit('formula:error' as never, { errors } as never);
              }
            }

            return { ...state, computedValues: newComputedValues, errors: allErrors };
          });

          // Write computed values back into row node data so the renderer displays them
          const state = ctx.getState(PLUGIN_STATE_KEY) as FormulaState;
          let anyUpdated = false;
          ctx.api.forEachNode?.((node: { id: string; data: Record<string, unknown>; version: number }) => {
            let nodeUpdated = false;
            for (const [colId, valueMap] of state.computedValues) {
              if (valueMap.has(node.id)) {
                node.data[colId] = valueMap.get(node.id);
                nodeUpdated = true;
              }
            }
            if (nodeUpdated) {
              // Increment version so the DOM renderer knows to rebuild this row's cells
              node.version = (node.version ?? 0) + 1;
              anyUpdated = true;
            }
          });

          // Touch rowNodes reference so the DOM renderer re-renders all cells
          if (anyUpdated) {
            ctx.store.setState((prev) => ({ ...prev, rowNodes: new Map(prev.rowNodes) }));
          }

          ctx.eventBus.emit('computedColumn:computed' as never, {
            columnId,
            computedValues: state.computedValues,
          } as never);
          // Deprecated alias for one release.
          ctx.eventBus.emit('formula:computed' as never, {
            columnId,
            computedValues: state.computedValues,
          } as never);
        } finally {
          isRecomputing = false;
        }
      }

      // ─── Canonical handlers ─────────────────────────────────────────────

      function handleDefine(payload: unknown): void {
        const def = payload as FormulaDefinition;
        ctx.setState(PLUGIN_STATE_KEY, (prev: unknown) => {
          const state = prev as FormulaState;
          const definitions = new Map(state.definitions);
          definitions.set(def.columnId, def);
          return { ...state, definitions };
        });
        recompute(def.columnId);
      }

      function handleRemove(payload: unknown): void {
        const { columnId } = payload as { columnId: string };
        // Defensive: the old `formula:remove` command shape from
        // @gridstorm/plugin-formula uses `{rowId, colId}`, not `{columnId}`.
        // If the alias handler is invoked with that shape, columnId will be
        // undefined here — silently no-op rather than scribble null over
        // every column.
        if (typeof columnId !== 'string') return;

        ctx.setState(PLUGIN_STATE_KEY, (prev: unknown) => {
          const state = prev as FormulaState;
          const definitions = new Map(state.definitions);
          const computedValues = new Map(state.computedValues);
          definitions.delete(columnId);
          computedValues.delete(columnId);
          return { ...state, definitions, computedValues };
        });

        // Clear the column value from every row's data and bump node.version
        // so the DOM renderer rebuilds those cells (same pattern as recompute)
        let anyCleared = false;
        ctx.api.forEachNode?.((node: { id: string; data: Record<string, unknown>; version: number }) => {
          if (columnId in node.data) {
            node.data[columnId] = null;
            node.version = (node.version ?? 0) + 1;
            anyCleared = true;
          }
        });

        if (anyCleared) {
          ctx.store.setState((prev) => ({ ...prev, rowNodes: new Map(prev.rowNodes) }));
        }
      }

      function handleRecalc(payload: unknown): void {
        const p = payload as { columnId?: string } | undefined;
        recompute(p?.columnId);
      }

      const unregDefineNew = ctx.commandBus.registerHandler('computedColumn:define' as never, handleDefine);
      const unregRemoveNew = ctx.commandBus.registerHandler('computedColumn:remove' as never, handleRemove);
      const unregRecalcNew = ctx.commandBus.registerHandler('computedColumn:recalculate' as never, handleRecalc);

      // ─── Deprecated aliases (warn once, then route to canonical) ───────

      const unregDefineOld = ctx.commandBus.registerHandler('formula:define' as never, (payload) => {
        warnDeprecatedAlias('formula:define', 'computedColumn:define');
        handleDefine(payload);
      });
      const unregRemoveOld = ctx.commandBus.registerHandler('formula:remove' as never, (payload) => {
        // The collision with plugin-formula's formula:remove lives here.
        // handleRemove already no-ops on missing columnId (see comment in
        // handleRemove), so dispatching formula:remove with plugin-formula's
        // {rowId, colId} payload no longer scribbles null over data.
        warnDeprecatedAlias('formula:remove', 'computedColumn:remove');
        handleRemove(payload);
      });
      const unregRecalcOld = ctx.commandBus.registerHandler('formula:recalculate' as never, (payload) => {
        warnDeprecatedAlias('formula:recalculate', 'computedColumn:recalculate');
        handleRecalc(payload);
      });

      // Recompute when rows change — isRecomputing guard prevents infinite loop
      // when recompute() itself touches rowNodes to trigger re-render
      const unsubRows = ctx.eventBus.on('rows:updated' as never, () => {
        if (!isRecomputing) recompute();
      });

      return () => {
        unregDefineNew();
        unregRemoveNew();
        unregRecalcNew();
        unregDefineOld();
        unregRemoveOld();
        unregRecalcOld();
        unsubRows();
      };
    },
  };
}
