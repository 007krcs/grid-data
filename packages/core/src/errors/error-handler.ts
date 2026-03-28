// ─── Structured Error Handler ───
// Provides enterprise-grade error reporting with context, telemetry hooks,
// and structured error types. Replaces ad-hoc console.error() calls.

// ─── Error Types ───

export type GridErrorSeverity = 'warning' | 'error' | 'fatal';
export type GridErrorSource = 'command' | 'event' | 'plugin' | 'render' | 'validation' | 'unknown';

export interface GridErrorContext {
  /** The source subsystem where the error occurred. */
  source: GridErrorSource;
  /** Command type, if the error occurred during command dispatch. */
  commandType?: string;
  /** Event type, if the error occurred during event emission. */
  eventType?: string;
  /** Plugin ID, if the error occurred inside a plugin. */
  pluginId?: string;
  /** Payload associated with the failing operation. */
  payload?: unknown;
  /** Severity classification. */
  severity: GridErrorSeverity;
  /** ISO timestamp of when the error occurred. */
  timestamp: string;
  /** Optional metadata for integrations (e.g. Sentry tags). */
  metadata?: Record<string, unknown>;
}

export interface GridError {
  /** The original error object. */
  error: Error;
  /** Structured context about where/how the error occurred. */
  context: GridErrorContext;
}

export type ErrorHandlerCallback = (gridError: GridError) => void;

// ─── Error Handler ───

export class ErrorHandler {
  private handlers: ErrorHandlerCallback[] = [];
  private suppressConsole = false;

  /**
   * Register an error handler callback. Returns an unsubscribe function.
   *
   * Use this to integrate with external error tracking services like
   * Sentry, DataDog, or custom telemetry systems.
   *
   * @example
   * ```ts
   * const unsub = errorHandler.onError(({ error, context }) => {
   *   Sentry.captureException(error, {
   *     tags: { source: context.source, command: context.commandType },
   *   });
   * });
   * ```
   */
  onError(handler: ErrorHandlerCallback): () => void {
    this.handlers.push(handler);
    return () => {
      const idx = this.handlers.indexOf(handler);
      if (idx >= 0) this.handlers.splice(idx, 1);
    };
  }

  /**
   * When true, errors are only sent to registered handlers and NOT
   * logged to console. Useful in production when telemetry handles reporting.
   */
  setSuppressConsole(suppress: boolean): void {
    this.suppressConsole = suppress;
  }

  /**
   * Report an error with structured context.
   * Called internally by CommandBus, EventBus, and PluginManager.
   */
  report(error: unknown, context: Omit<GridErrorContext, 'timestamp'>): void {
    const err = error instanceof Error ? error : new Error(String(error));

    const gridError: GridError = {
      error: err,
      context: {
        ...context,
        timestamp: new Date().toISOString(),
      },
    };

    // Dispatch to all registered handlers
    for (const handler of this.handlers) {
      try {
        handler(gridError);
      } catch {
        // Never let an error handler crash the grid
      }
    }

    // Log to console unless suppressed
    if (!this.suppressConsole) {
      const prefix = `[GridStorm:${context.source}]`;
      if (context.severity === 'warning') {
        console.warn(prefix, err.message, context);
      } else {
        console.error(prefix, err.message, context);
      }
    }
  }

  /** Remove all registered error handlers. */
  clear(): void {
    this.handlers = [];
    this.suppressConsole = false;
  }
}

/** Shared singleton error handler instance. */
let globalErrorHandler: ErrorHandler | null = null;

/**
 * Get or create the global ErrorHandler instance.
 * Each GridEngine can also create its own scoped instance.
 */
export function getGlobalErrorHandler(): ErrorHandler {
  if (!globalErrorHandler) {
    globalErrorHandler = new ErrorHandler();
  }
  return globalErrorHandler;
}
