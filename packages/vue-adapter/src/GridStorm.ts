// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── GridStorm Vue 3 Component ───
// Production-grade Vue wrapper around the headless core engine.
// Uses defineComponent with a render function (no .vue SFC) for tsup compatibility.
// Supports event emission, reactive prop watching, and composable injection.

import {
  defineComponent,
  ref,
  shallowRef,
  onMounted,
  onBeforeUnmount,
  onErrorCaptured,
  watch,
  provide,
  h,
} from 'vue';
import type { GridEngine } from '@gridstorm/core';
import { createGrid } from '@gridstorm/core';
import { DomRenderer } from '@gridstorm/dom-renderer';
import { gridStormPropDefs } from './types';
import type { GridContextValue } from './types';
import { GRID_CONTEXT_KEY } from './composables';

/**
 * GridStorm Vue 3 component.
 *
 * Wraps the headless GridStorm core engine and DOM renderer into a Vue component
 * with reactive prop watching, event emission, and provide/inject context for
 * child composables.
 *
 * @example
 * ```vue
 * <script setup lang="ts">
 * import { GridStorm } from '@gridstorm/vue';
 * import { sortingPlugin } from '@gridstorm/plugin-sorting';
 *
 * const columns = [
 *   { field: 'name', headerName: 'Name', sortable: true },
 *   { field: 'age', headerName: 'Age', width: 100 },
 * ];
 * const rowData = [
 *   { name: 'Alice', age: 30 },
 *   { name: 'Bob', age: 25 },
 * ];
 * </script>
 *
 * <template>
 *   <GridStorm
 *     :columns="columns"
 *     :row-data="rowData"
 *     :plugins="[sortingPlugin()]"
 *     @grid-ready="(api) => console.log('Grid ready!', api)"
 *   />
 * </template>
 * ```
 */
