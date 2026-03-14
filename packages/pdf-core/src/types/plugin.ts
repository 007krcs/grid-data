// ─── PDF Plugin Types ───

import type { PdfDocumentState } from './document';
import type { PdfEventMap } from './events';
import type { PdfCommandMap } from './commands';

/** Interface for PDF plugins that extend viewer functionality. */
export interface PdfPlugin {
  /** Unique plugin identifier. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Semantic version. */
  version: string;
  /** IDs of plugins that must be installed before this one. */
  dependencies?: string[];
  /** Called during engine initialization to set up the plugin. */
  install(context: PdfPluginContext): void | PdfPluginDisposer;
}

/** Cleanup function returned by a plugin's install method. */
export type PdfPluginDisposer = () => void;

/** Context provided to PDF plugins during installation. */
export interface PdfPluginContext {
  /** Public PDF API. */
  api: PdfApi;
  /** Access to the internal state store. */
  store: PdfStoreAccess;
  /** Event bus for emitting and subscribing to events. */
  eventBus: PdfEventBusAccess;
  /** Command bus for dispatching and handling commands. */
  commandBus: PdfCommandBusAccess;
  /** Viewer configuration. */
  config: PdfViewerConfig;
  /** Get another installed plugin by ID. */
  getPlugin<T extends PdfPlugin>(id: string): T | undefined;
  /** Register a command handler. */
  registerCommand(commandType: string, handler: PdfCommandHandler): void;
  /** Register a plugin-owned state slice. */
  registerState<S>(key: string, initialState: S): void;
  /** Read plugin state. */
  getState<S>(key: string): S;
  /** Update plugin state. */
  setState<S>(key: string, updater: (prev: S) => S): void;
}

/** PDF viewer configuration. */
export interface PdfViewerConfig {
  /** Container element or selector. */
  container?: HTMLElement | string;
  /** Initial zoom level (default: 1.0). */
  initialZoom?: number;
  /** Initial page index (default: 0). */
  initialPage?: number;
  /** Initial tool mode (default: 'select'). */
  initialToolMode?: string;
  /** Maximum undo history size (default: 50). */
  maxHistorySize?: number;
  /** Plugins to install. */
  plugins?: PdfPlugin[];
  /** Enable text selection layer (default: true). */
  enableTextLayer?: boolean;
  /** Enable annotation layer (default: true). */
  enableAnnotationLayer?: boolean;
  /** Pluggable PDF parser backend (e.g. pdf.js adapter). */
  parser?: import('../engine/pdf-parser').PdfParser;
}

// ─── Public API ───

/** Public API for interacting with the PDF engine. */
export interface PdfApi {
  // Document
  loadDocument(source: ArrayBuffer | Uint8Array | string): Promise<void>;
  saveDocument(): Promise<Blob>;
  closeDocument(): void;

  // Navigation
  goToPage(pageIndex: number): void;
  getCurrentPage(): number;
  getPageCount(): number;

  // Zoom
  setZoom(zoom: number): void;
  getZoom(): number;

  // Tools
  setToolMode(mode: string): void;
  getToolMode(): string;

  // Annotations
  getAnnotations(pageIndex?: number): import('./document').PdfAnnotation[];
  getAnnotation(id: string): import('./document').PdfAnnotation | undefined;

  // History
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;

  // State
  getState(): PdfDocumentState;

  // Events
  addEventListener<K extends keyof PdfEventMap>(
    event: K,
    listener: (payload: PdfEventMap[K]) => void,
  ): () => void;

  // Plugin API
  getPluginApi<T>(pluginId: string): T | undefined;

  // Lifecycle
  destroy(): void;
}

// ─── Store Access ───

export interface PdfStoreAccess {
  getState(): PdfDocumentState;
  setState(updater: (prev: PdfDocumentState) => PdfDocumentState): void;
  subscribe(listener: () => void): () => void;
  batch(fn: () => void): void;
  select<T>(
    selector: (state: PdfDocumentState) => T,
    listener: (value: T, prevValue: T) => void,
  ): () => void;
}

// ─── Event Bus Access ───

export interface PdfEventBusAccess {
  emit<K extends keyof PdfEventMap>(event: K, payload: PdfEventMap[K]): void;
  on<K extends keyof PdfEventMap>(
    event: K,
    listener: (payload: PdfEventMap[K]) => void,
  ): () => void;
}

// ─── Command Bus Access ───

export interface PdfCommandBusAccess {
  dispatch<K extends keyof PdfCommandMap>(commandType: K, payload: PdfCommandMap[K]): void;
  dispatch(commandType: string, payload: any): void;
  dispatchAsync<K extends keyof PdfCommandMap>(commandType: K, payload: PdfCommandMap[K]): Promise<void>;
  dispatchAsync(commandType: string, payload: any): Promise<void>;
  registerHandler<K extends keyof PdfCommandMap>(
    commandType: K,
    handler: (payload: PdfCommandMap[K]) => void,
  ): () => void;
  registerHandler(commandType: string, handler: PdfCommandHandler): () => void;
  registerAsyncHandler<K extends keyof PdfCommandMap>(
    commandType: K,
    handler: (payload: PdfCommandMap[K]) => Promise<void>,
  ): () => void;
  registerAsyncHandler(commandType: string, handler: PdfAsyncCommandHandler): () => void;
  /** Dispatch an undoable command with undo/redo support. */
  dispatchUndoable(command: import('../commands/undoable').UndoableCommand): void;
  /** Undo the last undoable command. */
  undo(): void;
  /** Redo the last undone command. */
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
}

export type PdfCommandHandler = (payload: any) => void;
export type PdfAsyncCommandHandler = (payload: any) => Promise<void>;
