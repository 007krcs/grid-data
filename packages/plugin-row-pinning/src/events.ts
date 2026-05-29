// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// Declaration-merging augmentation for `@gridstorm/core`'s `GridEventMap`.
// See packages/core/src/types/events.ts for the pattern.

import '@gridstorm/core';
import type { PinnedRowNode } from './row-pinning-plugin';

declare module '@gridstorm/core' {
  interface GridEventMap<TData> {
    /**
     * Fired when the set of pinned rows changes — pinning, unpinning,
     * reordering within a region, or replacing the entire pinned set.
     */
    'rowPinning:changed': {
      pinnedTopRows: PinnedRowNode[];
      pinnedBottomRows: PinnedRowNode[];
    };
  }
}

export {};
