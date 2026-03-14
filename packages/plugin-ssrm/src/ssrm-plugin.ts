// ─── Server-Side Row Model Plugin ───
// Provides lazy loading of rows from a server data source with block-based caching.

import type { GridPlugin, PluginContext, RowNode } from '@gridstorm/core';
import { validateLicense, createWatermark } from '@gridstorm/license';
import type { SSRMPluginOptions, ServerRequest } from './types';
import { BlockCache } from './block-cache';

export function SSRMPlugin(options: SSRMPluginOptions): GridPlugin {
  const {
    dataSource,
    blockSize = 100,
    maxBlocks = 10,
    showLoading: _showLoading = true,
  } = options;

  return {
    id: 'ssrm',
    name: 'Server-Side Row Model',
    version: '0.1.0',

    install(ctx: PluginContext) {
      // ── License validation ──
      const licenseResult = validateLicense('ssrm');
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

      const cache = new BlockCache(blockSize, maxBlocks);
      let totalRowCount = 0;
      let loading = false;

      // Fetch blocks from server
      async function fetchBlock(blockIndex: number): Promise<void> {
        const startRow = blockIndex * blockSize;
        const endRow = startRow + blockSize;

        const state = ctx.store.getState();

        const request: ServerRequest = {
          startRow,
          endRow,
          sortModel: state.sortModel.map((s) => ({ colId: s.colId, sort: s.sort })),
          filterModel: state.filterModel,
          groupKeys: [],
        };

        cache.setBlock(blockIndex, {
          startRow,
          endRow,
          status: 'loading',
          data: [],
          lastAccessed: Date.now(),
        });

        loading = true;

        try {
          const result = await dataSource.getRows(request);

          cache.setBlock(blockIndex, {
            startRow,
            endRow,
            status: 'loaded',
            data: result.rowData,
            lastAccessed: Date.now(),
          });

          if (result.rowCount != null) {
            totalRowCount = result.rowCount;
          } else if (result.lastRow != null) {
            totalRowCount = result.lastRow;
          }

          // Update the store with fetched data
          updateStoreWithCachedData();
          ctx.eventBus.emit('rowData:changed', { rowData: result.rowData });
        } catch (err) {
          cache.setBlock(blockIndex, {
            startRow,
            endRow,
            status: 'failed',
            data: [],
            lastAccessed: Date.now(),
          });
          // Emit a custom-like event via the event bus using a known event type
          // Since there's no custom ssrm event type in GridEventMap, log the error
          console.error(`[GridStorm SSRM] Failed to fetch block ${blockIndex}:`, err);
        } finally {
          loading = false;
        }
      }

      function updateStoreWithCachedData(): void {
        // Create/update row nodes from cached block data
        const state = ctx.store.getState();
        const rowNodes = new Map(state.rowNodes);
        const displayedRowIds: string[] = [];

        // Build row nodes for all cached data in order
        for (let i = 0; i < totalRowCount; i++) {
          const blockIndex = cache.getBlockIndex(i);
          const block = cache.getBlock(blockIndex);
          const rowId = `ssrm-row-${i}`;

          if (block?.status === 'loaded') {
            const offset = i - blockIndex * blockSize;
            const data = block.data[offset];
            if (data) {
              const existing = rowNodes.get(rowId);
              if (existing) {
                existing.data = data;
                existing.displayIndex = i;
                existing.rowTop = i * 40;
                existing.version++;
              } else {
                const newNode: RowNode = {
                  id: rowId,
                  data,
                  sourceIndex: i,
                  displayIndex: i,
                  level: 0,
                  rowHeight: 40,
                  rowTop: i * 40,
                  parent: null,
                  children: null,
                  expanded: false,
                  group: false,
                  groupField: null,
                  groupValue: undefined,
                  leafChildrenCount: 0,
                  aggData: null,
                  selected: false,
                  selectable: true,
                  detail: false,
                  rowPinned: null,
                  version: 0,
                };
                rowNodes.set(rowId, newNode);
              }
              displayedRowIds.push(rowId);
            }
          } else {
            // Placeholder for uncached rows
            if (!rowNodes.has(rowId)) {
              const placeholderNode: RowNode = {
                id: rowId,
                data: undefined,
                sourceIndex: i,
                displayIndex: i,
                level: 0,
                rowHeight: 40,
                rowTop: i * 40,
                parent: null,
                children: null,
                expanded: false,
                group: false,
                groupField: null,
                groupValue: undefined,
                leafChildrenCount: 0,
                aggData: null,
                selected: false,
                selectable: false,
                detail: false,
                rowPinned: null,
                version: 0,
              };
              rowNodes.set(rowId, placeholderNode);
            }
            displayedRowIds.push(rowId);
          }
        }

        ctx.store.setState((prev) => ({
          ...prev,
          rowNodes,
          displayedRowIds,
        }));
      }

      // When viewport changes, check which blocks we need
      const unregViewport = ctx.commandBus.registerHandler(
        'ssrm:ensureRows',
        (payload: { startRow: number; endRow: number }) => {
          const missing = cache.getMissingBlocks(payload.startRow, payload.endRow);
          for (const blockIdx of missing) {
            fetchBlock(blockIdx);
          }
        },
      );

      // ── Automatically fetch blocks when viewport scrolls ──
      const unsubViewport = ctx.eventBus.on('viewport:changed', (payload) => {
        try {
          if (!totalRowCount) return;
          const startRow = payload.firstRow ?? 0;
          const endRow = payload.lastRow ?? startRow + blockSize;
          const missing = cache.getMissingBlocks(startRow, Math.min(endRow, totalRowCount));
          for (const blockIdx of missing) {
            fetchBlock(blockIdx).catch((err) => {
              console.error(`[GridStorm SSRM] Error fetching block ${blockIdx} on viewport change:`, err);
            });
          }
        } catch (err) {
          console.error('[GridStorm SSRM] Error processing viewport change:', err);
        }
      });

      // When sort/filter changes, clear cache and re-fetch
      const unsubSort = ctx.eventBus.on('column:sort:changed', () => {
        cache.clear();
        totalRowCount = 0;
        fetchBlock(0).catch((err) => {
          console.error('[GridStorm SSRM] Error re-fetching after sort change:', err);
        });
      });

      const unsubFilter = ctx.eventBus.on('filter:changed', () => {
        cache.clear();
        totalRowCount = 0;
        fetchBlock(0).catch((err) => {
          console.error('[GridStorm SSRM] Error re-fetching after filter change:', err);
        });
      });

      // Refresh command
      const unregRefresh = ctx.commandBus.registerHandler('ssrm:refresh', () => {
        cache.clear();
        fetchBlock(0);
      });

      // Get cache info
      const unregCacheInfo = ctx.commandBus.registerHandler('ssrm:getCacheInfo', () => {
        return { totalRowCount, loading, blockSize, maxBlocks };
      });

      // Initial fetch
      fetchBlock(0);

      return () => {
        unsubLicenseWatermark?.();
        unregViewport();
        unsubViewport();
        unsubSort();
        unsubFilter();
        unregRefresh();
        unregCacheInfo();
        dataSource.destroy?.();
      };
    },
  };
}
