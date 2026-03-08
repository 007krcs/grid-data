// ─── Grouping Plugin ───
// Provides row grouping by one or more columns.
// Creates hierarchical group rows with expand/collapse support.

import type { GridPlugin, PluginContext, ColumnState, RowNode } from '@gridstorm/core';
import type { GroupingPluginOptions, GroupingState } from './types';
import { buildGroupTree, flattenGroupTree } from './group-tree';

export function GroupingPlugin(options: GroupingPluginOptions = {}): GridPlugin {
  const {
    defaultExpanded = false,
    groupDisplayType: _groupDisplayType = 'singleColumn',
    groupRowRenderer: _groupRowRenderer,
  } = options;

  return {
    id: 'grouping',
    name: 'Row Grouping',
    version: '0.1.0',

    install(ctx: PluginContext) {
      // Initialize plugin state
      const initialState: GroupingState = {
        groupColumns: [],
        expandedGroups: new Set<string>(),
      };

      // Detect initial group columns from column defs
      const state = ctx.store.getState();
      const autoGroupCols = state.columns
        .filter((c: ColumnState) => c.rowGroup)
        .sort((a: ColumnState, b: ColumnState) => (a.rowGroupIndex ?? 0) - (b.rowGroupIndex ?? 0))
        .map((c: ColumnState) => c.colId);

      if (autoGroupCols.length > 0) {
        initialState.groupColumns = autoGroupCols;
      }

      ctx.registerState('grouping', initialState);

      // ── Add column to grouping ──
      const unregAdd = ctx.commandBus.registerHandler(
        'group:addColumn',
        (payload: { colId: string }) => {
          const gs = ctx.getState<GroupingState>('grouping');
          if (gs.groupColumns.includes(payload.colId)) return;
          ctx.setState<GroupingState>('grouping', (prev) => ({
            ...prev,
            groupColumns: [...prev.groupColumns, payload.colId],
          }));
          reprocessWithGroups(ctx);
          ctx.eventBus.emit('grouping:changed', {
            groupColumns: ctx.getState<GroupingState>('grouping').groupColumns,
          });
        },
      );

      // ── Remove column from grouping ──
      const unregRemove = ctx.commandBus.registerHandler(
        'group:removeColumn',
        (payload: { colId: string }) => {
          ctx.setState<GroupingState>('grouping', (prev) => ({
            ...prev,
            groupColumns: prev.groupColumns.filter((c) => c !== payload.colId),
          }));
          reprocessWithGroups(ctx);
          ctx.eventBus.emit('grouping:changed', {
            groupColumns: ctx.getState<GroupingState>('grouping').groupColumns,
          });
        },
      );

      // ── Set all group columns ──
      const unregSet = ctx.commandBus.registerHandler(
        'group:setColumns',
        (payload: { colIds: string[] }) => {
          ctx.setState<GroupingState>('grouping', (prev) => ({
            ...prev,
            groupColumns: payload.colIds,
          }));
          reprocessWithGroups(ctx);
          ctx.eventBus.emit('grouping:changed', { groupColumns: payload.colIds });
        },
      );

      // ── Expand a group row ──
      const unregExpand = ctx.commandBus.registerHandler(
        'group:expand',
        (payload: { rowId: string }) => {
          ctx.setState<GroupingState>('grouping', (prev) => {
            const next = new Set(prev.expandedGroups);
            next.add(payload.rowId);
            return { ...prev, expandedGroups: next };
          });
          reprocessWithGroups(ctx);
          const node = ctx.store.getState().rowNodes.get(payload.rowId);
          if (node) {
            ctx.eventBus.emit('row:groupOpened', { node, expanded: true });
          }
        },
      );

      // ── Collapse a group row ──
      const unregCollapse = ctx.commandBus.registerHandler(
        'group:collapse',
        (payload: { rowId: string }) => {
          ctx.setState<GroupingState>('grouping', (prev) => {
            const next = new Set(prev.expandedGroups);
            next.delete(payload.rowId);
            return { ...prev, expandedGroups: next };
          });
          reprocessWithGroups(ctx);
          const node = ctx.store.getState().rowNodes.get(payload.rowId);
          if (node) {
            ctx.eventBus.emit('row:groupOpened', { node, expanded: false });
          }
        },
      );

      // ── Expand all ──
      const unregExpandAll = ctx.commandBus.registerHandler('group:expandAll', () => {
        const allGroupIds = getAllGroupIds(ctx);
        ctx.setState<GroupingState>('grouping', (prev) => ({
          ...prev,
          expandedGroups: new Set(allGroupIds),
        }));
        reprocessWithGroups(ctx);
      });

      // ── Collapse all ──
      const unregCollapseAll = ctx.commandBus.registerHandler('group:collapseAll', () => {
        ctx.setState<GroupingState>('grouping', (prev) => ({
          ...prev,
          expandedGroups: new Set(),
        }));
        reprocessWithGroups(ctx);
      });

      // ── Expand to level ──
      const unregExpandToLevel = ctx.commandBus.registerHandler(
        'group:expandToLevel',
        (payload: { level: number }) => {
          const groupIds = getGroupIdsToLevel(ctx, payload.level);
          ctx.setState<GroupingState>('grouping', (prev) => ({
            ...prev,
            expandedGroups: new Set(groupIds),
          }));
          reprocessWithGroups(ctx);
        },
      );

      // ── Apply default expanded state ──
      if (defaultExpanded !== false && autoGroupCols.length > 0) {
        if (defaultExpanded === true) {
          ctx.commandBus.dispatch('group:expandAll', {});
        } else if (typeof defaultExpanded === 'number') {
          ctx.commandBus.dispatch('group:expandToLevel', { level: defaultExpanded });
        }
      }

      return () => {
        unregAdd();
        unregRemove();
        unregSet();
        unregExpand();
        unregCollapse();
        unregExpandAll();
        unregCollapseAll();
        unregExpandToLevel();
      };
    },
  };
}

