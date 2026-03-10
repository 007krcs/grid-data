// ─── Floating Filter Renderer Extension ───
// Renders a row of filter inputs below the header for per-column filtering.

import type { ColumnState, GridState } from '@gridstorm/core';
import type { RendererContext, RendererExtension } from './types';

export interface FloatingFilterConfig {
  /** Debounce delay for filter input in ms. Default: 300. */
  debounce?: number;
}

export class FloatingFilterRenderer implements RendererExtension {
  readonly id = 'floating-filter';

  private container: HTMLElement | null = null;
  private filterInputs = new Map<string, HTMLInputElement>();
  private filterDebounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private debounce: number;

  constructor(config?: FloatingFilterConfig) {
    this.debounce = config?.debounce ?? 300;
  }

  mount(ctx: RendererContext): void {
    const p = ctx.prefix;

    // Create floating filter container
    this.container = ctx.el('div', `${p}-floating-filter`);
    this.container.style.cssText =
      'overflow:hidden;' +
      'background:var(--gs-color-filter-bg,var(--gs-color-header-bg,#f8fafc));' +
      'border-bottom:var(--gs-border-width,1px) solid var(--gs-color-border,#e2e8f0);';

    // Insert after the header
    const headerNext = ctx.headerContainer.nextSibling;
    if (headerNext) {
      ctx.wrapper.insertBefore(this.container, headerNext);
    } else {
      ctx.wrapper.appendChild(this.container);
    }

    this.renderFilterRow(ctx);
  }

  update(ctx: RendererContext): void {
    this.syncFilterValues(ctx);
  }

  destroy(): void {
    for (const timer of this.filterDebounceTimers.values()) clearTimeout(timer);
    this.filterDebounceTimers.clear();
    this.filterInputs.clear();
    this.container?.remove();
    this.container = null;
  }

  /** Re-render the entire filter row (e.g., after column changes). */
  rerender(ctx: RendererContext): void {
    this.renderFilterRow(ctx);
  }

  /** Update filter cell widths to match column widths. */
  updateWidths(ctx: RendererContext): void {
    if (!this.container) return;
    const state = ctx.getState();
    const visibleCols = state.columns.filter((c) => !c.hide);

    // Update individual cell widths
    const cells = this.container.querySelectorAll(`.${ctx.prefix}-floating-filter-cell`);
    for (const cellEl of cells) {
      const colId = cellEl.getAttribute('data-col-id');
      if (!colId || colId === '__checkbox') continue;
      const col = visibleCols.find((c) => c.colId === colId);
      if (col) {
        (cellEl as HTMLElement).style.width = `${col.width}px`;
        (cellEl as HTMLElement).style.minWidth = `${col.width}px`;
        (cellEl as HTMLElement).style.maxWidth = `${col.width}px`;
      }
    }

    // Update total row width
    const filterRow = this.container.querySelector(`.${ctx.prefix}-floating-filter-row`) as HTMLElement | null;
    if (filterRow) {
      const totalWidth = visibleCols.reduce((sum, c) => sum + c.width, 0) +
        (ctx.checkboxSelection ? ctx.checkboxColumnWidth : 0);
      filterRow.style.width = `${totalWidth}px`;
    }
  }

  /** Sync the horizontal scroll position with the body viewport. */
  syncScroll(scrollLeft: number): void {
    if (this.container) {
      this.container.scrollLeft = scrollLeft;
    }
  }

  /** Get the container element (for scroll sync). */
  getContainer(): HTMLElement | null {
    return this.container;
  }

  // ── Private Methods ──

  private renderFilterRow(ctx: RendererContext): void {
    if (!this.container) return;
    this.container.textContent = '';
    this.filterInputs.clear();

    const state = ctx.getState();
    const scrollLeft = ctx.bodyViewport?.scrollLeft ?? 0;
    const { columns: renderCols } = ctx.getVisibleColumns(scrollLeft);
    const filterHeight = 36;

    const filterRow = ctx.el('div', `${ctx.prefix}-floating-filter-row`);
    filterRow.style.cssText = `display:flex;height:${filterHeight}px;align-items:center;`;

    // Checkbox spacer
    if (ctx.checkboxSelection) {
      const spacer = document.createElement('div');
      spacer.setAttribute('data-col-id', '__checkbox');
      spacer.className = `${ctx.prefix}-floating-filter-cell`;
      spacer.style.cssText =
        `width:${ctx.checkboxColumnWidth}px;min-width:${ctx.checkboxColumnWidth}px;` +
        `max-width:${ctx.checkboxColumnWidth}px;` +
        'border-right:var(--gs-border-width,1px) solid var(--gs-color-border,#e0e0e0);';
      filterRow.appendChild(spacer);
    }

    // Check for pinned columns
    const hasPinned = renderCols.some((c) => c.pinned);

    if (hasPinned) {
      // Pinned-left filter cells
      let pinnedLeftOffset = 0;
      for (const col of renderCols.filter((c) => c.pinned === 'left')) {
        const cell = this.createFilterCell(col, state, ctx);
        cell.style.position = 'sticky';
        cell.style.left = `${pinnedLeftOffset + (ctx.checkboxSelection ? ctx.checkboxColumnWidth : 0)}px`;
        cell.style.zIndex = '1';
        cell.style.background = 'var(--gs-color-header-bg,#f8fafc)';
        pinnedLeftOffset += col.width;
        filterRow.appendChild(cell);
      }

      // Unpinned filter cells
      for (const col of renderCols.filter((c) => !c.pinned)) {
        filterRow.appendChild(this.createFilterCell(col, state, ctx));
      }

      // Pinned-right filter cells
      let pinnedRightOffset = 0;
      const pinnedRightCols = renderCols.filter((c) => c.pinned === 'right');
      for (let i = pinnedRightCols.length - 1; i >= 0; i--) {
        const col = pinnedRightCols[i]!;
        const cell = this.createFilterCell(col, state, ctx);
        cell.style.position = 'sticky';
        cell.style.right = `${pinnedRightOffset}px`;
        cell.style.zIndex = '1';
        cell.style.background = 'var(--gs-color-header-bg,#f8fafc)';
        pinnedRightOffset += col.width;
        filterRow.appendChild(cell);
      }

      // Set total width for scrolling
      const totalWidth = renderCols.reduce((sum, c) => sum + c.width, 0) +
        (ctx.checkboxSelection ? ctx.checkboxColumnWidth : 0);
      filterRow.style.width = `${totalWidth}px`;
    } else {
      for (const col of renderCols) {
        filterRow.appendChild(this.createFilterCell(col, state, ctx));
      }
    }

    this.container.appendChild(filterRow);
  }

