// ─── Pagination Renderer Extension ───
// Renders a pagination bar below the grid with navigation buttons and page size selector.

import type { RendererContext, RendererExtension } from './types';

export interface PaginationConfig {
  /** Available page size options. Default: [25, 50, 100, 250]. */
  pageSizeOptions?: number[];
}

export class PaginationRenderer implements RendererExtension {
  readonly id = 'pagination';

  private bar: HTMLElement | null = null;
  private label: HTMLElement | null = null;
  private pageInfo: HTMLElement | null = null;
  private pageSizeSelect: HTMLSelectElement | null = null;
  private pageSizeOptions: number[];

  constructor(config?: PaginationConfig) {
    this.pageSizeOptions = config?.pageSizeOptions ?? [25, 50, 100, 250];
  }

  mount(ctx: RendererContext): void {
    this.createPaginationBar(ctx);
    this.update(ctx);
  }

  update(ctx: RendererContext): void {
    if (!this.bar) return;

    const state = ctx.getState();
    const { currentPage, pageSize, totalRows } = state.pagination;
    const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

    // Update row info label
    if (this.label) {
      const start = totalRows > 0 ? currentPage * pageSize + 1 : 0;
      const end = Math.min((currentPage + 1) * pageSize, totalRows);
      this.label.textContent = `Rows ${start}\u2013${end} of ${totalRows}`;
    }

    // Update page info
    if (this.pageInfo) {
      this.pageInfo.textContent = `Page ${currentPage + 1} of ${totalPages}`;
    }

    // Update button disabled states
    const buttons = this.bar.querySelectorAll(`.${ctx.prefix}-pagination-btn`);
    if (buttons.length >= 4) {
      (buttons[0] as HTMLButtonElement).disabled = currentPage === 0;
      (buttons[1] as HTMLButtonElement).disabled = currentPage === 0;
      (buttons[2] as HTMLButtonElement).disabled = currentPage >= totalPages - 1;
      (buttons[3] as HTMLButtonElement).disabled = currentPage >= totalPages - 1;
    }

    // Sync page size select
    if (this.pageSizeSelect) {
      this.pageSizeSelect.value = String(pageSize);
    }
  }

  destroy(): void {
    this.bar?.remove();
    this.bar = null;
    this.label = null;
    this.pageInfo = null;
    this.pageSizeSelect = null;
  }

  // ── Private Methods ──

  private createPaginationBar(ctx: RendererContext): void {
    const p = ctx.prefix;
    this.bar = ctx.el('div', `${p}-pagination`);
    this.bar.setAttribute('role', 'navigation');
    this.bar.setAttribute('aria-label', 'Pagination controls');
    this.bar.style.cssText =
      'display:flex;align-items:center;justify-content:space-between;' +
      'padding:8px 12px;' +
      'border-top:var(--gs-border-width,1px) solid var(--gs-color-border,#e2e8f0);' +
      'background:var(--gs-color-header-bg,#f8fafc);' +
      'font-size:var(--gs-font-size-small,11px);' +
      'color:var(--gs-color-header-fg,#475569);' +
      'gap:12px;flex-shrink:0;';

    // Left: Row info label
    this.label = ctx.el('span', `${p}-pagination-label`);
    this.label.setAttribute('aria-live', 'polite');
    this.label.textContent = 'Rows 0-0 of 0';

    // Center: Navigation buttons
    const nav = ctx.el('div', `${p}-pagination-nav`);
    nav.style.cssText = 'display:flex;align-items:center;gap:4px;';

    const firstBtn = this.createButton(ctx, 'First page', '\u00AB', 'pagination:firstPage');
    const prevBtn = this.createButton(ctx, 'Previous page', '\u2039', 'pagination:prevPage');

    this.pageInfo = ctx.el('span', `${p}-pagination-pages`);
    this.pageInfo.style.cssText = 'padding:0 8px;white-space:nowrap;';
    this.pageInfo.textContent = 'Page 1 of 1';

    const nextBtn = this.createButton(ctx, 'Next page', '\u203A', 'pagination:nextPage');
    const lastBtn = this.createButton(ctx, 'Last page', '\u00BB', 'pagination:lastPage');

    nav.appendChild(firstBtn);
    nav.appendChild(prevBtn);
    nav.appendChild(this.pageInfo);
    nav.appendChild(nextBtn);
    nav.appendChild(lastBtn);

    // Right: Page size selector
    const sizeContainer = ctx.el('div', `${p}-pagination-size`);
    sizeContainer.style.cssText = 'display:flex;align-items:center;gap:6px;';

    const sizeLabel = document.createElement('span');
    sizeLabel.textContent = 'Rows per page:';

    this.pageSizeSelect = document.createElement('select');
    this.pageSizeSelect.className = `${p}-pagination-select`;
    this.pageSizeSelect.setAttribute('aria-label', 'Rows per page');
    this.pageSizeSelect.style.cssText =
      'border:var(--gs-border-width,1px) solid var(--gs-color-border,#e2e8f0);' +
      'border-radius:4px;padding:2px 6px;font:inherit;' +
      'background:var(--gs-color-background,#fff);' +
      'color:var(--gs-color-foreground,#1a1a1a);cursor:pointer;';

    for (const size of this.pageSizeOptions) {
      const opt = document.createElement('option');
      opt.value = String(size);
      opt.textContent = String(size);
      this.pageSizeSelect.appendChild(opt);
    }

    this.pageSizeSelect.addEventListener('change', () => {
      const newSize = Number(this.pageSizeSelect!.value);
      ctx.engine.commandBus.dispatch('pagination:setPageSize', { pageSize: newSize });
    });

    sizeContainer.appendChild(sizeLabel);
    sizeContainer.appendChild(this.pageSizeSelect);

    // Assemble
    this.bar.appendChild(this.label);
    this.bar.appendChild(nav);
    this.bar.appendChild(sizeContainer);

    // Append to wrapper (after body viewport)
    ctx.wrapper.appendChild(this.bar);
  }

  private createButton(ctx: RendererContext, label: string, text: string, command: string): HTMLElement {
    const btn = document.createElement('button');
    btn.className = `${ctx.prefix}-pagination-btn`;
    btn.textContent = text;
    btn.setAttribute('aria-label', label);
    btn.setAttribute('title', label);
    btn.style.cssText =
      'border:var(--gs-border-width,1px) solid var(--gs-color-border,#e2e8f0);' +
      'background:var(--gs-color-background,#fff);' +
      'color:var(--gs-color-foreground,#1a1a1a);' +
      'border-radius:4px;padding:4px 8px;cursor:pointer;' +
      'font-size:var(--gs-font-size,13px);line-height:1;' +
      'min-width:28px;text-align:center;' +
      'transition:background var(--gs-transition-duration,150ms) var(--gs-transition-easing);';

    btn.addEventListener('click', () => {
      ctx.engine.commandBus.dispatch(command, {});
    });

    return btn;
  }
}
