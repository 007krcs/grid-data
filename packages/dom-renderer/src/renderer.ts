// ─── DOM Renderer ───
// Creates and manages the grid DOM structure.
// Reads state from the core engine and renders rows/cells efficiently.

import type { GridEngine, GridState, ColumnState, RowNode } from '@gridstorm/core';
import { getValueFromData } from '@gridstorm/core';
import { VirtualScroller } from './virtual-scroll';
import { ColumnVirtualizer } from './column-virtualizer';
import type { ColumnVirtualResult } from './column-virtualizer';
import { ScrollManager } from './scroll-manager';
import { KeyboardManager } from './keyboard-manager';
import { isServer, safeResizeObserver } from './ssr';

export interface DomRendererConfig {
  /** Container element to mount the grid into. */
  container: HTMLElement;
  /** Grid engine instance. */
  engine: GridEngine;
  /** CSS class prefix. Default: 'gs'. */
  classPrefix?: string;
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

  // Virtualization
  private scroller = new VirtualScroller();
  private columnVirtualizer = new ColumnVirtualizer();
  private scrollManager = new ScrollManager();
  private keyboardManager = new KeyboardManager();

  // Row DOM cache
  private renderedRows = new Map<string, RowDomEntry>();
  private rowPool: HTMLElement[] = [];

  // Observers
  private resizeObserver: ResizeObserver | null = null;
  private mutationObserver: MutationObserver | null = null;

  // Subscription cleanup
  private unsubscribers: Array<() => void> = [];

  // Last rendered state
  private lastStartIndex = -1;
  private lastEndIndex = -1;
  private lastColumnResult: ColumnVirtualResult | null = null;

  constructor(config: DomRendererConfig) {
    this.engine = config.engine;
    this.container = config.container;
    this.prefix = config.classPrefix ?? 'gs';
  }

  /** Mount the grid into the container. No-op when running on the server. */
  mount(): void {
    if (isServer()) return;

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

    if (this.root && this.container?.contains(this.root)) {
      this.container.removeChild(this.root);
    }
    this.root = null;
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

    // Assemble
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
      // No column virtualization — render all visible columns as before
      headerRow.style.cssText = `display:flex;height:${headerHeight}px;align-items:center;`;
      for (const col of renderCols) {
        const cell = this.createHeaderCell(col, state);
        headerRow.appendChild(cell);
      }
    }

    this.headerContainer.appendChild(headerRow);

    // Update total row count for aria
    this.root?.setAttribute('aria-rowcount', String(state.displayedRowIds.length));
    this.root?.setAttribute('aria-colcount', String(allVisibleCols.length));
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
        cell.innerHTML = result;
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

    const unsubCols = this.engine.eventBus.on('columns:changed', () => {
      this.configureColumnVirtualizer();
      this.renderHeader();
      this.renderVisibleRows();
    });
    this.unsubscribers.push(unsubCols);

    const unsubColVisible = this.engine.eventBus.on('column:visible', () => {
      this.configureColumnVirtualizer();
      this.renderHeader();
      this.renderVisibleRows();
    });
    this.unsubscribers.push(unsubColVisible);

    const unsubColPinned = this.engine.eventBus.on('column:pinned', () => {
      this.configureColumnVirtualizer();
      this.renderHeader();
      this.renderVisibleRows();
    });
    this.unsubscribers.push(unsubColPinned);

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
    });
    this.unsubscribers.push(unsubRowData);
  }

  private onStateChanged(): void {
    const state = this.engine.store.getState();

    // Update virtual scroller if row count changed
    const newRowCount = state.displayedRowIds.length;
    if (this.scroller.getTotalHeight() !== newRowCount * ((this.engine.api.getGridOption('rowHeight') as number) ?? 40)) {
      this.scroller.updateRowCount(newRowCount);
      if (this.heightSpacer) {
        this.heightSpacer.style.height = `${this.scroller.getTotalHeight()}px`;
      }
    }

    // Invalidate cached indices to force re-render when state changes
    // (sort, filter, selection, data updates). The early-return optimization
    // in renderVisibleRows() still works for pure scroll events.
    this.lastStartIndex = -1;
    this.lastEndIndex = -1;

    this.renderVisibleRows();
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
    const rowHeight = (this.engine.api.getGridOption('rowHeight') as number) ?? 40;

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
        const expectedTop = i * rowHeight;
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
        // Update content if version changed
        if (existing.version !== node.version) {
          this.updateRowContent(existing.element, node, visibleCols, i);
          existing.version = node.version;
        }
      } else {
        // Create new row
        const rowEl = this.acquireRow();
        const top = i * rowHeight;
        this.setupRow(rowEl, node, visibleCols, i, top, rowHeight);
        this.bodyContainer.appendChild(rowEl);
        this.renderedRows.set(rowId, {
          element: rowEl,
          rowId,
          version: node.version,
        });
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

    rowEl.style.cssText = `
      position:absolute;
      top:${top}px;
      left:0;
      right:0;
      height:${height}px;
      display:flex;
      align-items:center;
      border-bottom:var(--gs-border-width,1px) solid var(--gs-color-border,#e0e0e0);
    `;

    this.updateRowContent(rowEl, node, columns, displayIndex);
  }

  private updateRowContent(
    rowEl: HTMLElement,
    node: RowNode,
    columns: ColumnState[],
    displayIndex: number,
  ): void {
    rowEl.textContent = '';

    for (let colIdx = 0; colIdx < columns.length; colIdx++) {
      const col = columns[colIdx]!;
      const cell = this.createCell(node, col, displayIndex, colIdx);
      rowEl.appendChild(cell);
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
          cell.innerHTML = result;
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

    // Cell click events
    cell.addEventListener('click', (e) => {
      e.stopPropagation();
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

    cell.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      this.engine.eventBus.emit('cell:doubleClicked', {
        node,
        colId: col.colId,
        value,
        event: e,
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
    this.rowPool.push(el);
  }

  // ── Utilities ──

  private el(tag: string, className: string): HTMLElement {
    const el = document.createElement(tag);
    el.className = className;
    return el;
  }
}
