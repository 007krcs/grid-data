// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Renderer Extension Types ───
//
// Mirrors GridStorm's RendererExtension pattern for PDF viewer.

import type { PdfApi, PdfDocumentState } from '@gridstorm/pdf-core';

/** Context provided to renderer extensions. */
export interface PdfRendererContext {
  /** Public PDF API. */
  api: PdfApi;
  /** CSS class prefix (default: 'gs-pdf'). */
  classPrefix: string;
  /** Root container element. */
  root: HTMLElement;
  /** Scrollable viewport element. */
  viewport: HTMLElement;
  /** Pages container element. */
  pagesContainer: HTMLElement;
  /** Get current document state snapshot. */
  getState: () => PdfDocumentState;
  /** Helper to create a DOM element with prefixed class. */
  el: (tag: string, className: string) => HTMLElement;
}

/** Extension interface for the PDF renderer. */
export interface PdfRendererExtension {
  /** Unique extension identifier. */
  id: string;
  /** Called once during renderer mount. */
  mount(ctx: PdfRendererContext): void;
  /** Called when document state changes. */
  update(ctx: PdfRendererContext): void;
  /** Called during renderer destroy. */
  destroy(): void;
}
