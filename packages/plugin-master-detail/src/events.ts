// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// Declaration-merging augmentation for `@gridstorm/core`'s `GridEventMap`.
// See packages/core/src/types/events.ts for the pattern.

import '@gridstorm/core';
import type { RowNode } from '@gridstorm/core';

declare module '@gridstorm/core' {
  interface GridEventMap<TData> {
    /**
     * Fired when a master row's detail panel is expanded. `node` is the
     * master row's `RowNode`, or `undefined` if the node has since been
     * removed from `state.rowNodes` (e.g. by row data replacement).
     */
    'detail:opened': {
      nodeId: string;
      node: RowNode<TData> | undefined;
    };

    /** Fired when a master row's detail panel is collapsed. */
    'detail:closed': {
      nodeId: string;
      node: RowNode<TData> | undefined;
    };
  }
}

export {};
