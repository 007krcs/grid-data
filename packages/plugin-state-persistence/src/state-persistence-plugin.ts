// ─── State Persistence Plugin ───
// Saves and restores grid state (column widths, sort model, filter model,
// column order, visibility, etc.) to localStorage or a custom storage adapter.

import type { GridPlugin, PluginContext, SortModelItem, SortDirection, FilterModel } from '@gridstorm/core';

// ─── Public Types ───

/**
 * Adapter interface for custom storage backends.
 * Supports both synchronous and asynchronous implementations.
 */
export interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

/**
 * Serializable snapshot of a single column's persisted state.
 */
export interface ColumnStateEntry {
  colId: string;
  width?: number;
  hide?: boolean;
  pinned?: 'left' | 'right' | null;
  sort?: SortDirection;
  sortIndex?: number;
}

/**
 * Complete serializable snapshot of grid state for persistence.
 */
export interface GridStateSnapshot {
  columnState: ColumnStateEntry[];
  sortModel: SortModelItem[];
  filterModel: Record<string, FilterModel>;
  pagination?: { page: number; pageSize: number };
  columnOrder?: string[];
  scrollPosition?: { top: number; left: number };
}

/**
 * Configuration options for the StatePersistencePlugin.
 */
export interface StatePersistenceOptions {
  /** localStorage key used for storage. Default: 'gridstorm-state'. */
  storageKey?: string;
  /** Custom storage adapter. Falls back to localStorage if not provided. */
  storage?: StorageAdapter;
  /** Automatically save state on changes. Default: true. */
  autoSave?: boolean;
  /** Debounce interval in milliseconds for auto-save. Default: 500. */
  debounceMs?: number;
  /** Whitelist of state keys to persist. When set, only these keys are saved. */
  include?: (keyof GridStateSnapshot)[];
  /** Blacklist of state keys to exclude from persistence. */
  exclude?: (keyof GridStateSnapshot)[];
}

// ─── Default localStorage adapter ───

function createLocalStorageAdapter(): StorageAdapter {
  return {
    getItem(key: string): string | null {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    },
    setItem(key: string, value: string): void {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
      }
    },
    removeItem(key: string): void {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    },
  };
}

// ─── Helpers ───

function debounce(fn: () => void, ms: number): { run: () => void; cancel: () => void } {
  let timerId: ReturnType<typeof setTimeout> | null = null;
  return {
    run() {
      if (timerId !== null) {
        clearTimeout(timerId);
      }
      timerId = setTimeout(() => {
        timerId = null;
        fn();
      }, ms);
    },
    cancel() {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
    },
  };
}

function shouldIncludeKey(
  key: keyof GridStateSnapshot,
  include?: (keyof GridStateSnapshot)[],
  exclude?: (keyof GridStateSnapshot)[],
): boolean {
  if (include && include.length > 0) {
    return include.includes(key);
  }
  if (exclude && exclude.length > 0) {
    return !exclude.includes(key);
  }
  return true;
}

function filterSnapshot(
  snapshot: GridStateSnapshot,
  include?: (keyof GridStateSnapshot)[],
  exclude?: (keyof GridStateSnapshot)[],
): Partial<GridStateSnapshot> {
  const filtered: Partial<GridStateSnapshot> = {};
  const keys = Object.keys(snapshot) as (keyof GridStateSnapshot)[];
  for (const key of keys) {
    if (shouldIncludeKey(key, include, exclude)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (filtered as any)[key] = snapshot[key];
    }
  }
  return filtered;
}

// ─── Plugin Factory ───

/**
 * Creates a StatePersistencePlugin that saves and restores grid state.
 *
 * @param options - Configuration options for persistence behavior.
 * @returns A GridPlugin instance.
 *
 * @example
 * ```ts
 * import { StatePersistencePlugin } from '@gridstorm/plugin-state-persistence';
 *
 * const grid = createGrid({
 *   columns: [...],
 *   rowData: [...],
 *   plugins: [
 *     StatePersistencePlugin({ storageKey: 'my-grid-state' }),
 *   ],
 * });
 * ```
 */
