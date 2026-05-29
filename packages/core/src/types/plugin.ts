// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Plugin Types ───

import type { GridApi, GridState } from './grid';
import type { GridEventMap } from './events';
import type { CommandMap } from './commands';
import type { CellRendererFn } from './column';
import type { CellEditorDef } from './editing';
// Type-only import (erased at compile time → no runtime cycle with command-bus).
import type { STOP_PROPAGATION } from '../events/command-bus';

/**
 * Interface for GridStorm plugins that extend grid functionality.
 *
 * Plugins are the primary extension mechanism for GridStorm. They can register
 * command handlers, listen to events, manage their own state slices, and
 * contribute custom cell renderers and editors.
 *
 * Plugins are installed in dependency-resolved order via topological sort
 * during grid initialization.
 *
 * @typeParam TData - The type of each row data object.
 *
 * @example
 * ```ts
 * const myPlugin: GridPlugin = {
 *   id: 'my-custom-plugin',
 *   name: 'My Custom Plugin',
 *   version: '1.0.0',
 *   dependencies: ['sorting'],
 *   install(ctx) {
 *     ctx.registerCommand('my:action', (payload) => {
 *       console.log('Custom action:', payload);
 *     });
 *     // Return a cleanup function
 *     return () => console.log('Plugin destroyed');
 *   },
 * };
 * ```
 *
 * @see {@link PluginContext} for the API available during installation.
 * @see {@link GridConfig.plugins} for registering plugins.
 */
export interface GridPlugin<TData = any> {
  /**
   * Unique plugin identifier used for dependency resolution and API lookups.
   *
   * Must be unique across all installed plugins. Used by other plugins
   * in their {@link dependencies} array to declare requirements.
   */
  id: string;

  /** Human-readable display name for debugging and tooling. */
  name: string;

  /**
   * Semantic version string (e.g., `'1.2.3'`).
   *
   * Used for compatibility checks and debugging.
   */
  version: string;

  /**
   * IDs of plugins that must be installed before this one.
   *
   * The plugin manager uses topological sorting to ensure dependencies
   * are installed in the correct order. An error is thrown if a required
   * dependency is not present.
   *
   * @default []
   *
   * @example
   * ```ts
   * dependencies: ['sorting', 'filtering']
   * ```
   */
  dependencies?: string[];

  /**
   * Called during grid initialization to set up the plugin.
   *
   * Use the provided {@link PluginContext} to register commands, listen to
   * events, manage state, and register renderers/editors.
   *
   * Optionally return a {@link PluginDisposer} function that will be called
   * when the grid is destroyed, allowing the plugin to clean up resources.
   *
   * @param context - The plugin context providing access to the grid's internals.
   * @returns An optional cleanup/disposer function.
   */
  install(context: PluginContext<TData>): void | PluginDisposer;
}

/**
 * Cleanup function returned by a plugin's {@link GridPlugin.install} method.
 *
 * Called automatically when the grid is destroyed via {@link GridApi.destroy}.
 * Use it to remove external event listeners, cancel timers, or release resources.
 */
export type PluginDisposer = () => void;

/**
 * Context object provided to plugins during installation.
 *
 * Provides access to the grid API, internal store, event bus, command bus,
 * and registration methods for renderers, editors, and custom state slices.
 *
 * @typeParam TData - The type of each row data object.
 *
 * @example
 * ```ts
 * install(ctx: PluginContext<MyData>) {
 *   // Listen for events
 *   const unsub = ctx.eventBus.on('selection:changed', (e) => { ... });
 *
 *   // Register custom state
 *   ctx.registerState('myPlugin', { count: 0 });
 *
 *   // Register a command handler
 *   ctx.registerCommand('myPlugin:increment', () => {
 *     ctx.setState('myPlugin', (prev) => ({ count: prev.count + 1 }));
 *   });
 *
 *   return () => unsub();
 * }
 * ```
 *
 * @see {@link GridPlugin.install}
 */
