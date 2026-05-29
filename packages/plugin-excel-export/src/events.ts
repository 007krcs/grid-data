// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// Declaration-merging augmentation for `@gridstorm/core`'s `GridEventMap`.
// See packages/core/src/types/events.ts for the pattern.

import '@gridstorm/core';
import type { ExportLimitExceededError } from './types';

// Mirrors `ExportLimitExceededError.format` in ./types.ts. Keep in sync
// if a future format ('xlsx', 'tsv', etc.) is added.
type ExcelFormat = 'csv' | 'excel';

declare module '@gridstorm/core' {
  interface GridEventMap<TData> {
    /** Fired after an Excel/CSV export completes successfully. */
    'excel:exported': {
      format: ExcelFormat;
      fileName: string;
      rowCount: number;
    };

    /**
     * Fired when an export is aborted because the row/cell cap was exceeded
     * (or any other failure-classified outcome). The `error` is the
     * structured `ExportLimitExceededError` when limits trip.
     */
    'excel:exportFailed': {
      format: ExcelFormat;
      reason: 'rows' | 'cells';
      rows: number;
      cells: number;
      maxRows: number;
      maxCells: number;
      error: ExportLimitExceededError;
    };
  }
}

export {};
