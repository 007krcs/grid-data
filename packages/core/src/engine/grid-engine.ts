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
import { registerCoreCommandValidators } from '../validation/command-validators';
import { resolveColumns, resolveColumnGroups, updateColumn, findColumn } from './column-model';
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

export function createGrid<TData = any>(_config: GridConfig<TData>): GridEngine<TData> {
  let config = _config;
  // ── Resolve initial state ──
  const columns = resolveColumns(config.columns, config.defaultColDef);
  const { groups: columnGroups, maxDepth: columnGroupDepth } = resolveColumnGroups(config.columns);
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
      pageSize: config.paginationPageSize ?? 0,
      totalRows: initialRowNodes.length,
    },
    quickFilterText: '',
    columnGroups,
    columnGroupDepth,
    pluginState: {},
  };

  // ── Create infrastructure ──
  const store = new Store<GridState<TData>>(initialState);
  const eventBus = new EventBus<GridEventMap<TData>>();
  const commandBus = new CommandBus();

  // Register built-in payload validators for core commands
  const removeValidators = registerCoreCommandValidators(commandBus);

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

    const allIds = nodes.map((n) => n.id);

    // Apply pagination if enabled
    const paginationEnabled = state.pagination.pageSize > 0;
    let displayedIds = allIds;
    if (paginationEnabled) {
      const { currentPage, pageSize } = state.pagination;
      const start = currentPage * pageSize;
      displayedIds = allIds.slice(start, start + pageSize);
      // Re-assign rowTop positions relative to this page (0, rowHeight, 2*rowHeight…)
      // so that rows on page 2+ render at the top of the viewport, not off-screen.
      const displayedNodes = nodes.slice(start, start + pageSize);
      assignDisplayPositions(displayedNodes);
    }

    store.setState((prev) => ({
      ...prev,
      displayedRowIds: displayedIds,
      pagination: {
        ...prev.pagination,
        totalRows: allIds.length,
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

    addRows(data: TData[], index?: number) {
      if (!Array.isArray(data) || data.length === 0) return;
      const newNodes = createRowNodes(data, config.getRowId, rowHeight);

      store.batch(() => {
        store.setState((prev) => {
          const updatedMap = new Map(prev.rowNodes);
          for (const node of newNodes) {
            updatedMap.set(node.id, node);
          }
          const newIds = newNodes.map((n) => n.id);
          const updatedIds = [...prev.displayedRowIds];
          const insertAt = index != null ? Math.min(index, updatedIds.length) : updatedIds.length;
          updatedIds.splice(insertAt, 0, ...newIds);
          return { ...prev, rowNodes: updatedMap, displayedRowIds: updatedIds };
        });
        reprocessRows();
      });

      // Pass full current rowData
      const addedState = store.getState();
      const allAddedRowData = [...addedState.rowNodes.values()]
        .filter((n) => n.data != null)
        .map((n) => n.data!);
      eventBus.emit('rowData:changed', { rowData: allAddedRowData });
    },

    removeRows(rowIds: string[]) {
      if (!Array.isArray(rowIds) || rowIds.length === 0) return;
      const idsToRemove = new Set(rowIds);

      store.batch(() => {
        store.setState((prev) => {
          const updatedMap = new Map(prev.rowNodes);
          const updatedSelection = new Set(prev.selection.selectedRowIds);
          for (const id of idsToRemove) {
            updatedMap.delete(id);
            updatedSelection.delete(id);
          }
          return {
            ...prev,
            rowNodes: updatedMap,
            selection: { ...prev.selection, selectedRowIds: updatedSelection },
          };
        });
        reprocessRows();
      });

      // Pass full current rowData
      const removedState = store.getState();
      const allRemovedRowData = [...removedState.rowNodes.values()]
        .filter((n) => n.data != null)
        .map((n) => n.data!);
      eventBus.emit('rowData:changed', { rowData: allRemovedRowData });
    },

    updateRows(updates: Array<{ id: string; data: Partial<TData> }>) {
      if (!Array.isArray(updates) || updates.length === 0) return;

      store.batch(() => {
        const state = store.getState();
        for (const update of updates) {
          const node = state.rowNodes.get(update.id);
          if (!node || !node.data) continue;
          const oldData = { ...node.data } as any;
          Object.assign(node.data as any, update.data);
          node.version++;
          // Emit one cell:valueChanged per changed field with correct colId
          for (const colId of Object.keys(update.data as any)) {
            eventBus.emit('cell:valueChanged', {
              node,
              colId,
              oldValue: oldData[colId],
              newValue: (update.data as any)[colId],
            });
          }
        }
        // Create a new Map reference so store subscribers detect the change
        store.setState((prev) => ({
          ...prev,
          rowNodes: new Map(prev.rowNodes),
        }));
        reprocessRows();
      });

      // Pass full current rowData
      const currentState = store.getState();
      const allRowData = [...currentState.rowNodes.values()]
        .filter((n) => n.data != null)
        .map((n) => n.data!);
      eventBus.emit('rowData:changed', { rowData: allRowData });
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
      const { groups: newGroups, maxDepth: newDepth } = resolveColumnGroups(defs);
      store.setState((prev) => ({
        ...prev,
        columns: newColumns,
        columnGroups: newGroups,
        columnGroupDepth: newDepth,
      }));
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
      // Guard: coerce null/undefined to empty array so downstream code never crashes
      const safeModel = Array.isArray(model) ? model : [];
      store.setState((prev) => ({ ...prev, sortModel: safeModel }));
      reprocessRows();
      eventBus.emit('column:sort:changed', { sortModel: safeModel });
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

      let value: any;
      const valueGetter = col.originalDef.valueGetter;
      if (valueGetter && node.data != null) {
        try {
          value = valueGetter({ data: node.data, node, colDef: col.originalDef, colId: col.colId });
        } catch {
          value = node.data != null ? (node.data as any)[col.field ?? col.colId] : undefined;
        }
      } else {
        value = node.data != null ? (node.data as any)[col.field ?? col.colId] : undefined;
      }

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
        let finalValue = value;
        // Write the new value back to the row data when not cancelled
        if (!cancel && value !== originalValue && node.data != null) {
          const col = state.columns.find((c) => c.colId === colId);
          const field = col?.field ?? colId;

          // Apply valueParser if defined
          if (col?.originalDef.valueParser) {
            try {
              finalValue = col.originalDef.valueParser({
                newValue: value,
                oldValue: originalValue,
                data: node.data,
                node,
                colDef: col.originalDef,
              });
            } catch { /* use raw value */ }
          }

          // Apply valueSetter if defined, else direct field write
          if (col?.originalDef.valueSetter) {
            try {
              col.originalDef.valueSetter({
                newValue: finalValue,
                oldValue: originalValue,
                data: node.data,
                node,
                colDef: col.originalDef,
              });
            } catch { /* fallback to direct write */
              (node.data as any)[field] = finalValue;
            }
          } else {
            (node.data as any)[field] = finalValue;
          }
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
            newValue: finalValue,
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
        if (node.group) {
          node.expanded = true;
          node.version++;
        }
      }
      store.setState((prev) => ({
        ...prev,
        rowNodes: new Map(prev.rowNodes),
      }));
      reprocessRows();
    },

    collapseAll() {
      const state = store.getState();
      for (const node of state.rowNodes.values()) {
        if (node.group) {
          node.expanded = false;
          node.version++;
        }
      }
      store.setState((prev) => ({
        ...prev,
        rowNodes: new Map(prev.rowNodes),
      }));
      reprocessRows();
    },

    setRowNodeExpanded(node, expanded) {
      node.expanded = expanded;
      node.version++;
      store.setState((prev) => ({
        ...prev,
        rowNodes: new Map(prev.rowNodes),
      }));
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
      const pageSize = Math.max(1, state.pagination.pageSize);
      const totalPages = Math.ceil(state.pagination.totalRows / pageSize);
      const clamped = Math.max(0, Math.min(page, totalPages - 1));
      store.setState((prev) => ({
        ...prev,
        pagination: { ...prev.pagination, currentPage: clamped },
      }));
      // Re-slice displayedRowIds for the new page
      reprocessRows();
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
      return Math.ceil(totalRows / Math.max(1, pageSize));
    },

    // Config
    setGridOption(key, value) {
      // Shallow copy config before mutating
      config = { ...config, [key]: value };
      // Handle specific option changes
      if (key === 'rowData') {
        api.setRowData(value as TData[]);
      } else if (key === 'columns') {
        api.setColumnDefs(value as any);
      } else if (key === 'rowHeight') {
        // Update runtime row height for future row creation
        const newHeight = typeof value === 'number' ? value : DEFAULT_ROW_HEIGHT;
        const state = store.getState();
        for (const node of state.rowNodes.values()) {
          node.rowHeight = newHeight;
        }
        store.setState((prev) => ({
          ...prev,
          rowNodes: new Map(prev.rowNodes),
        }));
        eventBus.emit('viewport:changed', { firstRow: 0, lastRow: api.getDisplayedRowCount() - 1 });
      } else if (key === 'headerHeight') {
        eventBus.emit('viewport:changed', { firstRow: 0, lastRow: api.getDisplayedRowCount() - 1 });
      } else if (key === 'paginationPageSize') {
        const newPageSize = typeof value === 'number' ? Math.max(1, value) : 100;
        store.setState((prev) => ({
          ...prev,
          pagination: { ...prev.pagination, pageSize: newPageSize, currentPage: 0 },
        }));
        reprocessRows();
      }
    },

    getGridOption(key) {
      return (config as any)[key];
    },

    // Lifecycle
    destroy() {
      eventBus.emit('grid:destroyed', {});
      pluginManager.destroyAll();
      eventBus.removeAllListeners();
      removeValidators();
      commandBus.clear();
    },

    // Events
    addEventListener(event, listener) {
      return eventBus.on(event, listener);
    },

    removeEventListener(event, listener) {
      eventBus.off(event, listener);
    },

    // Plugin API
    getPluginApi(pluginId) {
      return pluginManager.getPluginApi(pluginId);
    },

    // Commands
    dispatchCommand(command: string, payload?: any) {
      commandBus.dispatch(command, payload ?? {});
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

  commandBus.registerHandler('rows:add', (payload: { data: TData[]; index?: number }) => {
    api.addRows(payload.data, payload.index);
  });

  commandBus.registerHandler('rows:remove', (payload: { rowIds: string[] }) => {
    api.removeRows(payload.rowIds);
  });

  commandBus.registerHandler('rows:update', (payload: { updates: Array<{ id: string; data: Partial<TData> }> }) => {
    api.updateRows(payload.updates);
  });

  // ── Plugin Manager ──
  const pluginManager = new PluginManager<TData>(store, eventBus, commandBus, api, config);

  // Register plugins
  if (config.plugins) {
    for (const plugin of config.plugins) {
      pluginManager.register(plugin);
    }
  }

  // ── Wire up config callbacks (before plugin install so plugins can trigger them) ──
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

  // Install plugins
  pluginManager.installAll();

  // ── Initial processing ──
  reprocessRows();

  if (config.onGridReady) {
    config.onGridReady(api);
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