export interface PluginContext<TData = any> {
  /**
   * The public grid API for interacting with the grid.
   *
   * @see {@link GridApi}
   */
  api: GridApi<TData>;

  /**
   * Direct access to the internal state store.
   *
   * Provides low-level state read/write capabilities. Prefer using
   * {@link registerState}, {@link getState}, and {@link setState}
   * for plugin-specific state management.
   *
   * @see {@link PluginStoreAccess}
   */
  store: PluginStoreAccess<TData>;

  /**
   * Typed event bus for emitting and subscribing to grid events.
   *
   * @see {@link PluginEventBus}
   * @see {@link GridEventMap} for available events.
   */
  eventBus: PluginEventBus<TData>;

  /**
   * Command bus for dispatching and handling commands.
   *
   * Commands are the only way to mutate grid state, enforcing
   * a unidirectional data flow pattern.
   *
   * @see {@link PluginCommandBus}
   */
  commandBus: PluginCommandBus;

  /**
   * Retrieves a reference to another installed plugin by its ID.
   *
   * @typeParam T - The expected plugin type.
   * @param id - The unique plugin identifier.
   * @returns The plugin instance, or `undefined` if not installed.
   *
   * @example
   * ```ts
   * const sorting = ctx.getPlugin<SortingPlugin>('sorting');
   * ```
   */
  getPlugin<T extends GridPlugin>(id: string): T | undefined;

  /**
   * Registers a command handler that responds to dispatched commands.
   *
   * @remarks
   * Multiple handlers can be registered for the same command type.
   * All matching handlers will be invoked when the command is dispatched.
   * Handlers should guard their payloads if shared command types are used.
   *
   * @param commandType - The command type string (e.g., `'myPlugin:doSomething'`).
   * @param handler - The function to execute when the command is dispatched.
   *
   * @example
   * ```ts
   * ctx.registerCommand('myPlugin:refresh', (payload) => {
   *   ctx.store.setState((state) => ({ ...state, ... }));
   * });
   * ```
   */
  registerCommand(commandType: string, handler: CommandHandler): void;

  /**
   * Registers a plugin-owned state slice in the grid's `pluginState` map.
   *
   * @typeParam S - The shape of the plugin's state slice.
   * @param key - Unique key for this state slice.
   * @param initialState - The initial state value.
   *
   * @example
   * ```ts
   * ctx.registerState<{ searchTerm: string }>('search', { searchTerm: '' });
   * ```
   */
  registerState<S>(key: string, initialState: S): void;

  /**
   * Reads the current value of a plugin-owned state slice.
   *
   * @typeParam S - The expected state type.
   * @param key - The state slice key (as registered via {@link registerState}).
   * @returns The current state value.
   */
  getState<S>(key: string): S;

  /**
   * Updates a plugin-owned state slice using an updater function.
   *
   * @typeParam S - The state type.
   * @param key - The state slice key.
   * @param updater - Function that receives the current state and returns the new state.
   *
   * @example
   * ```ts
   * ctx.setState('search', (prev) => ({ ...prev, searchTerm: 'hello' }));
   * ```
   */
  setState<S>(key: string, updater: (prev: S) => S): void;

  /**
   * Registers a named cell renderer that can be referenced by
   * {@link ColumnDef.cellRenderer} using a string name.
   *
   * @param name - The renderer name used in column definitions.
   * @param renderer - The cell renderer function.
   *
   * @see {@link CellRendererFn}
   */
  registerCellRenderer(name: string, renderer: CellRendererFn): void;

  /**
   * Registers a named cell editor that can be referenced by
   * {@link ColumnDef.cellEditor} using a string name.
   *
   * @param name - The editor name used in column definitions.
   * @param editor - The cell editor definition.
   *
   * @see {@link CellEditorDef}
   */
  registerCellEditor(name: string, editor: CellEditorDef): void;