function reprocessWithGroups(ctx: PluginContext): void {
  const state = ctx.store.getState();
  const gs = ctx.getState<GroupingState>('grouping');

  if (gs.groupColumns.length === 0) {
    // No grouping — revert to flat list
    ctx.commandBus.dispatch('rows:reprocess', {});
    return;
  }

  // Get leaf rows (non-group rows)
  const leafRows: RowNode[] = [];
  for (const [_id, node] of state.rowNodes) {
    if (!node.group && node.data !== undefined) {
      leafRows.push(node);
    }
  }

  // Build group tree
  const groupTree = buildGroupTree(leafRows, gs.groupColumns, state.columns);

  // Flatten with expand state
  const rowNodes = new Map(state.rowNodes);
  const displayedRowIds = flattenGroupTree(groupTree, gs.expandedGroups, rowNodes);

  // Assign display positions
  let top = 0;
  const rowHeight = 40;
  for (let i = 0; i < displayedRowIds.length; i++) {
    const node = rowNodes.get(displayedRowIds[i]!);
    if (node) {
      node.displayIndex = i;
      node.rowTop = top;
      top += rowHeight;
    }
  }

  ctx.store.setState((prev) => ({
    ...prev,
    rowNodes,
    displayedRowIds,
    pagination: { ...prev.pagination, totalRows: displayedRowIds.length },
  }));
}

function getAllGroupIds(ctx: PluginContext): string[] {
  const ids: string[] = [];
  for (const [id, node] of ctx.store.getState().rowNodes) {
    if (node.group) ids.push(id);
  }
  return ids;
}

function getGroupIdsToLevel(ctx: PluginContext, maxLevel: number): string[] {
  const ids: string[] = [];
  for (const [id, node] of ctx.store.getState().rowNodes) {
    if (node.group && node.level < maxLevel) ids.push(id);
  }
  return ids;
}
