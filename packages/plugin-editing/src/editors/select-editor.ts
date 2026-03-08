// ─── Built-in Select Cell Editor ───

import type { CellEditorDef, CellEditorParams } from '@gridstorm/core';

export const SelectCellEditor: CellEditorDef = {
  type: 'select',

  create(params: CellEditorParams): HTMLElement {
    const select = document.createElement('select');
    select.className = 'gs-cell-editor gs-cell-editor-select';
    select.style.cssText =
      'width:100%;height:100%;box-sizing:border-box;border:2px solid var(--gs-color-accent,#1976d2);' +
      'outline:none;padding:0 4px;font:inherit;background:var(--gs-color-cell-bg-editing,#fff8e1);';

    // Get options from column editor params
    const editorParams = params.column.originalDef.cellEditorParams as
      | { values?: string[] }
      | undefined;
    const values = editorParams?.values ?? [];

    for (const value of values) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      if (value === String(params.value)) {
        option.selected = true;
      }
      select.appendChild(option);
    }

    select.addEventListener('change', () => {
      params.onValueChange(select.value);
    });

    select.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        params.stopEditing(false);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        params.stopEditing(true);
      }
    });

    return select;
  },

  getValue(element: HTMLElement): string {
    return (element as HTMLSelectElement).value;
  },

  afterAttach(element: HTMLElement): void {
    (element as HTMLSelectElement).focus();
  },

  onKeyDown(_event: KeyboardEvent, _element: HTMLElement): boolean {
    return false;
  },
};
