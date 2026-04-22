// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Tree Data Plugin ───
// Provides hierarchical parent-child row display with expand/collapse.

import type { GridPlugin, PluginContext, RowNode } from '@gridstorm/core';
import { validateLicense, createWatermark } from '@gridstorm/license';
import type { TreeDataPluginOptions, TreeNodeState } from './types';
import { buildTree, flattenTree } from './tree-builder';

export function TreeDataPlugin(options: TreeDataPluginOptions = {}): GridPlugin {
  const {
    getParentId,
    childrenField = 'children',
    defaultExpanded = false,
    maxDepth: _maxDepth = Infinity,
    indentPerLevel: _indentPerLevel = 24,
  } = options;

  return {
    id: 'tree-data',
    name: 'Tree Data',
    version: '0.1.0',

    install(ctx: PluginContext) {
      // ── License validation ──
      const licenseResult = validateLicense('tree-data');
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

      let treeState = new Map<string, TreeNodeState>();
      let lastAppliedIds: string[] | null = null;

      // Determine parentId function based on options
      const parentIdFn =
        typeof getParentId === 'string'
          ? (data: any) => data?.[getParentId] ?? null
          : getParentId ?? undefined;

      // If getParentId is provided, use flat data mode; otherwise use nested (childrenField) mode
      const useNested = !getParentId && !!childrenField;

      /**
       * Full rebuild: reconstruct the tree structure from row data.
       * Called when data changes (e.g., setRowData).
       * For nested data mode, first flatten children into RowNodes.
       */
      function fullRebuild(): void {
        const state = ctx.store.getState();

        // For nested data, flatten children into RowNodes if they don't exist yet
        if (useNested && childrenField) {
          let nextIndex = state.rowNodes.size;
          const flattenChildren = (parentData: any, parentId: string) => {
            const children = parentData?.[childrenField];
            if (!Array.isArray(children)) return;
            for (const childData of children) {
              // Check if this child data already has a RowNode
              let childHasNode = false;
              for (const [, node] of state.rowNodes) {
                if (node.data === childData) { childHasNode = true; break; }
              }
              if (!childHasNode) {
                // Create a RowNode for this child
                const childId = childData.id != null ? String(childData.id) : `tree-${parentId}-${nextIndex}`;
                const childNode: RowNode = {
                  id: childId,
                  data: childData,
                  sourceIndex: nextIndex++,
                  displayIndex: -1,
                  level: 0,
                  rowHeight: 40,
                  rowTop: 0,
                  parent: state.rowNodes.get(parentId) ?? null,
                  children: null,
                  expanded: defaultExpanded,
                  group: false,
                  groupField: null,
                  groupValue: undefined,
                  leafChildrenCount: 0,
                  aggData: null,
                  selected: false,
                  selectable: true,
                  detail: false,
                  rowPinned: null,
                  version: 1,
                };
                state.rowNodes.set(childId, childNode);
                // Recursively flatten grandchildren
                flattenChildren(childData, childId);
              }
            }
          };
          for (const [id, node] of state.rowNodes) {
            if (node.data?.[childrenField]) {
              flattenChildren(node.data, id);
            }
          }
        }

        treeState = buildTree({
          rowNodes: state.rowNodes,
          getParentId: useNested ? undefined : parentIdFn,
          childrenField: useNested ? childrenField : undefined,
          defaultExpanded,
        });

        applyTreeToGrid();
      }

      /**
       * Apply the current tree state to the grid: update RowNode properties
       * and recompute displayed row IDs from the flattened tree.
       * Called after expand/collapse changes (no need to rebuild the tree structure).
       */
      function applyTreeToGrid(): void {
        const state = ctx.store.getState();

        // Update RowNode properties based on tree state
        for (const [id, nodeState] of treeState) {
          const rowNode = state.rowNodes.get(id);
          if (rowNode) {
            rowNode.group = nodeState.hasChildren;
            rowNode.expanded = nodeState.expanded;
            rowNode.level = nodeState.level;
            rowNode.children = nodeState.childIds
              .map((cid) => state.rowNodes.get(cid))
              .filter(Boolean) as RowNode[];
          }
        }

        // Find root IDs (nodes with no parent)
        const rootIds = [...treeState.entries()]
          .filter(([_, s]) => s.parentId === null)
          .map(([id]) => id);

        const displayedIds = flattenTree({
          treeState,
          rowNodes: state.rowNodes,
          rootIds,
        });

        // Assign display positions
        let top = 0;
        const rowHeight = 40;
        for (let i = 0; i < displayedIds.length; i++) {
          const node = state.rowNodes.get(displayedIds[i]!);
          if (node) {
            node.displayIndex = i;
            node.rowTop = top;
            top += rowHeight;
          }
        }

        lastAppliedIds = displayedIds;
        ctx.store.setState((prev) => ({
          ...prev,
          displayedRowIds: displayedIds,
        }));
      }

      // Subscribe to data changes — full rebuild on new data
      const unsubData = ctx.eventBus.on('rowData:changed', fullRebuild);

      // Guard: when the core engine's reprocessRows() overwrites displayedRowIds,
      // re-apply tree filtering. Uses lastAppliedIds to prevent infinite loops.
      const unsubStore = ctx.store.subscribe(() => {
        if (treeState.size === 0) return;
        const currentIds = ctx.store.getState().displayedRowIds;
        if (currentIds !== lastAppliedIds) {
          applyTreeToGrid();
        }
      });

      // Toggle expand/collapse
      const unregToggle = ctx.commandBus.registerHandler(
        'tree:toggle',
        (payload: { nodeId: string }) => {
          const nodeState = treeState.get(payload.nodeId);
          if (!nodeState || nodeState.isLeaf) return;
          nodeState.expanded = !nodeState.expanded;
          applyTreeToGrid();
          ctx.eventBus.emit('row:groupOpened', {
            node: ctx.store.getState().rowNodes.get(payload.nodeId)!,
            expanded: nodeState.expanded,
          });
        },
      );

      // Expand node
      const unregExpand = ctx.commandBus.registerHandler(
        'tree:expand',
        (payload: { nodeId: string }) => {
          const nodeState = treeState.get(payload.nodeId);
          if (nodeState && !nodeState.isLeaf) {
            nodeState.expanded = true;
            applyTreeToGrid();
          }
        },
      );

      // Collapse node
      const unregCollapse = ctx.commandBus.registerHandler(
        'tree:collapse',
        (payload: { nodeId: string }) => {
          const nodeState = treeState.get(payload.nodeId);
          if (nodeState) {
            nodeState.expanded = false;
            applyTreeToGrid();
          }
        },
      );

      // Expand all
      const unregExpandAll = ctx.commandBus.registerHandler('tree:expandAll', () => {
        for (const [_, nodeState] of treeState) {
          if (!nodeState.isLeaf) nodeState.expanded = true;
        }
        applyTreeToGrid();
      });

      // Collapse all
      const unregCollapseAll = ctx.commandBus.registerHandler('tree:collapseAll', () => {
        for (const [_, nodeState] of treeState) {
          nodeState.expanded = false;
        }
        applyTreeToGrid();
      });

      // Get tree state for a node
      const unregGetState = ctx.commandBus.registerHandler(
        'tree:getNodeState',
        (payload: { nodeId: string }) => {
          return treeState.get(payload.nodeId);
        },
      );

      // Initial build
      fullRebuild();

      return () => {
        unsubLicenseWatermark?.();
        unsubData();
        unsubStore();
        unregToggle();
        unregExpand();
        unregCollapse();
        unregExpandAll();
        unregCollapseAll();
        unregGetState();
      };
    },
  };
}
