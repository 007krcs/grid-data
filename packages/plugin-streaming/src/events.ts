// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// Declaration-merging augmentation for `@gridstorm/core`'s `GridEventMap`.
// See packages/core/src/types/events.ts for the pattern.

import '@gridstorm/core';
import type { CellChange } from './streaming-plugin';

declare module '@gridstorm/core' {
  interface GridEventMap<TData> {
    /**
     * Fired after a batch of streamed updates has been applied to the grid.
     * The row data itself is updated via `ctx.api.updateRows`, which emits a
     * correctly-shaped `rowData:changed` for re-render; this event carries the
     * streaming-specific detail (batch size + per-cell change records used to
     * drive cell-flash highlighting).
     */
    'streaming:updated': {
      batchSize: number;
      changes: CellChange[];
    };

    /**
     * Fired when the streaming queue exceeds its size cap and older updates
     * had to be discarded. Adapters/consumers can react by showing a
     * "data lost" indicator or by slowing down the source.
     */
    'streaming:backpressure': {
      droppedCount: number;
      queueSize: number;
      queueLimit: number;
    };

    /** Fired when the stream adapter surfaces an error to the plugin. */
    'streaming:error': {
      error: Error;
    };

    /** Fired when the stream adapter's connection state flips. */
    'streaming:connectionChange': {
      connected: boolean;
    };
  }
}

export {};