  private createFilterCell(col: ColumnState, state: GridState, ctx: RendererContext): HTMLElement {
    const cell = document.createElement('div');
    cell.className = `${ctx.prefix}-floating-filter-cell`;
    cell.setAttribute('data-col-id', col.colId);
    cell.style.cssText =
      `width:${col.width}px;min-width:${col.width}px;max-width:${col.width}px;` +
      'padding:4px;box-sizing:border-box;' +
      'border-right:var(--gs-border-width,1px) solid var(--gs-color-border,#e0e0e0);';

    // Only add input for filterable columns
    if (!col.filterable && !col.originalDef.filter) {
      return cell;
    }

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:relative;width:100%;';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Filter...';
    input.className = `${ctx.prefix}-floating-filter-input`;
    input.setAttribute('aria-label', `Filter ${col.headerName}`);
    input.style.cssText =
      'width:100%;box-sizing:border-box;padding:4px 24px 4px 8px;' +
      'border:var(--gs-border-width,1px) solid var(--gs-color-border,#e2e8f0);' +
      'border-radius:4px;font:inherit;font-size:var(--gs-font-size-small,11px);' +
      'outline:none;background:var(--gs-color-background,#fff);' +
      'color:var(--gs-color-foreground,#1a1a1a);';

    // Sync current filter value
    const currentFilter = state.filterModel[col.colId];
    if (currentFilter?.filter != null) {
      input.value = String(currentFilter.filter);
    }

    // Clear button
    const clearBtn = document.createElement('span');
    clearBtn.className = `${ctx.prefix}-floating-filter-clear`;
    clearBtn.textContent = '\u00D7'; // ×
    clearBtn.setAttribute('aria-label', `Clear filter for ${col.headerName}`);
    clearBtn.setAttribute('role', 'button');
    clearBtn.setAttribute('tabindex', '0');
    clearBtn.style.cssText =
      'position:absolute;right:6px;top:50%;transform:translateY(-50%);' +
      'cursor:pointer;font-size:14px;line-height:1;' +
      'color:var(--gs-color-muted,#94a3b8);' +
      `display:${currentFilter?.filter ? 'block' : 'none'};`;

    // Debounced input handler
    input.addEventListener('input', () => {
      const existingTimer = this.filterDebounceTimers.get(col.colId);
      if (existingTimer) clearTimeout(existingTimer);

      const timer = setTimeout(() => {
        const val = input.value.trim();
        if (val) {
          ctx.engine.commandBus.dispatch('filter:setColumn', {
            colId: col.colId,
            model: { filterType: 'text', type: 'contains', filter: val },
          });
        } else {
          ctx.engine.commandBus.dispatch('filter:removeColumn', { colId: col.colId });
        }
        clearBtn.style.display = val ? 'block' : 'none';
      }, this.debounce);

      this.filterDebounceTimers.set(col.colId, timer);
    });

    // Focus ring
    input.addEventListener('focus', () => {
      input.style.borderColor = 'var(--gs-color-accent,#3b82f6)';
      input.style.boxShadow = 'var(--gs-shadow-focus-ring)';
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = 'var(--gs-color-border,#e2e8f0)';
      input.style.boxShadow = 'none';
    });

    // Clear button click
    clearBtn.addEventListener('click', () => {
      input.value = '';
      ctx.engine.commandBus.dispatch('filter:removeColumn', { colId: col.colId });
      clearBtn.style.display = 'none';
      input.focus();
    });

    // Clear button keyboard support
    clearBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        clearBtn.click();
      }
    });

    this.filterInputs.set(col.colId, input);

    wrapper.appendChild(input);
    wrapper.appendChild(clearBtn);
    cell.appendChild(wrapper);
    return cell;
  }

  private syncFilterValues(ctx: RendererContext): void {
    const state = ctx.getState();
    for (const [colId, input] of this.filterInputs) {
      const filter = state.filterModel[colId];
      const filterValue = filter?.filter != null ? String(filter.filter) : '';

      // Only update if the value changed externally (not from user input)
      if (document.activeElement !== input) {
        input.value = filterValue;
      }

      // Sync clear button visibility
      const clearBtn = input.parentElement?.querySelector(`.${ctx.prefix}-floating-filter-clear`) as HTMLElement | null;
      if (clearBtn) {
        clearBtn.style.display = filterValue ? 'block' : 'none';
      }
    }
  }
}
