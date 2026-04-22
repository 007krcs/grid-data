// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Built-in Text Cell Editor ───

import type { CellEditorDef, CellEditorParams } from '@gridstorm/core';

export const TextCellEditor: CellEditorDef = {
  type: 'text',

  create(params: CellEditorParams): HTMLElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = params.value != null ? String(params.value) : '';
    input.className = 'gs-cell-editor gs-cell-editor-text';
    input.style.cssText =
      'width:100%;height:100%;box-sizing:border-box;border:2px solid var(--gs-color-accent,#1976d2);' +
      'outline:none;padding:0 8px;font:inherit;background:var(--gs-color-cell-bg-editing,#fff8e1);';

    input.addEventListener('input', () => {
      params.onValueChange(input.value);
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        params.stopEditing(false);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        params.stopEditing(true);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        params.stopEditing(false);
      }
    });

    return input;
  },

  getValue(element: HTMLElement): string {
    return (element as HTMLInputElement).value;
  },

  afterAttach(element: HTMLElement): void {
    const input = element as HTMLInputElement;
    input.focus();
    input.select();
  },

  onKeyDown(event: KeyboardEvent, _element: HTMLElement): boolean {
    // Suppress grid keyboard nav while editing
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      return true;
    }
    return false;
  },
};
