// ─── Editing Types ───

/**
 * Represents the state of an active cell or row edit operation.
 *
 * Stored in {@link GridState.editing} when a cell is being edited,
 * and set to `null` when no edit is in progress.
 *
 * @see {@link GridApi.startEditingCell}
 * @see {@link GridApi.stopEditing}
 */
export interface EditingState {
  /** The unique ID of the row being edited. */
  rowId: string;

  /** The unique ID of the column being edited. */
  colId: string;

  /** The current (in-progress) value in the cell editor. */
  value: any;

  /** The cell's value before editing began, used for cancel/undo. */
  originalValue: any;

  /**
   * When `true`, the entire row is in edit mode (all editable cells).
   * When `false`, only the single cell identified by `colId` is being edited.
   *
   * @see {@link EditType}
   */
  rowEditMode: boolean;
}

/**
 * Controls the editing mode of the grid.
 *
 * - `'cell'` - Only one cell is editable at a time. Tab/Enter navigates between cells.
 * - `'fullRow'` - All editable cells in the row become editable simultaneously.
 *
 * @see {@link GridConfig.editType}
 */
export type EditType = 'cell' | 'fullRow';

/**
 * Definition for a custom cell editor component.
 *
 * Cell editors are registered via {@link PluginContext.registerCellEditor}
 * and referenced in column definitions via {@link ColumnDef.cellEditor}.
 *
 * Editors follow a lifecycle: `create` -> `afterAttach` -> user interaction
 * -> `getValue` -> `destroy`.
 *
 * @example
 * ```ts
 * const selectEditor: CellEditorDef = {
 *   type: 'select',
 *   create(params) {
 *     const select = document.createElement('select');
 *     const options = params.column.originalDef.cellEditorParams?.options ?? [];
 *     for (const opt of options) {
 *       const el = document.createElement('option');
 *       el.value = opt;
 *       el.textContent = opt;
 *       select.appendChild(el);
 *     }
 *     select.value = params.value;
 *     return select;
 *   },
 *   getValue(el) { return (el as HTMLSelectElement).value; },
 * };
 * ```
 *
 * @see {@link PluginContext.registerCellEditor}
 * @see {@link ColumnDef.cellEditor}
 */
export interface CellEditorDef {
  /**
   * Unique editor type name used to reference this editor in column definitions.
   *
   * @example
   * ```ts
   * { type: 'richText' }
   * // Referenced as: { cellEditor: 'richText' }
   * ```
   */
  type: string;

  /**
   * Creates the editor DOM element.
   *
   * Called when a cell enters edit mode. Must return an HTML element
   * (typically an `<input>`, `<select>`, or `<textarea>`) that will
   * be inserted into the cell.
   *
   * @param params - Editor initialization parameters.
   * @returns The editor's root HTML element.
   */
  create(params: CellEditorParams): HTMLElement;

  /**
   * Extracts the current value from the editor element.
   *
   * Called when editing stops (commit). The returned value is passed
   * through {@link ColumnDef.valueParser} and then written back to
   * the row data.
   *
   * @param element - The editor element created by {@link create}.
   * @returns The current editor value.
   */
  getValue(element: HTMLElement): any;

  /**
   * Optional cleanup function called when the editor is removed from the DOM.
   *
   * Use to remove event listeners, cancel timers, or release resources.
   *
   * @param element - The editor element to clean up.
   */
  destroy?(element: HTMLElement): void;

  /**
   * Optional callback invoked after the editor element is attached to the DOM.
   *
   * Commonly used to focus the input element or set initial cursor position.
   *
   * @param element - The editor element that was just attached.
   */
  afterAttach?(element: HTMLElement): void;

  /**
   * Optional key event handler for intercepting keyboard events within the editor.
   *
   * Return `true` to suppress the grid's default keyboard navigation
   * (e.g., to allow multi-line editing with Enter in a textarea).
   *
   * @param event - The keyboard event.
   * @param element - The editor element.
   * @returns `true` to prevent grid keyboard handling, `false` to allow it.
   */
  onKeyDown?(event: KeyboardEvent, element: HTMLElement): boolean;
}

/**
 * Parameters provided to a cell editor's {@link CellEditorDef.create} method.
 *
 * Contains the current cell value, row/column context, and callback functions
 * for communicating value changes and stopping the edit.
 */
export interface CellEditorParams {
  /** The current cell value when editing begins. */
  value: any;

  /** The column ID of the cell being edited. */
  colId: string;

  /** The row ID of the cell being edited. */
  rowId: string;

  /** The row data object. */
  data: any;

  /**
   * The resolved column state, providing access to width, header name,
   * and the original column definition (including `cellEditorParams`).
   *
   * @see {@link ColumnState}
   */
  column: import('./column').ColumnState;

  /**
   * Callback to notify the grid that the editor's value has changed.
   *
   * Call this for live-preview of edits or intermediate value tracking.
   *
   * @param value - The new value from the editor.
   */
  onValueChange: (value: any) => void;

  /**
   * Programmatically stop the current edit session.
   *
   * @param cancel - When `true`, reverts to the original value.
   *                 When `false` or omitted, commits the current value.
   */
  stopEditing: (cancel?: boolean) => void;
}

/**
 * Defines a validation rule for cell editing.
 *
 * Validation rules are evaluated when a cell edit is committed.
 * The edit is rejected if validation fails (returns `false` or an error string).
 *
 * @example
 * ```ts
 * const positiveNumber: ValidationRule = {
 *   validate: (value) => value > 0 || 'Value must be positive',
 *   message: 'Please enter a positive number',
 * };
 * ```
 */
export interface ValidationRule {
  /**
   * Validation function that checks the new cell value.
   *
   * @param value - The new value to validate.
   * @param data - The row data object for context-dependent validation.
   * @returns `true` if valid, `false` or an error message string if invalid.
   *          Can also return a `Promise` for async validation.
   */
  validate: (value: any, data: any) => boolean | string | Promise<boolean | string>;

  /**
   * Default error message to display when validation fails
   * and the `validate` function returns `false` (rather than a string).
   *
   * @default undefined
   */
  message?: string;
}
