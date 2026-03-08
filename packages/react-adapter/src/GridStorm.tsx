// ─── GridStorm React Component ───
// Production-grade React wrapper around the headless core engine.
// Supports controlled + uncontrolled modes, React component cell/header
// renderers via portals, event bridging, and comprehensive hooks.

import {
  useEffect,
  useRef,
  useMemo,
  useState,
  type CSSProperties,
} from 'react';
import type {
  GridConfig,
  ColumnDef,
  GridEngine,
} from '@gridstorm/core';
import { createGrid } from '@gridstorm/core';
import { DomRenderer } from '@gridstorm/dom-renderer';
import { GridContext, type GridContextValue } from './context';
import { PortalManager } from './portals/PortalManager';
import type { GridStormProps, ReactColumnDef } from './types';
import { GridErrorBoundary } from './ErrorBoundary';

// ── useGridEngine hook (internal) ──

function useGridEngine<TData = any>(config: GridConfig<TData>): GridEngine<TData> {
  const engineRef = useRef<GridEngine<TData> | null>(null);

  if (!engineRef.current) {
    engineRef.current = createGrid(config);
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  // Sync rowData changes
  useEffect(() => {
    if (config.rowData && engineRef.current) {
      engineRef.current.api.setRowData(config.rowData);
    }
  }, [config.rowData]);

  // Sync column changes
  useEffect(() => {
    if (config.columns && engineRef.current) {
      engineRef.current.api.setColumnDefs(config.columns);
    }
  }, [config.columns]);

  return engineRef.current;
}

// ── Column processing: convert ReactColumnDef[] → ColumnDef[] ──

function processColumns<TData>(
  reactColumns: ReactColumnDef<TData>[],
): ColumnDef<TData>[] {
  return reactColumns.map((col) => {
    const coreDef = { ...col } as any;

    // If cellRenderer is a React-wrapped renderer, keep the marker function
    // (it returns '' so DomRenderer creates empty cells; PortalManager handles rendering)
    // If it's a plain CellRendererFn, leave it as-is.
    // No conversion needed — the marker fn IS a valid CellRendererFn.

    // If headerRenderer is React-wrapped, same logic applies.

    // Remove React-only fields from the core column def
    delete coreDef.cellEditorComponent;

    return coreDef as ColumnDef<TData>;
  });
}

// ── Main Component ──

export function GridStorm<TData = any>(props: GridStormProps<TData>) {
  const {
    // GridConfig props
    columns: reactColumns,
    rowData,
    dataSource,
    rowModelType,
    getRowId,
    plugins,
    defaultColDef,
    rowHeight,
    headerHeight,
    domLayout,
    pinnedTopRowData,
    pinnedBottomRowData,
    suppressScrollX,
    suppressScrollY,
    rowSelection,
    editType,
    undoRedoCellEditing,
    pagination,
    paginationPageSize,
    animateRows,
    ariaLabel,
    locale,
    theme,
    // Controlled state props
    sortModel: controlledSortModel,
    onSortModelChange,
    filterModel: controlledFilterModel,
    onFilterModelChange,
    selectedRowIds: controlledSelectedRowIds,
    onSelectedRowIdsChange,
    currentPage: controlledCurrentPage,
    onCurrentPageChange,
    // Event props
    onGridReady,
    onRowDataChanged,
    onSelectionChanged,
    onSortChanged,
    onFilterChanged,
    onCellValueChanged,
    onCellClicked,
    onCellDoubleClicked,
    onRowClicked,
    onCellEditingStarted,
    onCellEditingStopped,
    onPaginationChanged,
    onColumnResized,
    // Component props
    height = 400,
    width = '100%',
    containerClass,
    containerStyle,
    contextMenu,
    children,
    // Rest are ignored (no HTML div passthrough to avoid TS errors)
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<DomRenderer | null>(null);
  const [rootElement, setRootElement] = useState<HTMLElement | null>(null);

  // ── Convert React columns to core columns ──
  const coreColumns = useMemo(
    () => processColumns(reactColumns),
    [reactColumns],
  );

  // ── Build core config (only depends on structural changes) ──
  const config = useMemo<GridConfig<TData>>(
    () => ({
      columns: coreColumns,
      rowData,
      dataSource,
      rowModelType,
      getRowId,
      plugins,
      defaultColDef,
      rowHeight,
      headerHeight,
      domLayout,
      pinnedTopRowData,
      pinnedBottomRowData,
      suppressScrollX,
      suppressScrollY,
      rowSelection,
      editType,
      undoRedoCellEditing,
      pagination,
      paginationPageSize,
      animateRows,
      ariaLabel,
      locale,
      theme,
    }),
    // Only recreate config on structural changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [coreColumns, plugins, rowModelType, getRowId],
  );

  // ── Create grid engine ──
  const engine = useGridEngine<TData>(config);

  // ── Mount DOM renderer ──
  useEffect(() => {
    if (!containerRef.current) return;

    const renderer = new DomRenderer({
      container: containerRef.current,
      engine,
    });
    renderer.mount();
    rendererRef.current = renderer;

    // Capture root element for portals
    const root = containerRef.current.querySelector<HTMLElement>('.gs-root');
    setRootElement(root);

    return () => {
      renderer.destroy();
      rendererRef.current = null;
      setRootElement(null);
    };
  }, [engine]);

  // ── Controlled mode: install command bus middleware ──
  const controlledCallbacksRef = useRef({
    onSortModelChange,
    onFilterModelChange,
    onSelectedRowIdsChange,
    onCurrentPageChange,
  });
  controlledCallbacksRef.current = {
    onSortModelChange,
    onFilterModelChange,
    onSelectedRowIdsChange,
    onCurrentPageChange,
  };

  useEffect(() => {
    const removeMw = engine.commandBus.use((ctx) => {
      const cbs = controlledCallbacksRef.current;

      // Intercept sort commands in controlled mode
      if (ctx.commandType === 'sort:toggle' && cbs.onSortModelChange) {
        // Let the command execute to compute the new sort model,
        // then we'll intercept the result via the event listener
        return;
      }

      // Intercept selection in controlled mode
      if (ctx.commandType === 'selection:select' && cbs.onSelectedRowIdsChange) {
        // Let it through — we intercept via event
        return;
      }
    });

    return removeMw;
  }, [engine]);

  // ── Controlled mode: sync controlled props to engine ──
  useEffect(() => {
    if (controlledSortModel !== undefined) {
      engine.api.setSortModel(controlledSortModel);
    }
  }, [controlledSortModel, engine]);

  useEffect(() => {
    if (controlledFilterModel !== undefined) {
      engine.api.setFilterModel(controlledFilterModel as any);
    }
  }, [controlledFilterModel, engine]);

  useEffect(() => {
    if (controlledCurrentPage !== undefined) {
      engine.api.paginationGoToPage(controlledCurrentPage);
    }
  }, [controlledCurrentPage, engine]);

  useEffect(() => {
    if (controlledSelectedRowIds !== undefined) {
      engine.store.setState((prev) => ({
        ...prev,
        selection: { ...prev.selection, selectedRowIds: controlledSelectedRowIds },
      }));
    }
  }, [controlledSelectedRowIds, engine]);

  // ── Event bridge: core events → React callbacks ──
  const eventCallbacksRef = useRef({
    onGridReady,
    onRowDataChanged,
    onSelectionChanged,
    onSortChanged,
    onFilterChanged,
    onCellValueChanged,
    onCellClicked,
    onCellDoubleClicked,
    onRowClicked,
    onCellEditingStarted,
    onCellEditingStopped,
    onPaginationChanged,
    onColumnResized,
  });
  eventCallbacksRef.current = {
    onGridReady,
    onRowDataChanged,
    onSelectionChanged,
    onSortChanged,
    onFilterChanged,
    onCellValueChanged,
    onCellClicked,
    onCellDoubleClicked,
    onRowClicked,
    onCellEditingStarted,
    onCellEditingStopped,
    onPaginationChanged,
    onColumnResized,
  };

  useEffect(() => {
    const eb = engine.eventBus;
    const cbs = () => eventCallbacksRef.current;

    const unsubs = [
      eb.on('rowData:changed', (e) => cbs().onRowDataChanged?.(e)),
      eb.on('selection:changed', (e) => {
        cbs().onSelectionChanged?.(e);
        // Controlled mode: notify parent of selection change
        controlledCallbacksRef.current.onSelectedRowIdsChange?.(
          engine.store.getState().selection.selectedRowIds,
          (e as any).source ?? 'api',
        );
      }),
      eb.on('column:sort:changed', (e) => {
        cbs().onSortChanged?.(e);
        // Controlled mode: notify parent of sort change
        controlledCallbacksRef.current.onSortModelChange?.(e.sortModel);
      }),
      eb.on('filter:changed', (e) => {
        cbs().onFilterChanged?.(e);
        controlledCallbacksRef.current.onFilterModelChange?.(e.filterModel);
      }),
      eb.on('cell:valueChanged', (e) => cbs().onCellValueChanged?.(e)),
      eb.on('cell:clicked', (e) => cbs().onCellClicked?.(e)),
      eb.on('cell:doubleClicked', (e) => cbs().onCellDoubleClicked?.(e)),
      eb.on('row:clicked', (e) => cbs().onRowClicked?.(e)),
      eb.on('cell:editingStarted', (e) => cbs().onCellEditingStarted?.(e)),
      eb.on('cell:editingStopped', (e) => cbs().onCellEditingStopped?.(e)),
      eb.on('pagination:changed', (e) => {
        cbs().onPaginationChanged?.(e);
        controlledCallbacksRef.current.onCurrentPageChange?.(e.currentPage);
      }),
      eb.on('column:resized', (e) => cbs().onColumnResized?.(e)),
    ];

    return () => unsubs.forEach((u) => u());
  }, [engine]);

  // ── Fire onGridReady ──
  useEffect(() => {
    onGridReady?.(engine.api);
  }, [engine]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync rowData prop changes ──
  useEffect(() => {
    if (rowData) {
      engine.api.setRowData(rowData);
    }
  }, [rowData, engine]);

  // ── Context value (stable reference) ──
  const contextValue = useMemo<GridContextValue<TData>>(
    () => ({
      engine,
      api: engine.api,
      rootElement,
    }),
    [engine, rootElement],
  );

  // ── Container style ──
  const style: CSSProperties = {
    height: typeof height === 'number' ? `${height}px` : height,
    width: typeof width === 'number' ? `${width}px` : width,
    ...containerStyle,
  };

  return (
    <GridErrorBoundary>
      <GridContext.Provider value={contextValue as GridContextValue}>
        <div
          ref={containerRef}
          className={`gs-container ${containerClass ?? ''}`.trim()}
          style={style}
        />
        <PortalManager
          engine={engine}
          api={engine.api}
          columns={reactColumns}
          rootElement={rootElement}
          contextMenuComponent={contextMenu}
        />
        {children}
      </GridContext.Provider>
    </GridErrorBoundary>
  );
}
