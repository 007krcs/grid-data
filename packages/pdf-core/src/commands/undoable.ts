// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Undoable Command ───

import type { PdfDocumentState, UndoableCommandRecord } from '../types/document';

/**
 * An undoable command that can be executed and reversed.
 * All state-mutating PDF operations should implement this interface.
 */
export interface UndoableCommand {
  /** Command type string (e.g. 'annotation:create'). */
  readonly type: string;
  /** Human-readable description for undo UI (e.g. "Add highlight"). */
  readonly description: string;
  /** Execute the command (forward). Returns the new state. */
  execute(state: PdfDocumentState): PdfDocumentState;
  /** Reverse the command (undo). Returns the previous state. */
  undo(state: PdfDocumentState): PdfDocumentState;
}

/**
 * A compound command that groups multiple undoable commands into
 * a single undo/redo step (batch operation).
 */
export class CompoundCommand implements UndoableCommand {
  readonly type = 'compound';

  constructor(
    readonly description: string,
    private commands: UndoableCommand[],
  ) {}

  execute(state: PdfDocumentState): PdfDocumentState {
    let current = state;
    for (const cmd of this.commands) {
      current = cmd.execute(current);
    }
    return current;
  }

  undo(state: PdfDocumentState): PdfDocumentState {
    let current = state;
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      current = this.commands[i]!.undo(current);
    }
    return current;
  }
}

/** Convert an UndoableCommand execution into a serializable record. */
export function createUndoRecord(
  command: UndoableCommand,
  stateBefore: PdfDocumentState,
  stateAfter: PdfDocumentState,
): UndoableCommandRecord {
  // Store minimal diff — only the fields that changed
  const diff: Partial<PdfDocumentState> = {};
  const beforeDiff: Partial<PdfDocumentState> = {};

  const keys: (keyof PdfDocumentState)[] = [
    'annotations', 'pages', 'activePageIndex', 'zoom',
    'scroll', 'toolMode', 'selectedAnnotationIds', 'metadata',
  ];

  for (const key of keys) {
    if (stateAfter[key] !== stateBefore[key]) {
      (diff as any)[key] = stateAfter[key];
      (beforeDiff as any)[key] = stateBefore[key];
    }
  }

  return {
    type: command.type,
    description: command.description,
    stateBefore: beforeDiff,
    stateAfter: diff,
  };
}
