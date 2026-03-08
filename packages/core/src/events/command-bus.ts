// ─── Command Bus ───
// Commands are the only way to mutate grid state.
// Each command type maps to a handler. Multiple handlers per type are supported (middleware pattern).

import type { CommandHandler } from '../types/plugin';

export class CommandBus {
  private handlers = new Map<string, CommandHandler[]>();
  private middlewares: CommandMiddleware[] = [];

  /** Register a handler for a command type. Returns an unsubscribe function. */
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

  /** Add a middleware that intercepts all commands. */
  use(middleware: CommandMiddleware): () => void {
    this.middlewares.push(middleware);
    return () => {
      const idx = this.middlewares.indexOf(middleware);
      if (idx >= 0) this.middlewares.splice(idx, 1);
    };
  }

  /** Dispatch a command. */
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

  /** Remove all handlers for a command type. */
  removeHandlers(commandType: string): void {
    this.handlers.delete(commandType);
  }

  /** Remove all handlers and middlewares. */
  clear(): void {
    this.handlers.clear();
    this.middlewares = [];
  }
}

export interface CommandContext {
  commandType: string;
  payload: any;
  cancel: () => void;
}

export type CommandMiddleware = (context: CommandContext) => void;
