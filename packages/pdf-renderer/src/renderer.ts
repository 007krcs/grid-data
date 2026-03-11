// ─── PDF Renderer ───
//
// Main renderer class that assembles canvas pages, text layers, and annotation layers
// into a scrollable PDF viewer. Mirrors GridStorm's DomRenderer pattern.

import type { PdfApi, PdfDocumentState, PdfAnnotation } from '@gridstorm/pdf-core';
import { PageRenderer } from './page-renderer';
import type { PageRenderResult } from './page-renderer';
import { TextLayer } from './text-layer';
import { AnnotationLayer } from './annotation-layer';
import type { AnnotationRendererFn } from './annotation-layer';
import { ScrollManager } from './scroll-manager';
import { ZoomManager } from './zoom-manager';
import { Toolbar } from './toolbar';
import {
  computePageLayouts,
  computeTotalHeight,
  getVisiblePages,
} from './viewport';
import type { PageViewport } from './viewport';
import type { PdfRendererExtension, PdfRendererContext } from './extensions/types';

/** Configuration for the PDF renderer. */
export interface PdfRendererConfig {
  /** PDF API instance (from createPdfEngine). */
  api: PdfApi;
  /** Container element or CSS selector. */
  container: HTMLElement | string;
  /** CSS class prefix (default: 'gs-pdf'). */
  classPrefix?: string;
  /** Device pixel ratio override. */
  devicePixelRatio?: number;
  /** Enable built-in toolbar (default: true). */
  enableToolbar?: boolean;
  /** Enable text selection layer (default: true). */
  enableTextLayer?: boolean;
  /** Enable annotation overlay (default: true). */
  enableAnnotationLayer?: boolean;
  /** Additional renderer extensions. */
  extensions?: PdfRendererExtension[];
}

interface RenderedPage {
  wrapper: HTMLElement;
  result: PageRenderResult;
  textLayer: TextLayer;
  annotationLayer: AnnotationLayer;
  viewport: PageViewport;
}

/** Main PDF renderer that displays pages in a scrollable viewer. */
export class PdfRenderer {
  private api: PdfApi;
  private container: HTMLElement;
  private classPrefix: string;
  private devicePixelRatio: number;

  // DOM elements
  private root: HTMLElement | null = null;
  private viewportEl: HTMLElement | null = null;
  private pagesContainer: HTMLElement | null = null;

  // Sub-systems
  private pageRenderer: PageRenderer;
  private scrollManager: ScrollManager | null = null;
  private zoomManager: ZoomManager | null = null;
  private toolbar: Toolbar | null = null;

  // State
  private renderedPages = new Map<number, RenderedPage>();
  private pageLayouts: PageViewport[] = [];
  private extensions: PdfRendererExtension[];
  private unsubscribers: (() => void)[] = [];
  private mounted = false;

  // Feature flags
  private enableToolbar: boolean;
  private enableTextLayer: boolean;
  private enableAnnotationLayer: boolean;

  constructor(config: PdfRendererConfig) {
    this.api = config.api;
    this.classPrefix = config.classPrefix ?? 'gs-pdf';
    this.devicePixelRatio = config.devicePixelRatio ?? (typeof window !== 'undefined' ? window.devicePixelRatio : 1);
    this.enableToolbar = config.enableToolbar ?? true;
    this.enableTextLayer = config.enableTextLayer ?? true;
    this.enableAnnotationLayer = config.enableAnnotationLayer ?? true;
    this.extensions = config.extensions ?? [];

    // Resolve container
    if (typeof config.container === 'string') {
      const el = document.querySelector<HTMLElement>(config.container);
      if (!el) throw new Error(`[GridStorm PDF] Container not found: ${config.container}`);
      this.container = el;
    } else {
      this.container = config.container;
    }

    this.pageRenderer = new PageRenderer({
      devicePixelRatio: this.devicePixelRatio,
      enableTextLayer: this.enableTextLayer,
      enableAnnotationLayer: this.enableAnnotationLayer,
    });
  }

  /** Mount the renderer into the container. */
  mount(): void {
    if (this.mounted) return;
    this.mounted = true;

    this.createDom();
    this.setupScrollManager();
    this.setupZoomManager();
    this.setupToolbar();
    this.subscribeToState();
    this.renderPages();

    // Mount extensions
    const ctx = this.buildContext();
    for (const ext of this.extensions) {
      ext.mount(ctx);
    }
  }

  /** Register an annotation renderer from a plugin. */
  registerAnnotationRenderer(type: string, renderer: AnnotationRendererFn): void {
    for (const page of this.renderedPages.values()) {
      page.annotationLayer.registerRenderer(type, renderer);
    }
  }

  /** Force re-render all visible pages. */
  refresh(): void {
    this.renderPages();
  }

  /** Get the zoom manager for external control. */
  getZoomManager(): ZoomManager | null {
    return this.zoomManager;
  }

