// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Aggregation Types ───

import type { ColumnState, RowNode } from '@gridstorm/core';

export interface AggregationPluginOptions {
  /** Default aggregation function name. */
  defaultAggFunc?: string;
  /** Custom aggregation functions. */
  customAggFuncs?: Record<string, AggFunc>;
}

export type AggFunc = (params: AggFuncParams) => any;

export interface AggFuncParams {
  values: any[];
  nodes: RowNode[];
  column: ColumnState;
}
