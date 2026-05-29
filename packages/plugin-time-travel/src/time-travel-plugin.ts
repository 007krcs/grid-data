// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Time Travel Plugin ───
// Git-for-grids: full state history with undo/redo, snapshots, diffs, and branches.
// Provides named checkpoints, state diffing, and what-if branches.

import type { GridPlugin, PluginContext } from '@gridstorm/core';
import type {
  TimeTravelPluginOptions,
  TimeTravelState,
  StateBranch,
  StateSnapshot,
} from './types';
import {
  captureFullSnapshot,
  captureDeltaSnapshot,
  restoreSnapshot,
  resolveSnapshotChain,
  trimSnapshots,
  serializeGridState,
} from './snapshot-store';
import { computeDiff } from './diff-engine';

// ─── Constants ───

const DEFAULT_MAX_SNAPSHOTS = 100;
const DEFAULT_MAX_BRANCHES = 10;
const MAIN_BRANCH_ID = 'main';

// ─── Helpers ───

let branchCounter = 0;

function generateBranchId(): string {
  branchCounter += 1;
  return `branch_${Date.now()}_${branchCounter}`;
}

/** Reset counter — useful for tests. */
export function resetBranchCounter(): void {
  branchCounter = 0;
}

// ─── Plugin Factory ───

export function TimeTravelPlugin(options: TimeTravelPluginOptions = {}): GridPlugin {
  const {
    maxSnapshots = DEFAULT_MAX_SNAPSHOTS,
    autoCapture = true,
    maxBranches = DEFAULT_MAX_BRANCHES,
  } = options;

  return {
    id: 'time-travel',
    name: 'Time Travel',
    version: '0.1.0',

    install(ctx: PluginContext): void | (() => void) {
      // ── Mutable internal state ──
      let isRestoring = false;
      let captureScheduled = false;

      // ── Create main branch with initial snapshot ──
      const initialSnapshot = captureFullSnapshot(
        ctx.store.getState(),
        'Initial state',
        'checkpoint',
      );

      const mainBranch: StateBranch = {
        id: MAIN_BRANCH_ID,
        name: 'main',
        parentBranchId: null,
        forkPointSnapshotId: initialSnapshot.id,
        snapshots: [initialSnapshot],
        createdAt: Date.now(),
      };

      const branches = new Map<string, StateBranch>();
      branches.set(MAIN_BRANCH_ID, mainBranch);

      const initialState: TimeTravelState = {
        currentBranchId: MAIN_BRANCH_ID,
        branches,
        currentSnapshotIndex: 0,
        totalSnapshots: 1,
        isDirty: false,
      };

      ctx.registerState<TimeTravelState>('timeTravel', initialState);

      // ── Helper: get current branch ──
      function getCurrentBranch(): StateBranch {
        const state = ctx.getState<TimeTravelState>('timeTravel');
        const branch = state.branches.get(state.currentBranchId);
        if (!branch) {
          throw new Error(`Branch "${state.currentBranchId}" not found`);
        }
        return branch;
      }

      // ── Helper: get current snapshot ──
      function getCurrentSnapshot(): StateSnapshot | undefined {
        const state = ctx.getState<TimeTravelState>('timeTravel');
        const branch = getCurrentBranch();
        return branch.snapshots[state.currentSnapshotIndex];
      }

      // ── Helper: snapshot the current row data for a `rowData:changed` ──
      // Restoring a snapshot rewrites the store's rowNodes directly (see
      // snapshot-store.restoreSnapshot), which the dom-renderer does NOT
      // observe on its own — it listens for the `rowData:changed` event to
      // do a full row rebuild. So state-mutating operations emit a properly
      // shaped `{ rowData }` payload (not the old abused `{ type, ... }`).
      function currentRowData(): unknown[] {
        const rowData: unknown[] = [];
        ctx.store.getState().rowNodes.forEach((node) => {
          if (node.data != null) rowData.push(node.data);
        });
        return rowData;
      }

      // ── Helper: update plugin state ──
      function updateTimeTravelState(
        updater: (prev: TimeTravelState) => TimeTravelState,
      ): void {
        ctx.setState<TimeTravelState>('timeTravel', updater);
      }

      // ── Auto-capture logic ──
      function scheduleCaptureIfNeeded(): void {
        if (!autoCapture || isRestoring || captureScheduled) return;
        captureScheduled = true;

        // Use microtask to batch rapid changes
        Promise.resolve().then(() => {
          captureScheduled = false;
          if (isRestoring) return;
          captureSnapshot('auto');
        });
      }

      function captureSnapshot(
        source: 'auto' | 'manual' | 'checkpoint',
        name?: string,
      ): void {
        const ttState = ctx.getState<TimeTravelState>('timeTravel');
        const branch = ttState.branches.get(ttState.currentBranchId);
        if (!branch) return;

        const currentGridState = ctx.store.getState();
        const currentIdx = ttState.currentSnapshotIndex;
        const prevSnapshot = branch.snapshots[currentIdx];

        // For auto-capture, skip if nothing changed
        if (source === 'auto' && prevSnapshot) {
          const prevSerialized = prevSnapshot.fullState
            ?? (prevSnapshot.type === 'full' ? prevSnapshot.fullState : undefined);
          if (prevSerialized) {
            const currentSerialized = serializeGridState(currentGridState);
            if (
              JSON.stringify(prevSerialized.rowData) === JSON.stringify(currentSerialized.rowData) &&
              JSON.stringify(prevSerialized.sortModel) === JSON.stringify(currentSerialized.sortModel) &&
              JSON.stringify(prevSerialized.filterModel) === JSON.stringify(currentSerialized.filterModel)
            ) {
              return; // No changes, skip
            }
          }
        }

        let newSnapshot: StateSnapshot;

        if (prevSnapshot && source !== 'checkpoint') {
          // Use delta capture
          newSnapshot = captureDeltaSnapshot(prevSnapshot, currentGridState, source);
        } else {
          // Full capture for checkpoints or first snapshot
          newSnapshot = captureFullSnapshot(
            currentGridState,
            name,
            source,
          );
        }

        if (name) {
          newSnapshot.name = name;
        }

        // If we undo'd and are now making new changes, truncate future
        let updatedSnapshots = branch.snapshots.slice(0, currentIdx + 1);
        updatedSnapshots.push(newSnapshot);

        // Resolve chain for delta snapshots
        resolveSnapshotChain(updatedSnapshots);

        // Trim to max
        updatedSnapshots = trimSnapshots(updatedSnapshots, maxSnapshots);

        // Find the index of the new snapshot after trimming
        const newIdx = updatedSnapshots.indexOf(newSnapshot);
        const finalIdx = newIdx >= 0 ? newIdx : updatedSnapshots.length - 1;

        const updatedBranch: StateBranch = {
          ...branch,
          snapshots: updatedSnapshots,
        };

        updateTimeTravelState((prev) => {
          const newBranches = new Map(prev.branches);
          newBranches.set(prev.currentBranchId, updatedBranch);
          return {
            ...prev,
            branches: newBranches,
            currentSnapshotIndex: finalIdx,
            totalSnapshots: updatedSnapshots.length,
            isDirty: false,
          };
        });

        // Capturing a snapshot does not change the grid's row data, so this is
        // a notification only — no `rowData:changed`.
        ctx.eventBus.emit('timeTravel:snapshotCaptured', {
          snapshot: newSnapshot,
        });
      }

      // ── Command: timeTravel:snapshot ──
      const unregSnapshot = ctx.commandBus.registerHandler(
        'timeTravel:snapshot',
        (payload: { name?: string }) => {
          captureSnapshot('checkpoint', payload.name);
        },
      );

      // ── Command: timeTravel:restore ──
      const unregRestore = ctx.commandBus.registerHandler(
        'timeTravel:restore',
        (payload: { snapshotId: string }) => {
          const branch = getCurrentBranch();
          const idx = branch.snapshots.findIndex((s) => s.id === payload.snapshotId);
          if (idx < 0) return;

          const snapshot = branch.snapshots[idx]!;
          resolveSnapshotChain(branch.snapshots);

          isRestoring = true;
          try {
            restoreSnapshot(snapshot, ctx.store);
            updateTimeTravelState((prev) => ({
              ...prev,
              currentSnapshotIndex: idx,
              isDirty: false,
            }));
            // Emit the row-data change while still inside the isRestoring
            // guard so the auto-capture listener does not snapshot our own
            // restore (see scheduleCaptureIfNeeded).
            ctx.eventBus.emit('rowData:changed', { rowData: currentRowData() as any });
          } finally {
            isRestoring = false;
          }

          ctx.eventBus.emit('timeTravel:restored', {
            snapshotId: payload.snapshotId,
          });
        },
      );

      // ── Command: timeTravel:undo ──
      const unregUndo = ctx.commandBus.registerHandler(
        'timeTravel:undo',
        (_payload: any) => {
          const ttState = ctx.getState<TimeTravelState>('timeTravel');
          if (ttState.currentSnapshotIndex <= 0) return;

          const branch = getCurrentBranch();
          const newIdx = ttState.currentSnapshotIndex - 1;
          const snapshot = branch.snapshots[newIdx];
          if (!snapshot) return;

          resolveSnapshotChain(branch.snapshots);

          isRestoring = true;
          try {
            restoreSnapshot(snapshot, ctx.store);
            updateTimeTravelState((prev) => ({
              ...prev,
              currentSnapshotIndex: newIdx,
              isDirty: false,
            }));
            ctx.eventBus.emit('rowData:changed', { rowData: currentRowData() as any });
          } finally {
            isRestoring = false;
          }

          ctx.eventBus.emit('timeTravel:undone', {
            snapshotIndex: newIdx,
          });
        },
      );

      // ── Command: timeTravel:redo ──
      const unregRedo = ctx.commandBus.registerHandler(
        'timeTravel:redo',
        (_payload: any) => {
          const ttState = ctx.getState<TimeTravelState>('timeTravel');
          const branch = getCurrentBranch();
          const newIdx = ttState.currentSnapshotIndex + 1;

          if (newIdx >= branch.snapshots.length) return;

          const snapshot = branch.snapshots[newIdx];
          if (!snapshot) return;

          resolveSnapshotChain(branch.snapshots);

          isRestoring = true;
          try {
            restoreSnapshot(snapshot, ctx.store);
            updateTimeTravelState((prev) => ({
              ...prev,
              currentSnapshotIndex: newIdx,
              isDirty: false,
            }));
            ctx.eventBus.emit('rowData:changed', { rowData: currentRowData() as any });
          } finally {
            isRestoring = false;
          }

          ctx.eventBus.emit('timeTravel:redone', {
            snapshotIndex: newIdx,
          });
        },
      );

      // ── Command: timeTravel:diff ──
      const unregDiff = ctx.commandBus.registerHandler(
        'timeTravel:diff',
        (payload: { fromId: string; toId: string }) => {
          const branch = getCurrentBranch();
          resolveSnapshotChain(branch.snapshots);

          const fromSnap = branch.snapshots.find((s) => s.id === payload.fromId);
          const toSnap = branch.snapshots.find((s) => s.id === payload.toId);

          if (!fromSnap || !toSnap) return;

          const diff = computeDiff(fromSnap, toSnap);

          ctx.eventBus.emit('timeTravel:diffResult', {
            fromId: payload.fromId,
            toId: payload.toId,
            diff,
          });
        },
      );

      // ── Command: timeTravel:branch ──
      const unregBranch = ctx.commandBus.registerHandler(
        'timeTravel:branch',
        (payload: { name: string }) => {
          const ttState = ctx.getState<TimeTravelState>('timeTravel');

          if (ttState.branches.size >= maxBranches) {
            ctx.eventBus.emit('timeTravel:error', {
              message: `Maximum branches (${maxBranches}) reached`,
            });
            return;
          }

          const currentBranch = getCurrentBranch();
          const currentSnapshot = getCurrentSnapshot();
          if (!currentSnapshot) return;

          // Take a full snapshot of current state for the new branch
          const forkSnapshot = captureFullSnapshot(
            ctx.store.getState(),
            `Fork: ${payload.name}`,
            'checkpoint',
          );

          const branchId = generateBranchId();
          const newBranch: StateBranch = {
            id: branchId,
            name: payload.name,
            parentBranchId: currentBranch.id,
            forkPointSnapshotId: currentSnapshot.id,
            snapshots: [forkSnapshot],
            createdAt: Date.now(),
          };

          updateTimeTravelState((prev) => {
            const newBranches = new Map(prev.branches);
            newBranches.set(branchId, newBranch);
            return {
              ...prev,
              currentBranchId: branchId,
              branches: newBranches,
              currentSnapshotIndex: 0,
              totalSnapshots: 1,
              isDirty: false,
            };
          });

          // Creating a branch forks history but leaves the live grid state
          // unchanged, so this is a notification only — no `rowData:changed`.
          ctx.eventBus.emit('timeTravel:branchCreated', {
            branchId,
            name: payload.name,
          });
        },
      );

      // ── Command: timeTravel:switchBranch ──
      const unregSwitchBranch = ctx.commandBus.registerHandler(
        'timeTravel:switchBranch',
        (payload: { branchId: string }) => {
          const ttState = ctx.getState<TimeTravelState>('timeTravel');
          const targetBranch = ttState.branches.get(payload.branchId);
          if (!targetBranch) return;

          // Restore the latest snapshot in the target branch
          const latestIdx = targetBranch.snapshots.length - 1;
          const snapshot = targetBranch.snapshots[latestIdx];
          if (!snapshot) return;

          resolveSnapshotChain(targetBranch.snapshots);

          isRestoring = true;
          try {
            restoreSnapshot(snapshot, ctx.store);
            updateTimeTravelState((prev) => ({
              ...prev,
              currentBranchId: payload.branchId,
              currentSnapshotIndex: latestIdx,
              totalSnapshots: targetBranch.snapshots.length,
              isDirty: false,
            }));
            ctx.eventBus.emit('rowData:changed', { rowData: currentRowData() as any });
          } finally {
            isRestoring = false;
          }

          ctx.eventBus.emit('timeTravel:branchSwitched', {
            branchId: payload.branchId,
          });
        },
      );

      // ── Command: timeTravel:getHistory ──
      const unregGetHistory = ctx.commandBus.registerHandler(
        'timeTravel:getHistory',
        (_payload: any) => {
          const ttState = ctx.getState<TimeTravelState>('timeTravel');
          const branch = getCurrentBranch();

          ctx.eventBus.emit('timeTravel:history', {
            branchId: ttState.currentBranchId,
            snapshots: branch.snapshots.map((s) => ({
              id: s.id,
              name: s.name,
              timestamp: s.timestamp,
              type: s.type,
              source: s.metadata.source,
              rowCount: s.metadata.rowCount,
              columnCount: s.metadata.columnCount,
            })),
            currentIndex: ttState.currentSnapshotIndex,
          });
        },
      );

      // ── Command: timeTravel:clear ──
      const unregClear = ctx.commandBus.registerHandler(
        'timeTravel:clear',
        (_payload: any) => {
          // Take a fresh snapshot of current state
          const freshSnapshot = captureFullSnapshot(
            ctx.store.getState(),
            'After clear',
            'checkpoint',
          );

          const freshBranch: StateBranch = {
            id: MAIN_BRANCH_ID,
            name: 'main',
            parentBranchId: null,
            forkPointSnapshotId: freshSnapshot.id,
            snapshots: [freshSnapshot],
            createdAt: Date.now(),
          };

          const newBranches = new Map<string, StateBranch>();
          newBranches.set(MAIN_BRANCH_ID, freshBranch);

          updateTimeTravelState((_prev) => ({
            currentBranchId: MAIN_BRANCH_ID,
            branches: newBranches,
            currentSnapshotIndex: 0,
            totalSnapshots: 1,
            isDirty: false,
          }));
        },
      );

      // ── Auto-capture: subscribe to state changes ──
      const disposers: Array<() => void> = [];

      if (autoCapture) {
        // Watch sortModel changes
        const unsubSort = ctx.store.select(
          (state) => state.sortModel,
          (_next, _prev) => {
            scheduleCaptureIfNeeded();
          },
        );
        disposers.push(unsubSort);

        // Watch filterModel changes
        const unsubFilter = ctx.store.select(
          (state) => state.filterModel,
          (_next, _prev) => {
            scheduleCaptureIfNeeded();
          },
        );
        disposers.push(unsubFilter);

        // Watch row data changes (via rowNodes reference)
        const unsubRows = ctx.store.select(
          (state) => state.rowNodes,
          (_next, _prev) => {
            scheduleCaptureIfNeeded();
          },
        );
        disposers.push(unsubRows);

        // Watch cell edits — editing plugin mutates data in-place
        // so the rowNodes reference doesn't change
        const unsubCellEdit = ctx.eventBus.on('cell:valueChanged', () => {
          scheduleCaptureIfNeeded();
        });
        disposers.push(unsubCellEdit);

        // Also watch rowData:changed for setRowData/updateRows calls. Our own
        // restore/undo/redo/switchBranch operations emit `rowData:changed`
        // while `isRestoring` is true, and scheduleCaptureIfNeeded bails out in
        // that state — so we don't snapshot our own restores.
        const unsubRowData = ctx.eventBus.on('rowData:changed', () => {
          scheduleCaptureIfNeeded();
        });
        disposers.push(unsubRowData);
      }

      // ── Disposer ──
      return () => {
        unregSnapshot();
        unregRestore();
        unregUndo();
        unregRedo();
        unregDiff();
        unregBranch();
        unregSwitchBranch();
        unregGetHistory();
        unregClear();
        for (const dispose of disposers) {
          dispose();
        }
      };
    },
  };
}
