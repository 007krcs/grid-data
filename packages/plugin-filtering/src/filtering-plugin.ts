// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Filtering Plugin ───
// Provides column-level filtering and quick filter through the plugin system.
// Registers command handlers for setting/clearing filters and manages
// the filter model state. The actual predicate evaluation is handled
// by core's filterRowNodes().

import type {
  GridPlugin,
  PluginContext,
  FilterModel,
  ColumnState,
} from '@gridstorm/core';

export interface FilteringPluginOptions {
  /** Debounce delay (ms) for quick filter input. Default: 300. */
  quickFilterDebounce?: number;
  /** Whether to preserve filter state when column definitions change. Default: true. */
  keepFilterOnColumnsChange?: boolean;
  /** Case-sensitive filtering. Default: false. */
  caseSensitive?: boolean;
}

export function FilteringPlugin(options: FilteringPluginOptions = {}): GridPlugin {
  const {
    quickFilterDebounce: _quickFilterDebounce = 300,
    keepFilterOnColumnsChange = true,
    caseSensitive: _caseSensitive = false,
  } = options;

  return {
    id: 'filtering',
    name: 'Column Filtering',
    version: '0.1.0',

    install(ctx: PluginContext) {
      // ── Register filter:set command ──
      // Note: core also registers a filter:set handler with { filterModel } payload.
      // This handler uses { colId, model } payload for per-column filter operations.
      const unregisterSet = ctx.commandBus.registerHandler(
        'filter:set',
        (payload: { colId?: string; model?: FilterModel | null; filterModel?: Record<string, FilterModel> }) => {
          // Guard: only handle per-column filter payload (ignore core's { filterModel } payload)
          if (!payload.colId) return;

          const currentModel = ctx.store.getState().filterModel ?? {};
          let newModel: Record<string, FilterModel>;

          if (payload.model === null || payload.model === undefined) {
            // Remove filter for this column
            const { [payload.colId]: _removed, ...rest } = currentModel;
            newModel = rest;
          } else {
            newModel = { ...currentModel, [payload.colId]: payload.model };
          }

          ctx.api.setFilterModel(newModel);
        },
      );

      // ── Register filter:clear command ──
      const unregisterClear = ctx.commandBus.registerHandler(
        'filter:clear',
        () => {
          ctx.api.setFilterModel({});
        },
      );

      // ── Register filter:quickFilter command ──
      const unregisterQuick = ctx.commandBus.registerHandler(
        'filter:quickFilter',
        (payload: { text: string }) => {
          ctx.api.setQuickFilter(payload.text);
        },
      );

      // ── Register filter:isActive command ──
      const unregisterIsActive = ctx.commandBus.registerHandler(
        'filter:isActive',
        (payload: { colId: string; callback: (active: boolean) => void }) => {
          const model = ctx.store.getState().filterModel;
          payload.callback(payload.colId in model);
        },
      );

      // ── Register filter:setColumn command (convenience) ──
      const unregisterSetColumn = ctx.commandBus.registerHandler(
        'filter:setColumn',
        (payload: { colId: string; model: FilterModel }) => {
          const currentModel = ctx.store.getState().filterModel;
          ctx.api.setFilterModel({ ...currentModel, [payload.colId]: payload.model });
        },
      );

      // ── Register filter:removeColumn command ──
      const unregisterRemoveColumn = ctx.commandBus.registerHandler(
        'filter:removeColumn',
        (payload: { colId: string }) => {
          const currentModel = ctx.store.getState().filterModel;
          const { [payload.colId]: _removed, ...rest } = currentModel;
          ctx.api.setFilterModel(rest);
        },
      );

      // ── Handle column changes — optionally prune stale filters ──
      let unsubColumns: (() => void) | undefined;
      if (!keepFilterOnColumnsChange) {
        unsubColumns = ctx.eventBus.on('columns:changed', ({ columns }) => {
          const currentFilter = ctx.store.getState().filterModel;
          const colIds = new Set(columns.map((c: ColumnState) => c.colId));
          const pruned: Record<string, FilterModel> = {};
          let changed = false;

          for (const [colId, model] of Object.entries(currentFilter)) {
            if (colIds.has(colId)) {
              pruned[colId] = model;
            } else {
              changed = true;
            }
          }

          if (changed) {
            ctx.api.setFilterModel(pruned);
          }
        });
      }

      // Return disposer
      return () => {
        unregisterSet();
        unregisterClear();
        unregisterQuick();
        unregisterIsActive();
        unregisterSetColumn();
        unregisterRemoveColumn();
        unsubColumns?.();
      };
    },
  };
}
