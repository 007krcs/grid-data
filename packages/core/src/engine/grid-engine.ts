// ─── Grid Engine ───
// The central orchestrator. Creates the store, event/command buses,
// plugin manager, and processes data through the row model pipeline.

import type { GridConfig, GridState, GridApi } from '../types/grid';
import type { GridEventMap } from '../types/events';
import type { RowNode } from '../types/row';
import type { SortModelItem } from '../types/column';
import type { FilterModel } from '../types/filter';

import { Store } from '../state/store';
import { EventBus } from '../events/event-bus';
import { CommandBus } from '../events/command-bus';
import { PluginManager } from '../plugins/plugin-manager';
import { resolveColumns, updateColumn, findColumn } from './column-model';
import {
  createRowNodes,
  sortRowNodes,
  filterRowNodes,
  assignDisplayPositions,
} from './row-model';

const DEFAULT_ROW_HEIGHT = 40;

export interface GridEngine<TData = any> {
  api: GridApi<TData>;
  store: Store<GridState<TData>>;
  eventBus: EventBus<GridEventMap<TData>>;
  commandBus: CommandBus;
  pluginManager: PluginManager<TData>;
  destroy(): void;
}

export function createGrid<TData = any>(config: GridConfig<TData>): GridEngine<TData> {
  // ── Resolve initial state ──
  const columns = resolveColumns(config.columns, config.defaultColDef);
  const rowHeight =
    typeof config.rowHeight === 'number' ? config.rowHeight : DEFAULT_ROW_HEIGHT;

  const initialRowNodes = config.rowData ? createRowNodes(config.rowData, config.getRowId, rowHeight) : [];

  const rowNodeMap = new Map<string, RowNode<TData>>();
  for (const node of initialRowNodes) {
    rowNodeMap.set(node.id, node);
  }

  // Build initial sort model from column defs
  const initialSortModel: SortModelItem[] = columns
    .filter((c) => c.sort != null)
    .sort((a, b) => (a.sortIndex ?? 0) - (b.sortIndex ?? 0))
    .map((c) => ({ colId: c.colId, sort: c.sort! }));

  const initialState: GridState<TData> = {
    columns,
    rowNodes: rowNodeMap,
    displayedRowIds: initialRowNodes.map((n) => n.id),
    sortModel: initialSortModel,
    filterModel: {},
    selection: {
      selectedRowIds: new Set(),
      rangeSelections: [],
    },
    editing: null,
    scroll: { top: 0, left: 0 },
    focusedCell: null,
    pagination: {
      currentPage: 0,
      pageSize: config.paginationPageSize ?? 100,
      totalRows: initialRowNodes.length,
    },
    quickFilterText: '',
    pluginState: {},
  };

  // ── Create infrastructure ──
  const store = new Store<GridState<TData>>(initialState);
  const eventBus = new EventBus<GridEventMap<TData>>();
  const commandBus = new CommandBus();

  // ── Row processing pipeline ──
  function reprocessRows(): void {
    const state = store.getState();

    // If the grouping plugin is active with group columns, delegate to it.
    // The GroupingPlugin manages its own displayedRowIds including filter/sort.
    const groupingState = state.pluginState?.grouping as
      | { groupColumns: string[] }
      | undefined;
    if (groupingState && groupingState.groupColumns.length > 0) {
      commandBus.dispatch('grouping:reprocess', {});
      return;
    }

    let nodes = [...state.rowNodes.values()].filter(
      (n) => n.rowPinned === null && !n.group,
    );

    // Filter
    nodes = filterRowNodes(nodes, state.filterModel, state.columns, state.quickFilterText);

    // Sort
    nodes = sortRowNodes(nodes, state.sortModel, state.columns);

    // Assign display positions
    assignDisplayPositions(nodes);

    const displayedIds = nodes.map((n) => n.id);

    store.setState((prev) => ({
      ...prev,
      displayedRowIds: displayedIds,
      pagination: {
        ...prev.pagination,
        totalRows: displayedIds.length,
      },
    }));
  }

  // ── Build API ──
  const api: GridApi<TData> = {
    // Data
    setRowData(data: TData[]) {
      if (!Array.isArray(data)) {
        console.warn('[GridStorm] setRowData called with non-array value, using empty array.');
        data = [];
      }
      const newNodes = createRowNodes(data, config.getRowId, rowHeight);
      const newMap = new Map<string, RowNode<TData>>();
      for (const node of newNodes) {
        newMap.set(node.id, node);
      }

      store.batch(() => {
        store.setState((prev) => ({
          ...prev,
          rowNodes: newMap,
          selection: {
            selectedRowIds: new Set(),
            rangeSelections: [],
          },
        }));
        reprocessRows();
      });

      eventBus.emit('rowData:changed', { rowData: data });
    },

    getRowNode(id: string) {
      return store.getState().rowNodes.get(id);
    },

    forEachNode(callback) {
      const state = store.getState();
      let index = 0;
      for (const node of state.rowNodes.values()) {
        callback(node, index++);
      }
    },

    getDisplayedRowCount() {
      return store.getState().displayedRowIds.length;
    },

    getDisplayedRowAtIndex(index: number) {
      const state = store.getState();
      const id = state.displayedRowIds[index];
      return id ? state.rowNodes.get(id) : undefined;
    },

    // Columns
    setColumnDefs(defs) {
      const newColumns = resolveColumns(defs, config.defaultColDef);
      store.setState((prev) => ({ ...prev, columns: newColumns }));
      eventBus.emit('columns:changed', { columns: newColumns });
    },

    getColumn(colId) {
      return findColumn(store.getState().columns, colId);
    },

    getAllColumns() {
      return store.getState().columns;
    },

    getVisibleColumns() {
      return store.getState().columns.filter((c) => !c.hide);
    },

    setColumnVisible(colId, visible) {
      store.setState((prev) => ({
        ...prev,
        columns: updateColumn(prev.columns, colId, { hide: !visible }),
      }));
      const col = findColumn(store.getState().columns, colId);
      if (col) eventBus.emit('column:visible', { column: col, visible });
    },

    setColumnPinned(colId, pinned) {
      store.setState((prev) => ({
        ...prev,
        columns: updateColumn(prev.columns, colId, { pinned }),
      }));
      const col = findColumn(store.getState().columns, colId);
      if (col) eventBus.emit('column:pinned', { column: col, pinned });
    },

    setColumnWidth(colId, width) {
      const col = findColumn(store.getState().columns, colId);
      if (!col) return;
      const clamped = Math.max(col.minWidth, Math.min(col.maxWidth, width));
      const oldWidth = col.width;
      store.setState((prev) => ({
        ...prev,
        columns: updateColumn(prev.columns, colId, { width: clamped }),
      }));
      const updatedCol = findColumn(store.getState().columns, colId)!;
      eventBus.emit('column:resized', { column: updatedCol, oldWidth, newWidth: clamped, finished: true });
    },

    moveColumn(colId, toIndex) {
      const prevCols = store.getState().columns;
      const fromIndex = prevCols.findIndex((c) => c.colId === colId);
      if (fromIndex < 0) return;

      store.setState((prev) => {
        const cols = [...prev.columns];
        const fi = cols.findIndex((c) => c.colId === colId);
        if (fi < 0) return prev;
        const [col] = cols.splice(fi, 1);
        cols.splice(toIndex, 0, col!);
        return { ...prev, columns: cols };
      });

      const movedCol = findColumn(store.getState().columns, colId);
      if (movedCol) {
        eventBus.emit('column:moved', { column: movedCol, fromIndex, toIndex });
      }
    },

    autoSizeColumn(_colId) {
      // Requires DOM measurement — delegated to renderer
    },

    autoSizeAllColumns() {
      // Requires DOM measurement — delegated to renderer
    },

    getColumnState() {
      return store.getState().columns;
    },

    applyColumnState(stateUpdates) {
      store.setState((prev) => {
        let columns = [...prev.columns];
        for (const update of stateUpdates) {
          if (!update.colId) continue;
          columns = updateColumn(columns, update.colId, update);
        }
        return { ...prev, columns };
      });
      eventBus.emit('columns:changed', { columns: store.getState().columns });
    },

    // Sorting
    setSortModel(model) {
      store.setState((prev) => ({ ...prev, sortModel: model }));
      reprocessRows();
      eventBus.emit('column:sort:changed', { sortModel: model });
    },

    getSortModel() {
      return store.getState().sortModel;
    },

    // Filtering
    setFilterModel(model) {
      store.setState((prev) => ({ ...prev, filterModel: model }));
      reprocessRows();
      eventBus.emit('filter:changed', { filterModel: model });
    },

    getFilterModel() {
      return store.getState().filterModel;
    },

    setQuickFilter(text) {
      store.setState((prev) => ({ ...prev, quickFilterText: text }));
      reprocessRows();
      eventBus.emit('quickFilter:changed', { text });
    },

    isAnyFilterPresent() {
      const state = store.getState();
      return Object.keys(state.filterModel).length > 0 || state.quickFilterText.length > 0;
    },

    // Selection
    selectAll() {
      const state = store.getState();
      const allIds = new Set(state.displayedRowIds);
      store.setState((prev) => ({
        ...prev,
        selection: { ...prev.selection, selectedRowIds: allIds },
      }));
      eventBus.emit('selection:changed', {
        selectedNodes: api.getSelectedNodes(),
        source: 'selectAll',
      });
    },

    deselectAll() {
      store.setState((prev) => ({
        ...prev,
        selection: { ...prev.selection, selectedRowIds: new Set() },
      }));
      eventBus.emit('selection:changed', { selectedNodes: [], source: 'api' });
    },

    getSelectedRows() {
      const state = store.getState();
      const result: TData[] = [];
      for (const id of state.selection.selectedRowIds) {
        const node = state.rowNodes.get(id);
        if (node?.data) result.push(node.data);
      }
      return result;
    },

    getSelectedNodes() {
      const state = store.getState();
      const result: RowNode<TData>[] = [];
      for (const id of state.selection.selectedRowIds) {
        const node = state.rowNodes.get(id);
        if (node) result.push(node);
      }
      return result;
    },

    // Editing
    startEditingCell(params) {
      const node = api.getDisplayedRowAtIndex(params.rowIndex);
      if (!node) return;
      const col = findColumn(store.getState().columns, params.colId);
      if (!col) return;

      const value =
        node.data != null ? (node.data as any)[col.field ?? col.colId] : undefined;

      store.setState((prev) => ({
        ...prev,
        editing: {
          rowId: node.id,
          colId: params.colId,
          value,
          originalValue: value,
          rowEditMode: false,
        },
      }));

      eventBus.emit('cell:editingStarted', { node, colId: params.colId, value });
    },

    stopEditing(cancel = false) {
      const state = store.getState();
      if (!state.editing) return;

      const node = state.rowNodes.get(state.editing.rowId);
      const { colId, value, originalValue } = state.editing;

      store.setState((prev) => ({ ...prev, editing: null }));

      if (node) {
        // Write the new value back to the row data when not cancelled
        if (!cancel && value !== originalValue && node.data != null) {
          const col = state.columns.find((c) => c.colId === colId);
          const field = col?.field ?? colId;
          (node.data as any)[field] = value;
          node.version++;
        }

        eventBus.emit('cell:editingStopped', {
          node,
          colId,
          oldValue: originalValue,
          newValue: cancel ? originalValue : value,
          cancelled: cancel,
        });

        if (!cancel && value !== originalValue) {
          eventBus.emit('cell:valueChanged', {
            node,
            colId,
            oldValue: originalValue,
            newValue: value,
          });
        }
      }
    },

    // Scrolling
    ensureIndexVisible(index, _position) {
      // Delegated to renderer
      eventBus.emit('viewport:changed', { firstRow: index, lastRow: index });
    },

    ensureColumnVisible(_colId) {
      // Delegated to renderer
    },

    // Row Groups
    expandAll() {
      const state = store.getState();
      for (const node of state.rowNodes.values()) {
        if (node.group) node.expanded = true;
      }
      reprocessRows();
    },

    collapseAll() {
      const state = store.getState();
      for (const node of state.rowNodes.values()) {
        if (node.group) node.expanded = false;
      }
      reprocessRows();
    },

    setRowNodeExpanded(node, expanded) {
      node.expanded = expanded;
      node.version++;
      reprocessRows();
      eventBus.emit('row:groupOpened', { node, expanded });
    },

    // Rendering
    refreshCells(_params) {
      // Signal renderer to refresh
      eventBus.emit('viewport:changed', { firstRow: 0, lastRow: api.getDisplayedRowCount() - 1 });
    },

    redrawRows() {
      eventBus.emit('viewport:changed', { firstRow: 0, lastRow: api.getDisplayedRowCount() - 1 });
    },

    // Pagination
    paginationGoToPage(page) {
      const state = store.getState();
      const totalPages = Math.ceil(state.pagination.totalRows / state.pagination.pageSize);
      const clamped = Math.max(0, Math.min(page, totalPages - 1));
      store.setState((prev) => ({
        ...prev,
        pagination: { ...prev.pagination, currentPage: clamped },
      }));
      eventBus.emit('pagination:changed', {
        currentPage: clamped,
        totalPages,
        pageSize: state.pagination.pageSize,
      });
    },

    paginationGetCurrentPage() {
      return store.getState().pagination.currentPage;
    },

    paginationGetTotalPages() {
      const { totalRows, pageSize } = store.getState().pagination;
      return Math.ceil(totalRows / pageSize);
    },

    // Config
    setGridOption(key, value) {
      (config as any)[key] = value;
      // Handle specific option changes
      if (key === 'rowData') {
        api.setRowData(value as TData[]);
      } else if (key === 'columns') {
        api.setColumnDefs(value as any);
      }
    },

    getGridOption(key) {
      return (config as any)[key];
    },

    // Lifecycle
    destroy() {
      pluginManager.destroyAll();
      eventBus.emit('grid:destroyed', {});
      eventBus.removeAllListeners();
      commandBus.clear();
    },

    // Events
    addEventListener(event, listener) {
      eventBus.on(event, listener);
    },

    removeEventListener(event, listener) {
      eventBus.off(event, listener);
    },

    // Plugin API
    getPluginApi(pluginId) {
      return pluginManager.getPluginApi(pluginId);
    },

    // State
    getState() {
      return store.getState();
    },
  };

  // ── Register built-in commands ──
  commandBus.registerHandler('rows:reprocess', () => {
    reprocessRows();
  });

  commandBus.registerHandler('sort:set', (payload: { sortModel: SortModelItem[] }) => {
    api.setSortModel(payload.sortModel);
  });

  commandBus.registerHandler('filter:set', (payload: { filterModel?: Record<string, FilterModel> }) => {
    if (payload.filterModel != null) {
      api.setFilterModel(payload.filterModel);
    }
  });

  // ── Plugin Manager ──
  const pluginManager = new PluginManager<TData>(store, eventBus, commandBus, api, config);

  // Register plugins
  if (config.plugins) {
    for (const plugin of config.plugins) {
      pluginManager.register(plugin);
    }
  }

  // Install plugins
  pluginManager.installAll();

  // ── Initial processing ──
  reprocessRows();

  // ── Wire up config callbacks ──
  if (config.onGridReady) {
    config.onGridReady(api);
  }
  if (config.onRowDataChanged) {
    eventBus.on('rowData:changed', config.onRowDataChanged);
  }
  if (config.onSelectionChanged) {
    eventBus.on('selection:changed', config.onSelectionChanged);
  }
  if (config.onSortChanged) {
    eventBus.on('column:sort:changed', config.onSortChanged);
  }
  if (config.onFilterChanged) {
    eventBus.on('filter:changed', config.onFilterChanged);
  }
  if (config.onCellValueChanged) {
    eventBus.on('cell:valueChanged', config.onCellValueChanged);
  }

  eventBus.emit('grid:ready', { api });

  return {
    api,
    store,
    eventBus,
    commandBus,
    pluginManager,
    destroy: () => api.destroy(),
  };
}