export function StatePersistencePlugin(options: StatePersistenceOptions = {}): GridPlugin {
  const {
    storageKey = 'gridstorm-state',
    storage: customStorage,
    autoSave = true,
    debounceMs = 500,
    include,
    exclude,
  } = options;

  const storage: StorageAdapter = customStorage ?? createLocalStorageAdapter();

  return {
    id: 'state-persistence',
    name: 'State Persistence',
    version: '0.1.0',

    install(ctx: PluginContext) {
      // ── Snapshot extraction ──

      function captureSnapshot(): GridStateSnapshot {
        const state = ctx.store.getState();

        const columnState: ColumnStateEntry[] = state.columns.map((col) => ({
          colId: col.colId,
          width: col.width,
          hide: col.hide,
          pinned: col.pinned,
          sort: col.sort,
          sortIndex: col.sortIndex ?? undefined,
        }));

        const columnOrder = state.columns.map((col) => col.colId);

        const snapshot: GridStateSnapshot = {
          columnState,
          sortModel: state.sortModel,
          filterModel: state.filterModel,
          pagination: {
            page: state.pagination.currentPage,
            pageSize: state.pagination.pageSize,
          },
          columnOrder,
          scrollPosition: { top: state.scroll.top, left: state.scroll.left },
        };

        return snapshot;
      }

      // ── Serialization ──

      function serializeState(): string {
        const snapshot = captureSnapshot();
        const filtered = filterSnapshot(snapshot, include, exclude);
        return JSON.stringify(filtered);
      }

      // ── Save ──

      async function saveState(): Promise<void> {
        const serialized = serializeState();
        await Promise.resolve(storage.setItem(storageKey, serialized));
      }

      // ── Restore ──

      async function restoreState(): Promise<void> {
        const raw = await Promise.resolve(storage.getItem(storageKey));
        if (!raw) return;

        let snapshot: Partial<GridStateSnapshot>;
        try {
          snapshot = JSON.parse(raw) as Partial<GridStateSnapshot>;
        } catch {
          return; // Corrupt data — skip silently
        }

        applySnapshot(snapshot);
      }

      function applySnapshot(snapshot: Partial<GridStateSnapshot>): void {
        // Apply column state (width, hide, pinned, sort, sortIndex)
        if (snapshot.columnState && shouldIncludeKey('columnState', include, exclude)) {
          ctx.api.applyColumnState(
            snapshot.columnState.map((entry) => ({
              colId: entry.colId,
              width: entry.width,
              hide: entry.hide,
              pinned: entry.pinned,
              sort: entry.sort,
              sortIndex: entry.sortIndex ?? null,
            })),
          );
        }

        // Apply column order
        if (snapshot.columnOrder && shouldIncludeKey('columnOrder', include, exclude)) {
          const currentCols = ctx.api.getAllColumns();
          const currentColIds = currentCols.map((c) => c.colId);
          // Only reorder if the column sets match
          const orderIsValid = snapshot.columnOrder.every((id) => currentColIds.includes(id));
          if (orderIsValid) {
            for (let i = 0; i < snapshot.columnOrder.length; i++) {
              const colId = snapshot.columnOrder[i]!;
              ctx.api.moveColumn(colId, i);
            }
          }
        }

        // Apply sort model
        if (snapshot.sortModel && shouldIncludeKey('sortModel', include, exclude)) {
          ctx.api.setSortModel(snapshot.sortModel);
        }

        // Apply filter model
        if (snapshot.filterModel && shouldIncludeKey('filterModel', include, exclude)) {
          ctx.api.setFilterModel(snapshot.filterModel);
        }

        // Apply pagination
        if (snapshot.pagination && shouldIncludeKey('pagination', include, exclude)) {
          ctx.api.paginationGoToPage(snapshot.pagination.page);
        }

        // Note: scrollPosition is exposed in the snapshot but applying it
        // typically requires the DOM renderer. We store it but leave
        // scroll restoration to the renderer layer if integrated.
      }

      // ── Auto-save wiring ──

      const disposers: (() => void)[] = [];
      let debouncedSave: { run: () => void; cancel: () => void } | null = null;

      if (autoSave) {
        debouncedSave = debounce(() => {
          void saveState();
        }, debounceMs);

        // Watch sort model changes
        const unsubSort = ctx.store.select(
          (s) => s.sortModel,
          (_next, _prev) => {
            debouncedSave!.run();
          },
        );
        disposers.push(unsubSort);

        // Watch filter model changes
        const unsubFilter = ctx.store.select(
          (s) => s.filterModel,
          (_next, _prev) => {
            debouncedSave!.run();
          },
        );
        disposers.push(unsubFilter);

        // Watch column state changes (width, hide, pinned, order)
        const unsubColumns = ctx.store.select(
          (s) => s.columns,
          (_next, _prev) => {
            debouncedSave!.run();
          },
        );
        disposers.push(unsubColumns);

        // Watch pagination changes
        const unsubPagination = ctx.store.select(
          (s) => s.pagination,
          (_next, _prev) => {
            debouncedSave!.run();
          },
        );
        disposers.push(unsubPagination);
      }

      // ── Command handlers ──

      const unregisterSave = ctx.commandBus.registerHandler('state:save', () => {
        void saveState();
      });
      disposers.push(unregisterSave);

      const unregisterRestore = ctx.commandBus.registerHandler('state:restore', () => {
        void restoreState();
      });
      disposers.push(unregisterRestore);

      const unregisterClear = ctx.commandBus.registerHandler('state:clear', () => {
        void Promise.resolve(storage.removeItem(storageKey));
      });
      disposers.push(unregisterClear);

      const unregisterExport = ctx.commandBus.registerHandler(
        'state:export',
        (payload: { callback?: (serialized: string) => void }) => {
          const serialized = serializeState();
          if (payload && payload.callback) {
            payload.callback(serialized);
          }
        },
      );
      disposers.push(unregisterExport);

      const unregisterImport = ctx.commandBus.registerHandler(
        'state:import',
        (payload: { state: string }) => {
          if (!payload || !payload.state) return;
          let snapshot: Partial<GridStateSnapshot>;
          try {
            snapshot = JSON.parse(payload.state) as Partial<GridStateSnapshot>;
          } catch {
            return; // Invalid JSON — skip silently
          }
          applySnapshot(snapshot);
        },
      );
      disposers.push(unregisterImport);

      // ── Initial restore ──

      void restoreState();

      // ── Disposer ──

      return () => {
        if (debouncedSave) {
          debouncedSave.cancel();
        }
        for (const dispose of disposers) {
          dispose();
        }
      };
    },
  };
}
