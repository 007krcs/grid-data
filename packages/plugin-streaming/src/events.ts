// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// Declaration-merging augmentation for `@gridstorm/core`'s `GridEventMap`.
// See packages/core/src/types/events.ts for the pattern.

import '@gridstorm/core';

declare module '@gridstorm/core' {
  interface GridEventMap<TData> {
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
