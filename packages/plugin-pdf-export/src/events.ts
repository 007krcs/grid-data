// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// Declaration-merging augmentation for `@gridstorm/core`'s `GridEventMap`.
// See packages/core/src/types/events.ts for the pattern.

import '@gridstorm/core';
import type { PageSize, Orientation, PdfExportLimitExceededError } from './types';

declare module '@gridstorm/core' {
  interface GridEventMap<TData> {
    /** Fired after a PDF export completes successfully. */
    'pdf:exportCompleted': {
      fileName: string;
      rowCount: number;
      pageSize: PageSize;
      orientation: Orientation;
    };

    /**
     * Fired when a PDF export is aborted because the row/cell cap was
     * exceeded (or any other failure-classified outcome).
     */
    'pdf:exportFailed': {
      reason: 'rows' | 'cells';
      rows: number;
      cells: number;
      maxRows: number;
      maxCells: number;
      error: PdfExportLimitExceededError;
    };
  }
}

export {};
