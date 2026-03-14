// ─── PDF Engine ───
// Factory function that wires all infrastructure together.

import type { PdfDocumentState, PdfAnnotation, ToolMode, PageRotation } from '../types/document';
import type { PdfEventMap } from '../types/events';
import type { PdfApi, PdfViewerConfig } from '../types/plugin';
import { createInitialState, createDefaultFlags } from '../types/document';
import { Store } from '../state/store';
import { EventBus } from '../events/event-bus';
import { PdfCommandBus } from '../commands/command-bus';
import { PdfPluginManager } from '../plugins/plugin-manager';
import { generateId } from '../utils/id';
import type { PdfParser } from './pdf-parser';
import { NoPdfParserError } from './pdf-parser';

/** The complete PDF engine instance. */
export interface PdfEngine {
  api: PdfApi;
  store: Store<PdfDocumentState>;
  eventBus: EventBus<PdfEventMap>;
  commandBus: PdfCommandBus;
  pluginManager: PdfPluginManager;
  destroy(): void;
}

/** Create a new PDF engine instance. */
export function createPdfEngine(config: PdfViewerConfig = {}): PdfEngine {
  const initialState = createInitialState();
  if (config.initialZoom) {
    initialState.zoom = config.initialZoom;
  }
  if (config.initialPage) {
    initialState.activePageIndex = config.initialPage;
  }
  if (config.initialToolMode) {
    initialState.toolMode = config.initialToolMode as ToolMode;
  }
  if (config.maxHistorySize) {
    initialState.history.maxSize = config.maxHistorySize;
  }

  const store = new Store<PdfDocumentState>(initialState);
  const eventBus = new EventBus<PdfEventMap>();
  const commandBus = new PdfCommandBus(store, eventBus, config.maxHistorySize);

  // Create the public API
  const api = createPdfApi(store, eventBus, commandBus, config.parser);

  // Create plugin manager
  const pluginManager = new PdfPluginManager(store, eventBus, commandBus, api, config);

  // Register plugins
  if (config.plugins) {
    for (const plugin of config.plugins) {
      pluginManager.register(plugin);
    }
  }

  // Register core command handlers
  registerCoreCommands(store, eventBus, commandBus);

  // Install plugins
  pluginManager.installAll();

  const destroy = () => {
    pluginManager.destroyAll();
    commandBus.clear();
    eventBus.removeAllListeners();
  };

  return {
    api,
    store,
    eventBus,
    commandBus,
    pluginManager,
    destroy,
  };
}

/** Create the public PdfApi. */
function createPdfApi(
  store: Store<PdfDocumentState>,
  eventBus: EventBus<PdfEventMap>,
  commandBus: PdfCommandBus,
  parser?: PdfParser,
): PdfApi {
  return {
    // Document
    async loadDocument(_source: ArrayBuffer | Uint8Array | string): Promise<void> {
      const bytes = _source instanceof ArrayBuffer
        ? new Uint8Array(_source)
        : typeof _source === 'string'
          ? new TextEncoder().encode(_source)
          : _source;

      if (parser) {
        // Use the provided parser to load and parse the document
        const data = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
        const parsed = await parser.loadDocument(data);

        store.setState((prev) => ({
          ...prev,
          loaded: true,
          documentBytes: bytes,
          metadata: {
            ...prev.metadata,
            ...parsed.metadata,
            pageCount: parsed.pageCount,
          },
          pages: parsed.pages.map((p, i) => ({
            index: i,
            width: p.width,
            height: p.height,
            rotation: p.rotation as PageRotation,
            annotationIds: [],
            rendered: false,
            textContent: null,
          })),
        }));

        eventBus.emit('document:loaded', {
          pageCount: parsed.pageCount,
          metadata: store.getState().metadata,
        });
      } else {
        // No parser configured — store raw bytes and create a placeholder page.
        console.warn(new NoPdfParserError().message);

        store.setState((prev) => ({
          ...prev,
          loaded: true,
          documentBytes: bytes,
          metadata: {
            ...prev.metadata,
            pageCount: 1,
          },
          pages: [{
            index: 0,
            width: 612,
            height: 792,
            rotation: 0,
            annotationIds: [],
            rendered: false,
            textContent: null,
          }],
        }));

        eventBus.emit('document:loaded', {
          pageCount: 1,
          metadata: store.getState().metadata,
        });
      }
    },

    async saveDocument(): Promise<Blob> {
      const bytes = store.getState().documentBytes;
      // Create a new copy of the bytes to avoid retaining a reference to the original buffer
      const copy = bytes ? new Uint8Array(bytes) : null;
      const blob = new Blob(copy ? [copy] : [], { type: 'application/pdf' });
      eventBus.emit('document:saved', { blob });
      return blob;
    },

    closeDocument(): void {
      store.setState((prev) => ({
        ...createInitialState(),
        history: prev.history,
      }));
      eventBus.emit('document:closed', {});
    },

    // Navigation
    goToPage(pageIndex: number): void {
      commandBus.dispatch('page:goTo', { pageIndex });
    },

    getCurrentPage(): number {
      return store.getState().activePageIndex;
    },

    getPageCount(): number {
      return store.getState().pages.length;
    },

    // Zoom
    setZoom(zoom: number): void {
      commandBus.dispatch('zoom:set', { zoom });
    },

    getZoom(): number {
      return store.getState().zoom;
    },

    // Tools
    setToolMode(mode: string): void {
      commandBus.dispatch('tool:set', { mode: mode as ToolMode });
    },

    getToolMode(): string {
      return store.getState().toolMode;
    },

    // Annotations
    getAnnotations(pageIndex?: number): PdfAnnotation[] {
      const state = store.getState();
      const annotations = Object.values(state.annotations);
      if (pageIndex !== undefined) {
        return annotations.filter((a) => a.pageIndex === pageIndex);
      }
      return annotations;
    },

    getAnnotation(id: string): PdfAnnotation | undefined {
      return store.getState().annotations[id];
    },

    // History
    undo(): void {
      commandBus.undo();
    },

    redo(): void {
      commandBus.redo();
    },

    canUndo(): boolean {
      return commandBus.canUndo();
    },

    canRedo(): boolean {
      return commandBus.canRedo();
    },

    // State
    getState(): PdfDocumentState {
      return store.getState();
    },

    // Events
    addEventListener<K extends keyof PdfEventMap>(
      event: K,
      listener: (payload: PdfEventMap[K]) => void,
    ): () => void {
      return eventBus.on(event, listener);
    },

    // Plugin API
    getPluginApi<T>(_pluginId: string): T | undefined {
      // Plugins can register their APIs via pluginState
      return store.getState().pluginState[_pluginId] as T | undefined;
    },

    // Lifecycle
    destroy(): void {
      // Handled by engine.destroy()
    },
  };
}

