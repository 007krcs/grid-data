// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// Declaration-merging augmentation for `@gridstorm/core`'s `GridEventMap`.
// See packages/core/src/types/events.ts for the pattern.

import '@gridstorm/core';
import type { StateSnapshot, DiffResult } from './types';

declare module '@gridstorm/core' {
  interface GridEventMap<TData> {
    /** Fired after a new snapshot is captured (auto, manual, or checkpoint). */
    'timeTravel:snapshotCaptured': {
      snapshot: StateSnapshot;
    };

    /** Fired after the grid is restored to a specific snapshot by id. */
    'timeTravel:restored': {
      snapshotId: string;
    };

    /** Fired after an undo moves the cursor to an earlier snapshot. */
    'timeTravel:undone': {
      snapshotIndex: number;
    };

    /** Fired after a redo moves the cursor to a later snapshot. */
    'timeTravel:redone': {
      snapshotIndex: number;
    };

    /** Fired with the computed diff between two snapshots. */
    'timeTravel:diffResult': {
      fromId: string;
      toId: string;
      diff: DiffResult;
    };

    /** Fired when a time-travel operation fails (e.g. branch cap reached). */
    'timeTravel:error': {
      message: string;
    };

    /** Fired after a new what-if branch is created and switched to. */
    'timeTravel:branchCreated': {
      branchId: string;
      name: string;
    };

    /** Fired after switching to a different branch (state is restored). */
    'timeTravel:branchSwitched': {
      branchId: string;
    };

    /** Fired in response to `timeTravel:getHistory`, listing the branch's snapshots. */
    'timeTravel:history': {
      branchId: string;
      snapshots: Array<{
        id: string;
        name: string | undefined;
        timestamp: number;
        type: 'full' | 'delta';
        source: 'auto' | 'manual' | 'checkpoint';
        rowCount: number;
        columnCount: number;
      }>;
      currentIndex: number;
    };
  }
}

export {};
