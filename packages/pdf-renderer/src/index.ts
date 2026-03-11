// ─── @gridstorm/pdf-renderer ───
//
// Canvas renderer with DOM text layer and annotation layer for GridStorm PDF.

// Main renderer
export { PdfRenderer } from './renderer';
export type { PdfRendererConfig } from './renderer';

// Page rendering
export { PageRenderer } from './page-renderer';
export type { PageRenderResult, PageRendererConfig } from './page-renderer';

// Text layer
export { TextLayer } from './text-layer';
export type { TextLayerConfig, SearchHighlight } from './text-layer';

// Annotation layer
export { AnnotationLayer } from './annotation-layer';
export type { AnnotationRendererFn } from './annotation-layer';

// Viewport calculation
export {
  computePageViewport,
  computePageLayouts,
  computeTotalHeight,
  getVisiblePages,
  clampZoom,
  PAGE_GAP,
  MIN_ZOOM,
  MAX_ZOOM,
  CSS_UNITS,
} from './viewport';
export type { PageViewport } from './viewport';

// Scroll management
export { ScrollManager } from './scroll-manager';
export type { ScrollManagerConfig } from './scroll-manager';

// Zoom management
export { ZoomManager, ZOOM_PRESETS } from './zoom-manager';
export type { ZoomManagerConfig } from './zoom-manager';

// Toolbar
export { Toolbar } from './toolbar';
export type { ToolbarConfig, ToolbarItem } from './toolbar';

// Extension types
export type {
  PdfRendererExtension,
  PdfRendererContext,
} from './extensions/types';
