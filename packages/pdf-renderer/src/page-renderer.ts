// ─── Page Renderer ───
//
// Renders a single PDF page to a canvas element.
// In Phase 1 this is a standalone implementation; Phase 2 will integrate pdf.js.

import type { PdfPageState } from '@gridstorm/pdf-core';
import type { PageViewport } from './viewport';

/** Render result for a single page. */
export interface PageRenderResult {
  canvas: HTMLCanvasElement;
  textLayer: HTMLDivElement;
  annotationLayer: HTMLDivElement;
}

/** Configuration for page rendering. */
export interface PageRendererConfig {
  /** Device pixel ratio for high-DPI displays. */
  devicePixelRatio?: number;
  /** Enable text selection layer. */
  enableTextLayer?: boolean;
  /** Enable annotation overlay layer. */
  enableAnnotationLayer?: boolean;
}

/** Renders individual PDF pages to canvas with overlay layers. */
export class PageRenderer {
  private devicePixelRatio: number;
  private enableTextLayer: boolean;
  private enableAnnotationLayer: boolean;

  constructor(config: PageRendererConfig = {}) {
    this.devicePixelRatio = config.devicePixelRatio ?? (typeof window !== 'undefined' ? window.devicePixelRatio : 1);
    this.enableTextLayer = config.enableTextLayer ?? true;
    this.enableAnnotationLayer = config.enableAnnotationLayer ?? true;
  }

  /** Create the DOM structure for a page. */
  createPageElement(
    _page: PdfPageState,
    viewport: PageViewport,
    classPrefix: string,
  ): PageRenderResult {
    // Canvas layer — actual PDF content
    const canvas = document.createElement('canvas');
    canvas.className = `${classPrefix}-page-canvas`;
    canvas.width = viewport.width * this.devicePixelRatio;
    canvas.height = viewport.height * this.devicePixelRatio;
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    // Text layer — transparent text for selection/search
    const textLayer = document.createElement('div');
    textLayer.className = `${classPrefix}-text-layer`;
    textLayer.style.width = `${viewport.width}px`;
    textLayer.style.height = `${viewport.height}px`;

    // Annotation layer — interactive annotation overlays
    const annotationLayer = document.createElement('div');
    annotationLayer.className = `${classPrefix}-annotation-layer`;
    annotationLayer.style.width = `${viewport.width}px`;
    annotationLayer.style.height = `${viewport.height}px`;

    if (!this.enableTextLayer) textLayer.style.display = 'none';
    if (!this.enableAnnotationLayer) annotationLayer.style.display = 'none';

    return { canvas, textLayer, annotationLayer };
  }

  /** Render placeholder content to canvas (until pdf.js integration). */
  renderPlaceholder(
    canvas: HTMLCanvasElement,
    page: PdfPageState,
    viewport: PageViewport,
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = this.devicePixelRatio;
    ctx.save();
    ctx.scale(dpr, dpr);

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    // Page border
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, viewport.width - 1, viewport.height - 1);

    // Page number text
    ctx.fillStyle = '#999999';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `Page ${page.index + 1}`,
      viewport.width / 2,
      viewport.height / 2,
    );

    // Dimension info
    ctx.font = '11px sans-serif';
    ctx.fillText(
      `${page.width} x ${page.height} pt`,
      viewport.width / 2,
      viewport.height / 2 + 24,
    );

    if (page.rotation !== 0) {
      ctx.fillText(
        `Rotation: ${page.rotation}\u00B0`,
        viewport.width / 2,
        viewport.height / 2 + 44,
      );
    }

    ctx.restore();
  }

  /** Clear and resize a canvas for a new viewport. */
  resizeCanvas(canvas: HTMLCanvasElement, viewport: PageViewport): void {
    canvas.width = viewport.width * this.devicePixelRatio;
    canvas.height = viewport.height * this.devicePixelRatio;
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
  }
}