  /**
   * The grid configuration object passed during initialization.
   *
   * @remarks
   * This is a read-only reference to the original config. Runtime changes
   * should be made via {@link GridApi.setGridOption}.
   *
   * @see {@link GridConfig}
   */
  config: import('./grid').GridConfig<TData>;
}

/**
 * Low-level interface for accessing and modifying the grid's internal state store.
 *
 * Available to plugins via {@link PluginContext.store}. Supports batched
 * updates to prevent excessive re-renders during multi-step state changes.
 *
 * @typeParam TData - The type of each row data object.
 *
 * @see {@link GridState}
 */
export interface PluginStoreAccess<TData = any> {
  /**
   * Returns the current grid state snapshot.
   *
   * @returns The current {@link GridState}.
   */
  getState(): GridState<TData>;

  /**
   * Updates the grid state using an updater function.
   *
   * The updater receives the previous state and must return a new state object.
   * Triggers re-render and notifies all subscribers.
   *
   * @param updater - Function that maps previous state to new state.
   */
  setState(updater: (prev: GridState<TData>) => GridState<TData>): void;

  /**
   * Subscribes to state changes. The listener is called after every state update.
   *
   * @param listener - Callback invoked on state change.
   * @returns An unsubscribe function.
   */
  subscribe(listener: () => void): () => void;

  /**
   * Batches multiple state updates into a single re-render cycle.
   *
   * Use this when performing multiple `setState` calls that should be
   * applied atomically, avoiding intermediate re-renders.
   *
   * @param fn - Function containing multiple state updates.
   *
   * @example
   * ```ts
   * ctx.store.batch(() => {
   *   ctx.store.setState((s) => ({ ...s, sortModel: newSort }));
   *   ctx.store.setState((s) => ({ ...s, filterModel: newFilter }));
   * });
   * ```
   */
  batch(fn: () => void): void;

  /**
   * Subscribe to a specific slice of state. Only fires when the selected
   * value changes (by reference equality).
   *
   * More efficient than `subscribe()` for plugins that only care about
   * specific parts of the state tree, avoiding unnecessary re-computations.
   *
   * @typeParam T - The type of the selected state slice.
   * @param selector - Function that extracts a slice from the full grid state.
   * @param listener - Callback invoked when the selected value changes.
   * @returns An unsubscribe function.
   *
   * @example
   * ```ts
   * const unsub = ctx.store.select(
   *   (state) => state.sortModel,
   *   (next, prev) => console.log('Sort changed:', prev, '->', next),
   * );
   * ```
   */
  select<T>(
    selector: (state: GridState<TData>) => T,
    listener: (value: T, prevValue: T) => void,
  ): () => void;
}

/**
 * Typed event bus interface for plugins to emit and subscribe to grid events.
 *
 * @typeParam TData - The type of each row data object.
 *
 * @see {@link GridEventMap} for all available events.
 */
export interface PluginEventBus<TData = any> {
  /**
   * Emits an event to all registered listeners.
   *
   * @typeParam K - The event key.
   * @param event - The event name.
   * @param payload - The event payload.
   */
  emit<K extends keyof GridEventMap<TData>>(
    event: K,
    payload: GridEventMap<TData>[K],
  ): void;

  /**
   * Subscribes to an event.
   *
   * @typeParam K - The event key.
   * @param event - The event name to listen for.
   * @param listener - Callback invoked when the event fires.
   * @returns An unsubscribe function.
   *
   * @example
   * ```ts
   * const unsub = ctx.eventBus.on('filter:changed', (e) => {
   *   console.log('Filters:', e.filterModel);
   * });
   * // Later: unsub();
   * ```
   */
  on<K extends keyof GridEventMap<TData>>(
    event: K,
    listener: (payload: GridEventMap<TData>[K]) => void,
  ): () => void;
}

