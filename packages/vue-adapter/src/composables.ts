// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Vue 3 Composables for GridStorm ───
// Provide/inject-based composables that mirror the React hooks API.
// All composables must be called inside a component that is a child of <GridStorm>.

import {
  inject,
  ref,
  onUnmounted,
  computed,
  watch,
  type InjectionKey,
  type Ref,
  type ShallowRef,
} from 'vue';
import type { GridApi, GridEngine, SortModelItem, FilterModel, RowNode } from '@gridstorm/core';
import type { GridContextValue } from './types';

// ── Context Key ──

/**
 * Injection key used internally to provide/inject the grid context.
 * Uses ShallowRef to avoid deep reactive unwrapping of GridEngine internals
 * (the Store class has private fields incompatible with Vue's deep proxy typing).
 */
export const GRID_CONTEXT_KEY: InjectionKey<ShallowRef<GridContextValue | null>> =
  Symbol('gridstorm-context');

// ── Internal helper ──

/**
 * Internal helper to get the grid context with validation.
 * Throws if called outside a <GridStorm> component hierarchy.
 */
function useGridContext<TData = any>(): ShallowRef<GridContextValue<TData> | null> {
  const context = inject(GRID_CONTEXT_KEY, null);
  if (!context) {
    throw new Error(
      '[GridStorm] Composable must be used within a <GridStorm> component.',
    );
  }
  return context as ShallowRef<GridContextValue<TData> | null>;
}

/**
 * Subscribe to the grid store and keep a reactive ref in sync.
 * Returns the reactive ref and automatically unsubscribes on unmount.
 */
function useStoreRef<T>(
  context: ShallowRef<GridContextValue | null>,
  selector: (engine: GridEngine) => T,
): Ref<T | undefined> {
  const value = ref<T | undefined>() as Ref<T | undefined>;
  let unsubscribe: (() => void) | null = null;

  function subscribe(ctx: GridContextValue | null) {
    // Clean up previous subscription
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }

    if (!ctx) {
      value.value = undefined;
      return;
    }

    // Set initial value
    value.value = selector(ctx.engine);

    // Subscribe to store changes
    unsubscribe = ctx.engine.store.subscribe(() => {
      value.value = selector(ctx.engine);
    });
  }

  // Watch for context changes (grid initialization/destruction)
  watch(context, (newCtx) => subscribe(newCtx), { immediate: true });

  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  });

  return value;
}

// ── Public Composables ──

/**
 * Access the GridApi instance from a parent GridStorm component.
 *
 * Returns a computed ref that resolves to the GridApi once the grid is initialized.
 * The ref will be undefined until the grid has mounted.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useGridApi } from '@gridstorm/vue';
 *
 * const api = useGridApi();
 *
 * function exportData() {
 *   const rows = api.value?.getSelectedRows() ?? [];
 *   console.log('Selected:', rows);
 * }
 * </script>
 * ```
 */
export function useGridApi<TData = any>(): Ref<GridApi<TData> | undefined> {
  const context = useGridContext<TData>();
  return computed(() => context.value?.api);
}

/**
 * Access the GridEngine instance from a parent GridStorm component.
 *
 * Primarily useful for advanced use cases that need direct access to
 * the store, event bus, or command bus.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useGridEngine } from '@gridstorm/vue';
 *
 * const engine = useGridEngine();
 * </script>
 * ```
 */
export function useGridEngine<TData = any>(): Ref<GridEngine<TData> | undefined> {
  const context = useGridContext<TData>();
  return computed(() => context.value?.engine);
}

/**
 * Reactive sort model state and sort actions.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useGridSort } from '@gridstorm/vue';
 *
 * const { sortModel, isSorted, toggleSort, clearSort } = useGridSort();
 * </script>
 *
 * <template>
 *   <button @click="toggleSort('name')">Sort by Name</button>
 *   <button v-if="isSorted" @click="clearSort()">Clear Sort</button>
 *   <pre>{{ sortModel }}</pre>
 * </template>
 * ```
 */
