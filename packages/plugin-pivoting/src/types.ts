// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Pivot Types ───

import type { ColumnDef } from '@gridstorm/core';

export interface PivotPluginOptions {
  /** Enable pivot mode on startup. Default: false. */
  pivotMode?: boolean;
  /** Maximum number of generated pivot columns. Default: 1000. */
  pivotMaxGeneratedColumns?: number;
  /** Post-process generated secondary columns. */
  processSecondaryColumns?: (columns: ColumnDef[]) => ColumnDef[];
}

export interface PivotState {
  pivotMode: boolean;
  pivotColumns: string[];
  generatedColumns: ColumnDef[];
  originalColumns?: any[];
}
