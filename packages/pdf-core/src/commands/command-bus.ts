// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── PDF Command Bus ───
// Extends GridStorm's CommandBus pattern with built-in undo/redo support.

import type { PdfDocumentState } from '../types/document';
import type { PdfCommandHandler, PdfAsyncCommandHandler } from '../types/plugin';
import type { Store } from '../state/store';
import type { EventBus } from '../events/event-bus';
import type { PdfEventMap } from '../types/events';
import type { UndoableCommand } from './undoable';
import { CompoundCommand } from './undoable';

export interface CommandContext {
  commandType: string;
  payload: any;
  cancel: () => void;
}

export type CommandMiddleware = (context: CommandContext) => void;

export class PdfCommandBus {
  private handlers = new Map<string, PdfCommandHandler[]>();
  private asyncHandlers = new Map<string, PdfAsyncCommandHandler[]>();
  private middlewares: CommandMiddleware[] = [];

  // Undo/redo
  private undoStack: UndoableCommand[] = [];
  private redoStack: UndoableCommand[] = [];
  private maxHistorySize: number;
  private batchDepth = 0;
  private batchCommands: UndoableCommand[] = [];
  private batchDescription = '';

  constructor(
    private store: Store<PdfDocumentState>,
    private eventBus: EventBus<PdfEventMap>,
    maxHistorySize = 50,
  ) {
    this.maxHistorySize = maxHistorySize;
  }

  // ── Handler Registration (mirrors GridStorm) ──

  registerHandler(commandType: string, handler: PdfCommandHandler): () => void {
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

  registerAsyncHandler(commandType: string, handler: PdfAsyncCommandHandler): () => void {
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

  use(middleware: CommandMiddleware): () => void {
    this.middlewares.push(middleware);
    return () => {
      const idx = this.middlewares.indexOf(middleware);
      if (idx >= 0) this.middlewares.splice(idx, 1);
    };
  }

  // ── Dispatch (mirrors GridStorm) ──

  dispatch(commandType: string, payload: any): void {
    let cancelled = false;
    const context: CommandContext = {
      commandType,
      payload,
      cancel: () => { cancelled = true; },
    };

    for (const mw of this.middlewares) {
      mw(context);
      if (cancelled) return;
    }

    const list = this.handlers.get(commandType);
    if (!list || list.length === 0) return;

    for (const handler of list) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[GridStorm PDF] Error in command handler for "${commandType}":`, err);
      }
    }
  }

  async dispatchAsync(commandType: string, payload: any): Promise<void> {
    let cancelled = false;
    const context: CommandContext = {
      commandType,
      payload,
      cancel: () => { cancelled = true; },
    };

    for (const mw of this.middlewares) {
      mw(context);
      if (cancelled) return;
    }

    const syncList = this.handlers.get(commandType);
    if (syncList) {
      for (const handler of syncList) {
        try {
          handler(payload);
        } catch (err) {
          console.error(`[GridStorm PDF] Error in sync handler for "${commandType}":`, err);
        }
      }
    }

    const asyncList = this.asyncHandlers.get(commandType);
    if (asyncList) {
      for (const handler of asyncList) {
        try {
          await handler(payload);
        } catch (err) {
          console.error(`[GridStorm PDF] Error in async handler for "${commandType}":`, err);
        }
      }
    }
  }

  // ── Undo/Redo (NEW — not in GridStorm) ──

  /** Dispatch an undoable command. Executes it and pushes to undo stack. */
  dispatchUndoable(command: UndoableCommand): void {
    // Run middleware
    let cancelled = false;
    const context: CommandContext = {
      commandType: command.type,
      payload: command,
      cancel: () => { cancelled = true; },
    };
    for (const mw of this.middlewares) {
      mw(context);
      if (cancelled) return;
    }

    // Execute the command
    const prevState = this.store.getState();
    const nextState = command.execute(prevState);
    this.store.setState(() => nextState);

    // If in a batch, accumulate instead of pushing to undo stack
    if (this.batchDepth > 0) {
      this.batchCommands.push(command);
      return;
    }

    // Push to undo stack
    this.undoStack.push(command);
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }

    // Clear redo stack (new action invalidates redo history)
    this.redoStack = [];

    this.emitHistoryChanged();
  }

  /** Undo the last undoable command. */
  undo(): void {
    const command = this.undoStack.pop();
    if (!command) return;

    const prevState = this.store.getState();
    const nextState = command.undo(prevState);
    this.store.setState(() => nextState);

    this.redoStack.push(command);
    this.emitHistoryChanged();
  }

  /** Redo the last undone command. */
  redo(): void {
    const command = this.redoStack.pop();
    if (!command) return;

    const prevState = this.store.getState();
    const nextState = command.execute(prevState);
    this.store.setState(() => nextState);

    this.undoStack.push(command);
    this.emitHistoryChanged();
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /** Begin a batch operation. All undoable commands become one undo step. */
  beginBatch(description: string): void {
    this.batchDepth++;
    if (this.batchDepth === 1) {
      this.batchCommands = [];
      this.batchDescription = description;
    }
  }

  /** End a batch operation. Groups accumulated commands into a CompoundCommand. */
  endBatch(): void {
    this.batchDepth--;
    if (this.batchDepth === 0 && this.batchCommands.length > 0) {
      const compound = new CompoundCommand(this.batchDescription, this.batchCommands);
      this.undoStack.push(compound);
      if (this.undoStack.length > this.maxHistorySize) {
        this.undoStack.shift();
      }
      this.redoStack = [];
      this.batchCommands = [];
      this.emitHistoryChanged();
    }
  }

  /** Clear all undo/redo history. */
  clearHistory(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.emitHistoryChanged();
  }

  /** Get undo stack size (for testing/debugging). */
  getUndoStackSize(): number {
    return this.undoStack.length;
  }

  /** Get redo stack size (for testing/debugging). */
  getRedoStackSize(): number {
    return this.redoStack.length;
  }

  removeHandlers(commandType: string): void {
    this.handlers.delete(commandType);
    this.asyncHandlers.delete(commandType);
  }

  clear(): void {
    this.handlers.clear();
    this.asyncHandlers.clear();
    this.middlewares = [];
    this.clearHistory();
  }

  private emitHistoryChanged(): void {
    this.eventBus.emit('history:changed', {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
    });
  }
}
