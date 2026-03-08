// ─── Editing Types ───

export interface EditingState {
  rowId: string;
  colId: string;
  value: any;
  originalValue: any;
  rowEditMode: boolean;
}

export type EditType = 'cell' | 'fullRow';

export interface CellEditorDef {
  /** Unique editor type name. */
  type: string;
  /** Create the editor DOM. Returns the input element. */
  create(params: CellEditorParams): HTMLElement;
  /** Get the current value from the editor. */
  getValue(element: HTMLElement): any;
  /** Clean up. */
  destroy?(element: HTMLElement): void;
  /** Focus the editor after mount. */
  afterAttach?(element: HTMLElement): void;
  /** Handle key events within the editor. Return true to suppress grid keyboard nav. */
  onKeyDown?(event: KeyboardEvent, element: HTMLElement): boolean;
}

export interface CellEditorParams {
  value: any;
  colId: string;
  rowId: string;
  data: any;
  column: import('./column').ColumnState;
  onValueChange: (value: any) => void;
  stopEditing: (cancel?: boolean) => void;
}

export interface ValidationRule {
  validate: (value: any, data: any) => boolean | string | Promise<boolean | string>;
  message?: string;
}
