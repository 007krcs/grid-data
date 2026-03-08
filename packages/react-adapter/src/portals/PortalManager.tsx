// ─── Portal Manager ───
// Central orchestrator for all React portals: cell renderers, header
// renderers, editors, and context menus.
//
// Uses a MutationObserver on .gs-body to detect when DomRenderer
// adds/removes row elements, then portals React content into wrapper
// divs inside cells that have React renderers.
//
// KEY DESIGN: We never portal directly into DomRenderer-managed cells.
// Instead, we create a wrapper <div style="display:contents"> inside each
// cell and portal into that wrapper. This prevents crashes when DomRenderer
// destroys/recycles cells — the wrapper is detached but still maintains
// its React children, so React can safely unmount.

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import type { GridEngine, GridApi, ColumnState, RowNode } from '@gridstorm/core';
import { getValueFromData } from '@gridstorm/core';
import type {
  ReactColumnDef,
  CellRendererProps,
  HeaderRendererProps,
  EditorPortalState,
  ContextMenuProps,
  ReactContextMenu,
  ReactCellEditor,
} from '../types';
import { getReactCellComponent, isReactCellRenderer } from '../renderers/ReactCellRenderer';
import { getReactHeaderComponent, isReactHeaderRenderer } from '../renderers/ReactHeaderRenderer';
import { CellRendererPortal } from './CellRendererPortal';
import { CellEditorPortal } from './CellEditorPortal';
import { ContextMenuPortal } from './ContextMenuPortal';

export interface PortalManagerProps<TData = any> {
  engine: GridEngine<TData>;
  api: GridApi<TData>;
  columns: ReactColumnDef<TData>[];
  rootElement: HTMLElement | null;
  contextMenuComponent?: ReactContextMenu<TData>;
}

// ── Portal wrapper attribute ──
// Used to identify wrapper divs we've created inside cells.
const WRAPPER_ATTR = 'data-gs-portal';

// ── Cell renderer portal entry ──
interface CellPortalEntry<TData = any> {
  key: string;
  /** The wrapper div inside the cell (React-owned, safe to portal into) */
  container: HTMLElement;
  component: any;
  props: CellRendererProps<TData>;
  nodeVersion: number;
}

// ── Header renderer portal entry ──
interface HeaderPortalEntry {
  key: string;
  /** The wrapper div inside the header cell */
  container: HTMLElement;
  element: any;
}

// ── Context menu state ──
interface ContextMenuState<TData = any> {
  x: number;
  y: number;
  menuProps: ContextMenuProps<TData>;
}

// ── Helper: get or create a stable wrapper div inside a cell ──
// The wrapper uses display:contents so it's layout-transparent.
// When DomRenderer destroys the cell, the wrapper is detached but
// still maintains its children — React can safely unmount from it.
function getOrCreateWrapper(cell: HTMLElement): HTMLElement {
  // Check direct children only (not descendants) for existing wrapper
  for (let i = 0; i < cell.children.length; i++) {
    const child = cell.children[i] as HTMLElement;
    if (child.hasAttribute(WRAPPER_ATTR)) {
      return child;
    }
  }
  // Create new wrapper
  const wrapper = document.createElement('div');
  wrapper.setAttribute(WRAPPER_ATTR, '');
  wrapper.style.display = 'contents';
  cell.appendChild(wrapper);
  return wrapper;
}

