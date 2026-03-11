// ─── Toolbar ───
//
// Optional default toolbar for the PDF viewer.

import type { PdfApi } from '@gridstorm/pdf-core';
import type { ZoomManager } from './zoom-manager';

/** Toolbar configuration. */
export interface ToolbarConfig {
  /** PDF API instance. */
  api: PdfApi;
  /** Zoom manager for zoom controls. */
  zoomManager: ZoomManager;
  /** CSS class prefix (default: 'gs-pdf'). */
  classPrefix?: string;
  /** Toolbar items to include. */
  items?: ToolbarItem[];
}

export type ToolbarItem =
  | 'prev-page'
  | 'next-page'
  | 'page-indicator'
  | 'separator'
  | 'zoom-out'
  | 'zoom-in'
  | 'zoom-indicator'
  | 'fit-width'
  | 'fit-page';

const DEFAULT_ITEMS: ToolbarItem[] = [
  'prev-page',
  'page-indicator',
  'next-page',
  'separator',
  'zoom-out',
  'zoom-indicator',
  'zoom-in',
  'separator',
  'fit-width',
  'fit-page',
];

/** Creates a toolbar element for the PDF viewer. */
export class Toolbar {
  private element: HTMLElement | null = null;
  private api: PdfApi;
  private zoomManager: ZoomManager;
  private classPrefix: string;
  private items: ToolbarItem[];
  private pageIndicator: HTMLElement | null = null;
  private zoomIndicator: HTMLElement | null = null;
  private unsubscribers: (() => void)[] = [];

  constructor(config: ToolbarConfig) {
    this.api = config.api;
    this.zoomManager = config.zoomManager;
    this.classPrefix = config.classPrefix ?? 'gs-pdf';
    this.items = config.items ?? DEFAULT_ITEMS;
  }

  /** Create and return the toolbar element. */
  mount(parent: HTMLElement): HTMLElement {
    const toolbar = document.createElement('div');
    toolbar.className = `${this.classPrefix}-toolbar`;
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', 'PDF viewer toolbar');

    for (const item of this.items) {
      toolbar.appendChild(this.createItem(item));
    }

    parent.insertBefore(toolbar, parent.firstChild);
    this.element = toolbar;

    // Subscribe to state changes for updating indicators
    const unsub1 = this.api.addEventListener('page:changed', () =>
      this.updatePageIndicator(),
    );
    const unsub2 = this.api.addEventListener('zoom:changed', () =>
      this.updateZoomIndicator(),
    );
    this.unsubscribers.push(unsub1, unsub2);

    this.updatePageIndicator();
    this.updateZoomIndicator();

    return toolbar;
  }

  /** Update toolbar state (page/zoom indicators). */
  update(): void {
    this.updatePageIndicator();
    this.updateZoomIndicator();
  }

  private createItem(item: ToolbarItem): HTMLElement {
    switch (item) {
      case 'prev-page':
        return this.createButton('\u25C0', 'Previous page', () => {
          const current = this.api.getCurrentPage();
          if (current > 0) this.api.goToPage(current - 1);
        });

      case 'next-page':
        return this.createButton('\u25B6', 'Next page', () => {
          const current = this.api.getCurrentPage();
          if (current < this.api.getPageCount() - 1)
            this.api.goToPage(current + 1);
        });

      case 'page-indicator': {
        const el = document.createElement('span');
        el.className = `${this.classPrefix}-toolbar-indicator`;
        el.setAttribute('aria-live', 'polite');
        this.pageIndicator = el;
        return el;
      }

      case 'zoom-out':
        return this.createButton('\u2212', 'Zoom out', () =>
          this.zoomManager.zoomOut(),
        );

      case 'zoom-in':
        return this.createButton('+', 'Zoom in', () =>
          this.zoomManager.zoomIn(),
        );

      case 'zoom-indicator': {
        const el = document.createElement('span');
        el.className = `${this.classPrefix}-toolbar-indicator`;
        el.setAttribute('aria-live', 'polite');
        this.zoomIndicator = el;
        return el;
      }

      case 'fit-width':
        return this.createButton('FW', 'Fit width', () => {
          const state = this.api.getState();
          const page = state.pages[state.activePageIndex];
          if (page) {
            const container = this.element?.parentElement;
            if (container) {
              this.zoomManager.zoomToFitWidth(page.width, container.clientWidth - 40);
            }
          }
        });

      case 'fit-page':
        return this.createButton('FP', 'Fit page', () => {
          const state = this.api.getState();
          const page = state.pages[state.activePageIndex];
          if (page) {
            const container = this.element?.parentElement;
            if (container) {
              this.zoomManager.zoomToFitPage(
                page.width,
                page.height,
                container.clientWidth - 40,
                container.clientHeight - 80,
              );
            }
          }
        });

      case 'separator': {
        const sep = document.createElement('span');
        sep.className = `${this.classPrefix}-toolbar-separator`;
        sep.setAttribute('role', 'separator');
        return sep;
      }
    }
  }

  private createButton(
    label: string,
    ariaLabel: string,
    onClick: () => void,
  ): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = `${this.classPrefix}-toolbar-btn`;
    btn.textContent = label;
    btn.setAttribute('aria-label', ariaLabel);
    btn.type = 'button';
    btn.addEventListener('click', onClick);
    return btn;
  }

  private updatePageIndicator(): void {
    if (!this.pageIndicator) return;
    const current = this.api.getCurrentPage() + 1;
    const total = this.api.getPageCount();
    this.pageIndicator.textContent = `${current} / ${total}`;
  }

  private updateZoomIndicator(): void {
    if (!this.zoomIndicator) return;
    const zoom = Math.round(this.api.getZoom() * 100);
    this.zoomIndicator.textContent = `${zoom}%`;
  }

  destroy(): void {
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
    this.element?.remove();
    this.element = null;
    this.pageIndicator = null;
    this.zoomIndicator = null;
  }
}