export function useGridSort(): {
  sortModel: Ref<SortModelItem[]>;
  isSorted: Ref<boolean>;
  setSortModel: (model: SortModelItem[]) => void;
  toggleSort: (colId: string, multiSort?: boolean) => void;
  clearSort: () => void;
} {
  const context = useGridContext();

  const sortModel = useStoreRef(context, (engine) =>
    engine.store.getState().sortModel,
  );

  const isSorted = computed(() => (sortModel.value?.length ?? 0) > 0);

  function setSortModel(model: SortModelItem[]): void {
    context.value?.api.setSortModel(model);
  }

  function toggleSort(colId: string, multiSort = false): void {
    context.value?.engine.commandBus.dispatch('sort:toggle', {
      colId,
      multiSort,
    });
  }

  function clearSort(): void {
    context.value?.api.setSortModel([]);
  }

  return {
    sortModel: sortModel as Ref<SortModelItem[]>,
    isSorted,
    setSortModel,
    toggleSort,
    clearSort,
  };
}

/**
 * Reactive filter model state and filter actions.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useGridFilter } from '@gridstorm/vue';
 *
 * const { isFiltered, setQuickFilter, clearFilters } = useGridFilter();
 * </script>
 *
 * <template>
 *   <input @input="(e) => setQuickFilter((e.target as HTMLInputElement).value)" />
 *   <button v-if="isFiltered" @click="clearFilters()">Clear Filters</button>
 * </template>
 * ```
 */
export function useGridFilter(): {
  filterModel: Ref<Record<string, FilterModel>>;
  quickFilterText: Ref<string>;
  isFiltered: Ref<boolean>;
  setFilterModel: (model: Record<string, FilterModel>) => void;
  setQuickFilter: (text: string) => void;
  clearFilters: () => void;
} {
  const context = useGridContext();

  const filterModel = useStoreRef(context, (engine) =>
    engine.store.getState().filterModel,
  );

  const quickFilterText = useStoreRef(context, (engine) =>
    engine.store.getState().quickFilterText,
  );

  const isFiltered = computed(() => {
    const hasColumnFilters = Object.keys(filterModel.value ?? {}).length > 0;
    const hasQuickFilter = (quickFilterText.value ?? '').length > 0;
    return hasColumnFilters || hasQuickFilter;
  });

  function setFilterModel(model: Record<string, FilterModel>): void {
    context.value?.api.setFilterModel(model);
  }

  function setQuickFilter(text: string): void {
    context.value?.api.setQuickFilter(text);
  }

  function clearFilters(): void {
    context.value?.api.setFilterModel({});
    context.value?.api.setQuickFilter('');
  }

  return {
    filterModel: filterModel as Ref<Record<string, FilterModel>>,
    quickFilterText: quickFilterText as Ref<string>,
    isFiltered,
    setFilterModel,
    setQuickFilter,
    clearFilters,
  };
}

/**
 * Reactive selection state and selection actions.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useGridSelection } from '@gridstorm/vue';
 *
 * const { selectedCount, selectAll, deselectAll, isRowSelected } = useGridSelection();
 * </script>
 *
 * <template>
 *   <p>{{ selectedCount }} rows selected</p>
 *   <button @click="selectAll()">Select All</button>
 *   <button @click="deselectAll()">Deselect All</button>
 * </template>
 * ```
 */