export function PortalManager<TData = any>(props: PortalManagerProps<TData>) {
  const { engine, api, columns, rootElement, contextMenuComponent } = props;

  // ── Portal state ──
  const [cellPortals, setCellPortals] = useState<Map<string, CellPortalEntry<TData>>>(
    () => new Map(),
  );
  const [headerPortals, setHeaderPortals] = useState<Map<string, HeaderPortalEntry>>(
    () => new Map(),
  );
  const [editorPortal, setEditorPortal] = useState<EditorPortalState | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState<TData> | null>(null);

  // Refs for stable access in callbacks
  const columnsRef = useRef(columns);
  columnsRef.current = columns;
  const engineRef = useRef(engine);
  engineRef.current = engine;

  // Track if we're currently scanning to prevent re-entrant scans
  const scanningRef = useRef(false);

  // ── Build lookup maps for which columns have React renderers ──
  const reactCellRendererMap = useRef(new Map<string, any>());
  const reactHeaderRendererMap = useRef(new Map<string, any>());
  const reactEditorMap = useRef(new Map<string, ReactCellEditor<TData>>());

  useEffect(() => {
    const cellMap = new Map<string, any>();
    const headerMap = new Map<string, any>();
    const editorMap = new Map<string, ReactCellEditor<TData>>();

    for (const col of columns) {
      const colId = (col as any).colId ?? col.field ?? '';
      if (col.cellRenderer && isReactCellRenderer(col.cellRenderer)) {
        cellMap.set(colId, getReactCellComponent(col.cellRenderer));
      }
      if (col.headerRenderer && isReactHeaderRenderer(col.headerRenderer)) {
        headerMap.set(colId, getReactHeaderComponent(col.headerRenderer));
      }
      if (col.cellEditorComponent) {
        editorMap.set(colId, col.cellEditorComponent);
      }
    }

    reactCellRendererMap.current = cellMap;
    reactHeaderRendererMap.current = headerMap;
    reactEditorMap.current = editorMap;
  }, [columns]);

  // ── Helper: build cell renderer props ──
  const buildCellProps = useCallback(
    (node: RowNode<TData>, col: ColumnState, rowIndex: number): CellRendererProps<TData> => {
      const colDef = col.originalDef;
      let value: any;
      if (colDef.valueGetter) {
        value = colDef.valueGetter({
          data: node.data,
          node,
          colDef,
          colId: col.colId,
        });
      } else {
        value = getValueFromData(node.data, col.field);
      }

      let formattedValue = value != null ? String(value) : '';
      if (colDef.valueFormatter) {
        formattedValue = colDef.valueFormatter({ value, data: node.data, node, colDef });
      }

      return {
        value,
        formattedValue,
        data: node.data,
        node,
        colDef,
        colId: col.colId,
        rowIndex,
        api,
      };
    },
    [api],
  );

  // ── Scan visible rows and create/update cell portals ──
  const scanVisibleRows = useCallback(() => {
    if (!rootElement || scanningRef.current) return;
    scanningRef.current = true;

    try {
      const bodyContainer = rootElement.querySelector('.gs-body');
      if (!bodyContainer) return;

      const state = engineRef.current.store.getState();
      const cellRenderers = reactCellRendererMap.current;
      if (cellRenderers.size === 0) return;

      const newPortals = new Map<string, CellPortalEntry<TData>>();
      const rowElements = bodyContainer.querySelectorAll<HTMLElement>('.gs-row');

      for (const rowEl of rowElements) {
        const rowId = rowEl.getAttribute('data-row-id');
        if (!rowId) continue;

        const node = state.rowNodes.get(rowId);
        if (!node) continue;

        const cells = rowEl.querySelectorAll<HTMLElement>('.gs-cell');
        for (const cellEl of cells) {
          const colId = cellEl.getAttribute('data-col-id');
          if (!colId || !cellRenderers.has(colId)) continue;

          const key = `${rowId}:${colId}`;
          const Component = cellRenderers.get(colId)!;
          const colState = state.columns.find((c) => c.colId === colId);
          if (!colState) continue;

          const rowIndex = state.displayedRowIds.indexOf(rowId);
          const rendererProps = buildCellProps(node, colState, rowIndex);

          // Get or create a stable wrapper div inside the cell.
          // We portal into the wrapper, NOT the cell directly.
          // This prevents crashes when DomRenderer destroys/recycles cells.
          const wrapper = getOrCreateWrapper(cellEl);

          newPortals.set(key, {
            key,
            container: wrapper,
            component: Component,
            props: rendererProps,
            nodeVersion: node.version,
          });
        }
      }

      setCellPortals(newPortals);
    } finally {
      scanningRef.current = false;
    }
  }, [rootElement, buildCellProps]);

  // ── Scan header cells for React header renderers ──
  const scanHeaderCells = useCallback(() => {
    if (!rootElement) return;
    const headerRenderers = reactHeaderRendererMap.current;
    if (headerRenderers.size === 0) return;

    const headerContainer = rootElement.querySelector('.gs-header');
    if (!headerContainer) return;

    const state = engineRef.current.store.getState();
    const newPortals = new Map<string, HeaderPortalEntry>();

    const headerCells = headerContainer.querySelectorAll<HTMLElement>('.gs-header-cell');
    for (const cellEl of headerCells) {
      const colId = cellEl.getAttribute('data-col-id');
      if (!colId || !headerRenderers.has(colId)) continue;

      const Component = headerRenderers.get(colId)!;
      const colState = state.columns.find((c) => c.colId === colId);
      if (!colState) continue;

      const sortItem = state.sortModel.find((s) => s.colId === colId);

      const headerProps: HeaderRendererProps<TData> = {
        colDef: colState.originalDef,
        colId,
        displayName: colState.headerName,
        sortDirection: sortItem?.sort ?? null,
        sortIndex: colState.sortIndex,
        api,
        onSortRequested: (multiSort: boolean) => {
          engineRef.current.commandBus.dispatch('sort:toggle', { colId, multiSort });
        },
      };

      // Get or create a stable wrapper div inside the header cell.
      const wrapper = getOrCreateWrapper(cellEl);

      newPortals.set(colId, {
        key: colId,
        container: wrapper,
        element: <Component {...headerProps} />,
      });
    }

    setHeaderPortals(newPortals);
  }, [rootElement, api]);

  // ── MutationObserver on .gs-body for row add/remove ──
  useEffect(() => {
    if (!rootElement) return;
    const bodyContainer = rootElement.querySelector('.gs-body');
    if (!bodyContainer) return;

    const observer = new MutationObserver(() => {
      // When DomRenderer adds/removes rows, re-scan for portals
      scanVisibleRows();
    });

    observer.observe(bodyContainer, { childList: true });

    // Initial scan for already-rendered rows
    scanVisibleRows();
    scanHeaderCells();

    return () => observer.disconnect();
  }, [rootElement, scanVisibleRows, scanHeaderCells]);

  // ── Re-scan when state changes (sort, filter, data) ──
  const stateVersion = useSyncExternalStore(
    (cb) => engine.store.subscribe(cb),
    () => engine.store.getVersion(),
  );

  useEffect(() => {
    scanVisibleRows();
  }, [stateVersion, scanVisibleRows]);

  // ── Re-scan headers when sort or columns change ──
  useEffect(() => {
    const unsubs = [
      engine.eventBus.on('column:sort:changed', () => {
        // Delay slightly to let DomRenderer recreate header cells first
        requestAnimationFrame(() => scanHeaderCells());
      }),
      engine.eventBus.on('columns:changed', () => {
        requestAnimationFrame(() => scanHeaderCells());
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [engine, scanHeaderCells]);

  // ── Editor portal lifecycle ──
  useEffect(() => {
    const unsubStart = engine.eventBus.on(
      'cell:editingStarted',
      (event: any) => {
        const { node, colId } = event;
        const editorComponent = reactEditorMap.current.get(colId);
        if (!editorComponent || !rootElement) return;

        // Find the cell element
        const cellEl = rootElement.querySelector<HTMLElement>(
          `.gs-row[data-row-id="${node.id}"] .gs-cell[data-col-id="${colId}"]`,
        );
        if (!cellEl) return;

        const state = engine.store.getState();
        const editing = state.editing;
        if (!editing) return;

        setEditorPortal({
          editing,
          cellElement: cellEl,
          cellRect: cellEl.getBoundingClientRect(),
        });
      },
    );

    const unsubStop = engine.eventBus.on('cell:editingStopped', () => {
      setEditorPortal(null);
    });

    return () => {
      unsubStart();
      unsubStop();
    };
  }, [engine, rootElement]);

  // ── Context menu ──
  useEffect(() => {
    if (!rootElement || !contextMenuComponent) return;

    const handler = (e: MouseEvent) => {
      e.preventDefault();
      const target = e.target as HTMLElement;
      const cellEl = target.closest<HTMLElement>('.gs-cell');
      const rowEl = target.closest<HTMLElement>('.gs-row');
      if (!cellEl || !rowEl) return;

      const rowId = rowEl.getAttribute('data-row-id');
      const colId = cellEl.getAttribute('data-col-id');
      if (!rowId || !colId) return;

      const state = engine.store.getState();
      const node = state.rowNodes.get(rowId);
      if (!node) return;

      const colState = state.columns.find((c) => c.colId === colId);
      const value = colState
        ? getValueFromData(node.data, colState.field)
        : undefined;

      const rootRect = rootElement.getBoundingClientRect();
      const rowIndex = state.displayedRowIds.indexOf(rowId);

      setContextMenu({
        x: e.clientX - rootRect.left,
        y: e.clientY - rootRect.top,
        menuProps: {
          position: { rowIndex, colId },
          node,
          colId,
          value,
          api,
          closeMenu: () => setContextMenu(null),
        },
      });
    };

    rootElement.addEventListener('contextmenu', handler);
    return () => rootElement.removeEventListener('contextmenu', handler);
  }, [rootElement, contextMenuComponent, api, engine]);

  // ── Render portals ──
  return (
    <>
      {/* Cell renderer portals — portaled into wrapper divs, NOT cells directly */}
      {Array.from(cellPortals.values()).map((entry) =>
        createPortal(
          <CellRendererPortal
            key={entry.key}
            Component={entry.component}
            rendererProps={entry.props}
            nodeVersion={entry.nodeVersion}
          />,
          entry.container,
          entry.key,
        ),
      )}

      {/* Header renderer portals — portaled into wrapper divs in header cells */}
      {Array.from(headerPortals.values()).map((entry) =>
        createPortal(entry.element, entry.container, entry.key),
      )}

      {/* Editor portal */}
      {editorPortal && rootElement && (() => {
        const editorComponent = reactEditorMap.current.get(editorPortal.editing.colId);
        if (!editorComponent) return null;
        const colDef = columnsRef.current.find(
          (c) => ((c as any).colId ?? c.field) === editorPortal.editing.colId,
        );
        return createPortal(
          <CellEditorPortal
            state={editorPortal}
            api={api}
            engine={engine}
            EditorComponent={editorComponent}
            editorParams={(colDef?.cellEditorParams as Record<string, unknown>) ?? {}}
            gridRootRect={rootElement.getBoundingClientRect()}
          />,
          rootElement,
          'gs-editor',
        );
      })()}

      {/* Context menu portal */}
      {contextMenu && contextMenuComponent && rootElement &&
        createPortal(
          <ContextMenuPortal
            x={contextMenu.x}
            y={contextMenu.y}
            menuProps={contextMenu.menuProps}
            Component={contextMenuComponent}
          />,
          rootElement,
          'gs-context-menu',
        )}
    </>
  );
}
