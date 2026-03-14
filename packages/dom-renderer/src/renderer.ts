// ─── DOM Renderer ───
// Creates and manages the grid DOM structure.
// Reads state from the core engine and renders rows/cells efficiently.

import type { GridEngine, GridState, ColumnState, RowNode, ColumnGroupInfo } from '@gridstorm/core';
import { getValueFromData } from '@gridstorm/core';
import { VirtualScroller } from './virtual-scroll';
import { ColumnVirtualizer } from './column-virtualizer';
import type { ColumnVirtualResult } from './column-virtualizer';
import { ScrollManager } from './scroll-manager';
import { KeyboardManager } from './keyboard-manager';
import { isServer, safeResizeObserver } from './ssr';
import type { RendererExtension, RendererContext } from './extensions/types';
import { FloatingFilterRenderer } from './extensions/floating-filter-renderer';
import { PaginationRenderer } from './extensions/pagination-renderer';
import { SidebarRenderer } from './extensions/sidebar-renderer';

export interface DomRendererConfig {
  /** Container element to mount the grid into. */
  container: HTMLElement;
  /** Grid engine instance. */
  engine: GridEngine;
  /** CSS class prefix. Default: 'gs'. */
  classPrefix?: string;

  // ── Tier 1 Feature Options ──

  /** Enable inline cell editing overlay. Default: auto-detect EditingPlugin. */
  enableCellEditing?: boolean;
  /** Enable row grouping visual (chevron, indent, group label). Default: auto-detect GroupingPlugin. */
  enableGrouping?: boolean;
  /** Indentation per group level in pixels. Default: 24. */
  groupIndent?: number;
  /** Show checkbox selection column as the first column. Default: false. */
  checkboxSelection?: boolean;
  /** Width of the checkbox column in pixels. Default: 48. */
  checkboxColumnWidth?: number;
  /** Show floating filter inputs below the header. Default: false. */
  floatingFilter?: boolean;
  /** Debounce delay for filter input in ms. Default: 300. */
  floatingFilterDebounce?: number;
  /** Show pagination bar below the grid. Default: auto-detect PaginationPlugin. */
  enablePagination?: boolean;
  /** Available page size options for the page size selector. Default: [25, 50, 100, 250]. */
  pageSizeOptions?: number[];

  // ── Tier 2 Feature Options ──

  /** Height of column group header rows in pixels. Default: same as headerHeight. */
  groupHeaderHeight?: number;
  /** Show column sidebar toggle button. Default: false. */
  enableColumnSidebar?: boolean;
  /** Width of the column sidebar panel in pixels. Default: 220. */
  sidebarWidth?: number;

  // ── Extension System ──

  /** Additional renderer extensions to mount. */
  extensions?: RendererExtension[];
}

interface RowDomEntry {
  element: HTMLElement;
  rowId: string;
  version: number;
}

export class DomRenderer {
  private engine: GridEngine;
  private container: HTMLElement;
  private prefix: string;

  // DOM elements
  private root: HTMLElement | null = null;
  private headerContainer: HTMLElement | null = null;
  private bodyViewport: HTMLElement | null = null;
  private bodyContainer: HTMLElement | null = null;
  private heightSpacer: HTMLElement | null = null;
  private liveRegion: HTMLElement | null = null;

  // Feature config
  private enableCellEditing: boolean;
  private enableGrouping: boolean;
  private groupIndent: number;
  private checkboxSelection: boolean;
  private checkboxColumnWidth: number;
  private groupHeaderHeight: number | null;

  // Extension system
  private extensions: RendererExtension[] = [];
  private extFloatingFilter: FloatingFilterRenderer | null = null;
  private extPagination: PaginationRenderer | null = null;
  private extSidebar: SidebarRenderer | null = null;

  // Feature state
  private headerCheckbox: HTMLInputElement | null = null;
  private activeEditor: {
    element: HTMLElement;
    cellElement: HTMLElement;
    rowId: string;
    colId: string;
  } | null = null;

  // Custom double-click detection via click events.
  // Native dblclick is unreliable because SelectionPlugin bumps node.version
  // on every click, causing updateRowContent() to destroy and recreate cells
  // synchronously. The browser's dblclick fires on the detached cell element
  // and never bubbles through the live DOM tree.
  private _lastCellClick: {
    time: number;
    rowId: string;
    colId: string;
  } | null = null;

  // Virtualization
  private scroller = new VirtualScroller();
  private columnVirtualizer = new ColumnVirtualizer();
  private scrollManager = new ScrollManager();
  private keyboardManager = new KeyboardManager();
  private lastRenderedRowCount = 0;

  // Row DOM cache
  private renderedRows = new Map<string, RowDomEntry>();
  private rowPool: HTMLElement[] = [];

  // Observers
  private resizeObserver: ResizeObserver | null = null;
  private mutationObserver: MutationObserver | null = null;

  // Subscription cleanup
  private unsubscribers: Array<() => void> = [];

  // State change batching
  private renderPending = false;

  // Last rendered state
  private lastStartIndex = -1;
  private lastEndIndex = -1;
  private lastColumnResult: ColumnVirtualResult | null = null;

  constructor(config: DomRendererConfig) {
    this.engine = config.engine;
    this.container = config.container;
    this.prefix = config.classPrefix ?? 'gs';

    // Feature config with smart defaults (auto-detect plugins)
    const hasPlugin = (id: string) => !!this.engine.pluginManager.getPlugin(id);
    this.enableCellEditing = config.enableCellEditing ?? hasPlugin('editing');
    this.enableGrouping = config.enableGrouping ?? hasPlugin('grouping');
    this.groupIndent = config.groupIndent ?? 24;
    this.checkboxSelection = config.checkboxSelection ?? false;
    this.checkboxColumnWidth = config.checkboxColumnWidth ?? 48;
    this.groupHeaderHeight = config.groupHeaderHeight ?? null;

    // Initialize built-in extensions based on config
    const floatingFilter = config.floatingFilter ?? false;
    const floatingFilterDebounce = config.floatingFilterDebounce ?? 300;
    const enablePagination = config.enablePagination ?? hasPlugin('pagination');
    const pageSizeOptions = config.pageSizeOptions ?? [25, 50, 100, 250];
    const enableColumnSidebar = config.enableColumnSidebar ?? false;
    const sidebarWidth = config.sidebarWidth ?? 220;

    if (floatingFilter) {
      this.extFloatingFilter = new FloatingFilterRenderer({ debounce: floatingFilterDebounce });
      this.extensions.push(this.extFloatingFilter);
    }
    if (enablePagination) {
      this.extPagination = new PaginationRenderer({ pageSizeOptions });
      this.extensions.push(this.extPagination);
    }
    if (enableColumnSidebar) {
      this.extSidebar = new SidebarRenderer({ width: sidebarWidth });
      this.extensions.push(this.extSidebar);
    }

    // Add user-provided extensions
    if (config.extensions) {
      this.extensions.push(...config.extensions);
    }
  }

  /** Build a RendererContext for extensions. */
  private buildContext(): RendererContext {
    return {
      engine: this.engine,
      prefix: this.prefix,
      root: this.root!,
      headerContainer: this.headerContainer!,
      bodyViewport: this.bodyViewport!,
      wrapper: this.root!.querySelector(`.${this.prefix}-wrapper`) as HTMLElement,
      getState: () => this.engine.store.getState(),
      api: this.engine.api,
      getVisibleColumns: (scrollLeft: number) => this.getVisibleColumnsForRender(scrollLeft),
      checkboxSelection: this.checkboxSelection,
      checkboxColumnWidth: this.checkboxColumnWidth,
      el: (tag: string, className: string) => this.el(tag, className),
    };
  }

  /** Mount the grid into the container. No-op when running on the server. */
  mount(): void {
    if (isServer()) return;

    // Guard against double mount — tear down previous instance first
    if (this.root) {
      this.destroy();
    }

    this.createDom();
    this.setupVirtualScroller();
    this.configureColumnVirtualizer();
    this.setupScrollManager();
    this.setupResizeObserver();
    this.setupKeyboardManager();
    this.observeContainerAttributes();
    this.subscribeToState();
    this.renderHeader();
    this.renderVisibleRows();

    // Mount all extensions (floating filter, pagination, sidebar, user-provided)
    if (this.root) {
      const ctx = this.buildContext();
      for (const ext of this.extensions) {
        ext.mount(ctx);
      }
      // Wire sidebar callback so it can trigger re-render
      if (this.extSidebar) {
        this.extSidebar.onColumnVisibilityChanged = () => {
          this.renderHeader();
          this.renderVisibleRows();
        };
      }
    }
  }

