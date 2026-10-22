// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// Declaration-merging augmentation for `@gridstorm/core`'s `GridEventMap`.
// See packages/core/src/types/events.ts for the pattern.

import '@gridstorm/core';
import type { AggregationResult } from './status-bar-plugin';

declare module '@gridstorm/core' {
  interface GridEventMap<TData> {
    /**
     * Fired after every status-bar recalculation (selection, filter, sort,
     * data or cell changes). `source` says which rows the numbers describe.
     */
    'status-bar:updated': {
      aggregations: Record<string, AggregationResult>;
      rowCount: number;
      source: 'selection' | 'all' | 'none';
    };
  }
}

export {};
