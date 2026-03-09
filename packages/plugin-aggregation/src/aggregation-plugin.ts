// ─── Aggregation Plugin ───
// Computes aggregate values for group rows.
// Walks the group tree bottom-up, computing aggregations for each group node.

import type { GridPlugin, PluginContext, ColumnState, RowNode } from '@gridstorm/core';
import { getValueFromData } from '@gridstorm/core';
import { validateLicense, createWatermark } from '@gridstorm/license';
import type { AggregationPluginOptions, AggFunc } from './types';
import { builtInAggFuncs } from './agg-functions';

export function AggregationPlugin(options: AggregationPluginOptions = {}): GridPlugin {
  const {
    defaultAggFunc: _defaultAggFunc,
    customAggFuncs = {},
  } = options;

  // Merge built-in and custom agg functions
  const aggFuncRegistry: Record<string, AggFunc> = { ...builtInAggFuncs, ...customAggFuncs };

  return {
    id: 'aggregation',
    name: 'Aggregation',
    version: '0.1.0',
    dependencies: ['grouping'],

    install(ctx: PluginContext) {
      // ── License validation ──
      const licenseResult = validateLicense('aggregation');
      let unsubLicenseWatermark: (() => void) | undefined;
      if (!licenseResult.valid && !licenseResult.isDevelopment) {
        console.warn(licenseResult.message);
        unsubLicenseWatermark = ctx.eventBus.on('grid:ready', () => {
          const container = document.querySelector<HTMLElement>('.gs-root');
          if (container) createWatermark(container);
        });
      }
      if (!licenseResult.pluginLicensed && !licenseResult.isDevelopment) {
        console.warn(licenseResult.message);
      }

      // ── Set aggregation function on a column ──
      const unregSet = ctx.commandBus.registerHandler(
        'agg:setColumnFunc',
        (payload: { colId: string; aggFunc: string }) => {
          ctx.store.setState((prev) => ({
            ...prev,
            columns: prev.columns.map((c: ColumnState) =>
              c.colId === payload.colId
                ? { ...c, aggFunc: payload.aggFunc }
                : c,
            ),
          }));
          computeAggregations(ctx, aggFuncRegistry);
        },
      );

      // ── Remove aggregation from a column ──
      const unregRemove = ctx.commandBus.registerHandler(
        'agg:removeColumnFunc',
        (payload: { colId: string }) => {
          ctx.store.setState((prev) => ({
            ...prev,
            columns: prev.columns.map((c: ColumnState) =>
              c.colId === payload.colId
                ? { ...c, aggFunc: null }
                : c,
            ),
          }));
        },
      );

      // ── Manually trigger aggregation computation ──
      const unregCompute = ctx.commandBus.registerHandler('agg:compute', () => {
        computeAggregations(ctx, aggFuncRegistry);
      });

      // ── Auto-compute when grouping changes ──
      const unsubGrouping = ctx.eventBus.on('grouping:changed', () => {
        computeAggregations(ctx, aggFuncRegistry);
      });

      return () => {
        unsubLicenseWatermark?.();
        unregSet();
        unregRemove();
        unregCompute();
        unsubGrouping();
      };
    },
  };
}

function computeAggregations(ctx: PluginContext, registry: Record<string, AggFunc>): void {
  const state = ctx.store.getState();

  // Find columns with agg functions
  const aggColumns = state.columns.filter((c: ColumnState) => c.aggFunc != null);
  if (aggColumns.length === 0) {
    // Clear aggData on all group nodes when no agg columns remain
    for (const [, node] of state.rowNodes) {
      if (node.group && node.aggData) {
        node.aggData = {};
        node.version++;
      }
    }
    return;
  }

  const groupNodeIds: string[] = [];

  // Walk all group nodes and compute aggregations
  for (const [id, node] of state.rowNodes) {
    if (!node.group || !node.children) continue;
    groupNodeIds.push(id);

    const aggData: Record<string, any> = {};

    for (const col of aggColumns) {
      const aggFuncName = typeof col.aggFunc === 'string' ? col.aggFunc : null;
      if (!aggFuncName) continue;

      const aggFn = registry[aggFuncName];
      if (!aggFn) continue;

      // Collect leaf values
      const { values, nodes } = collectLeafValues(node.children, col);

      aggData[col.colId] = aggFn({ values, nodes, column: col });
    }

    node.aggData = aggData;
    node.version++;
  }

  ctx.eventBus.emit('aggregation:computed', { groupNodeIds });
}

function collectLeafValues(
  children: RowNode[],
  col: ColumnState,
): { values: any[]; nodes: RowNode[] } {
  const values: any[] = [];
  const nodes: RowNode[] = [];

  for (const child of children) {
    if (child.group && child.children) {
      // Use child's aggregated value if available
      if (child.aggData && col.colId in child.aggData) {
        values.push(child.aggData[col.colId]);
        nodes.push(child);
      } else {
        // Recurse into leaf nodes
        const sub = collectLeafValues(child.children, col);
        values.push(...sub.values);
        nodes.push(...sub.nodes);
      }
    } else {
      const value = getValueFromData(child.data, col.field);
      values.push(value);
      nodes.push(child);
    }
  }

  return { values, nodes };
}
