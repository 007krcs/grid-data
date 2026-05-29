// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Cell Editing Overlay ───
// Renders an inline editor (<input>/<select>) over the active cell when the
// grid enters editing state, wires keyboard handling (Enter/Escape/Tab), and
// tears the editor down again — restoring the cell's rendered content.
//
// Extracted from renderer.ts to keep the DOM renderer focused on row/cell
// virtualization. The controller never touches renderer internals directly; it
// goes through the narrow EditingOverlayHost interface, mirroring the
// RendererContext pattern used by renderer extensions.

import type { GridState } from '@gridstorm/core';

/** A live inline editor mounted over a cell. */
export interface ActiveEditor {
  element: HTMLElement;
  cellElement: HTMLElement;
  rowId: string;
  colId: string;
}

/**
 * Narrow surface the editing overlay needs from the host renderer. Keeping this
 * explicit means the overlay has no access to renderer internals beyond what is
 * listed here, and the coupling is visible in one place.
 */
export interface EditingOverlayHost {
  /** CSS class prefix (e.g. 'gs'). */
  readonly prefix: string;
  /** Current grid state snapshot. */
  getState(): GridState;
  /** Dispatch a command on the engine's command bus. */
  dispatch(command: string, payload: unknown): void;
  /** The body container element rows are mounted into, if mounted. */
  getBodyContainer(): HTMLElement | null;
  /** The currently mounted editor, if any. */
  getActiveEditor(): ActiveEditor | null;
  /** Store/clear the currently mounted editor. */
  setActiveEditor(editor: ActiveEditor | null): void;
  /** Re-render a row's cells (used to restore content after editor teardown). */
  rerenderRow(rowId: string): void;
}

const EDITOR_STYLE =
  'width:100%;height:100%;box-sizing:border-box;' +
  'border:2px solid var(--gs-color-cell-editing-border,#3b82f6);' +
  'outline:none;padding:0 8px;font:inherit;' +
  'background:var(--gs-color-cell-editing-bg,#ffffff);';

const SELECT_STYLE =
  'width:100%;height:100%;box-sizing:border-box;' +
  'border:2px solid var(--gs-color-cell-editing-border,#3b82f6);' +
  'outline:none;padding:0 4px;font:inherit;' +
  'background:var(--gs-color-cell-editing-bg,#ffffff);';

export class EditingOverlay {
  private host: EditingOverlayHost;

  constructor(host: EditingOverlayHost) {
    this.host = host;
  }

  /** React to editing-state transitions: mount or tear down the editor. */
  onEditingStateChanged(): void {
    const state = this.host.getState();
    const activeEditor = this.host.getActiveEditor();

    if (state.editing && !activeEditor) {
      // Use microtask to ensure DOM has been updated with latest row data
      queueMicrotask(() => this.startEditorOverlay());
    } else if (!state.editing && activeEditor) {
      this.removeEditorOverlay();
    }
  }

