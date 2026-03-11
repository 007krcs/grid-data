// ─── PDF Document Model ───

/** Complete state of an opened PDF document. */
export interface PdfDocumentState {
  /** Document metadata. */
  metadata: PdfMetadata;
  /** Ordered array of page states. */
  pages: PdfPageState[];
  /** All annotations indexed by ID. */
  annotations: Record<string, PdfAnnotation>;
  /** Currently active page index (0-based). */
  activePageIndex: number;
  /** Zoom level (1.0 = 100%). */
  zoom: number;
  /** Scroll position. */
  scroll: { x: number; y: number };
  /** Current tool mode. */
  toolMode: ToolMode;
  /** Selected annotation IDs. */
  selectedAnnotationIds: string[];
  /** Undo/redo history state. */
  history: HistoryState;
  /** Plugin-owned state slices. */
  pluginState: Record<string, unknown>;
  /** Whether a document is loaded. */
  loaded: boolean;
  /** Raw PDF bytes (for save/export). */
  documentBytes: Uint8Array | null;
}

/** PDF document metadata. */
export interface PdfMetadata {
  title: string;
  author: string;
  subject: string;
  keywords: string[];
  creator: string;
  producer: string;
  creationDate: Date | null;
  modificationDate: Date | null;
  pageCount: number;
  encrypted: boolean;
}

/** State of a single PDF page. */
export interface PdfPageState {
  index: number;
  /** Width in PDF points (1 pt = 1/72 inch). */
  width: number;
  /** Height in PDF points. */
  height: number;
  rotation: PageRotation;
  /** Annotation IDs on this page. */
  annotationIds: string[];
  /** Whether the page content has been rendered to canvas. */
  rendered: boolean;
  /** Extracted text content (null if not yet extracted). */
  textContent: PdfTextContent | null;
}

export type PageRotation = 0 | 90 | 180 | 270;

/** Tool modes for the PDF viewer. */
export type ToolMode =
  | 'select'
  | 'hand'
  | 'text-select'
  | 'annotation-highlight'
  | 'annotation-underline'
  | 'annotation-strikethrough'
  | 'annotation-squiggle'
  | 'annotation-circle'
  | 'annotation-rectangle'
  | 'annotation-polygon'
  | 'annotation-ink'
  | 'annotation-text'
  | 'annotation-freetext'
  | 'annotation-stamp'
  | 'annotation-line'
  | 'annotation-redaction'
  | 'signature';

/** Undo/redo history state. */
export interface HistoryState {
  undoStack: UndoableCommandRecord[];
  redoStack: UndoableCommandRecord[];
  maxSize: number;
}

/** Serializable record of an undoable command. */
export interface UndoableCommandRecord {
  type: string;
  description: string;
  /** State snapshot before the command was executed. */
  stateBefore: Partial<PdfDocumentState>;
  /** State snapshot after the command was executed. */
  stateAfter: Partial<PdfDocumentState>;
}

// ─── Annotation Types ───

export type AnnotationType =
  | 'highlight'
  | 'underline'
  | 'strikethrough'
  | 'squiggle'
  | 'circle'
  | 'rectangle'
  | 'polygon'
  | 'ink'
  | 'text'
  | 'freetext'
  | 'stamp'
  | 'line'
  | 'redaction';

/** Bounding rectangle in PDF coordinates [x1, y1, x2, y2]. */
export type PdfRect = [number, number, number, number];

/** RGBA color. */
export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** PDF annotation flags per ISO 32000. */
export interface AnnotationFlags {
  invisible: boolean;
  hidden: boolean;
  print: boolean;
  noZoom: boolean;
  noRotate: boolean;
  noView: boolean;
  readOnly: boolean;
  locked: boolean;
  lockedContents: boolean;
}

/** Base annotation interface. */
export interface PdfAnnotation {
  id: string;
  type: AnnotationType;
  pageIndex: number;
  rect: PdfRect;
  color: RgbaColor;
  opacity: number;
  borderWidth: number;
  subject: string;
  author: string;
  createdAt: string;
  modifiedAt: string;
  contents: string;
  flags: AnnotationFlags;
  customData: Record<string, unknown>;
}

// ─── Text Types ───

/** Text content extracted from a page. */
export interface PdfTextContent {
  chars: PdfCharInfo[];
  words: PdfWordInfo[];
  lines: PdfLineInfo[];
}

/** Character-level text information. */
export interface PdfCharInfo {
  char: string;
  rect: PdfRect;
  fontName: string;
  fontSize: number;
  transform: [number, number, number, number, number, number];
}

/** Word-level text information. */
export interface PdfWordInfo {
  text: string;
  rect: PdfRect;
  charIndices: [number, number];
}

/** Line-level text information. */
export interface PdfLineInfo {
  text: string;
  rect: PdfRect;
  wordIndices: [number, number];
}

/** Default annotation flags. */
export function createDefaultFlags(): AnnotationFlags {
  return {
    invisible: false,
    hidden: false,
    print: true,
    noZoom: false,
    noRotate: false,
    noView: false,
    readOnly: false,
    locked: false,
    lockedContents: false,
  };
}

/** Default empty metadata. */
export function createDefaultMetadata(): PdfMetadata {
  return {
    title: '',
    author: '',
    subject: '',
    keywords: [],
    creator: '',
    producer: 'GridStorm PDF',
    creationDate: null,
    modificationDate: null,
    pageCount: 0,
    encrypted: false,
  };
}

/** Create the initial document state. */
export function createInitialState(): PdfDocumentState {
  return {
    metadata: createDefaultMetadata(),
    pages: [],
    annotations: {},
    activePageIndex: 0,
    zoom: 1.0,
    scroll: { x: 0, y: 0 },
    toolMode: 'select',
    selectedAnnotationIds: [],
    history: { undoStack: [], redoStack: [], maxSize: 50 },
    pluginState: {},
    loaded: false,
    documentBytes: null,
  };
}