  /** Get the scroll manager for external control. */
  getScrollManager(): ScrollManager | null {
    return this.scrollManager;
  }

  // ─── DOM Setup ───

  private createDom(): void {
    const p = this.classPrefix;

    // Root container
    this.root = document.createElement('div');
    this.root.className = `${p}-viewer`;
    this.root.setAttribute('role', 'document');
    this.root.setAttribute('aria-label', 'PDF document viewer');

    // Scrollable viewport
    this.viewportEl = document.createElement('div');
    this.viewportEl.className = `${p}-viewport`;
    this.viewportEl.style.overflow = 'auto';
    this.viewportEl.style.position = 'relative';
    this.viewportEl.style.width = '100%';
    this.viewportEl.style.height = '100%';
    this.viewportEl.setAttribute('tabindex', '0');

    // Pages container (positioned inside viewport for scrolling)
    this.pagesContainer = document.createElement('div');
    this.pagesContainer.className = `${p}-pages`;
    this.pagesContainer.style.position = 'relative';

    this.viewportEl.appendChild(this.pagesContainer);
    this.root.appendChild(this.viewportEl);
    this.container.appendChild(this.root);
  }

  // ─── Sub-system Setup ───

  private setupScrollManager(): void {
    if (!this.viewportEl) return;

    this.scrollManager = new ScrollManager({
      viewport: this.viewportEl,
      onScroll: (_scrollTop, _scrollLeft) => {
        this.renderVisiblePages();
      },
      onPageChange: (pageIndex) => {
        const state = this.api.getState();
        if (state.activePageIndex !== pageIndex) {
          this.api.goToPage(pageIndex);
        }
      },
    });
  }

  private setupZoomManager(): void {
    if (!this.viewportEl) return;

    this.zoomManager = new ZoomManager({
      viewport: this.viewportEl,
      onZoomChange: (zoom) => {
        this.api.setZoom(zoom);
      },
      getZoom: () => this.api.getZoom(),
    });
  }

  private setupToolbar(): void {
    if (!this.enableToolbar || !this.root || !this.zoomManager) return;

    this.toolbar = new Toolbar({
      api: this.api,
      zoomManager: this.zoomManager,
      classPrefix: this.classPrefix,
    });

    this.toolbar.mount(this.root);
  }

  // ─── State Subscriptions ───

  private subscribeToState(): void {
    // Re-render on zoom changes
    const unsub1 = this.api.addEventListener('zoom:changed', () => {
      this.renderPages();
    });

    // Re-render on page changes
    const unsub2 = this.api.addEventListener('page:changed', () => {
      this.scrollToCurrentPage();
    });

    // Re-render on document load
    const unsub3 = this.api.addEventListener('document:loaded', () => {
      this.clearRenderedPages();
      this.renderPages();
    });

    // Re-render on document close
    const unsub4 = this.api.addEventListener('document:closed', () => {
      this.clearRenderedPages();
    });

    // Re-render annotations on changes
    const unsub5 = this.api.addEventListener('annotation:created', () => {
      this.renderAnnotations();
    });
    const unsub6 = this.api.addEventListener('annotation:updated', () => {
      this.renderAnnotations();
    });
    const unsub7 = this.api.addEventListener('annotation:deleted', () => {
      this.renderAnnotations();
    });
    const unsub8 = this.api.addEventListener('annotation:selected', () => {
      this.renderAnnotations();
    });

    this.unsubscribers.push(unsub1, unsub2, unsub3, unsub4, unsub5, unsub6, unsub7, unsub8);
  }

  // ─── Rendering ───

  private renderPages(): void {
    const state = this.api.getState();
    if (!state.loaded || !this.pagesContainer || !this.viewportEl) return;

    const containerWidth = this.viewportEl.clientWidth;
    this.pageLayouts = computePageLayouts(state.pages, state.zoom, containerWidth);

    // Set total height for scrolling
    const totalHeight = computeTotalHeight(this.pageLayouts);
    this.pagesContainer.style.height = `${totalHeight}px`;

    this.scrollManager?.setLayouts(this.pageLayouts);
    this.renderVisiblePages();

    // Update extensions
    const ctx = this.buildContext();
    for (const ext of this.extensions) {
      ext.update(ctx);
    }
  }

  private renderVisiblePages(): void {
    const state = this.api.getState();
    if (!state.loaded || !this.viewportEl || !this.pagesContainer) return;

    const scrollTop = this.viewportEl.scrollTop;
    const viewportHeight = this.viewportEl.clientHeight;

    const visibleLayouts = getVisiblePages(this.pageLayouts, scrollTop, viewportHeight);
    const visibleIndices = new Set(visibleLayouts.map((l) => l.pageIndex));

    // Remove pages no longer visible
    for (const [index, page] of this.renderedPages) {
      if (!visibleIndices.has(index)) {
        page.wrapper.remove();
        page.textLayer.destroy();
        page.annotationLayer.destroy();
        this.renderedPages.delete(index);
      }
    }

    // Render newly visible pages
    for (const layout of visibleLayouts) {
      if (!this.renderedPages.has(layout.pageIndex)) {
        this.renderPage(state, layout);
      } else {
        // Update position if needed
        const existing = this.renderedPages.get(layout.pageIndex)!;
        this.updatePagePosition(existing, layout);
      }
    }
  }