  private startEditorOverlay(): void {
    const state = this.host.getState();
    if (!state.editing) return;

    const { rowId, colId, value } = state.editing;
    const node = state.rowNodes.get(rowId);
    if (!node) return;

    const col = state.columns.find((c) => c.colId === colId);
    if (!col) return;

    // Find cell DOM element
    const rowEl = this.host
      .getBodyContainer()
      ?.querySelector(`[data-row-id="${CSS.escape(rowId)}"]`);
    if (!rowEl) return;
    const cellEl = rowEl.querySelector(
      `[data-col-id="${CSS.escape(colId)}"]`,
    ) as HTMLElement | null;
    if (!cellEl) return;

    // Clear cell content and prepare for editor
    cellEl.textContent = '';
    cellEl.classList.add(`${this.host.prefix}-cell-editing`);
    cellEl.style.position = 'relative';
    cellEl.style.padding = '0';
    cellEl.style.overflow = 'visible';

    // Determine editor type
    const editorType = col.originalDef?.cellEditor ?? 'text';
    const editorParams = col.originalDef?.cellEditorParams as
      | Record<string, any>
      | undefined;

    let editorEl: HTMLElement;

    if (editorType === 'select' && editorParams?.values) {
      // Select editor
      const select = document.createElement('select');
      select.className = `${this.host.prefix}-cell-editor ${this.host.prefix}-cell-editor-select`;
      select.style.cssText = SELECT_STYLE;

      for (const optVal of editorParams.values as string[]) {
        const opt = document.createElement('option');
        opt.value = optVal;
        opt.textContent = optVal;
        if (optVal === String(value)) opt.selected = true;
        select.appendChild(opt);
      }

      select.addEventListener('change', () => {
        this.host.dispatch('editing:setValue', { value: select.value });
      });

      select.addEventListener('keydown', (e) => this.handleEditorKeydown(e));

      editorEl = select;
    } else if (editorType === 'number') {
      // Number editor
      const input = document.createElement('input');
      input.type = 'number';
      input.value = value != null ? String(value) : '';
      input.className = `${this.host.prefix}-cell-editor ${this.host.prefix}-cell-editor-number`;
      input.style.cssText = EDITOR_STYLE;

      input.addEventListener('input', () => {
        this.host.dispatch('editing:setValue', { value: input.valueAsNumber });
      });

      input.addEventListener('keydown', (e) => this.handleEditorKeydown(e));

      editorEl = input;
    } else {
      // Text editor (default)
      const input = document.createElement('input');
      input.type = 'text';
      input.value = value != null ? String(value) : '';
      input.className = `${this.host.prefix}-cell-editor ${this.host.prefix}-cell-editor-text`;
      input.style.cssText = EDITOR_STYLE;

      input.addEventListener('input', () => {
        this.host.dispatch('editing:setValue', { value: input.value });
      });

      input.addEventListener('keydown', (e) => this.handleEditorKeydown(e));

      editorEl = input;
    }

    cellEl.appendChild(editorEl);

    // Store reference
    this.host.setActiveEditor({
      element: editorEl,
      cellElement: cellEl,
      rowId,
      colId,
    });

    // Focus and select after DOM insertion
    requestAnimationFrame(() => {
      if (editorEl instanceof HTMLInputElement) {
        editorEl.focus();
        editorEl.select();
      } else if (editorEl instanceof HTMLSelectElement) {
        editorEl.focus();
      }
    });
  }

  /** Shared Enter/Escape/Tab handling for every editor element type. */
  private handleEditorKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      e.stopPropagation();
      e.preventDefault();
      this.host.dispatch('editing:stop', { cancel: false });
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
      this.host.dispatch('editing:stop', { cancel: true });
    } else if (e.key === 'Tab') {
      e.stopPropagation();
      e.preventDefault();
      this.tabToNextEditableCell(e.shiftKey);
    }
  }

  /** Stop current editing and move to the next/previous editable cell (Tab navigation). */
  private tabToNextEditableCell(reverse = false): void {
    const state = this.host.getState();
    if (!state.editing) {
      this.host.dispatch('editing:stop', { cancel: false });
      return;
    }

    const { rowId, colId } = state.editing;
    // Build a flat list of all [rowId, colId] pairs for editable cells
    const editablePairs: Array<{ rowId: string; colId: string }> = [];
    for (const id of state.displayedRowIds) {
      const node = state.rowNodes.get(id);
      if (!node || node.group || node.detail) continue;
      for (const col of state.columns) {
        if (col.hide) continue;
        if (col.originalDef?.editable) {
          editablePairs.push({ rowId: id, colId: col.colId });
        }
      }
    }

    // Find current position
    const currentIndex = editablePairs.findIndex(
      (p) => p.rowId === rowId && p.colId === colId,
    );

    // Stop editing first
    this.host.dispatch('editing:stop', { cancel: false });

    if (currentIndex === -1 || editablePairs.length < 2) return;

    const nextIndex = reverse
      ? (currentIndex - 1 + editablePairs.length) % editablePairs.length
      : (currentIndex + 1) % editablePairs.length;

    const next = editablePairs[nextIndex];
    if (!next) return;

    // Start editing the next cell after a microtask (allows stop to complete)
    queueMicrotask(() => {
      this.host.dispatch('editing:start', {
        rowId: next.rowId,
        colId: next.colId,
      });
    });
  }

  removeEditorOverlay(): void {
    const activeEditor = this.host.getActiveEditor();
    if (!activeEditor) return;

    const { cellElement, rowId } = activeEditor;

    // Remove editing class
    cellElement.classList.remove(`${this.host.prefix}-cell-editing`);
    cellElement.style.padding = '';
    cellElement.style.overflow = '';

    this.host.setActiveEditor(null);

    // Re-render the row to restore cell content
    this.host.rerenderRow(rowId);
  }
}
