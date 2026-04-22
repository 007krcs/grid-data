// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Status Bar Plugin ───
// Provides an aggregation summary bar showing sum, avg, min, max, count
// for selected cells or all rows. Listens to selection changes and
// recalculates aggregation results automatically.

import type { GridPlugin, PluginContext, RowNode, ColumnState } from '@gridstorm/core';

// ─── Types ───

export type AggregationType = 'sum' | 'avg' | 'min' | 'max' | 'count' | 'first' | 'last';

export interface StatusBarPanel {
  id: string;
  label?: string;
  align?: 'left' | 'center' | 'right';
  component?: string;
}

export interface AggregationResult {
  sum: number;
  avg: number;
  min: number;
  max: number;
  count: number;
  first: unknown;
  last: unknown;
}

export interface StatusBarState {
  panels: StatusBarPanel[];
  aggregations: Record<string, AggregationResult>;
  visible: boolean;
}

export interface StatusBarPluginOptions {
  /** Configurable panels to display in the status bar. */
  panels?: StatusBarPanel[];
  /** Which aggregation types to compute. Default: all. */
  defaultAggregations?: AggregationType[];
  /** Show stats for selected cells only. Default: true. */
  showOnSelection?: boolean;
  /** Show stats for all rows when no selection. Default: true. */
  showForAllRows?: boolean;
}

// ─── Constants ───

const ALL_AGGREGATIONS: AggregationType[] = ['sum', 'avg', 'min', 'max', 'count', 'first', 'last'];

const STATE_KEY = 'statusBar';

// ─── Plugin Factory ───

export function StatusBarPlugin(options: StatusBarPluginOptions = {}): GridPlugin {
  const {
    panels = [],
    defaultAggregations = ALL_AGGREGATIONS,
    showOnSelection = true,
    showForAllRows = true,
  } = options;

  return {
    id: 'status-bar',
    name: 'Status Bar',
    version: '0.1.0',

    install(ctx: PluginContext) {
      // Register initial plugin state
      const initialState: StatusBarState = {
        panels,
        aggregations: {},
        visible: true,
      };
      ctx.registerState<StatusBarState>(STATE_KEY, initialState);

      // ─── Calculation logic ───

      function calculateAggregations(rows: RowNode[], columns: ColumnState[]): Record<string, AggregationResult> {
        const results: Record<string, AggregationResult> = {};

        for (const col of columns) {
          const field = col.field;
          if (!field) continue;

          // Collect numeric values for this column
          const values: number[] = [];
          let first: unknown = undefined;
          let last: unknown = undefined;

          for (let i = 0; i < rows.length; i++) {
            const row = rows[i]!;
            if (!row.data) continue;

            const raw = (row.data as Record<string, unknown>)[field];

            // Track first and last raw values
            if (i === 0) first = raw;
            last = raw;

            // Only include numeric values for numeric aggregations
            const num = typeof raw === 'number' ? raw : Number(raw);
            if (!Number.isNaN(num) && raw !== null && raw !== undefined && raw !== '') {
              values.push(num);
            }
          }

          // Skip columns with no numeric data (unless first/last is requested)
          if (values.length === 0 && !defaultAggregations.includes('first') && !defaultAggregations.includes('last')) {
            continue;
          }

          const result: AggregationResult = {
            sum: 0,
            avg: 0,
            min: 0,
            max: 0,
            count: values.length,
            first,
            last,
          };

          if (values.length > 0) {
            if (defaultAggregations.includes('sum')) {
              result.sum = values.reduce((acc, v) => acc + v, 0);
            }
            if (defaultAggregations.includes('avg')) {
              result.avg = values.reduce((acc, v) => acc + v, 0) / values.length;
            }
            if (defaultAggregations.includes('min')) {
              result.min = Math.min(...values);
            }
            if (defaultAggregations.includes('max')) {
              result.max = Math.max(...values);
            }
          }

          results[col.colId] = result;
        }

        return results;
      }

      function recalculate(): void {
        const state = ctx.store.getState();
        const columns = state.columns;
        const selectedRowIds = state.selection.selectedRowIds;

        let rows: RowNode[] = [];

        if (showOnSelection && selectedRowIds.size > 0) {
          // Use selected rows
          for (const rowId of selectedRowIds) {
            const node = state.rowNodes.get(rowId);
            if (node) rows.push(node);
          }
        } else if (showForAllRows) {
          // Use all displayed rows
          for (const rowId of state.displayedRowIds) {
            const node = state.rowNodes.get(rowId);
            if (node) rows.push(node);
          }
        }

        const aggregations = calculateAggregations(rows, columns);

        ctx.setState<StatusBarState>(STATE_KEY, (prev) => ({
          ...prev,
          aggregations,
        }));
      }

      // ─── Commands ───

      ctx.registerCommand('statusBar:calculate', (_payload: unknown) => {
        recalculate();
      });

      ctx.registerCommand('statusBar:toggle', (_payload: unknown) => {
        ctx.setState<StatusBarState>(STATE_KEY, (prev) => ({
          ...prev,
          visible: !prev.visible,
        }));
      });

      ctx.registerCommand('statusBar:setPanels', (payload: { panels: StatusBarPanel[] }) => {
        ctx.setState<StatusBarState>(STATE_KEY, (prev) => ({
          ...prev,
          panels: payload.panels,
        }));
      });

      // ─── Event Listeners ───

      const unsubSelection = ctx.eventBus.on('selection:changed', () => {
        recalculate();
      });

      // Initial calculation
      recalculate();

      // Return disposer
      return () => {
        unsubSelection();
      };
    },
  };
}
