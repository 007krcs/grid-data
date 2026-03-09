// ─── Plugin Manager ───
// Manages plugin registration, dependency resolution, lifecycle, and destruction.

import type {
  GridPlugin,
  PluginContext,
  PluginDisposer,
  PluginStoreAccess,
  PluginEventBus,
  PluginCommandBus,
  CommandHandler,
} from '../types/plugin';
import type { GridApi, GridConfig, GridState } from '../types/grid';
import type { GridEventMap } from '../types/events';
import type { CellRendererFn } from '../types/column';
import type { CellEditorDef } from '../types/editing';
import type { EventBus } from '../events/event-bus';
import type { CommandBus } from '../events/command-bus';
import type { Store } from '../state/store';

export class PluginManager<TData = any> {
  private plugins = new Map<string, GridPlugin<TData>>();
  private disposers = new Map<string, PluginDisposer>();
  private pluginApis = new Map<string, any>();
  private cellRenderers = new Map<string, CellRendererFn>();
  private cellEditors = new Map<string, CellEditorDef>();
  private installed = false;

  constructor(
    private store: Store<GridState<TData>>,
    private eventBus: EventBus<GridEventMap<TData>>,
    private commandBus: CommandBus,
    private api: GridApi<TData>,
    private config: GridConfig<TData>,
  ) {}

  /** Register a plugin. Must be called before installAll(). */
  register(plugin: GridPlugin<TData>): void {
    if (this.installed) {
      throw new Error(`[GridStorm] Cannot register plugin "${plugin.id}" after installation.`);
    }
    if (this.plugins.has(plugin.id)) {
      throw new Error(`[GridStorm] Plugin "${plugin.id}" is already registered.`);
    }
    this.plugins.set(plugin.id, plugin);
  }

  /** Install all registered plugins in dependency order. */
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
        console.error(`[GridStorm] Failed to install plugin "${plugin.id}":`, err);
        throw err;
      }
    }
  }

  /** Get a plugin by ID. */
  getPlugin<T extends GridPlugin>(id: string): T | undefined {
    return this.plugins.get(id) as T | undefined;
  }

  /** Get a plugin's registered API. */
  getPluginApi<T>(id: string): T | undefined {
    return this.pluginApis.get(id) as T | undefined;
  }

  /** Get a registered cell renderer. */
  getCellRenderer(name: string): CellRendererFn | undefined {
    return this.cellRenderers.get(name);
  }

  /** Get a registered cell editor. */
  getCellEditor(name: string): CellEditorDef | undefined {
    return this.cellEditors.get(name);
  }

  /** Destroy all plugins in reverse installation order. */
  destroyAll(): void {
    const ids = [...this.disposers.keys()].reverse();
    for (const id of ids) {
      try {
        this.disposers.get(id)?.();
      } catch (err) {
        console.error(`[GridStorm] Error destroying plugin "${id}":`, err);
      }
    }
    this.disposers.clear();
    this.plugins.clear();
    this.pluginApis.clear();
    this.cellRenderers.clear();
    this.cellEditors.clear();
    this.installed = false;
  }

  // ── Private ──

  private createContext(_plugin: GridPlugin<TData>): PluginContext<TData> {
    const self = this;

    const storeAccess: PluginStoreAccess<TData> = {
      getState: () => self.store.getState(),
      setState: (updater) => self.store.setState(updater),
      subscribe: (listener) => self.store.subscribe(listener),
      batch: (fn) => self.store.batch(fn),
      select: (selector: any, listener: any) => self.store.select(selector, listener),
    };

    const eventBusAccess: PluginEventBus<TData> = {
      emit: (event, payload) => self.eventBus.emit(event, payload),
      on: (event, listener) => self.eventBus.on(event, listener),
    };

    const commandBusAccess: PluginCommandBus = {
      dispatch: (type: any, payload: any) => self.commandBus.dispatch(type, payload),
      dispatchAsync: (type: any, payload: any) => self.commandBus.dispatchAsync(type, payload),
      registerHandler: (type: any, handler: any) => self.commandBus.registerHandler(type, handler),
      registerAsyncHandler: (type: any, handler: any) =>
        self.commandBus.registerAsyncHandler(type, handler),
    };

    return {
      api: this.api,
      store: storeAccess,
      eventBus: eventBusAccess,
      commandBus: commandBusAccess,
      config: this.config,

      getPlugin: <T extends GridPlugin>(id: string) => self.getPlugin<T>(id),

      registerCommand: (commandType: string, handler: CommandHandler) => {
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

      registerCellRenderer: (name: string, renderer: CellRendererFn) => {
        self.cellRenderers.set(name, renderer);
      },

      registerCellEditor: (name: string, editor: CellEditorDef) => {
        self.cellEditors.set(name, editor);
      },
    };
  }

  private topologicalSort(): GridPlugin<TData>[] {
    const visited = new Set<string>();
    const visiting = new Set<string>(); // cycle detection
    const result: GridPlugin<TData>[] = [];

    const visit = (id: string, path: string[]) => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        throw new Error(
          `[GridStorm] Circular plugin dependency detected: ${[...path, id].join(' → ')}`,
        );
      }

      visiting.add(id);
      const plugin = this.plugins.get(id);
      if (!plugin) {
        throw new Error(
          `[GridStorm] Missing plugin dependency: "${id}" (required by ${path[path.length - 1] ?? 'root'})`,
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
