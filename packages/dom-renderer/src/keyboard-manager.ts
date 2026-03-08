// ─── Keyboard Manager ───
// Handles keyboard navigation within the grid: arrow keys, Tab, Enter, Escape.
// Implements roving tabindex for ARIA compliance.

import type { GridEngine } from '@gridstorm/core';

export interface KeyboardManagerConfig {
  root: HTMLElement;
  engine: GridEngine;
  getVisibleColumns: () => Array<{ colId: string }>;
}

export class KeyboardManager {
  private root: HTMLElement | null = null;
  private engine: GridEngine | null = null;
  private getVisibleColumns: (() => Array<{ colId: string }>) | null = null;
  private cleanup: (() => void) | null = null;

  configure(config: KeyboardManagerConfig): void {
    this.destroy();

    this.root = config.root;
    this.engine = config.engine;
    this.getVisibleColumns = config.getVisibleColumns;

    const handler = (e: KeyboardEvent) => this.handleKeyDown(e);
    this.root.addEventListener('keydown', handler);

    // Make root focusable
    if (!this.root.getAttribute('tabindex')) {
      this.root.setAttribute('tabindex', '0');
    }

    this.cleanup = () => {
      this.root?.removeEventListener('keydown', handler);
    };
  }

  destroy(): void {
    this.cleanup?.();
    this.cleanup = null;
    this.root = null;
    this.engine = null;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.engine || !this.getVisibleColumns) return;

    const state = this.engine.store.getState();
    const focused = state.focusedCell;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.moveFocus(0, 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.moveFocus(0, -1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.moveFocus(1, 0);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.moveFocus(-1, 0);
        break;
      case 'Home':
        e.preventDefault();
        if (e.ctrlKey) {
          this.setFocus(0, 0);
        } else if (focused) {
          this.setFocus(0, focused.rowIndex);
        }
        break;
      case 'End':
        e.preventDefault();
        if (e.ctrlKey) {
          const cols = this.getVisibleColumns();
          this.setFocus(
            cols.length - 1,
            state.displayedRowIds.length - 1,
          );
        } else if (focused) {
          const cols = this.getVisibleColumns();
          this.setFocus(cols.length - 1, focused.rowIndex);
        }
        break;
      case 'PageDown':
        e.preventDefault();
        this.moveFocus(0, 20);
        break;
      case 'PageUp':
        e.preventDefault();
        this.moveFocus(0, -20);
        break;
      case 'Enter':
      case 'F2':
        if (focused) {
          e.preventDefault();
          const rowId = state.displayedRowIds[focused.rowIndex];
          if (rowId) {
            this.engine.commandBus.dispatch('editing:start', {
              rowId,
              colId: focused.colId,
            });
          }
        }
        break;
      case 'Escape':
        if (state.editing) {
          e.preventDefault();
          this.engine.commandBus.dispatch('editing:stop', { cancel: true });
        }
        break;
      case ' ':
        if (focused && !state.editing) {
          e.preventDefault();
          const rowId = state.displayedRowIds[focused.rowIndex];
          if (rowId) {
            this.engine.commandBus.dispatch('selection:select', {
              rowId,
              multiSelect: e.ctrlKey || e.metaKey,
              source: 'keyboard',
            });
          }
        }
        break;
      case 'a':
        if ((e.ctrlKey || e.metaKey) && !state.editing) {
          e.preventDefault();
          this.engine.commandBus.dispatch('selection:selectAll', {});
        }
        break;
      case 'Tab':
        if (focused && !state.editing) {
          e.preventDefault();
          this.moveFocus(e.shiftKey ? -1 : 1, 0);
        }
        break;
    }
  }

  private moveFocus(colDelta: number, rowDelta: number): void {
    if (!this.engine || !this.getVisibleColumns) return;

    const state = this.engine.store.getState();
    const cols = this.getVisibleColumns();
    const focused = state.focusedCell;

    if (!focused) {
      // No current focus — focus first cell
      if (cols.length > 0 && state.displayedRowIds.length > 0) {
        this.setFocus(0, 0);
      }
      return;
    }

    const colIdx = cols.findIndex((c) => c.colId === focused.colId);
    let newColIdx = colIdx + colDelta;
    let newRowIdx = focused.rowIndex + rowDelta;

    // Clamp
    newColIdx = Math.max(0, Math.min(newColIdx, cols.length - 1));
    newRowIdx = Math.max(
      0,
      Math.min(newRowIdx, state.displayedRowIds.length - 1),
    );

    this.setFocus(newColIdx, newRowIdx);
  }

  private setFocus(colIdx: number, rowIdx: number): void {
    if (!this.engine || !this.getVisibleColumns) return;

    const cols = this.getVisibleColumns();
    const col = cols[colIdx];
    if (!col) return;

    this.engine.commandBus.dispatch('focus:set', {
      position: { rowIndex: rowIdx, colId: col.colId },
    });

    // Ensure focused row is visible
    this.engine.api.ensureIndexVisible(rowIdx);

    // Update DOM focus indicator
    this.updateFocusIndicator(rowIdx, col.colId);
  }

  private updateFocusIndicator(rowIdx: number, colId: string): void {
    if (!this.root) return;

    // Remove old focus
    const oldFocused = this.root.querySelector('.gs-cell-focused');
    if (oldFocused) {
      oldFocused.classList.remove('gs-cell-focused');
      (oldFocused as HTMLElement).removeAttribute('tabindex');
    }

    // Find and mark new focused cell
    const state = this.engine!.store.getState();
    const rowId = state.displayedRowIds[rowIdx];
    if (!rowId) return;

    const rowEl = this.root.querySelector(`[data-row-id="${rowId}"]`);
    if (!rowEl) return;

    const cellEl = rowEl.querySelector(`[data-col-id="${colId}"]`) as HTMLElement;
    if (!cellEl) return;

    cellEl.classList.add('gs-cell-focused');
    cellEl.setAttribute('tabindex', '0');
    cellEl.focus();
  }
}