  /** Unmount and clean up all DOM and subscriptions. Safe to call on the server. */
  destroy(): void {
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
    this.resizeObserver?.disconnect();
    this.mutationObserver?.disconnect();
    this.scrollManager.destroy();
    this.keyboardManager.destroy();
    this.renderedRows.clear();
    this.rowPool = [];

    // Clean up feature state
    this.removeEditorOverlay();
    this.headerCheckbox = null;
    this._lastCellClick = null;

    // Clean up extensions
    for (const ext of this.extensions) {
      ext.destroy();
    }

    if (this.root && this.container?.contains(this.root)) {
      this.container.removeChild(this.root);
    }
    this.root = null;

    // Null out references to allow GC and prevent use-after-destroy
    this.engine = null as any;
    this.container = null as any;
  }

  // ── DOM Creation ──

  private createDom(): void {
    const p = this.prefix;

    // Root
    this.root = this.el('div', `${p}-root`);
    this.root.setAttribute('role', 'grid');
    this.root.setAttribute('aria-label', this.engine.api.getGridOption('ariaLabel') ?? 'Data Grid');
    this.root.setAttribute('aria-multiselectable', 'true');
    this.root.style.cssText = 'position:relative;overflow:hidden;width:100%;height:100%;';

    // Live region for screen reader announcements
    this.liveRegion = this.el('div', `${p}-live-region`);
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);';

    // Header
    this.headerContainer = this.el('div', `${p}-header`);
    this.headerContainer.setAttribute('role', 'rowgroup');
    this.headerContainer.style.cssText =
      'position:sticky;top:0;z-index:var(--gs-z-header,2);overflow:hidden;';

    // Body viewport (scrollable)
    this.bodyViewport = this.el('div', `${p}-body-viewport`);
    this.bodyViewport.style.cssText = 'overflow:auto;position:relative;flex:1;contain:strict;';

    // Height spacer (sets total scrollable height)
    this.heightSpacer = this.el('div', `${p}-height-spacer`);
    this.heightSpacer.style.cssText = 'position:absolute;top:0;left:0;width:1px;pointer-events:none;';

    // Body container (holds rendered rows)
    this.bodyContainer = this.el('div', `${p}-body`);
    this.bodyContainer.setAttribute('role', 'rowgroup');
    this.bodyContainer.style.cssText = 'position:relative;will-change:transform;';

    this.bodyViewport.appendChild(this.heightSpacer);
    this.bodyViewport.appendChild(this.bodyContainer);

    // Assemble wrapper (extensions inject their DOM in mount phase)
    const wrapper = this.el('div', `${p}-wrapper`);
    wrapper.style.cssText = 'display:flex;flex-direction:column;height:100%;';
    wrapper.appendChild(this.headerContainer);
    wrapper.appendChild(this.bodyViewport);

