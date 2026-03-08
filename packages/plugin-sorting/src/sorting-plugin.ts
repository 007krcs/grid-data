// ─── Sorting Plugin ───
// Provides single and multi-column sorting through the plugin system.
// Listens for 'sort:toggle' commands from the header click handler
// and manages the sort model state.

import type { GridPlugin, PluginContext, SortModelItem, SortDirection } from '@gridstorm/core';

export interface SortingPluginOptions {
  /** Allow multiple columns to be sorted simultaneously. Default: true. */
  multiSort?: boolean;
  /** Maximum number of columns in multi-sort. Default: Infinity. */
  maxSortColumns?: number;
  /** Sort cycle order. Default: ['asc', 'desc', null]. */
  sortCycle?: (SortDirection)[];
  /** Trigger row reprocessing after sort change. Default: true. */
  autoApply?: boolean;
}

const DEFAULT_SORT_CYCLE: SortDirection[] = ['asc', 'desc', null];

export function SortingPlugin(options: SortingPluginOptions = {}): GridPlugin {
  const {
    multiSort = true,
    maxSortColumns = Infinity,
    sortCycle = DEFAULT_SORT_CYCLE,
    autoApply: _autoApply = true,
  } = options;

  return {
    id: 'sorting',
    name: 'Column Sorting',
    version: '0.1.0',

    install(ctx: PluginContext) {
      // Register the sort:toggle command
      const unregisterToggle = ctx.commandBus.registerHandler(
        'sort:toggle',
        (payload: { colId: string; multiSort?: boolean }) => {
          const state = ctx.store.getState();
          const col = state.columns.find((c) => c.colId === payload.colId);

          // Only sort sortable columns
          if (!col || !col.sortable) return;

          const useMultiSort = multiSort && (payload.multiSort ?? false);
          const currentModel = state.sortModel;
          const newModel = toggleColumnSort(
            currentModel,
            payload.colId,
            useMultiSort,
            maxSortColumns,
            sortCycle,
          );

          // Update sort model via API
          ctx.api.setSortModel(newModel);
        },
      );

      // Register sort:clear command
      const unregisterClear = ctx.commandBus.registerHandler('sort:clear', () => {
        ctx.api.setSortModel([]);
      });

      // Return disposer
      return () => {
        unregisterToggle();
        unregisterClear();
      };
    },
  };
}

/**
 * Toggle sort for a column, respecting multi-sort and cycle settings.
 */
function toggleColumnSort(
  currentModel: SortModelItem[],
  colId: string,
  multiSort: boolean,
  maxSortColumns: number,
  sortCycle: SortDirection[],
): SortModelItem[] {
  const existingIndex = currentModel.findIndex((s) => s.colId === colId);

  if (existingIndex >= 0) {
    // Column is already sorted — cycle to next direction
    const existing = currentModel[existingIndex]!;
    const currentCycleIndex = sortCycle.indexOf(existing.sort);
    const nextCycleIndex = (currentCycleIndex + 1) % sortCycle.length;
    const nextDirection = sortCycle[nextCycleIndex]!;

    if (nextDirection === null) {
      // Remove from sort model
      if (multiSort) {
        return currentModel.filter((_, i) => i !== existingIndex);
      }
      return [];
    }

    // Update direction
    const updated: SortModelItem = { colId, sort: nextDirection };
    if (multiSort) {
      return currentModel.map((s, i) => (i === existingIndex ? updated : s));
    }
    return [updated];
  }

  // Column is not sorted — add with first direction in cycle
  const firstDirection = sortCycle.find((d) => d !== null);
  if (!firstDirection) return currentModel;

  const newItem: SortModelItem = { colId, sort: firstDirection };

  if (multiSort) {
    const model = [...currentModel, newItem];
    // Trim to max sort columns
    if (model.length > maxSortColumns) {
      return model.slice(model.length - maxSortColumns);
    }
    return model;
  }

  return [newItem];
}
