// ─── Master-Detail Plugin ───
// Provides expandable detail rows beneath master rows with data fetching,
// caching, and full display integration.

import type { GridPlugin, PluginContext, RowNode } from '@gridstorm/core';
import { validateLicense, createWatermark } from '@gridstorm/license';
import type { MasterDetailOptions, DetailState } from './types';

/** Prefix for detail row IDs to distinguish them from master rows. */
const DETAIL_ID_PREFIX = '__detail__';

/** Creates a detail row ID from a master row ID. */
function detailIdFor(masterRowId: string): string {
  return `${DETAIL_ID_PREFIX}${masterRowId}`;
}

/** Checks whether a row ID is a detail row. */
function isDetailRowId(rowId: string): boolean {
  return rowId.startsWith(DETAIL_ID_PREFIX);
}

export function MasterDetailPlugin(options: MasterDetailOptions): GridPlugin {
  const {
    getDetailRowData,
    detailGridOptions: _detailGridOptions,
    detailRowHeight = 200,
    keepDetailRows = false,
    embedFullWidthRows: _embedFullWidthRows = true,
  } = options;

  return {
    id: 'master-detail',
    name: 'Master Detail',
    version: '0.1.0',

    install(ctx: PluginContext) {
      // ── License validation ──
      const licenseResult = validateLicense('master-detail');
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

      // ── Internal state ──
      const detailState: DetailState = {
        expandedMasterIds: new Set<string>(),
        detailCache: new Map<string, any[]>(),
      };

      // Track the last applied displayedRowIds to prevent infinite loops
      let lastAppliedIds: string[] | null = null;

      // ── Resolve detail row height for a given master row ──
      function getDetailHeight(node: RowNode): number {
        if (typeof detailRowHeight === 'function') {
          return detailRowHeight({ node, data: node.data });
        }
        return detailRowHeight;
      }

      // ── Create a detail RowNode for a master row ──
      function createDetailRowNode(masterNode: RowNode): RowNode {
        const detailId = detailIdFor(masterNode.id);
        return {
          id: detailId,
          data: undefined,
          sourceIndex: -1,
          displayIndex: -1,
          level: masterNode.level + 1,
          rowHeight: getDetailHeight(masterNode),
          rowTop: 0,
          parent: masterNode,
          children: null,
          expanded: false,
          group: false,
          groupField: null,
          groupValue: undefined,
          leafChildrenCount: 0,
          aggData: null,
          selected: false,
          selectable: false,
          detail: true,
          rowPinned: null,
          version: 1,
        };
      }

      // ── Apply detail rows to the displayed row IDs ──
      function applyDetailRows(): void {
        const state = ctx.store.getState();
        const currentIds = state.displayedRowIds;

        // Build new displayed IDs by inserting detail rows after expanded masters
        const newIds: string[] = [];
        for (const id of currentIds) {
          // Skip existing detail rows — we'll re-insert fresh ones
          if (isDetailRowId(id)) continue;

          newIds.push(id);

          if (detailState.expandedMasterIds.has(id)) {
            const detailId = detailIdFor(id);

            // Ensure detail RowNode exists in rowNodes map
            if (!state.rowNodes.has(detailId)) {
              const masterNode = state.rowNodes.get(id);
              if (masterNode) {
                const detailNode = createDetailRowNode(masterNode);
                state.rowNodes.set(detailId, detailNode);
              }
            }

            newIds.push(detailId);
          }
        }

        // Recalculate display positions
        let top = 0;
        const defaultRowHeight = 40;
        for (let i = 0; i < newIds.length; i++) {
          const node = state.rowNodes.get(newIds[i]!);
          if (node) {
            node.displayIndex = i;
            node.rowTop = top;
            top += node.detail ? getDetailHeight(node.parent ?? node) : (node.rowHeight || defaultRowHeight);
          }
        }

        lastAppliedIds = newIds;
        ctx.store.setState((prev) => ({
          ...prev,
          displayedRowIds: newIds,
        }));
      }

      // ── Fetch detail data for a master row ──
      async function fetchDetailData(masterRowId: string): Promise<void> {
        const state = ctx.store.getState();
        const masterNode = state.rowNodes.get(masterRowId);
        if (!masterNode) return;

        // Check cache first
        if (detailState.detailCache.has(masterRowId)) {
          return;
        }

        // Fetch data
        const result = getDetailRowData({
          node: masterNode,
          data: masterNode.data,
          successCallback: (rowData: any[]) => {
            detailState.detailCache.set(masterRowId, rowData);
          },
        });

        // Handle both sync return and Promise
        if (result && typeof (result as Promise<any[]>).then === 'function') {
          const data = await (result as Promise<any[]>);
          detailState.detailCache.set(masterRowId, data);
        } else if (Array.isArray(result)) {
          detailState.detailCache.set(masterRowId, result);
        }
      }

      // ── Guard: re-apply detail rows when core engine overwrites displayedRowIds ──
      const unsubStore = ctx.store.subscribe(() => {
        if (detailState.expandedMasterIds.size === 0) return;
        const currentIds = ctx.store.getState().displayedRowIds;
        if (currentIds !== lastAppliedIds) {
          applyDetailRows();
        }
      });

      // ── Command: Expand a master row ──
      const unregExpand = ctx.commandBus.registerHandler(
        'detail:expand',
        (payload: { nodeId: string }) => {
          if (detailState.expandedMasterIds.has(payload.nodeId)) return;

          detailState.expandedMasterIds.add(payload.nodeId);
          applyDetailRows(); // Show detail row immediately (may have cached data)

          // Fetch data asynchronously, then re-apply to show loaded data
          fetchDetailData(payload.nodeId).then(() => {
            applyDetailRows();
          }).catch((err) => {
            console.error(`[GridStorm] Failed to fetch detail data for row ${payload.nodeId}:`, err);
          });

          ctx.eventBus.emit('detail:opened' as any, {
            nodeId: payload.nodeId,
            node: ctx.store.getState().rowNodes.get(payload.nodeId),
          });
        },
      );

      // ── Command: Collapse a master row ──
      const unregCollapse = ctx.commandBus.registerHandler(
        'detail:collapse',
        (payload: { nodeId: string }) => {
          if (!detailState.expandedMasterIds.has(payload.nodeId)) return;

          detailState.expandedMasterIds.delete(payload.nodeId);

          // Remove detail RowNode from map unless keeping detail rows cached
          if (!keepDetailRows) {
            const detailId = detailIdFor(payload.nodeId);
            const state = ctx.store.getState();
            state.rowNodes.delete(detailId);
            detailState.detailCache.delete(payload.nodeId);
          }

          applyDetailRows();

          ctx.eventBus.emit('detail:closed' as any, {
            nodeId: payload.nodeId,
            node: ctx.store.getState().rowNodes.get(payload.nodeId),
          });
        },
      );

      // ── Command: Toggle a master row ──
      const unregToggle = ctx.commandBus.registerHandler(
        'detail:toggle',
        (payload: { nodeId: string }) => {
          if (detailState.expandedMasterIds.has(payload.nodeId)) {
            ctx.commandBus.dispatch('detail:collapse', payload);
          } else {
            ctx.commandBus.dispatch('detail:expand', payload);
          }
        },
      );

      // ── Command: Expand all master rows ──
      const unregExpandAll = ctx.commandBus.registerHandler(
        'detail:expandAll',
        () => {
          const state = ctx.store.getState();
          const fetchPromises: Promise<void>[] = [];
          for (const id of state.displayedRowIds) {
            if (!isDetailRowId(id) && !detailState.expandedMasterIds.has(id)) {
              detailState.expandedMasterIds.add(id);
              fetchPromises.push(fetchDetailData(id));
            }
          }
          applyDetailRows(); // Show immediately
          // Re-apply after all data is fetched
          Promise.all(fetchPromises).then(() => {
            applyDetailRows();
          }).catch(() => {});
        },
      );

      // ── Command: Collapse all master rows ──
      const unregCollapseAll = ctx.commandBus.registerHandler(
        'detail:collapseAll',
        () => {
          const state = ctx.store.getState();

          if (!keepDetailRows) {
            // Clean up all detail nodes and cache
            for (const masterId of detailState.expandedMasterIds) {
              const detailId = detailIdFor(masterId);
              state.rowNodes.delete(detailId);
              detailState.detailCache.delete(masterId);
            }
          }

          detailState.expandedMasterIds.clear();
          applyDetailRows();
        },
      );

      // ── Command: Refresh detail data for a master row ──
      const unregRefresh = ctx.commandBus.registerHandler(
        'detail:refreshDetail',
        (payload: { nodeId: string }) => {
          // Clear cached data so it will be re-fetched
          detailState.detailCache.delete(payload.nodeId);

          if (detailState.expandedMasterIds.has(payload.nodeId)) {
            fetchDetailData(payload.nodeId);
          }
        },
      );

      return () => {
        unsubLicenseWatermark?.();
        unsubStore();
        unregExpand();
        unregCollapse();
        unregToggle();
        unregExpandAll();
        unregCollapseAll();
        unregRefresh();
      };
    },
  };
}
