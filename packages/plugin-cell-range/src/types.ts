// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Cell Range Selection Types ───

export interface CellPosition {
  rowIndex: number;
  colIndex: number;
}

export interface RangeSelection {
  id: string;
  start: CellPosition;
  end: CellPosition;
  /** Normalized: startRow <= endRow, startCol <= endCol */
  bounds: RangeBounds;
}

export interface RangeBounds {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

export type DetectedPattern =
  | { type: 'number-increment'; start: number; step: number }
  | { type: 'date-increment'; startMs: number; stepMs: number }
  | { type: 'repeat'; values: unknown[] }
  | { type: 'text-series'; prefix: string; numStart: number; step: number; suffix: string }
  | { type: 'copy'; value: unknown };

export interface FillOperation {
  sourceRange: RangeBounds;
  direction: 'down' | 'up' | 'left' | 'right';
  count: number;
  pattern: DetectedPattern;
}

export interface FillResult {
  cellsUpdated: number;
  values: Array<{ rowIndex: number; colIndex: number; value: unknown }>;
}

export interface CellRangeState {
  ranges: RangeSelection[];
  activeRangeId: string | null;
  fillDragging: boolean;
}

export interface CellRangePluginOptions {
  /** Allow multiple simultaneous range selections. Default: true. */
  multiRange?: boolean;
  /** Enable fill handle for auto-fill. Default: true. */
  fillHandle?: boolean;
  /** Maximum number of ranges allowed. Default: 10. */
  maxRanges?: number;
}