/**
 * Command bus interface for dispatching and handling commands.
 *
 * Commands represent intent to change grid state and are the only sanctioned
 * way to mutate state in GridStorm's unidirectional data flow architecture.
 *
 * @see {@link PluginContext.registerCommand}
 */
export interface PluginCommandBus {
  /**
   * Dispatches a typed command to all registered handlers.
   *
   * @typeParam K - The command key from {@link CommandMap}.
   * @param commandType - The command type identifier.
   * @param payload - The command payload, typed according to the {@link CommandMap}.
   *
   * @example
   * ```ts
   * ctx.commandBus.dispatch('sort:set', {
   *   sortModel: [{ colId: 'name', sort: 'asc' }],
   * });
   * ```
   */
  dispatch<K extends keyof CommandMap>(commandType: K, payload: CommandMap[K]): void;
  dispatch(commandType: string, payload: any): void;

  /**
   * Dispatches a command asynchronously to all registered handlers.
   *
   * Runs sync handlers first, then async handlers sequentially.
   * Middleware is evaluated synchronously before any handler.
   *
   * @typeParam K - The command key from {@link CommandMap}.
   * @param commandType - The command type identifier.
   * @param payload - The command payload.
   * @returns A promise that resolves when all handlers complete.
   *
   * @example
   * ```ts
   * await ctx.commandBus.dispatchAsync('ssrm:refresh', {});
   * ```
   */
  dispatchAsync<K extends keyof CommandMap>(commandType: K, payload: CommandMap[K]): Promise<void>;
  dispatchAsync(commandType: string, payload: any): Promise<void>;

  /**
   * Registers a handler for a specific command type.
   *
   * @typeParam K - The command key from {@link CommandMap}.
   * @param commandType - The command type to handle.
   * @param handler - The handler function.
   * @returns An unsubscribe function that removes the handler.
   */
  registerHandler<K extends keyof CommandMap>(
    commandType: K,
    handler: (payload: CommandMap[K]) => void,
  ): () => void;
  registerHandler(commandType: string, handler: CommandHandler): () => void;

  /**
   * Registers an async handler for a specific command type.
   *
   * Async handlers are only invoked via {@link dispatchAsync}.
   * They are executed sequentially, and each must complete before the next.
   *
   * @typeParam K - The command key from {@link CommandMap}.
   * @param commandType - The command type to handle.
   * @param handler - The async handler function.
   * @returns An unsubscribe function that removes the handler.
   *
   * @example
   * ```ts
   * ctx.commandBus.registerAsyncHandler('ssrm:refresh', async (payload) => {
   *   await fetchDataFromServer();
   * });
   * ```
   */
  registerAsyncHandler<K extends keyof CommandMap>(
    commandType: K,
    handler: (payload: CommandMap[K]) => Promise<void>,
  ): () => void;
  registerAsyncHandler(commandType: string, handler: AsyncCommandHandler): () => void;
}

/**
 * Function type for command handlers that process dispatched commands.
 *
 * A handler may return {@link STOP_PROPAGATION} to prevent the remaining
 * handlers registered for the same command from running. Returning `void`
 * (the common case) lets propagation continue.
 *
 * @param payload - The command payload.
 *
 * @see {@link PluginContext.registerCommand}
 * @see {@link PluginCommandBus.registerHandler}
 */
export type CommandHandler = (payload: any) => void | typeof STOP_PROPAGATION;

/**
 * Function type for async command handlers that process dispatched commands.
 *
 * Used with {@link PluginCommandBus.registerAsyncHandler} and invoked via
 * {@link PluginCommandBus.dispatchAsync}.
 *
 * May resolve to {@link STOP_PROPAGATION} to stop the remaining async handlers
 * for the same command from running.
 *
 * @param payload - The command payload.
 *
 * @see {@link PluginCommandBus.registerAsyncHandler}
 * @see {@link PluginCommandBus.dispatchAsync}
 */
export type AsyncCommandHandler = (payload: any) => Promise<void | typeof STOP_PROPAGATION>;
