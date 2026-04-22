// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── GridStorm Svelte Action ───
// The core of the Svelte 5 adapter. Implements a Svelte "action" — a function
// that takes a DOM element and manages the GridStorm lifecycle (create, update, destroy).
//
// Usage in a Svelte 5 component:
//
//   <script lang="ts">
//     import { gridstormAction } from '@gridstorm/svelte';
//
//     const columns = [{ field: 'name' }, { field: 'age' }];
//     const rowData = [{ name: 'Alice', age: 30 }];
//   </script>
//
//   <div use:gridstormAction={{ props: { columns, rowData } }} style="height: 400px" />

import { createGrid } from '@gridstorm/core';
import type { GridEngine, GridApi, GridConfig } from '@gridstorm/core';
import { DomRenderer } from '@gridstorm/dom-renderer';
import type { GridStormProps, GridStormEventHandlers } from './types';

/**
 * Parameters for the gridstormAction Svelte action.
 *
 * @typeParam TData - The type of each row data object.
 */
export interface GridStormActionParams<TData = any> {
  /** Grid configuration props. */
  props: GridStormProps<TData>;
  /** Event handler callbacks. */
  events?: GridStormEventHandlers<TData>;
  /** Callback fired when the engine and API are ready. */
  onReady?: (api: GridApi<TData>, engine: GridEngine<TData>) => void;
}

/**
 * Svelte action that creates and manages a GridStorm instance on a DOM element.
 *
 * This is the primary integration point for using GridStorm in Svelte 5.
 * It handles engine creation, DOM renderer mounting, event bridging,
 * reactive updates (rowData, columns), and cleanup on destroy.
 *
 * @param container - The DOM element to mount the grid into.
 * @param params - Configuration including props, event handlers, and ready callback.
 * @returns A Svelte action interface with `update` and `destroy` methods.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { gridstormAction } from '@gridstorm/svelte';
 *   import { sortingPlugin } from '@gridstorm/plugin-sorting';
 *
 *   let api = $state(null);
 *   const columns = [
 *     { field: 'name', headerName: 'Name', sortable: true },
 *     { field: 'age', headerName: 'Age', width: 100 },
 *   ];
 *   const rowData = [
 *     { name: 'Alice', age: 30 },
 *     { name: 'Bob', age: 25 },
 *   ];
 * </script>
 *
 * <div
 *   use:gridstormAction={{
 *     props: { columns, rowData, plugins: [sortingPlugin()] },
 *     onReady: (gridApi) => { api = gridApi; },
 *   }}
 *   style="height: 400px"
 * />
 * ```
 */
export function gridstormAction<TData = any>(
  container: HTMLElement,
  params: GridStormActionParams<TData>,
) {
  let engine: GridEngine<TData> | null = null;
  let renderer: DomRenderer | null = null;
  const unsubs: Array<() => void> = [];

  function init() {
    const { props, events, onReady } = params;

    // Build grid config from props
    const config: GridConfig<TData> = {
      columns: props.columns,
      rowData: props.rowData,
      plugins: props.plugins || [],
      getRowId: props.getRowId
        ? (p) => props.getRowId!(p.data)
        : undefined,
      rowHeight: props.rowHeight,
      headerHeight: props.headerHeight,
      theme: props.theme,
    };

    // Create the headless grid engine
    engine = createGrid(config);

    // Create and mount the DOM renderer
    renderer = new DomRenderer({
      container,
      engine,
      enableCellEditing: props.enableCellEditing,
      enableGrouping: props.enableGrouping,
      floatingFilter: props.floatingFilter,
      enablePagination: props.enablePagination,
      pageSizeOptions: props.paginationPageSize
        ? [props.paginationPageSize]
        : undefined,
    });
    renderer.mount();

    // Apply density as a data attribute on the container
    if (props.density) {
      container.setAttribute('data-density', props.density);
    }

    // ── Event bridge: core events -> Svelte callbacks ──

    if (events?.onSelectionChanged) {
      unsubs.push(
        engine.eventBus.on('selection:changed', () => {
          events.onSelectionChanged!(engine!.api.getSelectedNodes());
        }),
      );
    }

    if (events?.onSortChanged) {
      unsubs.push(
        engine.eventBus.on('column:sort:changed', (e: any) => {
          events.onSortChanged!(e.sortModel || []);
        }),
      );
    }

    if (events?.onFilterChanged) {
      unsubs.push(
        engine.eventBus.on('filter:changed', (e: any) => {
          events.onFilterChanged!(e.filterModel || {});
        }),
      );
    }

    if (events?.onCellValueChanged) {
      unsubs.push(
        engine.eventBus.on('cell:valueChanged', (e: any) => {
          events.onCellValueChanged!(e);
        }),
      );
    }

    if (events?.onRowClicked) {
      unsubs.push(
        engine.eventBus.on('row:clicked', (e: any) => {
          events.onRowClicked!(e.node);
        }),
      );
    }

    if (events?.onPaginationChanged) {
      unsubs.push(
        engine.eventBus.on('pagination:changed', (e: any) => {
          events.onPaginationChanged!(e);
        }),
      );
    }

    if (events?.onColumnResized) {
      unsubs.push(
        engine.eventBus.on('column:resized', (e: any) => {
          events.onColumnResized!(e);
        }),
      );
    }

    // Fire grid:ready after the renderer has mounted and DOM is populated.
    // Plugins like column-resize and context-menu use rAF on grid:ready to
    // inject DOM elements, so we re-emit after the renderer is in the DOM.
    requestAnimationFrame(() => {
      if (engine) {
        engine.eventBus.emit('grid:ready', { api: engine.api });
        events?.onGridReady?.(engine.api);
        onReady?.(engine.api, engine);
      }
    });
  }

  function destroy() {
    unsubs.forEach((fn) => fn());
    unsubs.length = 0;
    renderer?.destroy();
    engine?.destroy();
    renderer = null;
    engine = null;
  }

  // Initialize the grid
  init();

  // Return the Svelte action interface
  return {
    /**
     * Called by Svelte when the action parameters change.
     * Performs incremental updates for rowData and columns changes.
     */
    update(newParams: GridStormActionParams<TData>) {
      if (engine && newParams.props.rowData !== params.props.rowData) {
        engine.api.setRowData(newParams.props.rowData);
      }
      if (engine && newParams.props.columns !== params.props.columns) {
        engine.api.setColumnDefs(newParams.props.columns);
      }
      params = newParams;
    },

    /**
     * Called by Svelte when the element is removed from the DOM.
     * Cleans up the engine, renderer, and all event subscriptions.
     */
    destroy,
  };
}
