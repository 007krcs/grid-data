// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
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

    const w = viewport.width;
    const h = viewport.height;
    const margin = Math.min(w * 0.1, 56);

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Subtle shadow border
    ctx.shadowColor = 'rgba(0,0,0,0.08)';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#d4d4d8';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(0.5, 0.5, w - 1, h - 1);
    ctx.shadowColor = 'transparent';

    // ─── Page-specific content ───
    if (page.index === 0) {
      this.renderCoverPage(ctx, w, h, margin);
    } else if (page.index === 1) {
      this.renderContentPage(ctx, w, h, margin, 'Architecture Overview', [
        'GridStorm uses a headless core engine paired with a',
        'DOM-based renderer for maximum flexibility and accessibility.',
        '',
        'Key components:',
        '\u2022  Core Engine \u2014 State management, event bus, command bus',
        '\u2022  DOM Renderer \u2014 Virtual scrolling, cell rendering',
        '\u2022  Plugin System \u2014 Topological dependency resolution',
        '\u2022  React Adapter \u2014 Hooks-based API with portals',
        '',
        'The plugin system allows extending grid functionality',
        'without modifying the core engine. Plugins register',
        'command handlers and event listeners.',
      ], true);
    } else {
      this.renderContentPage(ctx, w, h, margin, `Section ${page.index + 1}`, [
        'API Reference and Command Documentation',
        '',
        'GridStorm exposes a comprehensive API surface:',
        '',
        '\u2022  grid.api.setRowData(data) \u2014 Set row data',
        '\u2022  grid.api.getSelectedRows() \u2014 Get selection',
        '\u2022  grid.api.exportCsv() \u2014 Export to CSV',
        '\u2022  grid.api.addEventListener(type, fn) \u2014 Events',
        '',
        'Commands follow a namespace:action pattern:',
        '  sort:apply, filter:set, selection:selectAll,',
        '  editing:start, clipboard:copy, pagination:setPage',
      ], false);
    }

    // Page number footer
    ctx.fillStyle = '#a1a1aa';
    ctx.font = '10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`\u2014 ${page.index + 1} \u2014`, w / 2, h - margin * 0.5);

    ctx.restore();
  }

  /** Render a title/cover page. */
  private renderCoverPage(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    margin: number,
  ): void {
    // Top accent bar
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#3b82f6');
    grad.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, 6);

    // Logo placeholder
    const logoY = h * 0.22;
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.roundRect(w / 2 - 28, logoY - 28, 56, 56, 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GS', w / 2, logoY);

    // Title
    ctx.fillStyle = '#18181b';
    ctx.font = `bold ${Math.min(w * 0.058, 28)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('GridStorm PDF Toolkit', w / 2, logoY + 48);

    // Subtitle
    ctx.fillStyle = '#71717a';
    ctx.font = `${Math.min(w * 0.034, 16)}px system-ui, sans-serif`;
    ctx.fillText('Technical Overview & API Reference', w / 2, logoY + 86);

    // Divider
    ctx.strokeStyle = '#e4e4e7';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin * 2, logoY + 120);
    ctx.lineTo(w - margin * 2, logoY + 120);
    ctx.stroke();

    // Feature list
    const features = [
      'Canvas-based page rendering with virtual scrolling',
      'Full-text search with highlight overlays',
      'Annotation system: highlights, notes, shapes',
      'Theme support: light, dark, high-contrast',
      'Headless engine with plugin architecture',
    ];
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let fy = logoY + 140;
    for (const feat of features) {
      ctx.fillStyle = '#3b82f6';
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillText('\u2713', margin * 2, fy);
      ctx.fillStyle = '#3f3f46';
      ctx.font = `${Math.min(w * 0.028, 13)}px system-ui, sans-serif`;
      ctx.fillText(feat, margin * 2 + 20, fy);
      fy += 24;
    }

    // Version badge
    ctx.fillStyle = '#f0f9ff';
    const badgeW = 100;
    const badgeH = 26;
    const badgeX = w / 2 - badgeW / 2;
    const badgeY = h * 0.78;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 13);
    ctx.fill();
    ctx.strokeStyle = '#bfdbfe';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#2563eb';
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('v0.2.0 \u2022 Demo', w / 2, badgeY + badgeH / 2);
  }

  /** Render a content page with title and text lines. */
  private renderContentPage(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    margin: number,
    title: string,
    lines: string[],
    showDiagram: boolean,
  ): void {
    // Top accent line
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#3b82f6');
    grad.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, 3);

    // Header
    ctx.fillStyle = '#18181b';
    ctx.font = `bold ${Math.min(w * 0.044, 22)}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(title, margin, margin);

    // Divider under header
    ctx.strokeStyle = '#e4e4e7';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin, margin + 32);
    ctx.lineTo(w - margin, margin + 32);
    ctx.stroke();

    // Text content
    let y = margin + 50;
    const lineH = 20;
    for (const line of lines) {
      if (line === '') {
        y += lineH * 0.5;
        continue;
      }
      const isBullet = line.startsWith('\u2022');
      const isIndented = line.startsWith('  ');
      ctx.fillStyle = isBullet ? '#3f3f46' : isIndented ? '#71717a' : '#52525b';
      ctx.font = `${isBullet ? '' : isIndented ? 'italic ' : ''}${Math.min(w * 0.028, 13)}px system-ui, sans-serif`;
      ctx.fillText(line, margin + (isIndented ? 16 : 0), y);
      y += lineH;
    }

    // Optional architecture diagram
    if (showDiagram) {
      const dY = Math.max(y + 24, h * 0.55);
      const dW = w - margin * 2;
      const dH = Math.min(h * 0.28, 180);

      // Diagram background
      ctx.fillStyle = '#fafafa';
      ctx.beginPath();
      ctx.roundRect(margin, dY, dW, dH, 8);
      ctx.fill();
      ctx.strokeStyle = '#e4e4e7';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Diagram label
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '10px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Architecture Diagram', margin + 12, dY + 8);

      // Draw boxes
      const boxes = [
        { label: 'Core Engine', x: 0.15, color: '#3b82f6' },
        { label: 'Plugins', x: 0.40, color: '#8b5cf6' },
        { label: 'Renderer', x: 0.65, color: '#22c55e' },
      ];
      const boxW = dW * 0.2;
      const boxH = 36;
      const boxY = dY + dH / 2 - boxH / 2 + 4;

      for (const box of boxes) {
        const bx = margin + dW * box.x - boxW / 2;
        ctx.fillStyle = box.color + '18';
        ctx.beginPath();
        ctx.roundRect(bx, boxY, boxW, boxH, 6);
        ctx.fill();
        ctx.strokeStyle = box.color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = box.color;
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(box.label, bx + boxW / 2, boxY + boxH / 2);
      }

      // Arrows between boxes
      ctx.strokeStyle = '#a1a1aa';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < boxes.length - 1; i++) {
        const fromX = margin + dW * boxes[i]!.x + boxW / 2 + 4;
        const toX = margin + dW * boxes[i + 1]!.x - boxW / 2 - 4;
        const arrY = boxY + boxH / 2;
        ctx.beginPath();
        ctx.moveTo(fromX, arrY);
        ctx.lineTo(toX, arrY);
        ctx.stroke();
        // Arrow head
        ctx.beginPath();
        ctx.moveTo(toX, arrY);
        ctx.lineTo(toX - 6, arrY - 4);
        ctx.lineTo(toX - 6, arrY + 4);
        ctx.closePath();
        ctx.fillStyle = '#a1a1aa';
        ctx.fill();
      }
    }
  }

  /** Clear and resize a canvas for a new viewport. */
  resizeCanvas(canvas: HTMLCanvasElement, viewport: PageViewport): void {
    canvas.width = viewport.width * this.devicePixelRatio;
    canvas.height = viewport.height * this.devicePixelRatio;
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
  }
}
