// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Edit History ───
// Tracks cell value changes for undo/redo support.

export interface EditRecord {
  rowId: string;
  colId: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
}

export class EditHistory {
  private undoStack: EditRecord[] = [];
  private redoStack: EditRecord[] = [];
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  push(record: EditRecord): void {
    this.undoStack.push(record);
    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }
    // Clear redo stack when new edit is made
    this.redoStack = [];
  }

  undo(): EditRecord | null {
    const record = this.undoStack.pop();
    if (!record) return null;
    this.redoStack.push(record);
    return record;
  }

  redo(): EditRecord | null {
    const record = this.redoStack.pop();
    if (!record) return null;
    this.undoStack.push(record);
    return record;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  getUndoCount(): number {
    return this.undoStack.length;
  }

  getRedoCount(): number {
    return this.redoStack.length;
  }
}
