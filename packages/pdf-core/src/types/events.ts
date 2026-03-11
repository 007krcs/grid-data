// ─── PDF Event Map ───

import type {
  PdfAnnotation,
  PdfMetadata,
  PdfRect,
  ToolMode,
} from './document';

/** All events emitted by the PDF engine and its plugins. */
export interface PdfEventMap {
  // ── Lifecycle ──
  'document:loaded': { pageCount: number; metadata: PdfMetadata };
  'document:closed': Record<string, never>;
  'document:saved': { blob: Blob };
  'document:error': { error: Error; source: string };

  // ── Pages ──
  'page:rendered': { pageIndex: number };
  'page:changed': { pageIndex: number };
  'page:inserted': { pageIndex: number };
  'page:deleted': { pageIndex: number };
  'page:rotated': { pageIndex: number; rotation: number };
  'page:reordered': { fromIndex: number; toIndex: number };

  // ── Annotations ──
  'annotation:created': { annotation: PdfAnnotation };
  'annotation:updated': { annotation: PdfAnnotation; changes: Partial<PdfAnnotation> };
  'annotation:deleted': { annotationId: string };
  'annotation:selected': { annotationIds: string[] };
  'annotation:deselected': Record<string, never>;

  // ── View ──
  'zoom:changed': { zoom: number };
  'scroll:changed': { x: number; y: number };
  'tool:changed': { mode: ToolMode };

  // ── Text ──
  'text:extracted': { pageIndex: number; textContent: any };
  'text:selected': { text: string; rects: PdfRect[] };
  'search:found': { query: string; matches: any[]; total: number };

  // ── History ──
  'history:changed': { canUndo: boolean; canRedo: boolean };

  // ── Signatures ──
  'signature:placed': { fieldId: string; pageIndex: number };
  'signature:signed': { fieldId: string };
  'signature:validated': { fieldId: string; valid: boolean };

  // ── Redaction ──
  'redaction:marked': { annotationId: string };
  'redaction:applied': { pageIndex: number; count: number };

  // Extensibility
  [key: string]: any;
}

/** Search match result. */
export interface SearchMatch {
  pageIndex: number;
  text: string;
  rects: PdfRect[];
  charIndices: [number, number];
}
