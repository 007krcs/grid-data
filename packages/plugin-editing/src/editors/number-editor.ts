// ─── Built-in Number Cell Editor ───

import type { CellEditorDef, CellEditorParams } from '@gridstorm/core';

export const NumberCellEditor: CellEditorDef = {
  type: 'number',

  create(params: CellEditorParams): HTMLElement {
    const input = document.createElement('input');
    input.type = 'number';
    input.value = params.value != null ? String(params.value) : '';
    input.className = 'gs-cell-editor gs-cell-editor-number';
    input.style.cssText =
      'width:100%;height:100%;box-sizing:border-box;border:2px solid var(--gs-color-accent,#1976d2);' +
      'outline:none;padding:0 8px;font:inherit;background:var(--gs-color-cell-bg-editing,#fff8e1);';

    input.addEventListener('input', () => {
      const val = input.value === '' ? null : Number(input.value);
      params.onValueChange(val);
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

  getValue(element: HTMLElement): number | null {
    const val = (element as HTMLInputElement).value;
    return val === '' ? null : Number(val);
  },

  afterAttach(element: HTMLElement): void {
    const input = element as HTMLInputElement;
    input.focus();
    input.select();
  },

  onKeyDown(event: KeyboardEvent, _element: HTMLElement): boolean {
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      return true;
    }
    return false;
  },
};
