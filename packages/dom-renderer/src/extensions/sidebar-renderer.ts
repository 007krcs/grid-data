// ─── Column Sidebar Renderer Extension ───
// Renders a slide-in panel to show/hide columns with checkboxes and search.

import type { RendererContext, RendererExtension } from './types';

export interface SidebarConfig {
  /** Width of the sidebar panel in pixels. Default: 220. */
  width?: number;
}

export class SidebarRenderer implements RendererExtension {
  readonly id = 'sidebar';

  private sidebarElement: HTMLElement | null = null;
  private sidebarOpen = false;
  private width: number;
  /** Callback invoked when column visibility changes (renderer needs to re-render). */
  onColumnVisibilityChanged: (() => void) | null = null;

  constructor(config?: SidebarConfig) {
    this.width = config?.width ?? 220;
  }

  mount(ctx: RendererContext): void {
    this.createSidebar(ctx);
  }

  update(_ctx: RendererContext): void {
    // Sidebar list auto-refreshes on toggle; no per-state-change update needed
  }

  destroy(): void {
    this.sidebarElement?.remove();
    this.sidebarElement = null;
    this.sidebarOpen = false;
    this.onColumnVisibilityChanged = null;
  }

  // ── Private Methods ──

  private createSidebar(ctx: RendererContext): void {
    if (!ctx.root) return;

    // Toggle button in the header area
    const toggleBtn = ctx.el('button', `${ctx.prefix}-sidebar-toggle`);
    toggleBtn.setAttribute('aria-label', 'Toggle column panel');
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.textContent = '\u2630'; // ☰
    toggleBtn.style.cssText = `
      position:absolute;top:4px;right:4px;z-index:3;
      width:28px;height:28px;border:1px solid var(--gs-color-border,#e2e8f0);
      border-radius:4px;background:var(--gs-color-header-bg,#f8fafc);
      cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;
      color:var(--gs-color-header-fg,#475569);
    `;
    toggleBtn.addEventListener('click', () => this.toggle(ctx));
    ctx.root.appendChild(toggleBtn);

    // Sidebar panel
    this.sidebarElement = ctx.el('div', `${ctx.prefix}-sidebar`);
    this.sidebarElement.setAttribute('role', 'dialog');
    this.sidebarElement.setAttribute('aria-label', 'Column visibility panel');
    this.sidebarElement.style.cssText = `
      position:absolute;top:0;right:0;bottom:0;
      width:${this.width}px;
      background:var(--gs-sidebar-bg,var(--gs-color-background,#fff));
      border-left:1px solid var(--gs-sidebar-border,var(--gs-color-border,#e2e8f0));
      box-shadow:-4px 0 12px rgba(0,0,0,0.08);
      z-index:5;overflow-y:auto;
      transform:translateX(100%);transition:transform 0.2s ease;
      padding:0;
    `;

    // Header
    const header = document.createElement('div');
    header.style.cssText = `
      display:flex;align-items:center;justify-content:space-between;
      padding:12px 16px;border-bottom:1px solid var(--gs-color-border,#e2e8f0);
      font-weight:600;font-size:14px;
    `;
    const titleSpan = document.createElement('span');
    titleSpan.textContent = 'Columns';
    header.appendChild(titleSpan);

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '\u00D7'; // ×
    closeBtn.setAttribute('aria-label', 'Close column panel');
    closeBtn.style.cssText = `
      border:none;background:none;cursor:pointer;font-size:18px;
      color:var(--gs-color-muted,#94a3b8);padding:0 4px;
    `;
    closeBtn.addEventListener('click', () => this.toggle(ctx));
    header.appendChild(closeBtn);
    this.sidebarElement.appendChild(header);

    // Search input
    const searchBox = document.createElement('div');
    searchBox.style.cssText = 'padding:8px 12px;';
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search columns...';
    searchInput.setAttribute('aria-label', 'Search columns');
    searchInput.style.cssText = `
      width:100%;padding:6px 10px;border:1px solid var(--gs-color-border,#e2e8f0);
      border-radius:4px;font-size:13px;box-sizing:border-box;
      outline:none;background:var(--gs-color-background,#fff);
      color:var(--gs-color-foreground,#1a1a1a);
    `;
    searchInput.addEventListener('input', () => {
      this.updateList(ctx, searchInput.value.toLowerCase());
    });
    searchBox.appendChild(searchInput);
    this.sidebarElement.appendChild(searchBox);

    // Column list container
    const listContainer = document.createElement('div');
    listContainer.className = `${ctx.prefix}-sidebar-list`;
    listContainer.style.cssText = 'padding:4px 12px;';
    this.sidebarElement.appendChild(listContainer);

    // Escape to close
    this.sidebarElement.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.toggle(ctx);
    });

    ctx.root.appendChild(this.sidebarElement);
    this.updateList(ctx, '');
  }

  private toggle(ctx: RendererContext): void {
    this.sidebarOpen = !this.sidebarOpen;
    if (this.sidebarElement) {
      this.sidebarElement.style.transform = this.sidebarOpen ? 'translateX(0)' : 'translateX(100%)';
    }
    const toggleEl = ctx.root?.querySelector(`.${ctx.prefix}-sidebar-toggle`);
    toggleEl?.setAttribute('aria-expanded', String(this.sidebarOpen));
  }

  private updateList(ctx: RendererContext, filter: string): void {
    if (!this.sidebarElement) return;
    const listContainer = this.sidebarElement.querySelector(`.${ctx.prefix}-sidebar-list`);
    if (!listContainer) return;
    listContainer.textContent = '';

    const state = ctx.getState();
    for (const col of state.columns) {
      // Skip columns marked as suppressColumnsToolPanel
      if ((col.originalDef as any).suppressColumnsToolPanel) continue;

      // Filter by search
      if (filter && !col.headerName.toLowerCase().includes(filter)) continue;

      const item = document.createElement('label');
      item.style.cssText = `
        display:flex;align-items:center;gap:8px;padding:6px 4px;
        cursor:pointer;font-size:13px;
        color:var(--gs-color-foreground,#1a1a1a);
      `;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = !col.hide;
      checkbox.style.cssText = 'cursor:pointer;';
      checkbox.addEventListener('change', () => {
        ctx.engine.api.setColumnVisible(col.colId, checkbox.checked);
        this.onColumnVisibilityChanged?.();
      });

      const labelText = document.createElement('span');
      labelText.textContent = col.headerName;
      labelText.style.cssText = 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

      item.appendChild(checkbox);
      item.appendChild(labelText);
      listContainer.appendChild(item);
    }
  }
}
