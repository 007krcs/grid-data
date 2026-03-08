// ─── Selection Types ───

export type RowSelectionMode = 'single' | 'multiple' | false;

export interface SelectionState {
  selectedRowIds: Set<string>;
  rangeSelections: CellRange[];
}

export interface CellPosition {
  rowIndex: number;
  colId: string;
}

export interface CellRange {
  startRow: number;
  endRow: number;
  startColId: string;
  endColId: string;
  columns: string[];
}