export function useGridSelection<TData = any>(): {
  selectedRowIds: Ref<Set<string>>;
  selectedCount: Ref<number>;
  getSelectedRows: () => TData[];
  getSelectedNodes: () => RowNode<TData>[];
  isRowSelected: (rowId: string) => boolean;
  selectAll: () => void;
  deselectAll: () => void;
} {
  const context = useGridContext<TData>();

  const selectedRowIds = useStoreRef(context, (engine) =>
    engine.store.getState().selection.selectedRowIds,
  );

  const selectedCount = computed(() => selectedRowIds.value?.size ?? 0);

  function getSelectedRows(): TData[] {
    return context.value?.api.getSelectedRows() ?? [];
  }

  function getSelectedNodes(): RowNode<TData>[] {
    return context.value?.api.getSelectedNodes() ?? [];
  }

  function isRowSelected(rowId: string): boolean {
    return selectedRowIds.value?.has(rowId) ?? false;
  }

  function selectAll(): void {
    context.value?.api.selectAll();
  }

  function deselectAll(): void {
    context.value?.api.deselectAll();
  }

  return {
    selectedRowIds: selectedRowIds as Ref<Set<string>>,
    selectedCount,
    getSelectedRows,
    getSelectedNodes,
    isRowSelected,
    selectAll,
    deselectAll,
  };
}

/**
 * Reactive pagination state and navigation actions.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useGridPagination } from '@gridstorm/vue';
 *
 * const {
 *   currentPage,
 *   totalPages,
 *   hasNextPage,
 *   hasPreviousPage,
 *   nextPage,
 *   previousPage,
 * } = useGridPagination();
 * </script>
 *
 * <template>
 *   <div class="pagination">
 *     <button :disabled="!hasPreviousPage" @click="previousPage()">Prev</button>
 *     <span>Page {{ currentPage + 1 }} of {{ totalPages }}</span>
 *     <button :disabled="!hasNextPage" @click="nextPage()">Next</button>
 *   </div>
 * </template>
 * ```
 */
export function useGridPagination(): {
  currentPage: Ref<number>;
  totalPages: Ref<number>;
  pageSize: Ref<number>;
  totalRows: Ref<number>;
  hasNextPage: Ref<boolean>;
  hasPreviousPage: Ref<boolean>;
  goToPage: (page: number) => void;
  nextPage: () => void;
  previousPage: () => void;
  firstPage: () => void;
  lastPage: () => void;
} {
  const context = useGridContext();

  const paginationState = useStoreRef(context, (engine) =>
    engine.store.getState().pagination,
  );

  const currentPage = computed(() => paginationState.value?.currentPage ?? 0);
  const pageSize = computed(() => paginationState.value?.pageSize ?? 100);
  const totalRows = computed(() => paginationState.value?.totalRows ?? 0);
  const totalPages = computed(() =>
    Math.max(1, Math.ceil(totalRows.value / pageSize.value)),
  );
  const hasNextPage = computed(() => currentPage.value < totalPages.value - 1);
  const hasPreviousPage = computed(() => currentPage.value > 0);

  function goToPage(page: number): void {
    context.value?.api.paginationGoToPage(page);
  }

  function nextPage(): void {
    if (hasNextPage.value) {
      context.value?.api.paginationGoToPage(currentPage.value + 1);
    }
  }

  function previousPage(): void {
    if (hasPreviousPage.value) {
      context.value?.api.paginationGoToPage(currentPage.value - 1);
    }
  }

  function firstPage(): void {
    context.value?.api.paginationGoToPage(0);
  }

  function lastPage(): void {
    context.value?.api.paginationGoToPage(totalPages.value - 1);
  }

  return {
    currentPage,
    totalPages,
    pageSize,
    totalRows,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
  };
}

/**
 * Listen to a specific grid event with automatic cleanup on unmount.
 *
 * @param event - The event name from GridEventMap.
 * @param handler - Callback function invoked when the event fires.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { useGridEvent } from '@gridstorm/vue';
 *
 * useGridEvent('selection:changed', (e) => {
 *   console.log('Selection changed:', e.selectedNodes);
 * });
 * </script>
 * ```
 */
export function useGridEvent<TData = any>(
  event: string,
  handler: (payload: any) => void,
): void {
  const context = useGridContext<TData>();
  let unsubscribe: (() => void) | null = null;

  watch(
    context,
    (ctx) => {
      // Clean up previous listener
      if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
      }

      if (ctx) {
        unsubscribe = ctx.engine.eventBus.on(event as any, handler);
      }
    },
    { immediate: true },
  );

  onUnmounted(() => {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  });
}
