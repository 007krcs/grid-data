// ─── Command Bus ───
// Commands are the only way to mutate grid state.
// Each command type maps to a handler. Multiple handlers per type are supported (middleware pattern).

import type { CommandHandler, AsyncCommandHandler } from '../types/plugin';
import type { CommandMap } from '../types/commands';

export class CommandBus {
  private handlers = new Map<string, CommandHandler[]>();
  private asyncHandlers = new Map<string, AsyncCommandHandler[]>();
  private middlewares: CommandMiddleware[] = [];

  /** Register a handler for a command type. Returns an unsubscribe function. */
  registerHandler<K extends keyof CommandMap>(
    commandType: K,
    handler: (payload: CommandMap[K]) => void,
  ): () => void;
  registerHandler(commandType: string, handler: CommandHandler): () => void;
  registerHandler(commandType: string, handler: CommandHandler): () => void {
    let list = this.handlers.get(commandType);
    if (!list) {
      list = [];
      this.handlers.set(commandType, list);
    }
    list.push(handler);

    return () => {
      const idx = list!.indexOf(handler);
      if (idx >= 0) list!.splice(idx, 1);
    };
  }

  /**
   * Register an async handler for a command type. Returns an unsubscribe function.
   *
   * Async handlers are only invoked via {@link dispatchAsync}. They are executed
   * sequentially, and each handler must complete before the next one runs.
   */
  registerAsyncHandler<K extends keyof CommandMap>(
    commandType: K,
    handler: (payload: CommandMap[K]) => Promise<void>,
  ): () => void;
  registerAsyncHandler(commandType: string, handler: AsyncCommandHandler): () => void;
  registerAsyncHandler(commandType: string, handler: AsyncCommandHandler): () => void {
    let list = this.asyncHandlers.get(commandType);
    if (!list) {
      list = [];
      this.asyncHandlers.set(commandType, list);
    }
    list.push(handler);

    return () => {
      const idx = list!.indexOf(handler);
      if (idx >= 0) list!.splice(idx, 1);
    };
  }

  /** Add a middleware that intercepts all commands. */
  use(middleware: CommandMiddleware): () => void {
    this.middlewares.push(middleware);
    return () => {
      const idx = this.middlewares.indexOf(middleware);
      if (idx >= 0) this.middlewares.splice(idx, 1);
    };
  }

  /** Dispatch a command synchronously. */
  dispatch<K extends keyof CommandMap>(commandType: K, payload: CommandMap[K]): void;
  dispatch(commandType: string, payload: any): void;
  dispatch(commandType: string, payload: any): void {
    // Run through middleware chain
    let cancelled = false;
    const context: CommandContext = {
      commandType,
      payload,
      cancel: () => {
        cancelled = true;
      },
    };

    for (const mw of this.middlewares) {
      mw(context);
      if (cancelled) return;
    }

    // Execute handlers
    const list = this.handlers.get(commandType);
    if (!list || list.length === 0) {
      // No handler — this is not necessarily an error (command might be handled later)
      return;
    }

    for (const handler of list) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[GridStorm] Error in command handler for "${commandType}":`, err);
      }
    }
  }

  /**
   * Dispatch a command asynchronously.
   *
   * Runs middleware synchronously first. Then executes all async handlers
   * sequentially (awaiting each before the next). Also runs any sync handlers
   * registered for the same command type before the async ones.
   */
  async dispatchAsync<K extends keyof CommandMap>(
    commandType: K,
    payload: CommandMap[K],
  ): Promise<void>;
  async dispatchAsync(commandType: string, payload: any): Promise<void>;
  async dispatchAsync(commandType: string, payload: any): Promise<void> {
    // Run through middleware chain (synchronous)
    let cancelled = false;
    const context: CommandContext = {
      commandType,
      payload,
      cancel: () => {
        cancelled = true;
      },
    };

    for (const mw of this.middlewares) {
      mw(context);
      if (cancelled) return;
    }

    // Execute sync handlers first
    const syncList = this.handlers.get(commandType);
    if (syncList) {
      for (const handler of syncList) {
        try {
          handler(payload);
        } catch (err) {
          console.error(`[GridStorm] Error in sync command handler for "${commandType}":`, err);
        }
      }
    }

    // Execute async handlers sequentially
    const asyncList = this.asyncHandlers.get(commandType);
    if (asyncList) {
      for (const handler of asyncList) {
        try {
          await handler(payload);
        } catch (err) {
          console.error(`[GridStorm] Error in async command handler for "${commandType}":`, err);
        }
      }
    }
  }

  /** Remove all handlers for a command type (both sync and async). */
  removeHandlers(commandType: string): void {
    this.handlers.delete(commandType);
    this.asyncHandlers.delete(commandType);
  }

  /** Remove all handlers and middlewares. */
  clear(): void {
    this.handlers.clear();
    this.asyncHandlers.clear();
    this.middlewares = [];
  }
}

export interface CommandContext {
  commandType: string;
  payload: any;
  cancel: () => void;
}

export type CommandMiddleware = (context: CommandContext) => void;
