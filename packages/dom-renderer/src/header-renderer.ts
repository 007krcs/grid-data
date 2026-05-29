// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Header Renderer ───
// Builds the column header DOM: the leaf header row (with pinned-left/right
// sticky positioning and column virtualization spacers), multi-level column
// group header rows, and per-column header cells (custom renderers, sort
// indicators, sort-on-click).
//
// Extracted from renderer.ts so the DOM renderer can stay focused on row/cell
// virtualization. The controller reaches the renderer only through the narrow
// HeaderRendererHost interface, mirroring the RendererContext pattern used by
// renderer extensions and the EditingOverlay controller.

import type { ColumnState, ColumnGroupInfo, GridState } from '@gridstorm/core';
import type { ColumnVirtualResult } from './column-virtualizer';

/** Narrow surface the header renderer needs from the host DOM renderer. */
export interface HeaderRendererHost {
  /** CSS class prefix (e.g. 'gs'). */
  readonly prefix: string;
  /** Whether a checkbox selection column is rendered. */
  readonly checkboxSelection: boolean;
  /** Explicit group-header row height, or null to derive from header height. */
  readonly groupHeaderHeight: number | null;
  /** Current grid state snapshot. */
  getState(): GridState;
  /** Resolved leaf header row height in px. */
  getHeaderHeight(): number;
  /** Current horizontal scroll offset of the body viewport. */
  getScrollLeft(): number;
  /** Columns to render for the current scroll position, plus virtualization info. */
  getVisibleColumnsForRender(scrollLeft: number): {
    columns: ColumnState[];
    colResult: ColumnVirtualResult;
  };
  /** Persist the latest column virtualization result on the host. */
  setLastColumnResult(result: ColumnVirtualResult): void;
  /** Whether column virtualization is active. */
  isColumnVirtualized(): boolean;
  /** Total width of all columns (for the scrollable header row). */
  getColumnTotalWidth(): number;
  /** Create an element with a class (host's shared helper). */
  el(tag: string, className: string): HTMLElement;
  /** The header container element, if mounted. */
  getHeaderContainer(): HTMLElement | null;
  /** The root grid element, if mounted (for aria-row/colcount). */
  getRoot(): HTMLElement | null;
  /** Create the checkbox header cell (owned by the renderer's selection logic). */
  createCheckboxHeaderCell(): HTMLElement;
  /** Dispatch a command on the engine's command bus. */
  dispatch(command: string, payload: unknown): void;
  /** Rebuild the floating-filter row to match columns (no-op if disabled). */
  rerenderFloatingFilter(): void;
  /** Emit the dom:headerRendered event so plugins can re-inject handles. */
  emitHeaderRendered(): void;
}

export class HeaderRenderer {
  private host: HeaderRendererHost;

  constructor(host: HeaderRendererHost) {
    this.host = host;
  }

  /** Rebuild the full header (leaf row + optional group rows). */
  render(): void {
    const headerContainer = this.host.getHeaderContainer();
    if (!headerContainer) return;
    headerContainer.textContent = '';

    const state = this.host.getState();
    const headerHeight = this.host.getHeaderHeight();
    const scrollLeft = this.host.getScrollLeft();

    const { columns: renderCols, colResult } =
      this.host.getVisibleColumnsForRender(scrollLeft);
    this.host.setLastColumnResult(colResult);

    // All visible columns for aria-colcount
    const allVisibleCols = state.columns.filter((c) => !c.hide);

    const headerRow = this.host.el('div', `${this.host.prefix}-header-row`);
    headerRow.setAttribute('role', 'row');

    // Checkbox selection header cell
    if (this.host.checkboxSelection) {
      headerRow.appendChild(this.host.createCheckboxHeaderCell());
    }

    if (this.host.isColumnVirtualized()) {
      // Use the total width of all columns so the header row is scrollable
      const totalWidth = this.host.getColumnTotalWidth();
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

    headerContainer.appendChild(headerRow);

    // Update total row count for aria
    const root = this.host.getRoot();
    root?.setAttribute('aria-rowcount', String(state.displayedRowIds.length));
    root?.setAttribute('aria-colcount', String(allVisibleCols.length));

    // Rebuild floating filter row to match columns (via extension)
    this.host.rerenderFloatingFilter();

    // Notify plugins that header DOM was rebuilt so they can re-inject
    // handles (resize, reorder, context menu, etc.)
    this.host.emitHeaderRendered();
  }

  private createHeaderCell(col: ColumnState, state: GridState): HTMLElement {
    const cell = this.host.el('div', `${this.host.prefix}-header-cell`);
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

    // Check for custom header renderer (guard for dynamically generated columns)
    const customRenderer = col.originalDef?.headerRenderer;
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
        if (col.originalDef?.dangerouslySetInnerHTML === true) {
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
        sortIcon.className = `${this.host.prefix}-sort-icon`;
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
        this.host.dispatch('sort:toggle', {
          colId: col.colId,
          multiSort,
        });
        // Re-render header to update sort indicators
        this.render();
      });
    }

    return cell;
  }

  private renderColumnGroupHeaders(
    state: GridState,
    _visibleCols: ColumnState[],
    totalHeaderHeight: number,
  ): void {
    const headerContainer = this.host.getHeaderContainer();
    if (!headerContainer) return;
    const groups = state.columnGroups;
    const depth = state.columnGroupDepth;
    if (depth === 0 || groups.length === 0) return;

    const allVisibleCols = state.columns.filter((c) => !c.hide);
    const rowHeight = this.host.groupHeaderHeight ?? Math.round(totalHeaderHeight / (depth + 1));

    // Build a map of colId -> column for quick width lookups
    const colWidthMap = new Map<string, number>();
    for (const col of allVisibleCols) {
      colWidthMap.set(col.colId, col.width);
    }

    // For each level from 0 (top) to depth-1, render a group header row
    for (let level = 0; level < depth; level++) {
      const levelGroups = groups.filter((g) => g.level === level);
      if (levelGroups.length === 0) continue;

      const groupRow = this.host.el('div', `${this.host.prefix}-header-group-row`);
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
        const filler = this.host.el('div', `${this.host.prefix}-header-group-filler`);
        filler.style.cssText = `
          width:${col.width}px;min-width:${col.width}px;max-width:${col.width}px;
          height:${rowHeight}px;box-sizing:border-box;
          border-right:var(--gs-border-width,1px) solid var(--gs-color-border,#e2e8f0);
        `;
        groupRow.appendChild(filler);
        i++;
      }

      headerContainer.appendChild(groupRow);
    }

    // Adjust the leaf header row height to account for group rows
    const leafRow = headerContainer.querySelector(`.${this.host.prefix}-header-row`);
    if (!leafRow && headerContainer.children.length > 0) {
      // The leaf row hasn't been added yet - it will be added after this call
      // Adjust via the headerRow that's about to be appended (handled in render)
    }
  }

  private createGroupHeaderCell(
    group: ColumnGroupInfo,
    width: number,
    height: number,
  ): HTMLElement {
    const cell = this.host.el('div', `${this.host.prefix}-header-group-cell`);
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
}
