// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Selection Types ───

/**
 * Configures the row selection behavior of the grid.
 *
 * - `'single'` - Only one row can be selected at a time. Clicking a new row deselects the previous.
 * - `'multiple'` - Multiple rows can be selected using Ctrl+Click, Shift+Click, or checkbox selection.
 * - `false` - Row selection is disabled entirely.
 *
 * @see {@link GridConfig.rowSelection}
 */
export type RowSelectionMode = 'single' | 'multiple' | false;

/**
 * Internal state object tracking the current selection.
 *
 * @see {@link GridState.selection}
 */
export interface SelectionState {
  /** Set of unique IDs of all currently selected rows. */
  selectedRowIds: Set<string>;

  /**
   * Array of active cell range selections.
   *
   * Used for range-select operations (e.g., Shift+Click drag) that
   * support clipboard copy/paste of rectangular cell regions.
   *
   * @see {@link CellRange}
   */
  rangeSelections: CellRange[];
}

/**
 * Identifies a single cell by its row index and column ID.
 *
 * Used for cell focus tracking, editing, and keyboard navigation.
 *
 * @see {@link GridState.focusedCell}
 * @see {@link GridApi.startEditingCell}
 *
 * @example
 * ```ts
 * const position: CellPosition = { rowIndex: 5, colId: 'name' };
 * api.startEditingCell(position);
 * ```
 */
export interface CellPosition {
  /** Zero-based display row index. */
  rowIndex: number;

  /** The unique column identifier. */
  colId: string;
}

/**
 * Represents a rectangular range of cells spanning multiple rows and columns.
 *
 * Used for range selection operations (e.g., copy/paste, bulk editing).
 * The range is defined by start/end row indices and start/end column IDs,
 * plus an expanded `columns` array of all column IDs within the range.
 *
 * @see {@link SelectionState.rangeSelections}
 *
 * @example
 * ```ts
 * const range: CellRange = {
 *   startRow: 2,
 *   endRow: 5,
 *   startColId: 'name',
 *   endColId: 'salary',
 *   columns: ['name', 'department', 'salary'],
 * };
 * ```
 */
export interface CellRange {
  /** Start row index of the range (inclusive). */
  startRow: number;

  /** End row index of the range (inclusive). */
  endRow: number;

  /** Column ID at the start (left edge) of the range. */
  startColId: string;

  /** Column ID at the end (right edge) of the range. */
  endColId: string;

  /** All column IDs included in the range, in display order. */
  columns: string[];
}