    this.root.appendChild(wrapper);
    this.root.appendChild(this.liveRegion!);
    this.container.appendChild(this.root);
  }

  private announce(message: string): void {
    if (this.liveRegion) {
      this.liveRegion.textContent = message;
    }
  }

  // ── Header Rendering ──

  private renderHeader(): void {
    if (!this.headerContainer) return;
    this.headerContainer.textContent = '';

    const state = this.engine.store.getState();
    const headerHeight = this.engine.api.getGridOption('headerHeight') ?? 48;
    const scrollLeft = this.bodyViewport?.scrollLeft ?? 0;

    const { columns: renderCols, colResult } = this.getVisibleColumnsForRender(scrollLeft);
    this.lastColumnResult = colResult;

    // All visible columns for aria-colcount
    const allVisibleCols = state.columns.filter((c) => !c.hide);

    const headerRow = this.el('div', `${this.prefix}-header-row`);
    headerRow.setAttribute('role', 'row');

    // Checkbox selection header cell
    if (this.checkboxSelection) {
      headerRow.appendChild(this.createCheckboxHeaderCell());
    }

    if (this.columnVirtualizer.isVirtualized()) {
      // Use the total width of all columns so the header row is scrollable
      const totalWidth = this.columnVirtualizer.getTotalWidth();
      headerRow.style.cssText = `display:flex;height:${headerHeight}px;align-items:center;width:${totalWidth}px;position:relative;`;

      // Render pinned-left columns at fixed left positions
      let pinnedLeftOffset = 0;
      for (const col of renderCols.filter((c) => c.pinned === 'left')) {
        const cell = this.createHeaderCell(col, state);
        cell.style.position = 'sticky';
        cell.style.left = `${pinnedLeftOffset}px`;
        cell.style.zIndex = '1';
        pinnedLeftOffset += col.width;
        headerRow.appendChild(cell);
      }

      // Render visible unpinned columns with left offset spacer
      if (colResult.offsetLeft > 0) {
        const spacer = document.createElement('div');
        spacer.style.cssText = `width:${colResult.offsetLeft}px;min-width:${colResult.offsetLeft}px;flex-shrink:0;`;
        headerRow.appendChild(spacer);
      }

      for (const col of renderCols.filter((c) => !c.pinned)) {
        const cell = this.createHeaderCell(col, state);
        headerRow.appendChild(cell);
      }

      // Add a spacer for the remaining unpinned width
      const renderedUnpinnedWidth = renderCols
        .filter((c) => !c.pinned)
        .reduce((sum, c) => sum + c.width, 0);
      const remainingWidth = colResult.totalWidth - colResult.offsetLeft - renderedUnpinnedWidth;
      if (remainingWidth > 0) {
        const endSpacer = document.createElement('div');
        endSpacer.style.cssText = `width:${remainingWidth}px;min-width:${remainingWidth}px;flex-shrink:0;`;
        headerRow.appendChild(endSpacer);
      }

      // Render pinned-right columns at fixed right positions
      let pinnedRightOffset = 0;
      const pinnedRightCols = renderCols.filter((c) => c.pinned === 'right');
      for (let i = pinnedRightCols.length - 1; i >= 0; i--) {
        const col = pinnedRightCols[i]!;
        const cell = this.createHeaderCell(col, state);
        cell.style.position = 'sticky';
        cell.style.right = `${pinnedRightOffset}px`;
        cell.style.zIndex = '1';
        pinnedRightOffset += col.width;
        headerRow.appendChild(cell);
      }
    } else {
      // No column virtualization — render all visible columns
      const hasPinned = renderCols.some((c) => c.pinned);
      if (hasPinned) {
        // Set explicit total width so horizontal scroll enables sticky positioning
        const totalWidth = renderCols.reduce((sum, c) => sum + c.width, 0);
        headerRow.style.cssText = `display:flex;height:${headerHeight}px;align-items:center;width:${totalWidth}px;position:relative;`;

        let pinnedLeftOffset = 0;
        for (const col of renderCols.filter((c) => c.pinned === 'left')) {
          const cell = this.createHeaderCell(col, state);
          cell.style.position = 'sticky';
          cell.style.left = `${pinnedLeftOffset}px`;
          cell.style.zIndex = '1';
          cell.style.background = 'var(--gs-color-header-bg, #f5f5f5)';
          pinnedLeftOffset += col.width;
          headerRow.appendChild(cell);
        }
        for (const col of renderCols.filter((c) => !c.pinned)) {
          headerRow.appendChild(this.createHeaderCell(col, state));
        }
        let pinnedRightOffset = 0;
        const pinnedRightCols = renderCols.filter((c) => c.pinned === 'right');
        for (let i = pinnedRightCols.length - 1; i >= 0; i--) {
          const col = pinnedRightCols[i]!;
          const cell = this.createHeaderCell(col, state);
          cell.style.position = 'sticky';
          cell.style.right = `${pinnedRightOffset}px`;
          cell.style.zIndex = '1';
          cell.style.background = 'var(--gs-color-header-bg, #f5f5f5)';
          pinnedRightOffset += col.width;
          headerRow.appendChild(cell);
        }
      } else {
        headerRow.style.cssText = `display:flex;height:${headerHeight}px;align-items:center;`;
        for (const col of renderCols) {
          headerRow.appendChild(this.createHeaderCell(col, state));
        }
      }
    }

    // ── Column Group Header Rows (multi-level headers) ──
    if (state.columnGroups.length > 0 && state.columnGroupDepth > 0) {
      this.renderColumnGroupHeaders(state, renderCols, headerHeight);
    }

    this.headerContainer.appendChild(headerRow);

    // Update total row count for aria
    this.root?.setAttribute('aria-rowcount', String(state.displayedRowIds.length));
    this.root?.setAttribute('aria-colcount', String(allVisibleCols.length));

    // Rebuild floating filter row to match columns (via extension)
    if (this.extFloatingFilter) {
      this.extFloatingFilter.rerender(this.buildContext());
    }

    // Notify plugins that header DOM was rebuilt so they can re-inject
    // handles (resize, reorder, context menu, etc.)
    this.engine.eventBus.emit('dom:headerRendered', {});
  }

  private createHeaderCell(col: ColumnState, state: GridState): HTMLElement {
    const cell = this.el('div', `${this.prefix}-header-cell`);
    cell.setAttribute('role', 'columnheader');
    cell.setAttribute('data-col-id', col.colId);
    cell.style.cssText = `
      width:${col.width}px;
      min-width:${col.width}px;
      max-width:${col.width}px;
      padding:var(--gs-spacing-header-horizontal,12px);
      box-sizing:border-box;
      display:flex;
      align-items:center;
      gap:4px;
      cursor:${col.sortable ? 'pointer' : 'default'};
      user-select:none;
      border-right:var(--gs-border-width,1px) solid var(--gs-color-border,#e0e0e0);
      font-weight:var(--gs-font-weight-header,600);
      font-size:var(--gs-font-size-header,13px);
    `;

    // Check for custom header renderer
    const customRenderer = col.originalDef.headerRenderer;
    if (customRenderer) {
      const sortItem = state.sortModel.find((s) => s.colId === col.colId);
      const result = customRenderer({
        colDef: col.originalDef,
        colId: col.colId,
        displayName: col.headerName,
        sortDirection: sortItem?.sort ?? null,
        sortIndex: col.sortIndex,
      });
      if (typeof result === 'string') {
        if (col.originalDef.dangerouslySetInnerHTML) {
          cell.innerHTML = result;
        } else {
          cell.textContent = result;
        }
      } else {
        cell.appendChild(result);
      }
    } else {
      // Default header: name + sort indicator
      const label = document.createElement('span');
      label.textContent = col.headerName;
      label.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
      cell.appendChild(label);

      const sortItem = state.sortModel.find((s) => s.colId === col.colId);
      if (sortItem) {
        const sortIcon = document.createElement('span');
        sortIcon.className = `${this.prefix}-sort-icon`;
        sortIcon.textContent = sortItem.sort === 'asc' ? '▲' : '▼';
        sortIcon.style.cssText = 'font-size:10px;opacity:0.7;';
        cell.appendChild(sortIcon);
        cell.setAttribute('aria-sort', sortItem.sort === 'asc' ? 'ascending' : 'descending');
      }
    }

    // Click handler for sorting
    if (col.sortable) {
      cell.addEventListener('click', (e) => {
        const multiSort = e.shiftKey;
        this.engine.commandBus.dispatch('sort:toggle', {
          colId: col.colId,
          multiSort,
        });
        // Re-render header to update sort indicators
        this.renderHeader();
      });
    }

    return cell;
  }

  // ── Column Group Header Rendering ──

  private renderColumnGroupHeaders(
    state: GridState,
    _visibleCols: ColumnState[],
    totalHeaderHeight: number,
  ): void {
    if (!this.headerContainer) return;
    const groups = state.columnGroups;
    const depth = state.columnGroupDepth;
    if (depth === 0 || groups.length === 0) return;

    const allVisibleCols = state.columns.filter((c) => !c.hide);
    const rowHeight = this.groupHeaderHeight ?? Math.round(totalHeaderHeight / (depth + 1));

    // Build a map of colId -> column for quick width lookups
    const colWidthMap = new Map<string, number>();
    for (const col of allVisibleCols) {
      colWidthMap.set(col.colId, col.width);
    }

    // For each level from 0 (top) to depth-1, render a group header row
    for (let level = 0; level < depth; level++) {
      const levelGroups = groups.filter((g) => g.level === level);
      if (levelGroups.length === 0) continue;

      const groupRow = this.el('div', `${this.prefix}-header-group-row`);
      groupRow.setAttribute('role', 'row');
      groupRow.style.cssText = `display:flex;height:${rowHeight}px;align-items:center;`;

      // Track which leaf columns are covered by groups at this level
      const coveredColIds = new Set<string>();
      for (const group of levelGroups) {
        for (const colId of group.leafColIds) {
          coveredColIds.add(colId);
        }
      }

      // Walk through all visible columns in order, emitting group cells or filler cells
      let i = 0;
      while (i < allVisibleCols.length) {
        const col = allVisibleCols[i]!;

        // Find if this column starts a group at this level
        const group = levelGroups.find((g) => g.leafColIds[0] === col.colId);
        if (group) {
          // Calculate total width of all visible leaf columns in this group
          let spanWidth = 0;
          let spanCount = 0;
          for (const leafId of group.leafColIds) {
            const w = colWidthMap.get(leafId);
            if (w !== undefined) {
              spanWidth += w;
              spanCount++;
            }
          }

          if (spanWidth > 0) {
            const groupCell = this.createGroupHeaderCell(group, spanWidth, rowHeight);
            groupRow.appendChild(groupCell);
          }

          // Advance past all columns in this group
          i += spanCount;
          continue;
        }

        // Check if this column is covered by a group (but not at the start)
        if (coveredColIds.has(col.colId)) {
          // Already covered by a group cell rendered earlier
          i++;
          continue;
        }

        // Uncovered column at this level — render an empty filler cell
        const filler = this.el('div', `${this.prefix}-header-group-filler`);
        filler.style.cssText = `
          width:${col.width}px;min-width:${col.width}px;max-width:${col.width}px;
          height:${rowHeight}px;box-sizing:border-box;
          border-right:var(--gs-border-width,1px) solid var(--gs-color-border,#e2e8f0);
        `;
        groupRow.appendChild(filler);
        i++;
      }

      this.headerContainer!.appendChild(groupRow);
    }

    // Adjust the leaf header row height to account for group rows
    const leafRow = this.headerContainer!.querySelector(`.${this.prefix}-header-row`);
    if (!leafRow && this.headerContainer!.children.length > 0) {
      // The leaf row hasn't been added yet - it will be added after this call
      // Adjust via the headerRow that's about to be appended (handled in renderHeader)
    }
  }

  private createGroupHeaderCell(
    group: ColumnGroupInfo,
    width: number,
    height: number,
  ): HTMLElement {
    const cell = this.el('div', `${this.prefix}-header-group-cell`);
    cell.setAttribute('role', 'columnheader');
    cell.setAttribute('data-group-id', group.groupId);
    cell.style.cssText = `
      width:${width}px;min-width:${width}px;max-width:${width}px;
      height:${height}px;
      padding:var(--gs-spacing-header-horizontal,12px);
      box-sizing:border-box;
      display:flex;align-items:center;justify-content:center;
      font-weight:var(--gs-font-weight-header,600);
      font-size:var(--gs-font-size-header,13px);
      border-right:var(--gs-border-width,1px) solid var(--gs-color-border,#e2e8f0);
      border-bottom:var(--gs-border-width,1px) solid var(--gs-color-border,#e2e8f0);
      background:var(--gs-color-group-header-bg,var(--gs-color-header-bg,#f8fafc));
      user-select:none;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
    `;

    const label = document.createElement('span');
    label.textContent = group.headerName;
    label.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    cell.appendChild(label);

    return cell;
  }

  // ── Virtual Scrolling Setup ──

  private setupVirtualScroller(): void {
    const state = this.engine.store.getState();
    const rowHeight = (this.engine.api.getGridOption('rowHeight') as number) ?? 40;

    this.scroller.configure({
      rowCount: state.displayedRowIds.length,
      rowHeight,
      viewportHeight: this.bodyViewport?.clientHeight ?? 600,
      overscan: 5,
    });

    // Set spacer height
    if (this.heightSpacer) {
      this.heightSpacer.style.height = `${this.scroller.getTotalHeight()}px`;
    }
  }

  // ── Column Virtualization ──

  private configureColumnVirtualizer(): void {
    const state = this.engine.store.getState();
    const visibleCols = state.columns.filter((c) => !c.hide);

    this.columnVirtualizer.configure({
      columns: visibleCols.map((c) => ({
        colId: c.colId,
        width: c.width,
        pinned: c.pinned,
      })),
      viewportWidth: this.bodyViewport?.clientWidth ?? 1200,
      overscan: 2,
    });
  }

  /**
   * Get the columns to render based on horizontal scroll position.
   * Uses the column virtualizer for grids with 20+ unpinned columns.
   */
  private getVisibleColumnsForRender(scrollLeft: number): {
    columns: ColumnState[];
    colResult: ColumnVirtualResult;
  } {
    const colResult = this.columnVirtualizer.calculate(scrollLeft);

    if (!this.columnVirtualizer.isVirtualized()) {
      // Not virtualized — return all visible columns
      const state = this.engine.store.getState();
      return {
        columns: state.columns.filter((c) => !c.hide),
        colResult,
      };
    }

    // Build a set of visible column IDs for fast lookup
    const visibleSet = new Set<string>([
      ...colResult.pinnedLeftColumns,
      ...colResult.pinnedRightColumns,
      ...colResult.visibleColumns,
    ]);

    const state = this.engine.store.getState();
    const columns = state.columns.filter(
      (c) => !c.hide && visibleSet.has(c.colId),
    );

    return { columns, colResult };
  }

  // ── Scroll Management ──

  private setupScrollManager(): void {
    if (!this.bodyViewport) return;

    this.scrollManager.configure({
      viewport: this.bodyViewport,
      onScroll: (scrollTop, scrollLeft) => {
        // Sync header horizontal scroll
        if (this.headerContainer) {
          this.headerContainer.scrollLeft = scrollLeft;
        }
        // Sync floating filter horizontal scroll (via extension)
        if (this.extFloatingFilter) {
          this.extFloatingFilter.syncScroll(scrollLeft);
        }

        // Update store scroll state
        this.engine.store.setState((prev) => ({
          ...prev,
          scroll: { top: scrollTop, left: scrollLeft },
        }));

        // Check if visible columns changed due to horizontal scroll
        if (this.columnVirtualizer.isVirtualized()) {
          const newColResult = this.columnVirtualizer.calculate(scrollLeft);
          const colsChanged = this.hasColumnResultChanged(newColResult);
          if (colsChanged) {
            this.lastColumnResult = newColResult;
            // Force full re-render since column set changed
            this.lastStartIndex = -1;
            this.lastEndIndex = -1;
            this.renderHeader();
          }
        }

        // Re-render visible rows
        this.renderVisibleRows();
      },
      horizontalSyncTargets: this.headerContainer ? [this.headerContainer] : [],
    });
  }

  // ── Column Result Comparison ──

  private hasColumnResultChanged(newResult: ColumnVirtualResult): boolean {
    if (!this.lastColumnResult) return true;
    const prev = this.lastColumnResult;
    if (prev.visibleColumns.length !== newResult.visibleColumns.length) return true;
    for (let i = 0; i < newResult.visibleColumns.length; i++) {
      if (prev.visibleColumns[i] !== newResult.visibleColumns[i]) return true;
    }
    return false;
  }

  // ── Resize Observer ──

  private setupResizeObserver(): void {
    this.resizeObserver = safeResizeObserver((entries) => {
      if (!this.engine || !this.bodyViewport) return;
      for (const entry of entries) {
        if (entry.target === this.bodyViewport) {
          const height = entry.contentRect.height;
          this.scroller.updateViewportHeight(height);
          // Reconfigure column virtualizer with new viewport width
          this.configureColumnVirtualizer();
          this.renderHeader();
          this.renderVisibleRows();
        }
      }
    });

    if (this.resizeObserver && this.bodyViewport) {
      this.resizeObserver.observe(this.bodyViewport);
    }
  }

  // ── Custom Double-Click Detection ──
  // Native dblclick delegation on bodyContainer does NOT work because:
  //   click #1 → SelectionPlugin → node.version++ → updateRowContent()
  //   → destroys cell A, creates cell B
  //   click #2 → fires on cell B → SelectionPlugin → node.version++ →
  //   updateRowContent() → destroys cell B, creates cell C
  //   dblclick → fires on cell B (DETACHED from DOM) → never bubbles
  //
  // Instead, we detect double-clicks manually in the per-cell click handler
  // using _lastCellClick state. Since the click handler always fires
  // (on the current live cell), and we track by rowId/colId (which persist
  // across cell rebuilds), two clicks within 400ms on the same cell
  // emit cell:doubleClicked.

  // ── Keyboard Navigation ──

  private setupKeyboardManager(): void {
    if (!this.root) return;
    this.keyboardManager.configure({
      root: this.root,
      engine: this.engine,
      getVisibleColumns: () =>
        this.engine.store.getState().columns.filter((c) => !c.hide),
    });
  }

  // ── Container Attribute Observer ──
  // Propagates data-theme from the container (or its parent) to .gs-root
  // so CSS theme selectors like .gs-root[data-theme="dark"] work.

  private observeContainerAttributes(): void {
    if (!this.root) return;

    // Sync initial theme from container or parent
    this.syncThemeAttribute();

    // Watch for attribute changes on the container and its parent
    this.mutationObserver = new MutationObserver(() => {
      this.syncThemeAttribute();
    });

    this.mutationObserver.observe(this.container, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    if (this.container.parentElement) {
      this.mutationObserver.observe(this.container.parentElement, {
        attributes: true,
        attributeFilter: ['data-theme'],
      });
    }
  }

  private syncThemeAttribute(): void {
    if (!this.root) return;
    const theme =
      this.container.getAttribute('data-theme') ??
      this.container.parentElement?.getAttribute('data-theme');
    if (theme) {
      this.root.setAttribute('data-theme', theme);
    } else {
      this.root.removeAttribute('data-theme');
    }
  }

  // ── State Subscription ──

  private subscribeToState(): void {
    const unsub = this.engine.store.subscribe(() => {
      this.onStateChanged();
    });
    this.unsubscribers.push(unsub);

    // Listen for specific events
    const unsubSort = this.engine.eventBus.on('column:sort:changed', (e) => {
      this.renderHeader();
      const model = (e as any).sortModel;
      if (model && model.length > 0) {
        const col = this.engine.api.getColumn(model[0].colId);
        const name = col?.headerName ?? model[0].colId;
        this.announce(`Sorted by ${name} ${model[0].sort === 'asc' ? 'ascending' : 'descending'}`);
      }
    });
    this.unsubscribers.push(unsubSort);

    // Column structure changes (add/remove/reorder/pin/visibility) require
    // rebuilding all row cells because the column set changed but row
    // versions did not. Force-invalidate cached row versions.
    const forceRowRebuild = () => {
      for (const [, entry] of this.renderedRows) {
        entry.version = -1;
      }
      this.lastStartIndex = -1;
      this.lastEndIndex = -1;
    };

    const unsubCols = this.engine.eventBus.on('columns:changed', () => {
      forceRowRebuild();
      this.configureColumnVirtualizer();
      this.renderHeader();
      this.renderVisibleRows();
    });
    this.unsubscribers.push(unsubCols);

    const unsubColVisible = this.engine.eventBus.on('column:visible', () => {
      forceRowRebuild();
      this.configureColumnVirtualizer();
      this.renderHeader();
      this.renderVisibleRows();
    });
    this.unsubscribers.push(unsubColVisible);

    const unsubColPinned = this.engine.eventBus.on('column:pinned', () => {
      forceRowRebuild();
      this.configureColumnVirtualizer();
      this.renderHeader();
      this.renderVisibleRows();
    });
    this.unsubscribers.push(unsubColPinned);

    const unsubColMoved = this.engine.eventBus.on('column:moved', () => {
      forceRowRebuild();
      this.configureColumnVirtualizer();
      this.renderHeader();
      this.renderVisibleRows();
    });
    this.unsubscribers.push(unsubColMoved);

    // Lightweight column width update on resize — updates CSS in-place
    // without destroying/recreating DOM elements (critical for drag perf)
    const unsubResized = this.engine.eventBus.on('column:resized', () => {
      this.updateColumnWidths();
    });
    this.unsubscribers.push(unsubResized);

    const unsubRowData = this.engine.eventBus.on('rowData:changed', () => {
      // Clear rendered row cache since row IDs may be reused with different data
      for (const [, entry] of this.renderedRows) {
        entry.element.remove();
        this.recycleRow(entry.element);
      }
      this.renderedRows.clear();
      this.lastStartIndex = -1;
      this.lastEndIndex = -1;
      this.renderHeader();
      this.renderVisibleRows();
      // Pagination update handled by extensions via onStateChanged()
    });
    this.unsubscribers.push(unsubRowData);

    // ── Tier 1 Feature Event Listeners ──

    // Checkbox selection: update header checkbox on selection change
    if (this.checkboxSelection) {
      const unsubSel = this.engine.eventBus.on('selection:changed', () => {
        this.updateHeaderCheckboxState();
      });
      this.unsubscribers.push(unsubSel);
    }

    // Inline cell editing: show/hide editor overlay
    if (this.enableCellEditing) {
      const unsubEditStart = this.engine.eventBus.on('cell:editingStarted', () => {
        this.onEditingStateChanged();
      });
      this.unsubscribers.push(unsubEditStart);

      const unsubEditStop = this.engine.eventBus.on('cell:editingStopped', () => {
        this.onEditingStateChanged();
      });
      this.unsubscribers.push(unsubEditStop);
    }

    // Note: floating filter sync and pagination updates are handled by
    // extensions via onStateChanged() → ext.update(ctx), so no separate
    // event listeners are needed for filter:changed and pagination:changed.

    // Row grouping: announce expand/collapse for a11y
    if (this.enableGrouping) {
      const unsubGroup = this.engine.eventBus.on('row:groupOpened', (e: any) => {
        const node = e?.node;
        const expanded = e?.expanded;
        if (node) {
          this.announce(
            `Group ${node.groupValue ?? ''} ${expanded ? 'expanded' : 'collapsed'}`,
          );
        }
      });
      this.unsubscribers.push(unsubGroup);
    }
  }

  /**
   * Lightweight column width update — patches CSS widths on existing header
   * and body cells in-place without destroying/recreating DOM.  Used during
   * column resize drag for smooth 60 fps feedback.
   */
  private updateColumnWidths(): void {
    const state = this.engine.store.getState();

    // ── Header cells ──
    if (this.headerContainer) {
      const headerRow = this.headerContainer.querySelector(
        `.${this.prefix}-header-row`,
      ) as HTMLElement | null;
      if (headerRow) {
        const visibleCols = state.columns.filter((c) => !c.hide);
        const hasPinned = visibleCols.some((c) => c.pinned);
        if (hasPinned || this.columnVirtualizer.isVirtualized()) {
          const totalWidth = visibleCols.reduce((sum, c) => sum + c.width, 0);
          headerRow.style.width = `${totalWidth}px`;
        }
      }

      const headers = this.headerContainer.querySelectorAll(
        `.${this.prefix}-header-cell`,
      );
      for (const header of headers) {
        const el = header as HTMLElement;
        const colId = el.getAttribute('data-col-id');
        if (!colId) continue;
        const col = state.columns.find((c) => c.colId === colId);
        if (!col) continue;
        el.style.width = `${col.width}px`;
        el.style.minWidth = `${col.width}px`;
        el.style.maxWidth = `${col.width}px`;
      }
    }

    // ── Floating filter cell widths (via extension) ──
    if (this.extFloatingFilter) {
      this.extFloatingFilter.updateWidths(this.buildContext());
    }

    // ── Body row widths + cell widths ──
    for (const [, entry] of this.renderedRows) {
      const rowEl = entry.element;
      const visibleCols = state.columns.filter((c) => !c.hide);
      const hasPinned = visibleCols.some((c) => c.pinned);
      if (hasPinned) {
        const totalWidth = visibleCols.reduce((sum, c) => sum + c.width, 0);
        rowEl.style.width = `${totalWidth}px`;
      }

      const cells = rowEl.querySelectorAll(`.${this.prefix}-cell`);
      for (const cell of cells) {
        const cellEl = cell as HTMLElement;
        const colId = cellEl.getAttribute('data-col-id');
        if (!colId) continue;
        const col = state.columns.find((c) => c.colId === colId);
        if (!col) continue;
        cellEl.style.width = `${col.width}px`;
        cellEl.style.minWidth = `${col.width}px`;
        cellEl.style.maxWidth = `${col.width}px`;
      }
    }
  }

  private onStateChanged(): void {
    const state = this.engine.store.getState();

    // Update virtual scroller if row count changed
    const newRowCount = state.displayedRowIds.length;
    if (newRowCount !== this.lastRenderedRowCount) {
      this.scroller.updateRowCount(newRowCount);
      this.lastRenderedRowCount = newRowCount;
      if (this.heightSpacer) {
        this.heightSpacer.style.height = `${this.scroller.getTotalHeight()}px`;
      }
    }

    // Invalidate cached indices to force re-render when state changes
    // (sort, filter, selection, data updates). The early-return optimization
    // in renderVisibleRows() still works for pure scroll events.
    this.lastStartIndex = -1;
    this.lastEndIndex = -1;

    // Batch render via microtask to coalesce rapid state changes.
    // If a render is already scheduled, skip. Otherwise schedule one
    // that will pick up the latest state.
    if (this.renderPending) return;

    this.renderPending = true;
    queueMicrotask(() => {
      if (!this.engine) return;
      this.renderPending = false;
      this.renderVisibleRows();

      // Update extensions
      if (this.root) {
        const ctx = this.buildContext();
        for (const ext of this.extensions) {
          ext.update(ctx);
        }
      }
    });
  }

  // ── Row Rendering ──

  private renderVisibleRows(): void {
    if (!this.bodyContainer || !this.bodyViewport) return;

    const scrollTop = this.bodyViewport.scrollTop;
    const scrollLeft = this.bodyViewport.scrollLeft;
    const result = this.scroller.calculate(scrollTop);

    // Skip if range hasn't changed
    if (result.startIndex === this.lastStartIndex && result.endIndex === this.lastEndIndex) {
      return;
    }
    this.lastStartIndex = result.startIndex;
    this.lastEndIndex = result.endIndex;

    const state = this.engine.store.getState();
    const { columns: visibleCols, colResult } = this.getVisibleColumnsForRender(scrollLeft);
    this.lastColumnResult = colResult;
    // Determine which row IDs should be rendered
    const newRowIds = new Set<string>();
    for (let i = result.startIndex; i < result.endIndex; i++) {
      const rowId = state.displayedRowIds[i];
      if (rowId) newRowIds.add(rowId);
    }

    // Remove rows no longer in viewport
    for (const [rowId, entry] of this.renderedRows) {
      if (!newRowIds.has(rowId)) {
        this.bodyContainer.removeChild(entry.element);
        this.recycleRow(entry.element);
        this.renderedRows.delete(rowId);
      }
    }

    // Add/update rows in viewport
    for (let i = result.startIndex; i < result.endIndex; i++) {
      const rowId = state.displayedRowIds[i];
      if (!rowId) continue;

      const node = state.rowNodes.get(rowId);
      if (!node) continue;

      const existing = this.renderedRows.get(rowId);

      if (existing) {
        // Update position if needed
        const expectedTop = node.rowTop;
        if (existing.element.style.top !== `${expectedTop}px`) {
          existing.element.style.top = `${expectedTop}px`;
        }
        // Update selection visual
        const isSelected = state.selection.selectedRowIds.has(rowId);
        existing.element.classList.toggle(`${this.prefix}-row-selected`, isSelected);
        if (isSelected) {
          existing.element.setAttribute('aria-selected', 'true');
        } else {
          existing.element.removeAttribute('aria-selected');
        }
        // Sync checkbox state
        if (this.checkboxSelection) {
          const cb = existing.element.querySelector(`.${this.prefix}-checkbox-cell input`) as HTMLInputElement | null;
          if (cb) cb.checked = isSelected;
        }
        // Update content if version changed, or always for group rows
        // (group nodes are re-created each cycle with version 0, but
        //  their expanded state may have changed)
        // IMPORTANT: Skip content rebuild for the row with an active editor
        // overlay — updateRowContent() clears all cell children, which would
        // destroy the editor input element. The editor lifecycle manages its
        // own cell content (clear on start, restore on stop).
        // Also protect during the editing:start → cell:editingStarted gap
        // where activeEditor is null but state.editing already has the rowId.
        const isEditingThisRow =
          (this.activeEditor && this.activeEditor.rowId === rowId) ||
          (state.editing && state.editing.rowId === rowId);
        if (!isEditingThisRow && (existing.version !== node.version || node.group)) {
          this.updateRowContent(existing.element, node, visibleCols, i);
          existing.version = node.version;
        }
      } else {
        // Create new row
        const rowEl = this.acquireRow();
        const top = node.rowTop;
        this.setupRow(rowEl, node, visibleCols, i, top, node.rowHeight);
        this.bodyContainer.appendChild(rowEl);
        this.renderedRows.set(rowId, {
          element: rowEl,
          rowId,
          version: node.version,
        });
      }
    }

    // Cancel editing if the edited row scrolled out of viewport
    if (this.activeEditor) {
      const editingState = state.editing;
      if (editingState && !newRowIds.has(editingState.rowId)) {
        this.engine.commandBus.dispatch('editing:stop', { cancel: true });
      }
    }
  }

  private setupRow(
    rowEl: HTMLElement,
    node: RowNode,
    columns: ColumnState[],
    displayIndex: number,
    top: number,
    height: number,
  ): void {
    rowEl.setAttribute('role', 'row');
    rowEl.setAttribute('data-row-id', node.id);
    rowEl.setAttribute('aria-rowindex', String(displayIndex + 2)); // +2 for 1-based + header
    rowEl.className = `${this.prefix}-row`;

    if (node.selected) {
      rowEl.classList.add(`${this.prefix}-row-selected`);
      rowEl.setAttribute('aria-selected', 'true');
    }

    // When there are pinned columns, set the row width to the total column
    // width so pinned columns can use position:sticky
    const hasPinned = columns.some((c) => c.pinned);
    const totalWidth = hasPinned
      ? columns.reduce((sum, c) => sum + c.width, 0)
      : 0;

    rowEl.style.cssText = totalWidth > 0
      ? `position:absolute;top:${top}px;left:0;width:${totalWidth}px;height:${height}px;display:flex;align-items:center;border-bottom:var(--gs-border-width,1px) solid var(--gs-color-border,#e0e0e0);`
      : `position:absolute;top:${top}px;left:0;right:0;height:${height}px;display:flex;align-items:center;border-bottom:var(--gs-border-width,1px) solid var(--gs-color-border,#e0e0e0);`;

    this.updateRowContent(rowEl, node, columns, displayIndex);
  }

  private updateRowContent(
    rowEl: HTMLElement,
    node: RowNode,
    columns: ColumnState[],
    displayIndex: number,
  ): void {
    rowEl.textContent = '';

    // Group row rendering
    if (this.enableGrouping && node.group) {
      this.renderGroupRowContent(rowEl, node, columns, displayIndex);
      return;
    }

    // Prepend checkbox cell for non-group rows
    if (this.checkboxSelection) {
      rowEl.appendChild(this.createCheckboxCell(node, displayIndex));
    }

    const hasPinned = columns.some((c) => c.pinned);

    if (hasPinned) {
      // Apply sticky positioning for pinned columns
      let pinnedLeftOffset = 0;
      for (const col of columns.filter((c) => c.pinned === 'left')) {
        const cell = this.createCell(node, col, displayIndex, columns.indexOf(col));
        cell.style.position = 'sticky';
        cell.style.left = `${pinnedLeftOffset}px`;
        cell.style.zIndex = '1';
        cell.style.background = 'var(--gs-color-row-bg, #fff)';
        pinnedLeftOffset += col.width;
        rowEl.appendChild(cell);
      }

      if (this.columnVirtualizer.isVirtualized()) {
        // Add spacer for virtualized unpinned offset
        const colResult = this.lastColumnResult;
        if (colResult && colResult.offsetLeft > 0) {
          const spacer = document.createElement('div');
          spacer.style.cssText = `width:${colResult.offsetLeft}px;min-width:${colResult.offsetLeft}px;flex-shrink:0;`;
          rowEl.appendChild(spacer);
        }
      }

      // Unpinned cells
      for (const col of columns.filter((c) => !c.pinned)) {
        const cell = this.createCell(node, col, displayIndex, columns.indexOf(col));
        rowEl.appendChild(cell);
      }

      if (this.columnVirtualizer.isVirtualized()) {
        // End spacer for remaining unpinned width
        const colResult = this.lastColumnResult;
        if (colResult) {
          const renderedUnpinnedWidth = columns
            .filter((c) => !c.pinned)
            .reduce((sum, c) => sum + c.width, 0);
          const remainingWidth = colResult.totalWidth - colResult.offsetLeft - renderedUnpinnedWidth;
          if (remainingWidth > 0) {
            const endSpacer = document.createElement('div');
            endSpacer.style.cssText = `width:${remainingWidth}px;min-width:${remainingWidth}px;flex-shrink:0;`;
            rowEl.appendChild(endSpacer);
          }
        }
      }

      // Pinned-right cells
      let pinnedRightOffset = 0;
      const pinnedRightCols = columns.filter((c) => c.pinned === 'right');
      for (let i = pinnedRightCols.length - 1; i >= 0; i--) {
        const col = pinnedRightCols[i]!;
        const cell = this.createCell(node, col, displayIndex, columns.indexOf(col));
        cell.style.position = 'sticky';
        cell.style.right = `${pinnedRightOffset}px`;
        cell.style.zIndex = '1';
        cell.style.background = 'var(--gs-color-row-bg, #fff)';
        pinnedRightOffset += col.width;
        rowEl.appendChild(cell);
      }
    } else {
      // No pinned columns — render all cells normally
      for (let colIdx = 0; colIdx < columns.length; colIdx++) {
        const col = columns[colIdx]!;
        const cell = this.createCell(node, col, displayIndex, colIdx);
        rowEl.appendChild(cell);
      }
    }
  }

  private createCell(
    node: RowNode,
    col: ColumnState,
    rowIndex: number,
    colIndex: number,
  ): HTMLElement {
    const cell = document.createElement('div');
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('aria-colindex', String(colIndex + 1));
    cell.setAttribute('data-col-id', col.colId);
    cell.id = `gs-cell-${node.id}-${col.colId}`;
    cell.className = `${this.prefix}-cell`;
    cell.style.cssText = `
      width:${col.width}px;
      min-width:${col.width}px;
      max-width:${col.width}px;
      padding:var(--gs-spacing-cell-horizontal,12px);
      box-sizing:border-box;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
      border-right:var(--gs-border-width,1px) solid var(--gs-color-border,#e0e0e0);
    `;

    // Get value
    let value: any;
    const valueGetter = col.originalDef.valueGetter;
    if (valueGetter) {
      try {
        value = valueGetter({
          data: node.data,
          node,
          colDef: col.originalDef,
          colId: col.colId,
        });
      } catch (err) {
        console.error(`[GridStorm] valueGetter error for column "${col.colId}":`, err);
        value = undefined;
      }
    } else {
      value = getValueFromData(node.data, col.field);
    }

    // Format value
    const formatter = col.originalDef.valueFormatter;
    let displayValue: string;
    if (formatter) {
      try {
        displayValue = formatter({
          value,
          data: node.data,
          node,
          colDef: col.originalDef,
        });
      } catch (err) {
        console.error(`[GridStorm] valueFormatter error for column "${col.colId}":`, err);
        displayValue = value != null ? String(value) : '';
      }
    } else {
      displayValue = value != null ? String(value) : '';
    }

    // Apply cell renderer
    const cellRenderer = col.originalDef.cellRenderer;
    if (cellRenderer) {
      try {
        const result = cellRenderer({
          data: node.data,
          value,
          node,
          colDef: col.originalDef,
          colId: col.colId,
          rowIndex,
        });
        if (typeof result === 'string') {
          if (col.originalDef.dangerouslySetInnerHTML) {
            cell.innerHTML = result;
          } else {
            cell.textContent = result;
          }
        } else {
          cell.appendChild(result);
        }
      } catch (err) {
        console.error(`[GridStorm] cellRenderer error for column "${col.colId}":`, err);
        cell.textContent = displayValue;
      }
    } else {
      cell.textContent = displayValue;
    }

    // Apply cell classes
    const cellClass = col.originalDef.cellClass;
    if (cellClass) {
      try {
        if (typeof cellClass === 'function') {
          const classes = cellClass({
            data: node.data,
            value,
            node,
            colDef: col.originalDef,
            colId: col.colId,
            rowIndex,
          });
          const classList = Array.isArray(classes) ? classes : [classes];
          cell.classList.add(...classList);
        } else if (Array.isArray(cellClass)) {
          cell.classList.add(...cellClass);
        } else {
          cell.classList.add(cellClass);
        }
      } catch (err) {
        console.error(`[GridStorm] cellClass error for column "${col.colId}":`, err);
      }
    }

    // Apply cell styles
    const cellStyle = col.originalDef.cellStyle;
    if (cellStyle) {
      try {
        const styles =
          typeof cellStyle === 'function'
            ? cellStyle({
                data: node.data,
                value,
                node,
                colDef: col.originalDef,
                colId: col.colId,
                rowIndex,
              })
            : cellStyle;
        Object.assign(cell.style, styles);
      } catch (err) {
        console.error(`[GridStorm] cellStyle error for column "${col.colId}":`, err);
      }
    }

    // Cell click events — includes custom double-click detection.
    // Native dblclick events are unreliable because SelectionPlugin bumps
    // node.version on click, causing updateRowContent() to destroy/recreate
    // cells synchronously. The browser dblclick fires on detached elements.
    // Instead, we track the last click's time/rowId/colId and detect a
    // double-click when two clicks hit the same cell within 400ms.
    cell.addEventListener('click', (e) => {
      e.stopPropagation();

      const now = Date.now();
      const clickRowId = node.id;
      const clickColId = col.colId;

      // Check for double-click BEFORE emitting cell:clicked / row:clicked.
      // This way the double-click event fires before SelectionPlugin's
      // row:clicked handler bumps node.version and triggers a re-render.
      const last = this._lastCellClick;
      if (
        last &&
        last.rowId === clickRowId &&
        last.colId === clickColId &&
        now - last.time < 400
      ) {
        // Double-click detected — clear tracking and emit event
        this._lastCellClick = null;

        // Re-read value in case the first click changed selection/state
        const currentState = this.engine.store.getState();
        const currentNode = currentState.rowNodes.get(clickRowId);
        const currentCol = currentState.columns.find((c) => c.colId === clickColId);
        const currentValue = currentCol?.field && currentNode
          ? getValueFromData(currentNode.data, currentCol.field)
          : value;

        this.engine.eventBus.emit('cell:doubleClicked', {
          node: currentNode ?? node,
          colId: clickColId,
          value: currentValue,
          event: e,
        });
        return; // Skip single-click processing for double-click
      }

      // Track this click for potential double-click
      this._lastCellClick = { time: now, rowId: clickRowId, colId: clickColId };

      this.engine.eventBus.emit('cell:clicked', {
        node,
        colId: col.colId,
        value,
        event: e,
      });
      // Also emit row:clicked (bubble up)
      this.engine.eventBus.emit('row:clicked', { node, event: e });
      // Set focus
      this.engine.commandBus.dispatch('focus:set', {
        position: { rowIndex, colId: col.colId },
      });
    });

    return cell;
  }

  // ── Row Pooling ──

  private acquireRow(): HTMLElement {
    if (this.rowPool.length > 0) {
      return this.rowPool.pop()!;
    }
    return document.createElement('div');
  }

  private recycleRow(el: HTMLElement): void {
    el.textContent = '';
    el.className = '';
    el.removeAttribute('style');
    el.removeAttribute('data-row-id');
    el.removeAttribute('aria-rowindex');
    el.removeAttribute('aria-selected');
    // Cap the pool to prevent unbounded memory growth
    if (this.rowPool.length < 100) {
      this.rowPool.push(el);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ── Feature 1: Row Grouping Visual ──
  // ═══════════════════════════════════════════════════════════

  private renderGroupRowContent(
    rowEl: HTMLElement,
    node: RowNode,
    columns: ColumnState[],
    _displayIndex: number,
  ): void {
    rowEl.textContent = '';
    rowEl.classList.add(`${this.prefix}-group-row`);
    rowEl.setAttribute('aria-expanded', String(node.expanded));
    rowEl.setAttribute('aria-level', String(node.level + 1));

    const totalWidth = columns.reduce((sum, c) => sum + c.width, 0);
    const indent = node.level * this.groupIndent;
    const cbWidth = this.checkboxSelection ? this.checkboxColumnWidth : 0;

    const groupCell = document.createElement('div');
    groupCell.setAttribute('role', 'gridcell');
    groupCell.setAttribute('aria-colspan', String(columns.length + (this.checkboxSelection ? 1 : 0)));
    groupCell.className = `${this.prefix}-cell ${this.prefix}-group-cell`;
    groupCell.style.cssText =
      `width:${totalWidth + cbWidth}px;padding-left:${indent + 12}px;` +
      'display:flex;align-items:center;gap:8px;' +
      'font-weight:var(--gs-font-weight-bold,700);cursor:pointer;' +
      'background:var(--gs-color-group-bg,#f1f5f9);height:100%;';

    // Chevron icon with CSS transition
    const chevron = document.createElement('span');
    chevron.className = `${this.prefix}-group-chevron`;
    chevron.textContent = node.expanded ? '\u25BC' : '\u25B6';
    chevron.setAttribute('aria-hidden', 'true');
    chevron.style.cssText =
      'font-size:10px;flex-shrink:0;transition:transform var(--gs-transition-duration,150ms) var(--gs-transition-easing);' +
      'color:var(--gs-color-group-chevron,#64748b);';

    // Group label
    const label = document.createElement('span');
    label.className = `${this.prefix}-group-label`;
    const fieldName = node.groupField ?? '';
    const colDef = this.engine.store.getState().columns.find((c) => c.field === fieldName);
    const displayField = colDef?.headerName ?? fieldName;
    label.textContent = `${displayField}: ${node.groupValue ?? ''} (${node.leafChildrenCount})`;

    // Count badge
    const badge = document.createElement('span');
    badge.className = `${this.prefix}-group-count`;
    badge.textContent = String(node.leafChildrenCount);
    badge.style.cssText =
      'font-size:var(--gs-font-size-small,11px);color:var(--gs-color-muted,#94a3b8);' +
      'font-weight:var(--gs-font-weight-normal,400);margin-left:4px;';

    groupCell.appendChild(chevron);
    groupCell.appendChild(label);

    // Click to expand/collapse via pointer events (touch + mouse)
    // Read current expanded state from the store at click time to avoid stale closures.
    const nodeId = node.id;
    groupCell.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const currentNode = this.engine.store.getState().rowNodes.get(nodeId);
      const cmd = currentNode?.expanded ? 'group:collapse' : 'group:expand';
      this.engine.commandBus.dispatch(cmd, { rowId: nodeId });
    });

    rowEl.appendChild(groupCell);
  }

  // ═══════════════════════════════════════════════════════════
  // ── Feature 2: Checkbox Selection Column ──
  // ═══════════════════════════════════════════════════════════

  private createCheckboxHeaderCell(): HTMLElement {
    const cell = this.el('div', `${this.prefix}-header-cell ${this.prefix}-checkbox-header`);
    cell.setAttribute('role', 'columnheader');
    cell.setAttribute('data-col-id', '__checkbox');
    cell.style.cssText =
      `width:${this.checkboxColumnWidth}px;min-width:${this.checkboxColumnWidth}px;` +
      `max-width:${this.checkboxColumnWidth}px;` +
      'display:flex;align-items:center;justify-content:center;' +
      'border-right:var(--gs-border-width,1px) solid var(--gs-color-border,#e0e0e0);';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = `${this.prefix}-checkbox`;
    checkbox.setAttribute('aria-label', 'Select all rows');
    checkbox.style.cssText =
      'width:var(--gs-size-checkbox,16px);height:var(--gs-size-checkbox,16px);cursor:pointer;' +
      'accent-color:var(--gs-color-accent,#3b82f6);';

    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        this.engine.commandBus.dispatch('selection:selectAll', {});
      } else {
        this.engine.commandBus.dispatch('selection:deselectAll', {});
      }
    });

    this.headerCheckbox = checkbox;
    cell.appendChild(checkbox);

    // Initial state sync
    this.updateHeaderCheckboxState();

    return cell;
  }

  private createCheckboxCell(node: RowNode, displayIndex: number): HTMLElement {
    const cell = document.createElement('div');
    cell.setAttribute('role', 'gridcell');
    cell.setAttribute('data-col-id', '__checkbox');
    cell.className = `${this.prefix}-cell ${this.prefix}-checkbox-cell`;
    cell.style.cssText =
      `width:${this.checkboxColumnWidth}px;min-width:${this.checkboxColumnWidth}px;` +
      `max-width:${this.checkboxColumnWidth}px;` +
      'display:flex;align-items:center;justify-content:center;' +
      'border-right:var(--gs-border-width,1px) solid var(--gs-color-border,#e0e0e0);';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = node.selected;
    checkbox.className = `${this.prefix}-checkbox`;
    checkbox.setAttribute('aria-label', `Select row ${displayIndex + 1}`);
    checkbox.style.cssText =
      'width:var(--gs-size-checkbox,16px);height:var(--gs-size-checkbox,16px);cursor:pointer;' +
      'accent-color:var(--gs-color-accent,#3b82f6);';

    // Stop propagation to prevent row click selection conflict
    checkbox.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    checkbox.addEventListener('change', () => {
      this.engine.commandBus.dispatch('selection:select', {
        rowId: node.id,
        multiSelect: true,
        source: 'checkbox',
      });
    });

    cell.appendChild(checkbox);
    return cell;
  }

  private updateHeaderCheckboxState(): void {
    if (!this.headerCheckbox) return;
    const state = this.engine.store.getState();
    const totalDisplayed = state.displayedRowIds.length;
    const selectedCount = state.selection.selectedRowIds.size;

    this.headerCheckbox.checked = selectedCount > 0 && selectedCount >= totalDisplayed;
    this.headerCheckbox.indeterminate = selectedCount > 0 && selectedCount < totalDisplayed;
  }

  // ═══════════════════════════════════════════════════════════
  // ── Feature 3: Inline Cell Editing ──
  // ═══════════════════════════════════════════════════════════

  private onEditingStateChanged(): void {
    const state = this.engine.store.getState();

    if (state.editing && !this.activeEditor) {
      this.startEditorOverlay();
    } else if (!state.editing && this.activeEditor) {
      this.removeEditorOverlay();
    }
  }

  private startEditorOverlay(): void {
    const state = this.engine.store.getState();
    if (!state.editing) return;

    const { rowId, colId, value } = state.editing;
    const node = state.rowNodes.get(rowId);
    if (!node) return;

    const col = state.columns.find((c) => c.colId === colId);
    if (!col) return;

    // Find cell DOM element
    const rowEl = this.bodyContainer?.querySelector(`[data-row-id="${CSS.escape(rowId)}"]`);
    if (!rowEl) return;
    const cellEl = rowEl.querySelector(`[data-col-id="${CSS.escape(colId)}"]`) as HTMLElement | null;
    if (!cellEl) return;

    // Clear cell content and prepare for editor
    cellEl.textContent = '';
    cellEl.classList.add(`${this.prefix}-cell-editing`);
    cellEl.style.position = 'relative';
    cellEl.style.padding = '0';
    cellEl.style.overflow = 'visible';

    // Determine editor type
    const editorType = col.originalDef.cellEditor ?? 'text';
    const editorParams = col.originalDef.cellEditorParams as Record<string, any> | undefined;

    let editorEl: HTMLElement;

    if (editorType === 'select' && editorParams?.values) {
      // Select editor
      const select = document.createElement('select');
      select.className = `${this.prefix}-cell-editor ${this.prefix}-cell-editor-select`;
      select.style.cssText =
        'width:100%;height:100%;box-sizing:border-box;' +
        'border:2px solid var(--gs-color-cell-editing-border,#3b82f6);' +
        'outline:none;padding:0 4px;font:inherit;' +
        'background:var(--gs-color-cell-editing-bg,#ffffff);';

      for (const optVal of editorParams.values as string[]) {
        const opt = document.createElement('option');
        opt.value = optVal;
        opt.textContent = optVal;
        if (optVal === String(value)) opt.selected = true;
        select.appendChild(opt);
      }

      select.addEventListener('change', () => {
        this.engine.commandBus.dispatch('editing:setValue', { value: select.value });
      });

      select.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); this.engine.commandBus.dispatch('editing:stop', { cancel: false }); }
        else if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); this.engine.commandBus.dispatch('editing:stop', { cancel: true }); }
        else if (e.key === 'Tab') { e.stopPropagation(); e.preventDefault(); this.engine.commandBus.dispatch('editing:stop', { cancel: false }); }
      });

      editorEl = select;
    } else if (editorType === 'number') {
      // Number editor
      const input = document.createElement('input');
      input.type = 'number';
      input.value = value != null ? String(value) : '';
      input.className = `${this.prefix}-cell-editor ${this.prefix}-cell-editor-number`;
      input.style.cssText =
        'width:100%;height:100%;box-sizing:border-box;' +
        'border:2px solid var(--gs-color-cell-editing-border,#3b82f6);' +
        'outline:none;padding:0 8px;font:inherit;' +
        'background:var(--gs-color-cell-editing-bg,#ffffff);';

      input.addEventListener('input', () => {
        this.engine.commandBus.dispatch('editing:setValue', { value: input.valueAsNumber });
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); this.engine.commandBus.dispatch('editing:stop', { cancel: false }); }
        else if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); this.engine.commandBus.dispatch('editing:stop', { cancel: true }); }
        else if (e.key === 'Tab') { e.stopPropagation(); e.preventDefault(); this.engine.commandBus.dispatch('editing:stop', { cancel: false }); }
      });

      editorEl = input;
    } else {
      // Text editor (default)
      const input = document.createElement('input');
      input.type = 'text';
      input.value = value != null ? String(value) : '';
      input.className = `${this.prefix}-cell-editor ${this.prefix}-cell-editor-text`;
      input.style.cssText =
        'width:100%;height:100%;box-sizing:border-box;' +
        'border:2px solid var(--gs-color-cell-editing-border,#3b82f6);' +
        'outline:none;padding:0 8px;font:inherit;' +
        'background:var(--gs-color-cell-editing-bg,#ffffff);';

      input.addEventListener('input', () => {
        this.engine.commandBus.dispatch('editing:setValue', { value: input.value });
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); this.engine.commandBus.dispatch('editing:stop', { cancel: false }); }
        else if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); this.engine.commandBus.dispatch('editing:stop', { cancel: true }); }
        else if (e.key === 'Tab') { e.stopPropagation(); e.preventDefault(); this.engine.commandBus.dispatch('editing:stop', { cancel: false }); }
      });

      editorEl = input;
    }

    cellEl.appendChild(editorEl);

    // Store reference
    this.activeEditor = {
      element: editorEl,
      cellElement: cellEl,
      rowId,
      colId,
    };

    // Focus and select after DOM insertion
    requestAnimationFrame(() => {
      if (editorEl instanceof HTMLInputElement) {
        editorEl.focus();
        editorEl.select();
      } else if (editorEl instanceof HTMLSelectElement) {
        editorEl.focus();
      }
    });
  }

  private removeEditorOverlay(): void {
    if (!this.activeEditor) return;

    const { cellElement, rowId } = this.activeEditor;

    // Remove editing class
    cellElement.classList.remove(`${this.prefix}-cell-editing`);
    cellElement.style.padding = '';
    cellElement.style.overflow = '';

    this.activeEditor = null;

    // Re-render the row to restore cell content
    const state = this.engine.store.getState();
    const node = state.rowNodes.get(rowId);
    if (node) {
      const entry = this.renderedRows.get(rowId);
      if (entry) {
        const scrollLeft = this.bodyViewport?.scrollLeft ?? 0;
        const { columns: visibleCols } = this.getVisibleColumnsForRender(scrollLeft);
        this.updateRowContent(entry.element, node, visibleCols, node.displayIndex);
        entry.version = node.version;
      }
    }
  }

  // ── Utilities ──

  private el(tag: string, className: string): HTMLElement {
    const el = document.createElement(tag);
    el.className = className;
    return el;
  }
}
