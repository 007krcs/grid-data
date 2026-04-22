// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── PDF Command Map ───

import type {
  PdfAnnotation,
  PdfRect,
  PageRotation,
  ToolMode,
} from './document';

/** All commands that can be dispatched to the PDF engine. */
export interface PdfCommandMap {
  // ── Navigation ──
  'page:goTo': { pageIndex: number };
  'zoom:set': { zoom: number };
  'zoom:fitWidth': Record<string, never>;
  'zoom:fitPage': Record<string, never>;
  'scroll:to': { x: number; y: number };
  'tool:set': { mode: ToolMode };

  // ── Page Manipulation ──
  'page:insert': { atIndex: number; blank?: { width: number; height: number }; fromSource?: ArrayBuffer };
  'page:delete': { pageIndex: number };
  'page:reorder': { fromIndex: number; toIndex: number };
  'page:rotate': { pageIndex: number; degrees: PageRotation };
  'page:rotateAll': { degrees: PageRotation };

  // ── Annotations ──
  'annotation:create': { annotation: Omit<PdfAnnotation, 'id' | 'createdAt' | 'modifiedAt'> & { id?: string } };
  'annotation:update': { annotationId: string; changes: Partial<PdfAnnotation> };
  'annotation:delete': { annotationId: string };
  'annotation:select': { annotationIds: string[] };
  'annotation:deselect': Record<string, never>;
  'annotation:move': { annotationId: string; deltaX: number; deltaY: number };
  'annotation:resize': { annotationId: string; newRect: PdfRect };

  // ── Text ──
  'text:extract': { pageIndex: number };
  'text:extractAll': Record<string, never>;
  'text:search': { query: string; caseSensitive?: boolean; wholeWord?: boolean; regex?: boolean };
  'text:searchNext': Record<string, never>;
  'text:searchPrev': Record<string, never>;
  'text:clearSearch': Record<string, never>;

  // ── History ──
  'history:undo': Record<string, never>;
  'history:redo': Record<string, never>;
  'history:clear': Record<string, never>;

  // ── Signatures ──
  'signature:place': { pageIndex: number; rect: PdfRect; fieldName: string };
  'signature:sign': { fieldId: string; certificate: ArrayBuffer; privateKey: ArrayBuffer; password?: string };
  'signature:validate': { fieldId: string };
  'signature:remove': { fieldId: string };

  // ── Redaction ──
  'redaction:mark': { pageIndex: number; rect: PdfRect; overlayText?: string };
  'redaction:apply': { annotationIds: string[] };
  'redaction:applyAll': Record<string, never>;

  // ── Document ──
  'document:save': Record<string, never>;
  'document:close': Record<string, never>;

  // Extensibility
  [key: string]: any;
}
