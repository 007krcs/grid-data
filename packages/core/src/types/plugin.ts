// ─── Plugin Types ───

import type { GridApi, GridState } from './grid';
import type { GridEventMap } from './events';
import type { CellRendererFn } from './column';
import type { CellEditorDef } from './editing';

export interface GridPlugin<TData = any> {
  /** Unique plugin identifier. */
  id: string;

  /** Human-readable name. */
  name: string;

  /** Semver version string. */
  version: string;

  /** IDs of plugins that must be installed before this one. */
  dependencies?: string[];

  /**
   * Called during grid initialization.
   * Return a disposer function that will be called on grid destruction.
   */
  install(context: PluginContext<TData>): void | PluginDisposer;
}

export type PluginDisposer = () => void;

export interface PluginContext<TData = any> {
  /** Public grid API. */
  api: GridApi<TData>;

  /** Access to the internal state store. */
  store: PluginStoreAccess<TData>;

  /** Typed event emitter. */
  eventBus: PluginEventBus<TData>;

  /** Command dispatch. */
  commandBus: PluginCommandBus;

  /** Get another installed plugin. */
  getPlugin<T extends GridPlugin>(id: string): T | undefined;

  /** Register a new command handler. */
  registerCommand(commandType: string, handler: CommandHandler): void;

  /** Register plugin-owned state slice. */
  registerState<S>(key: string, initialState: S): void;

  /** Read plugin state. */
  getState<S>(key: string): S;

  /** Update plugin state. */
  setState<S>(key: string, updater: (prev: S) => S): void;

  /** Register a named cell renderer. */
  registerCellRenderer(name: string, renderer: CellRendererFn): void;

  /** Register a named cell editor. */
  registerCellEditor(name: string, editor: CellEditorDef): void;

  /** Grid configuration. */
  config: import('./grid').GridConfig<TData>;
}

export interface PluginStoreAccess<TData = any> {
  getState(): GridState<TData>;
  setState(updater: (prev: GridState<TData>) => GridState<TData>): void;
  subscribe(listener: () => void): () => void;
  batch(fn: () => void): void;
}

export interface PluginEventBus<TData = any> {
  emit<K extends keyof GridEventMap<TData>>(
    event: K,
    payload: GridEventMap<TData>[K],
  ): void;

  on<K extends keyof GridEventMap<TData>>(
    event: K,
    listener: (payload: GridEventMap<TData>[K]) => void,
  ): () => void;
}

export interface PluginCommandBus {
  dispatch(commandType: string, payload: any): void;
  registerHandler(commandType: string, handler: CommandHandler): () => void;
}

export type CommandHandler = (payload: any) => void;