export const GridStorm = defineComponent({
  name: 'GridStorm',

  props: gridStormPropDefs,

  emits: [
    'gridReady',
    'rowDataChanged',
    'selectionChanged',
    'sortChanged',
    'filterChanged',
    'cellValueChanged',
    'cellClicked',
    'cellDoubleClicked',
    'rowClicked',
    'paginationChanged',
    'columnResized',
  ],

  setup(props, { emit, expose }) {
    const containerRef = ref<HTMLElement | null>(null);
    let engine: GridEngine | null = null;
    let renderer: DomRenderer | null = null;
    const eventUnsubscribers: Array<() => void> = [];

    // ── Build GridConfig from props ──
    function buildConfig() {
      return {
        columns: props.columns as any,
        rowData: props.rowData as any,
        plugins: props.plugins as any,
        getRowId: props.getRowId as any,
        rowHeight: props.rowHeight,
        headerHeight: props.headerHeight,
        defaultColDef: props.defaultColDef as any,
        paginationPageSize: props.paginationPageSize,
        pagination: props.pagination,
        rowSelection: props.rowSelection as any,
        editType: props.editType as any,
        ariaLabel: props.ariaLabel,
      };
    }

    // ── Subscribe to engine events and bridge to Vue emits ──
    function subscribeToEvents() {
      if (!engine) return;

      const eb = engine.eventBus;

      eventUnsubscribers.push(
        eb.on('rowData:changed', (e) => emit('rowDataChanged', e)),
      );
      eventUnsubscribers.push(
        eb.on('selection:changed', (e) => emit('selectionChanged', e)),
      );
      eventUnsubscribers.push(
        eb.on('column:sort:changed', (e) => emit('sortChanged', e)),
      );
      eventUnsubscribers.push(
        eb.on('filter:changed', (e) => emit('filterChanged', e)),
      );
      eventUnsubscribers.push(
        eb.on('cell:valueChanged', (e) => emit('cellValueChanged', e)),
      );
      eventUnsubscribers.push(
        eb.on('cell:clicked', (e) => emit('cellClicked', e)),
      );
      eventUnsubscribers.push(
        eb.on('cell:doubleClicked', (e) => emit('cellDoubleClicked', e)),
      );
      eventUnsubscribers.push(
        eb.on('row:clicked', (e) => emit('rowClicked', e)),
      );
      eventUnsubscribers.push(
        eb.on('pagination:changed', (e) => emit('paginationChanged', e)),
      );
      eventUnsubscribers.push(
        eb.on('column:resized', (e) => emit('columnResized', e)),
      );
    }

    // ── Provide context for composables ──
    // Use shallowRef to avoid deep unwrapping of GridEngine internals
    // (Store class has private fields that break Vue's deep reactive proxy typing)
    const gridContext = shallowRef<GridContextValue | null>(null);

    provide(GRID_CONTEXT_KEY, gridContext);

    // ── Initialize grid engine and renderer ──
    function initGrid() {
      if (!containerRef.value) return;

      const config = buildConfig();
      engine = createGrid(config);

      // Update context for composables
      gridContext.value = {
        engine,
        api: engine.api,
      };

      // Mount DOM renderer
      renderer = new DomRenderer({
        container: containerRef.value,
        engine,
      });
      renderer.mount();

      // Subscribe to events
      subscribeToEvents();

      // Emit gridReady
      emit('gridReady', engine.api);
    }

    // ── Teardown ──
    function destroyGrid() {
      // Unsubscribe from all events
      for (const unsub of eventUnsubscribers) {
        unsub();
      }
      eventUnsubscribers.length = 0;

      renderer?.destroy();
      renderer = null;

      engine?.destroy();
      engine = null;

      gridContext.value = null;
    }

    // ── Error Boundary ──
    const error = ref<Error | null>(null);

    onErrorCaptured((err: Error) => {
      error.value = err;
      console.error('[GridStorm Vue] Error captured:', err);
      // Return false to stop the error from propagating further
      return false;
    });

    // ── Lifecycle ──
    onMounted(() => {
      try {
        initGrid();
      } catch (err) {
        error.value = err instanceof Error ? err : new Error(String(err));
        console.error('[GridStorm Vue] Initialization error:', err);
      }
    });

    onBeforeUnmount(() => {
      destroyGrid();
    });

    // ── Watch for rowData changes ──
    watch(
      () => props.rowData,
      (newData) => {
        if (engine && newData) {
          engine.api.setRowData(newData as any);
        }
      },
      { deep: false },
    );

    // ── Watch for column changes ──
    watch(
      () => props.columns,
      (newCols) => {
        if (engine && newCols) {
          engine.api.setColumnDefs(newCols as any);
        }
      },
      { deep: false },
    );

    // ── Watch for theme changes ──
    watch(
      () => props.theme,
      (newTheme) => {
        if (containerRef.value && newTheme) {
          containerRef.value.setAttribute('data-theme', newTheme);
        }
      },
    );

    // ── Watch for density changes ──
    watch(
      () => props.density,
      (newDensity) => {
        if (containerRef.value && newDensity) {
          containerRef.value.setAttribute('data-density', newDensity);
        }
      },
    );

    // ── Expose public API via template refs ──
    expose({
      /**
       * Get the GridApi instance.
       * Returns undefined if the grid has not been initialized yet.
       */
      getApi: () => engine?.api,

      /**
       * Get the GridEngine instance.
       * Returns undefined if the grid has not been initialized yet.
       */
      getEngine: () => engine,
    });

    // ── Render function ──
    return () => {
      const heightStyle =
        typeof props.height === 'number' ? `${props.height}px` : props.height;
      const widthStyle =
        typeof props.width === 'number' ? `${props.width}px` : props.width;

      return h('div', {
        ref: containerRef,
        class: ['gridstorm-wrapper', props.containerClass].filter(Boolean).join(' '),
        'data-theme': props.theme,
        'data-density': props.density,
        style: {
          width: widthStyle,
          height: heightStyle,
        },
      });
    };
  },
});