  private renderPage(state: PdfDocumentState, layout: PageViewport): void {
    if (!this.pagesContainer) return;

    const page = state.pages[layout.pageIndex];
    if (!page) return;

    const p = this.classPrefix;

    // Page wrapper
    const wrapper = document.createElement('div');
    wrapper.className = `${p}-page`;
    wrapper.dataset.pageIndex = String(layout.pageIndex);
    wrapper.style.position = 'absolute';
    wrapper.style.left = `${layout.offsetX}px`;
    wrapper.style.top = `${layout.offsetY}px`;
    wrapper.style.width = `${layout.width}px`;
    wrapper.style.height = `${layout.height}px`;

    // Create page layers
    const result = this.pageRenderer.createPageElement(page, layout, p);

    // Render placeholder to canvas (pdf.js integration in Phase 2)
    this.pageRenderer.renderPlaceholder(result.canvas, page, layout);

    wrapper.appendChild(result.canvas);
    wrapper.appendChild(result.textLayer);
    wrapper.appendChild(result.annotationLayer);

    this.pagesContainer.appendChild(wrapper);

    // Create text and annotation layer managers
    const textLayer = new TextLayer({ classPrefix: p });
    const annotationLayer = new AnnotationLayer(p);

    // Render text content if available
    if (page.textContent) {
      textLayer.render(result.textLayer, page.textContent, layout);
    }

    // Render annotations for this page
    const pageAnnotations = this.getPageAnnotations(state, layout.pageIndex);
    annotationLayer.render(
      result.annotationLayer,
      pageAnnotations,
      layout,
      state.selectedAnnotationIds,
    );

    this.renderedPages.set(layout.pageIndex, {
      wrapper,
      result,
      textLayer,
      annotationLayer,
      viewport: layout,
    });
  }

  private updatePagePosition(page: RenderedPage, layout: PageViewport): void {
    if (
      page.viewport.offsetX !== layout.offsetX ||
      page.viewport.offsetY !== layout.offsetY ||
      page.viewport.width !== layout.width ||
      page.viewport.height !== layout.height
    ) {
      page.wrapper.style.left = `${layout.offsetX}px`;
      page.wrapper.style.top = `${layout.offsetY}px`;
      page.wrapper.style.width = `${layout.width}px`;
      page.wrapper.style.height = `${layout.height}px`;
      page.viewport = layout;
    }
  }

  private renderAnnotations(): void {
    const state = this.api.getState();
    for (const [index, page] of this.renderedPages) {
      const annotations = this.getPageAnnotations(state, index);
      page.annotationLayer.render(
        page.result.annotationLayer,
        annotations,
        page.viewport,
        state.selectedAnnotationIds,
      );
    }
  }

  private getPageAnnotations(state: PdfDocumentState, pageIndex: number): PdfAnnotation[] {
    const page = state.pages[pageIndex];
    if (!page) return [];
    return page.annotationIds
      .map((id) => state.annotations[id])
      .filter((a): a is PdfAnnotation => a != null);
  }

  private scrollToCurrentPage(): void {
    const state = this.api.getState();
    this.scrollManager?.scrollToPage(state.activePageIndex);
  }

  private clearRenderedPages(): void {
    for (const page of this.renderedPages.values()) {
      page.wrapper.remove();
      page.textLayer.destroy();
      page.annotationLayer.destroy();
    }
    this.renderedPages.clear();
  }

  // ─── Extension Context ───

  private buildContext(): PdfRendererContext {
    const p = this.classPrefix;
    return {
      api: this.api,
      classPrefix: p,
      root: this.root!,
      viewport: this.viewportEl!,
      pagesContainer: this.pagesContainer!,
      getState: () => this.api.getState(),
      el: (tag: string, className: string) => {
        const el = document.createElement(tag);
        el.className = `${p}-${className}`;
        return el;
      },
    };
  }

  // ─── Lifecycle ───

  /** Unmount the renderer and clean up all resources. */
  destroy(): void {
    if (!this.mounted) return;
    this.mounted = false;

    // Unsubscribe all state listeners
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];

    // Destroy extensions
    for (const ext of this.extensions) {
      ext.destroy();
    }

    // Destroy sub-systems
    this.toolbar?.destroy();
    this.scrollManager?.destroy();
    this.zoomManager?.destroy();

    // Clear rendered pages
    this.clearRenderedPages();

    // Remove DOM
    this.root?.remove();
    this.root = null;
    this.viewportEl = null;
    this.pagesContainer = null;
  }
}
