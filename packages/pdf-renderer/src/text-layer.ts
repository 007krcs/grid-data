// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Text Layer ───
//
// Renders transparent text spans over the canvas for text selection and search highlighting.

import type { PdfTextContent, PdfWordInfo, PdfRect } from '@gridstorm/pdf-core';
import type { PageViewport } from './viewport';

/** Configuration for the text layer. */
export interface TextLayerConfig {
  /** CSS class prefix (default: 'gs-pdf'). */
  classPrefix?: string;
}

/** Search highlight rectangle. */
export interface SearchHighlight {
  rect: PdfRect;
  active: boolean;
}

/** Manages the text selection layer for a single page. */
export class TextLayer {
  private container: HTMLDivElement | null = null;
  private classPrefix: string;
  private highlightElements: HTMLElement[] = [];

  constructor(config: TextLayerConfig = {}) {
    this.classPrefix = config.classPrefix ?? 'gs-pdf';
  }

  /** Render text content into the text layer container. */
  render(
    container: HTMLDivElement,
    textContent: PdfTextContent,
    viewport: PageViewport,
  ): void {
    this.container = container;
    container.innerHTML = '';

    for (const word of textContent.words) {
      const span = document.createElement('span');
      span.className = `${this.classPrefix}-text-word`;
      span.textContent = word.text;

      this.positionElement(span, word.rect, viewport);
      container.appendChild(span);
    }
  }

  /** Clear all rendered text. */
  clear(): void {
    if (this.container) {
      this.container.innerHTML = '';
    }
    this.clearHighlights();
  }

  /** Highlight search results. */
  setSearchHighlights(
    container: HTMLDivElement,
    highlights: SearchHighlight[],
    viewport: PageViewport,
  ): void {
    this.clearHighlights();

    for (const highlight of highlights) {
      const el = document.createElement('div');
      el.className = highlight.active
        ? `${this.classPrefix}-search-highlight-active`
        : `${this.classPrefix}-search-highlight`;

      this.positionElement(el, highlight.rect, viewport);
      container.appendChild(el);
      this.highlightElements.push(el);
    }
  }

  /** Remove all search highlights. */
  clearHighlights(): void {
    for (const el of this.highlightElements) {
      el.remove();
    }
    this.highlightElements = [];
  }

  /** Get text from a selection rectangle (for copy). */
  getTextInRect(
    textContent: PdfTextContent,
    rect: PdfRect,
  ): string {
    const [x1, y1, x2, y2] = rect;
    const selectedWords: PdfWordInfo[] = [];

    for (const word of textContent.words) {
      const [wx1, wy1, wx2, wy2] = word.rect;
      // Check if word overlaps selection rect
      if (wx2 > x1 && wx1 < x2 && wy2 > y1 && wy1 < y2) {
        selectedWords.push(word);
      }
    }

    return selectedWords.map((w) => w.text).join(' ');
  }

  private positionElement(
    el: HTMLElement,
    rect: PdfRect,
    viewport: PageViewport,
  ): void {
    const cssUnits = 96 / 72;
    const zoom = viewport.scale / (typeof window !== 'undefined' ? window.devicePixelRatio : 1) / cssUnits;

    const [x1, y1, x2, y2] = rect;
    el.style.position = 'absolute';
    el.style.left = `${x1 * zoom * cssUnits}px`;
    el.style.top = `${y1 * zoom * cssUnits}px`;
    el.style.width = `${(x2 - x1) * zoom * cssUnits}px`;
    el.style.height = `${(y2 - y1) * zoom * cssUnits}px`;
  }

  destroy(): void {
    this.clear();
    this.container = null;
  }
}