/** Register core command handlers for navigation, zoom, tool mode, and annotations. */
function registerCoreCommands(
  store: Store<PdfDocumentState>,
  eventBus: EventBus<PdfEventMap>,
  commandBus: PdfCommandBus,
): void {
  // Page navigation
  commandBus.registerHandler('page:goTo', (payload: { pageIndex: number }) => {
    const { pageIndex } = payload;
    const state = store.getState();
    const clamped = Math.max(0, Math.min(pageIndex, state.pages.length - 1));
    store.setState((prev) => ({ ...prev, activePageIndex: clamped }));
    eventBus.emit('page:changed', { pageIndex: clamped });
  });

  // Zoom
  commandBus.registerHandler('zoom:set', (payload: { zoom: number }) => {
    const zoom = Math.max(0.1, Math.min(payload.zoom, 10));
    store.setState((prev) => ({ ...prev, zoom }));
    eventBus.emit('zoom:changed', { zoom });
  });

  // Zoom fit width — calculates zoom to fit page width in the container
  commandBus.registerHandler('zoom:fitWidth', (payload: { containerWidth?: number }) => {
    const state = store.getState();
    const page = state.pages[state.activePageIndex];
    if (!page) return;
    const containerWidth = payload?.containerWidth || 800;
    const zoom = Math.max(0.1, Math.min(containerWidth / page.width, 10));
    store.setState((prev) => ({ ...prev, zoom }));
    eventBus.emit('zoom:changed', { zoom });
  });

  // Zoom fit page — calculates zoom to fit entire page in the container
  commandBus.registerHandler('zoom:fitPage', (payload: { containerWidth?: number; containerHeight?: number }) => {
    const state = store.getState();
    const page = state.pages[state.activePageIndex];
    if (!page) return;
    const containerWidth = payload?.containerWidth || 800;
    const containerHeight = payload?.containerHeight || 600;
    const zoomW = containerWidth / page.width;
    const zoomH = containerHeight / page.height;
    const zoom = Math.max(0.1, Math.min(Math.min(zoomW, zoomH), 10));
    store.setState((prev) => ({ ...prev, zoom }));
    eventBus.emit('zoom:changed', { zoom });
  });

  // Scroll
  commandBus.registerHandler('scroll:to', (payload: { x: number; y: number }) => {
    store.setState((prev) => ({ ...prev, scroll: payload }));
    eventBus.emit('scroll:changed', payload);
  });

  // Tool mode
  commandBus.registerHandler('tool:set', (payload: { mode: ToolMode }) => {
    store.setState((prev) => ({ ...prev, toolMode: payload.mode }));
    eventBus.emit('tool:changed', { mode: payload.mode });
  });

  // History commands — undo/redo exposed only via API methods to avoid recursion
  commandBus.registerHandler('history:clear', () => {
    commandBus.clearHistory();
  });

  // ── Annotation Commands ──

  // Create annotation
  commandBus.registerHandler('annotation:create', (payload: {
    annotation: Omit<PdfAnnotation, 'id' | 'createdAt' | 'modifiedAt'> & { id?: string };
  }) => {
    const now = new Date().toISOString();
    const annotation: PdfAnnotation = {
      ...payload.annotation,
      id: payload.annotation.id || generateId('ann'),
      createdAt: now,
      modifiedAt: now,
      flags: payload.annotation.flags || createDefaultFlags(),
      customData: payload.annotation.customData || {},
    } as PdfAnnotation;

    store.setState((prev) => {
      const annotations = { ...prev.annotations, [annotation.id]: annotation };
      const pages = prev.pages.map((p, i) => {
        if (i === annotation.pageIndex) {
          return { ...p, annotationIds: [...p.annotationIds, annotation.id] };
        }
        return p;
      });
      return { ...prev, annotations, pages };
    });

    eventBus.emit('annotation:created', { annotation });
  });

  // Update annotation
  commandBus.registerHandler('annotation:update', (payload: {
    annotationId: string;
    changes: Partial<PdfAnnotation>;
  }) => {
    const state = store.getState();
    const existing = state.annotations[payload.annotationId];
    if (!existing) return;

    const updated: PdfAnnotation = {
      ...existing,
      ...payload.changes,
      id: existing.id, // id cannot be changed
      modifiedAt: new Date().toISOString(),
    };

    store.setState((prev) => ({
      ...prev,
      annotations: { ...prev.annotations, [payload.annotationId]: updated },
    }));

    eventBus.emit('annotation:updated', { annotation: updated, changes: payload.changes });
  });

  // Delete annotation
  commandBus.registerHandler('annotation:delete', (payload: { annotationId: string }) => {
    const state = store.getState();
    const annotation = state.annotations[payload.annotationId];
    if (!annotation) return;

    store.setState((prev) => {
      const annotations = { ...prev.annotations };
      delete annotations[payload.annotationId];

      const pages = prev.pages.map((p, i) => {
        if (i === annotation.pageIndex) {
          return {
            ...p,
            annotationIds: p.annotationIds.filter((id) => id !== payload.annotationId),
          };
        }
        return p;
      });

      // Remove from selection if selected
      const selectedAnnotationIds = prev.selectedAnnotationIds.filter(
        (id) => id !== payload.annotationId,
      );

      return { ...prev, annotations, pages, selectedAnnotationIds };
    });

    eventBus.emit('annotation:deleted', { annotationId: payload.annotationId });
  });

  // Select annotations
  commandBus.registerHandler('annotation:select', (payload: { annotationIds: string[] }) => {
    store.setState((prev) => ({ ...prev, selectedAnnotationIds: payload.annotationIds }));
    eventBus.emit('annotation:selected', { annotationIds: payload.annotationIds });
  });

  // Deselect annotations
  commandBus.registerHandler('annotation:deselect', () => {
    store.setState((prev) => ({ ...prev, selectedAnnotationIds: [] }));
    eventBus.emit('annotation:deselected', {});
  });

  // Move annotation
  commandBus.registerHandler('annotation:move', (payload: {
    annotationId: string;
    deltaX: number;
    deltaY: number;
  }) => {
    const state = store.getState();
    const annotation = state.annotations[payload.annotationId];
    if (!annotation) return;

    const newRect = [
      annotation.rect[0] + payload.deltaX,
      annotation.rect[1] + payload.deltaY,
      annotation.rect[2] + payload.deltaX,
      annotation.rect[3] + payload.deltaY,
    ] as [number, number, number, number];

    const updated: PdfAnnotation = {
      ...annotation,
      rect: newRect,
      modifiedAt: new Date().toISOString(),
    };

    store.setState((prev) => ({
      ...prev,
      annotations: { ...prev.annotations, [payload.annotationId]: updated },
    }));

    eventBus.emit('annotation:updated', { annotation: updated, changes: { rect: newRect } });
  });

  // Resize annotation
  commandBus.registerHandler('annotation:resize', (payload: {
    annotationId: string;
    newRect: [number, number, number, number];
  }) => {
    const state = store.getState();
    const annotation = state.annotations[payload.annotationId];
    if (!annotation) return;

    const updated: PdfAnnotation = {
      ...annotation,
      rect: payload.newRect,
      modifiedAt: new Date().toISOString(),
    };

    store.setState((prev) => ({
      ...prev,
      annotations: { ...prev.annotations, [payload.annotationId]: updated },
    }));

    eventBus.emit('annotation:updated', { annotation: updated, changes: { rect: payload.newRect } });
  });
}
