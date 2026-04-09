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

          ctx.eventBus.emit('formula:computed' as never, {
            columnId,
            computedValues: state.computedValues,
          } as never);
        } finally {
          isRecomputing = false;
        }
      }

      const unregisterDefine = ctx.commandBus.registerHandler(
        'formula:define' as never,
        (payload: unknown) => {
          const def = payload as FormulaDefinition;
          ctx.setState(PLUGIN_STATE_KEY, (prev: unknown) => {
            const state = prev as FormulaState;
            const definitions = new Map(state.definitions);
            definitions.set(def.columnId, def);
            return { ...state, definitions };
          });
          recompute(def.columnId);
        },
      );

      const unregisterRemove = ctx.commandBus.registerHandler(
        'formula:remove' as never,
        (payload: unknown) => {
          const { columnId } = payload as { columnId: string };
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
        },
      );

      const unregisterRecalc = ctx.commandBus.registerHandler(
        'formula:recalculate' as never,
        (payload: unknown) => {
          const p = payload as { columnId?: string } | undefined;
          recompute(p?.columnId);
        },
      );

      // Recompute when rows change — isRecomputing guard prevents infinite loop
      // when recompute() itself touches rowNodes to trigger re-render
      const unsubRows = ctx.eventBus.on('rows:updated' as never, () => {
        if (!isRecomputing) recompute();
      });

      return () => {
        unregisterDefine();
        unregisterRemove();
        unregisterRecalc();
        unsubRows();
      };
    },
  };
}
