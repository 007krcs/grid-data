// ─── PDF Plugin Manager ───
// Mirrors GridStorm's PluginManager with topological dependency resolution.

import type {
  PdfPlugin,
  PdfPluginContext,
  PdfPluginDisposer,
  PdfStoreAccess,
  PdfEventBusAccess,
  PdfCommandBusAccess,
  PdfCommandHandler,
  PdfApi,
  PdfViewerConfig,
} from '../types/plugin';
import type { PdfDocumentState } from '../types/document';
import type { PdfEventMap } from '../types/events';
import type { Store } from '../state/store';
import type { EventBus } from '../events/event-bus';
import type { PdfCommandBus } from '../commands/command-bus';

export class PdfPluginManager {
  private plugins = new Map<string, PdfPlugin>();
  private disposers = new Map<string, PdfPluginDisposer>();
  private installed = false;

  constructor(
    private store: Store<PdfDocumentState>,
    private eventBus: EventBus<PdfEventMap>,
    private commandBus: PdfCommandBus,
    private api: PdfApi,
    private config: PdfViewerConfig,
  ) {}

  register(plugin: PdfPlugin): void {
    if (this.installed) {
      throw new Error(`[GridStorm PDF] Cannot register plugin "${plugin.id}" after installation.`);
    }
    if (this.plugins.has(plugin.id)) {
      throw new Error(`[GridStorm PDF] Plugin "${plugin.id}" is already registered.`);
    }
    this.plugins.set(plugin.id, plugin);
  }

  installAll(): void {
    if (this.installed) return;
    this.installed = true;

    const sorted = this.topologicalSort();

    for (const plugin of sorted) {
      const context = this.createContext(plugin);
      try {
        const disposer = plugin.install(context);
        if (disposer) {
          this.disposers.set(plugin.id, disposer);
        }
      } catch (err) {
        console.error(`[GridStorm PDF] Failed to install plugin "${plugin.id}":`, err);
        throw err;
      }
    }
  }

  getPlugin<T extends PdfPlugin>(id: string): T | undefined {
    return this.plugins.get(id) as T | undefined;
  }

  destroyAll(): void {
    const ids = [...this.disposers.keys()].reverse();
    for (const id of ids) {
      try {
        this.disposers.get(id)?.();
      } catch (err) {
        console.error(`[GridStorm PDF] Error destroying plugin "${id}":`, err);
      }
    }
    this.disposers.clear();
    this.plugins.clear();
    this.installed = false;
  }

  // ── Private ──

  private createContext(_plugin: PdfPlugin): PdfPluginContext {
    const self = this;

    const storeAccess: PdfStoreAccess = {
      getState: () => self.store.getState(),
      setState: (updater) => self.store.setState(updater),
      subscribe: (listener) => self.store.subscribe(listener),
      batch: (fn) => self.store.batch(fn),
      select: (selector: any, listener: any) => self.store.select(selector, listener),
    };

    const eventBusAccess: PdfEventBusAccess = {
      emit: (event, payload) => self.eventBus.emit(event, payload),
      on: (event, listener) => self.eventBus.on(event, listener),
    };

    const commandBusAccess: PdfCommandBusAccess = {
      dispatch: (type: any, payload: any) => self.commandBus.dispatch(type, payload),
      dispatchAsync: (type: any, payload: any) => self.commandBus.dispatchAsync(type, payload),
      registerHandler: (type: any, handler: any) => self.commandBus.registerHandler(type, handler),
      registerAsyncHandler: (type: any, handler: any) => self.commandBus.registerAsyncHandler(type, handler),
      dispatchUndoable: (command) => self.commandBus.dispatchUndoable(command),
      undo: () => self.commandBus.undo(),
      redo: () => self.commandBus.redo(),
      canUndo: () => self.commandBus.canUndo(),
      canRedo: () => self.commandBus.canRedo(),
    };

    return {
      api: this.api,
      store: storeAccess,
      eventBus: eventBusAccess,
      commandBus: commandBusAccess,
      config: this.config,

      getPlugin: <T extends PdfPlugin>(id: string) => self.getPlugin<T>(id),

      registerCommand: (commandType: string, handler: PdfCommandHandler) => {
        self.commandBus.registerHandler(commandType, handler);
      },

      registerState: <S>(key: string, initialState: S) => {
        self.store.setState((prev) => ({
          ...prev,
          pluginState: {
            ...prev.pluginState,
            [key]: initialState,
          },
        }));
      },

      getState: <S>(key: string): S => {
        return self.store.getState().pluginState[key] as S;
      },

      setState: <S>(key: string, updater: (prev: S) => S) => {
        self.store.setState((prev) => ({
          ...prev,
          pluginState: {
            ...prev.pluginState,
            [key]: updater(prev.pluginState[key] as S),
          },
        }));
      },
    };
  }

  private topologicalSort(): PdfPlugin[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const result: PdfPlugin[] = [];

    const visit = (id: string, path: string[]) => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        throw new Error(
          `[GridStorm PDF] Circular plugin dependency: ${[...path, id].join(' → ')}`,
        );
      }

      visiting.add(id);
      const plugin = this.plugins.get(id);
      if (!plugin) {
        throw new Error(
          `[GridStorm PDF] Missing plugin dependency: "${id}" (required by ${path[path.length - 1] ?? 'root'})`,
        );
      }

      for (const dep of plugin.dependencies ?? []) {
        visit(dep, [...path, id]);
      }

      visiting.delete(id);
      visited.add(id);
      result.push(plugin);
    };

    for (const [id] of this.plugins) {
      visit(id, []);
    }

    return result;
  }
}
