// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Command Bus ───
// Commands are the only way to mutate grid state.
// Each command type maps to one or more handlers, executed in registration
// order. A handler may return STOP_PROPAGATION to prevent the remaining
// handlers for that command from running (per-handler cancel). Each command
// type may also have multiple validators, all of which must pass before any
// handler runs (validator chain).

import type { CommandHandler, AsyncCommandHandler } from '../types/plugin';
import type { CommandMap } from '../types/commands';
import type { ErrorHandler } from '../errors/error-handler';

export type CommandValidator = (payload: unknown) => string | null;

/**
 * Sentinel a command handler can return to stop the bus from invoking the
 * remaining handlers registered for the same command type. Handlers that
 * return `void` (the common case) let propagation continue. Works for both
 * sync (`dispatch`) and async (`dispatchAsync`) handlers.
 */
export const STOP_PROPAGATION: unique symbol = Symbol('gridstorm.command.stopPropagation');

export class CommandBus {
  private handlers = new Map<string, CommandHandler[]>();
  private asyncHandlers = new Map<string, AsyncCommandHandler[]>();
  private middlewares: CommandMiddleware[] = [];
  // Multiple validators may be registered per command type (a chain). They are
  // run in registration order and the FIRST to return a non-null message
  // rejects the command. Using a Map<string, CommandValidator[]> instead of a
  // single validator fixes the silent-overwrite footgun where a second
  // registerValidator() call clobbered the first.
  private validators = new Map<string, CommandValidator[]>();
  private errorHandler: ErrorHandler | null = null;

  /** Attach a structured error handler for error reporting. */
  setErrorHandler(handler: ErrorHandler): void {
    this.errorHandler = handler;
  }

  /**
   * Register a payload validator for a command type.
   * The validator should return null if valid, or an error message string if invalid.
   *
   * Multiple validators may be registered for the same command type; they form
   * a chain run in registration order, and the first to return a non-null
   * message rejects the command. The returned function removes only the
   * validator it registered (not the whole chain).
   */
  registerValidator<K extends keyof CommandMap>(
    commandType: K,
    validator: (payload: CommandMap[K]) => string | null,
  ): () => void;
  registerValidator(commandType: string, validator: CommandValidator): () => void;
  registerValidator(commandType: string, validator: CommandValidator): () => void {
    let list = this.validators.get(commandType);
    if (!list) {
      list = [];
      this.validators.set(commandType, list);
    }
    list.push(validator);

    return () => {
      const current = this.validators.get(commandType);
      if (!current) return;
      const idx = current.indexOf(validator);
      if (idx >= 0) current.splice(idx, 1);
      if (current.length === 0) this.validators.delete(commandType);
    };
  }

  /**
   * Run the validator chain for a command. Returns the first error message, or
   * null if all validators pass (or none are registered). Reports the failure
   * through the error handler / console as a side effect.
   */
  private validate(commandType: string, payload: unknown): string | null {
    const list = this.validators.get(commandType);
    if (!list || list.length === 0) return null;
    for (const validator of list) {
      const message = validator(payload);
      if (message) {
        const err = new Error(`Command validation failed for "${commandType}": ${message}`);
        if (this.errorHandler) {
          this.errorHandler.report(err, {
            source: 'validation',
            commandType,
            payload,
            severity: 'error',
          });
        } else {
          console.error(`[GridStorm]`, err.message);
        }
        return message;
      }
    }
    return null;
  }

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
    // Validate payload against the validator chain (no-op if none registered)
    if (this.validate(commandType, payload) !== null) return;

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
      if (typeof globalThis !== 'undefined' && (globalThis as any).__GRIDSTORM_DEV__) {
        console.warn(`[GridStorm] No handler registered for command "${commandType}".`);
      }
      return;
    }

    for (const handler of [...list]) {
      try {
        const result = (handler as (p: any) => unknown)(payload);
        // A handler may stop the rest of the chain for this command.
        if (result === STOP_PROPAGATION) break;
      } catch (err) {
        if (this.errorHandler) {
          this.errorHandler.report(err, {
            source: 'command',
            commandType,
            severity: 'error',
          });
        } else {
          console.error(`[GridStorm] Error in command handler for "${commandType}":`, err);
        }
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
    // Validate payload against the validator chain (no-op if none registered)
    if (this.validate(commandType, payload) !== null) return;

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
      for (const handler of [...syncList]) {
        try {
          const result = (handler as (p: any) => unknown)(payload);
          if (result === STOP_PROPAGATION) return;
        } catch (err) {
          if (this.errorHandler) {
            this.errorHandler.report(err, {
              source: 'command',
              commandType,
              severity: 'error',
            });
          } else {
            console.error(`[GridStorm] Error in sync command handler for "${commandType}":`, err);
          }
        }
      }
    }

    // Execute async handlers sequentially
    const asyncList = this.asyncHandlers.get(commandType);
    if (asyncList) {
      for (const handler of [...asyncList]) {
        try {
          const result = (await (handler as (p: any) => Promise<unknown>)(payload)) as unknown;
          if (result === STOP_PROPAGATION) return;
        } catch (err) {
          if (this.errorHandler) {
            this.errorHandler.report(err, {
              source: 'command',
              commandType,
              severity: 'error',
            });
          } else {
            console.error(`[GridStorm] Error in async command handler for "${commandType}":`, err);
          }
        }
      }
    }
  }

  /** Remove all handlers for a command type (both sync and async). */
  removeHandlers(commandType: string): void {
    this.handlers.delete(commandType);
    this.asyncHandlers.delete(commandType);
  }

  /** Remove all handlers, middlewares, and validators. */
  clear(): void {
    this.handlers.clear();
    this.asyncHandlers.clear();
    this.middlewares = [];
    this.validators.clear();
  }
}

export interface CommandContext {
  commandType: string;
  payload: any;
  cancel: () => void;
}

export type CommandMiddleware = (context: CommandContext) => void;
