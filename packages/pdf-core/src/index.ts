// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── @gridstorm/pdf-core ───
// Headless PDF document engine with command bus, undo/redo, and plugin system.

// Engine
export { createPdfEngine } from './engine/pdf-engine';
export type { PdfEngine } from './engine/pdf-engine';

// Parser interface (for pluggable PDF backends)
export { NoPdfParserError } from './engine/pdf-parser';
export type {
  PdfParser,
  ParsedDocument,
  PageInfo,
  PageTextContent,
  TextItem,
} from './engine/pdf-parser';

// Types - Document
export type {
  PdfDocumentState,
  PdfMetadata,
  PdfPageState,
  PageRotation,
  ToolMode,
  HistoryState,
  UndoableCommandRecord,
  AnnotationType,
  PdfRect,
  RgbaColor,
  AnnotationFlags,
  PdfAnnotation,
  PdfTextContent,
  PdfCharInfo,
  PdfWordInfo,
  PdfLineInfo,
} from './types/document';
export {
  createInitialState,
  createDefaultMetadata,
  createDefaultFlags,
} from './types/document';

// Types - Events
export type { PdfEventMap, SearchMatch } from './types/events';

// Types - Commands
export type { PdfCommandMap } from './types/commands';

// Types - Plugin
export type {
  PdfPlugin,
  PdfPluginDisposer,
  PdfPluginContext,
  PdfViewerConfig,
  PdfApi,
  PdfStoreAccess,
  PdfEventBusAccess,
  PdfCommandBusAccess,
  PdfCommandHandler,
  PdfAsyncCommandHandler,
} from './types/plugin';

// Infrastructure
export { Store } from './state/store';
export type { StoreListener, Selector } from './state/store';
export { EventBus } from './events/event-bus';
export type { EventListener } from './events/event-bus';
export { PdfCommandBus } from './commands/command-bus';
export type { CommandContext, CommandMiddleware } from './commands/command-bus';
export { PdfPluginManager } from './plugins/plugin-manager';

// Undoable Commands
export type { UndoableCommand } from './commands/undoable';
export { CompoundCommand, createUndoRecord } from './commands/undoable';

// Utilities
export { generateId, resetIdCounter } from './utils/id';
export {
  rectsIntersect,
  rectContains,
  pointInRect,
  rectUnion,
  rectWidth,
  rectHeight,
  rectCenter,
  rectTranslate,
  rectNormalize,
} from './utils/geometry';
export {
  rgba,
  rgbaToCss,
  hexToRgba,
  rgbaToHex,
  COLORS,
} from './utils/color';
