// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
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
  RenderCapability,
} from '../types/plugin';
import type { GridApi, GridConfig, GridState } from '../types/grid';
import type { GridEventMap } from '../types/events';
import type { CellRendererFn } from '../types/column';
import type { CellEditorDef } from '../types/editing';
import type { EventBus } from '../events/event-bus';
import type { CommandBus } from '../events/command-bus';
import type { Store } from '../state/store';

/**
 * Fallback mapping from built-in plugin IDs to the capability they provide,
 * for plugins that predate the {@link GridPlugin.capabilities} field. Plugins
 * that declare `capabilities` explicitly do not rely on this map; it only keeps
 * older/third-party plugins working without changes.
 */
const LEGACY_CAPABILITY_BY_PLUGIN_ID: Record<string, RenderCapability> = {
  editing: 'cell-editing',
  grouping: 'row-grouping',
  'master-detail': 'master-detail',
  'tree-data': 'tree-data',
  pagination: 'pagination',
};

export class PluginManager<TData = any> {
  private plugins = new Map<string, GridPlugin<TData>>();
  private disposers = new Map<string, PluginDisposer>();
  private pluginApis = new Map<string, any>();
  private cellRenderers = new Map<string, CellRendererFn>();
  private cellEditors = new Map<string, CellEditorDef>();
  private pluginUnsubscribes = new Map<string, Array<() => void>>();
  private pluginStateOwners = new Map<string, string>(); // state key → plugin id
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

  /**
   * Whether any registered plugin provides the given render capability.
   *
   * Checks each plugin's declared {@link GridPlugin.capabilities} first, then
   * falls back to a built-in plugin-ID → capability map so plugins that haven't
   * adopted the `capabilities` field still work. Lets consumers (the DOM
   * renderer) enable behavior without hard-coding plugin IDs.
   */
  hasCapability(capability: RenderCapability | string): boolean {
    for (const plugin of this.plugins.values()) {
      if (plugin.capabilities?.includes(capability)) return true;
      if (LEGACY_CAPABILITY_BY_PLUGIN_ID[plugin.id] === capability) return true;
    }
    return false;
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
        // Call all tracked unsubscribes (event + command) for this plugin
        const unsubs = this.pluginUnsubscribes.get(id);
        if (unsubs) {
          for (const unsub of unsubs) {
            unsub();
          }
        }
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
    this.pluginUnsubscribes.clear();
    this.pluginStateOwners.clear();
    this.installed = false;
  }

  // ── Private ──

  private trackUnsubscribe(pluginId: string, unsub: () => void): void {
    let unsubs = this.pluginUnsubscribes.get(pluginId);
    if (!unsubs) {
      unsubs = [];
      this.pluginUnsubscribes.set(pluginId, unsubs);
    }
    unsubs.push(unsub);
  }

  private createContext(plugin: GridPlugin<TData>): PluginContext<TData> {
    const self = this;
    const pluginId = plugin.id;

    const storeAccess: PluginStoreAccess<TData> = {
      getState: () => self.store.getState(),
      setState: (updater) => self.store.setState(updater),
      subscribe: (listener) => self.store.subscribe(listener),
      batch: (fn) => self.store.batch(fn),
      select: (selector: any, listener: any) => self.store.select(selector, listener),
    };

    const eventBusAccess: PluginEventBus<TData> = {
      emit: (event, payload) => self.eventBus.emit(event, payload),
      on: (event, listener) => {
        const unsub = self.eventBus.on(event, listener);
        self.trackUnsubscribe(pluginId, unsub);
        return unsub;
      },
    };

    const commandBusAccess: PluginCommandBus = {
      dispatch: (type: any, payload: any) => self.commandBus.dispatch(type, payload),
      dispatchAsync: (type: any, payload: any) => self.commandBus.dispatchAsync(type, payload),
      registerHandler: (type: any, handler: any) => {
        const unsub = self.commandBus.registerHandler(type, handler);
        self.trackUnsubscribe(pluginId, unsub);
        return unsub;
      },
      registerAsyncHandler: (type: any, handler: any) => {
        const unsub = self.commandBus.registerAsyncHandler(type, handler);
        self.trackUnsubscribe(pluginId, unsub);
        return unsub;
      },
    };

    return {
      api: this.api,
      store: storeAccess,
      eventBus: eventBusAccess,
      commandBus: commandBusAccess,
      config: this.config,

      getPlugin: <T extends GridPlugin>(id: string) => {
        if (
          typeof globalThis !== 'undefined' &&
          (globalThis as any).__GRIDSTORM_DEV__ &&
          plugin.dependencies &&
          !plugin.dependencies.includes(id)
        ) {
          console.warn(
            `[GridStorm] Plugin "${pluginId}" accessed plugin "${id}" without declaring it as a dependency.`,
          );
        }
        return self.getPlugin<T>(id);
      },

      registerCommand: (commandType: string, handler: CommandHandler) => {
        const unsub = self.commandBus.registerHandler(commandType, handler);
        self.trackUnsubscribe(pluginId, unsub);
      },

      registerState: <S>(key: string, initialState: S) => {
        const existingOwner = self.pluginStateOwners.get(key);
        if (existingOwner && existingOwner !== pluginId) {
          throw new Error(
            `[GridStorm] Plugin "${pluginId}" attempted to register state key "${key}" already owned by plugin "${existingOwner}".`,
          );
        }
        self.pluginStateOwners.set(key, pluginId);
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
