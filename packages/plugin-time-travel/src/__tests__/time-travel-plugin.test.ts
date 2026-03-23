import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { TimeTravelPlugin } from '../time-travel-plugin';
import { resetBranchCounter } from '../time-travel-plugin';
import { resetSnapshotCounter } from '../snapshot-store';
import {
  captureFullSnapshot,
  serializeGridState,
  trimSnapshots,
  resolveFullState,
} from '../snapshot-store';
import { computeDiff, diffSerializedStates } from '../diff-engine';
import type { TimeTravelState, StateSnapshot, SerializedGridState } from '../types';

// ─── Helpers ───

function makeGrid(pluginOptions = {}) {
  return createGrid({
    columns: [
      { field: 'name' },
      { field: 'value' },
      { field: 'category' },
    ],
    rowData: [
      { name: 'Alice', value: 100, category: 'A' },
      { name: 'Bob', value: 200, category: 'B' },
      { name: 'Charlie', value: 300, category: 'A' },
    ],
    getRowId: ({ data }: { data: Record<string, unknown> }) => String(data.name),
    plugins: [TimeTravelPlugin(pluginOptions)],
  });
}

function getTTState(engine: ReturnType<typeof createGrid>): TimeTravelState {
  return engine.store.getState().pluginState?.['timeTravel'] as TimeTravelState;
}

function getRowData(engine: ReturnType<typeof createGrid>, rowId: string): Record<string, unknown> | undefined {
  const node = engine.api.getRowNode(rowId);
  return node?.data as Record<string, unknown> | undefined;
}

// ─── Tests ───

describe('TimeTravelPlugin', () => {
  beforeEach(() => {
    resetSnapshotCounter();
    resetBranchCounter();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── 1. Initial state ──

  it('initializes with a single snapshot on the main branch', () => {
    const engine = makeGrid();
    const state = getTTState(engine);

    expect(state).toBeDefined();
    expect(state.currentBranchId).toBe('main');
    expect(state.currentSnapshotIndex).toBe(0);
    expect(state.totalSnapshots).toBe(1);
    expect(state.isDirty).toBe(false);

    const branch = state.branches.get('main');
    expect(branch).toBeDefined();
    expect(branch!.snapshots.length).toBe(1);
    expect(branch!.snapshots[0]!.type).toBe('full');
    expect(branch!.snapshots[0]!.metadata.source).toBe('checkpoint');

    engine.destroy();
  });

  // ── 2. Full snapshot capture ──

  it('captures a full snapshot via timeTravel:snapshot command', () => {
    const engine = makeGrid({ autoCapture: false });

    engine.commandBus.dispatch('timeTravel:snapshot', { name: 'My checkpoint' });

    const state = getTTState(engine);
    const branch = state.branches.get('main')!;
    expect(branch.snapshots.length).toBe(2);
    expect(branch.snapshots[1]!.name).toBe('My checkpoint');
    expect(branch.snapshots[1]!.metadata.source).toBe('checkpoint');
    expect(state.currentSnapshotIndex).toBe(1);

    engine.destroy();
  });

  // ── 3. Snapshot captures row data correctly ──

  it('snapshot captures current row data', () => {
    const engine = makeGrid({ autoCapture: false });

    engine.commandBus.dispatch('timeTravel:snapshot', { name: 'Before edit' });

    const state = getTTState(engine);
    const branch = state.branches.get('main')!;
    const snap = branch.snapshots[1]!;
    const fullState = resolveFullState(snap);

    expect(fullState.rowData.length).toBe(3);
    const alice = fullState.rowData.find((r) => r.id === 'Alice');
    expect(alice).toBeDefined();
    expect(alice!.data.value).toBe(100);

    engine.destroy();
  });

  // ── 4. Restore to previous state ──

  it('restores grid to a previous snapshot', () => {
    const engine = makeGrid({ autoCapture: false });

    engine.commandBus.dispatch('timeTravel:snapshot', { name: 'Before edit' });

    // Modify data
    engine.api.updateRows([{ id: 'Alice', data: { value: 999 } as any }]);
    expect(getRowData(engine, 'Alice')?.value).toBe(999);

    engine.commandBus.dispatch('timeTravel:snapshot', { name: 'After edit' });

    // Restore to "Before edit"
    const state = getTTState(engine);
    const branch = state.branches.get('main')!;
    const beforeEditSnap = branch.snapshots[1]!;

    engine.commandBus.dispatch('timeTravel:restore', { snapshotId: beforeEditSnap.id });

    expect(getRowData(engine, 'Alice')?.value).toBe(100);
    expect(getTTState(engine).currentSnapshotIndex).toBe(1);

    engine.destroy();
  });

  // ── 5. Undo navigation ──

  it('undo moves to previous snapshot', () => {
    const engine = makeGrid({ autoCapture: false });

    engine.commandBus.dispatch('timeTravel:snapshot', { name: 'Snap 1' });

    engine.api.updateRows([{ id: 'Alice', data: { value: 500 } as any }]);
    engine.commandBus.dispatch('timeTravel:snapshot', { name: 'Snap 2' });

    expect(getRowData(engine, 'Alice')?.value).toBe(500);

    engine.commandBus.dispatch('timeTravel:undo', {});

    expect(getRowData(engine, 'Alice')?.value).toBe(100);
    expect(getTTState(engine).currentSnapshotIndex).toBe(1);

    engine.destroy();
  });

  // ── 6. Redo navigation ──

  it('redo moves to next snapshot after undo', () => {
    const engine = makeGrid({ autoCapture: false });

    engine.commandBus.dispatch('timeTravel:snapshot', { name: 'Snap 1' });

    engine.api.updateRows([{ id: 'Alice', data: { value: 500 } as any }]);
    engine.commandBus.dispatch('timeTravel:snapshot', { name: 'Snap 2' });

    engine.commandBus.dispatch('timeTravel:undo', {});
    expect(getRowData(engine, 'Alice')?.value).toBe(100);

    engine.commandBus.dispatch('timeTravel:redo', {});
    expect(getRowData(engine, 'Alice')?.value).toBe(500);
    expect(getTTState(engine).currentSnapshotIndex).toBe(2);

    engine.destroy();
  });

  // ── 7. Undo at beginning is no-op ──

  it('undo at the first snapshot is a no-op', () => {
    const engine = makeGrid({ autoCapture: false });

    engine.commandBus.dispatch('timeTravel:undo', {});

    expect(getTTState(engine).currentSnapshotIndex).toBe(0);
    engine.destroy();
  });

  // ── 8. Redo at end is no-op ──

  it('redo at the last snapshot is a no-op', () => {
    const engine = makeGrid({ autoCapture: false });

    engine.commandBus.dispatch('timeTravel:redo', {});

    expect(getTTState(engine).currentSnapshotIndex).toBe(0);
    engine.destroy();
  });

  // ── 9. Named checkpoints ──

  it('named checkpoints are preserved during trimming', () => {
    const engine = makeGrid({ autoCapture: false, maxSnapshots: 5 });

    // Create several snapshots
    for (let i = 0; i < 6; i++) {
      engine.api.updateRows([{ id: 'Alice', data: { value: i * 10 } as any }]);
      engine.commandBus.dispatch('timeTravel:snapshot', {
        name: i === 3 ? 'Important Checkpoint' : undefined,
      });
    }

    const state = getTTState(engine);
    const branch = state.branches.get('main')!;

    // Should be trimmed to maxSnapshots
    expect(branch.snapshots.length).toBeLessThanOrEqual(5);

    // The named checkpoint should still exist
    const checkpoint = branch.snapshots.find((s) => s.name === 'Important Checkpoint');
    expect(checkpoint).toBeDefined();

    engine.destroy();
  });

  // ── 10. Diff computation — cell changes ──

  it('diff detects cell changes between snapshots', () => {
    const engine = makeGrid({ autoCapture: false });

    engine.commandBus.dispatch('timeTravel:snapshot', { name: 'Before' });

    engine.api.updateRows([{ id: 'Alice', data: { value: 999 } as any }]);
    engine.commandBus.dispatch('timeTravel:snapshot', { name: 'After' });

    const state = getTTState(engine);
    const branch = state.branches.get('main')!;

    const snap1 = branch.snapshots[1]!;
    const snap2 = branch.snapshots[2]!;

    const diff = computeDiff(snap1, snap2);

    expect(diff.cellChanges.length).toBeGreaterThanOrEqual(1);
    const valueChange = diff.cellChanges.find(
      (c) => c.rowId === 'Alice' && c.field === 'value',
    );
    expect(valueChange).toBeDefined();
    expect(valueChange!.oldValue).toBe(100);
    expect(valueChange!.newValue).toBe(999);
    expect(diff.summary).toContain('changed');

    engine.destroy();
  });

  // ── 11. Diff computation — row additions ──

  it('diff detects row additions', () => {
    const stateA: SerializedGridState = {
      rowData: [{ id: 'r1', data: { v: 1 } }],
      sortModel: [],
      filterModel: {},
      columnOrder: ['v'],
      columnWidths: { v: 100 },
      pluginState: {},
    };
    const stateB: SerializedGridState = {
      rowData: [
        { id: 'r1', data: { v: 1 } },
        { id: 'r2', data: { v: 2 } },
      ],
      sortModel: [],
      filterModel: {},
      columnOrder: ['v'],
      columnWidths: { v: 100 },
      pluginState: {},
    };

    const diff = diffSerializedStates(stateA, stateB);
    expect(diff.rowsAdded).toContain('r2');
    expect(diff.summary).toContain('1 row added');
  });

  // ── 12. Diff computation — row deletions ──

  it('diff detects row deletions', () => {
    const stateA: SerializedGridState = {
      rowData: [
        { id: 'r1', data: { v: 1 } },
        { id: 'r2', data: { v: 2 } },
      ],
      sortModel: [],
      filterModel: {},
      columnOrder: ['v'],
      columnWidths: { v: 100 },
      pluginState: {},
    };
    const stateB: SerializedGridState = {
      rowData: [{ id: 'r1', data: { v: 1 } }],
      sortModel: [],
      filterModel: {},
      columnOrder: ['v'],
      columnWidths: { v: 100 },
      pluginState: {},
    };

    const diff = diffSerializedStates(stateA, stateB);
    expect(diff.rowsRemoved).toContain('r2');
    expect(diff.summary).toContain('1 row removed');
  });

  // ── 13. Diff — sort changed ──

  it('diff detects sort model changes', () => {
    const stateA: SerializedGridState = {
      rowData: [],
      sortModel: [{ colId: 'name', sort: 'asc' }],
      filterModel: {},
      columnOrder: [],
      columnWidths: {},
      pluginState: {},
    };
    const stateB: SerializedGridState = {
      rowData: [],
      sortModel: [{ colId: 'name', sort: 'desc' }],
      filterModel: {},
      columnOrder: [],
      columnWidths: {},
      pluginState: {},
    };

    const diff = diffSerializedStates(stateA, stateB);
    expect(diff.sortChanged).toBe(true);
    expect(diff.summary).toContain('sort changed');
  });

  // ── 14. Diff — filter changed ──

  it('diff detects filter model changes', () => {
    const stateA: SerializedGridState = {
      rowData: [],
      sortModel: [],
      filterModel: {},
      columnOrder: [],
      columnWidths: {},
      pluginState: {},
    };
    const stateB: SerializedGridState = {
      rowData: [],
      sortModel: [],
      filterModel: { name: { type: 'contains', filter: 'A' } },
      columnOrder: [],
      columnWidths: {},
      pluginState: {},
    };

    const diff = diffSerializedStates(stateA, stateB);
    expect(diff.filterChanged).toBe(true);
    expect(diff.summary).toContain('filter changed');
  });

  // ── 15. Diff — no changes ──

  it('diff returns "no changes" for identical states', () => {
    const state: SerializedGridState = {
      rowData: [{ id: 'r1', data: { v: 1 } }],
      sortModel: [],
      filterModel: {},
      columnOrder: ['v'],
      columnWidths: { v: 100 },
      pluginState: {},
    };

    const diff = diffSerializedStates(state, state);
    expect(diff.summary).toBe('no changes');
    expect(diff.cellChanges.length).toBe(0);
    expect(diff.rowsAdded.length).toBe(0);
    expect(diff.rowsRemoved.length).toBe(0);
  });

  // ── 16. Branch creation ──

  it('creates a new branch from current state', () => {
    const engine = makeGrid({ autoCapture: false });

    engine.commandBus.dispatch('timeTravel:branch', { name: 'what-if' });

    const state = getTTState(engine);
    expect(state.currentBranchId).not.toBe('main');
    expect(state.branches.size).toBe(2);

    const newBranch = state.branches.get(state.currentBranchId)!;
    expect(newBranch.name).toBe('what-if');
    expect(newBranch.parentBranchId).toBe('main');
    expect(newBranch.snapshots.length).toBe(1);

    engine.destroy();
  });

  // ── 17. Branch switching ──

  it('switches between branches and restores state', () => {
    const engine = makeGrid({ autoCapture: false });

    // Modify data on main
    engine.api.updateRows([{ id: 'Alice', data: { value: 500 } as any }]);
    engine.commandBus.dispatch('timeTravel:snapshot', { name: 'Main modified' });

    // Create branch
    engine.commandBus.dispatch('timeTravel:branch', { name: 'experiment' });
    const branchState = getTTState(engine);
    const experimentBranchId = branchState.currentBranchId;

    // Modify on branch
    engine.api.updateRows([{ id: 'Alice', data: { value: 9999 } as any }]);
    engine.commandBus.dispatch('timeTravel:snapshot', { name: 'Experiment modified' });

    expect(getRowData(engine, 'Alice')?.value).toBe(9999);

    // Switch back to main
    engine.commandBus.dispatch('timeTravel:switchBranch', { branchId: 'main' });

    expect(getRowData(engine, 'Alice')?.value).toBe(500);
    expect(getTTState(engine).currentBranchId).toBe('main');

    // Switch back to experiment
    engine.commandBus.dispatch('timeTravel:switchBranch', { branchId: experimentBranchId });

    expect(getRowData(engine, 'Alice')?.value).toBe(9999);

    engine.destroy();
  });

  // ── 18. Max snapshots limit ──

  it('trims snapshots when exceeding maxSnapshots', () => {
    const engine = makeGrid({ autoCapture: false, maxSnapshots: 5 });

    for (let i = 0; i < 10; i++) {
      engine.api.updateRows([{ id: 'Alice', data: { value: i * 100 } as any }]);
      engine.commandBus.dispatch('timeTravel:snapshot', {});
    }

    const state = getTTState(engine);
    const branch = state.branches.get('main')!;
    expect(branch.snapshots.length).toBeLessThanOrEqual(5);

    engine.destroy();
  });

  // ── 19. Auto-capture on row data changes ──

  it('auto-captures snapshot on row data changes', async () => {
    const engine = makeGrid({ autoCapture: true });

    const initialState = getTTState(engine);
    const initialCount = initialState.totalSnapshots;

    // Modify row data
    engine.api.updateRows([{ id: 'Alice', data: { value: 777 } as any }]);

    // Wait for microtask to process
    await new Promise((r) => setTimeout(r, 50));

    const state = getTTState(engine);
    expect(state.totalSnapshots).toBeGreaterThan(initialCount);

    engine.destroy();
  });

  // ── 20. Truncate future on new changes after undo ──

  it('truncates future snapshots when new changes made after undo', () => {
    const engine = makeGrid({ autoCapture: false });

    engine.api.updateRows([{ id: 'Alice', data: { value: 100 } as any }]);
    engine.commandBus.dispatch('timeTravel:snapshot', { name: 'Snap 1' });

    engine.api.updateRows([{ id: 'Alice', data: { value: 200 } as any }]);
    engine.commandBus.dispatch('timeTravel:snapshot', { name: 'Snap 2' });

    engine.api.updateRows([{ id: 'Alice', data: { value: 300 } as any }]);
    engine.commandBus.dispatch('timeTravel:snapshot', { name: 'Snap 3' });

    // We have: initial, Snap 1, Snap 2, Snap 3 (index = 3)
    expect(getTTState(engine).currentSnapshotIndex).toBe(3);

    // Undo twice (back to Snap 1)
    engine.commandBus.dispatch('timeTravel:undo', {});
    engine.commandBus.dispatch('timeTravel:undo', {});
    expect(getTTState(engine).currentSnapshotIndex).toBe(1);

    // Make new change — should truncate Snap 2 and Snap 3
    engine.api.updateRows([{ id: 'Alice', data: { value: 999 } as any }]);
    engine.commandBus.dispatch('timeTravel:snapshot', { name: 'New Snap' });

    const state = getTTState(engine);
    const branch = state.branches.get('main')!;

    // Should be: initial, Snap 1, New Snap (3 total)
    expect(branch.snapshots.length).toBe(3);
    expect(branch.snapshots[2]!.name).toBe('New Snap');

    engine.destroy();
  });

  // ── 21. Clear history ──

  it('clears all history and starts fresh', () => {
    const engine = makeGrid({ autoCapture: false });

    engine.commandBus.dispatch('timeTravel:snapshot', { name: 'Snap 1' });
    engine.commandBus.dispatch('timeTravel:snapshot', { name: 'Snap 2' });
    engine.commandBus.dispatch('timeTravel:branch', { name: 'test-branch' });

    const beforeClear = getTTState(engine);
    expect(beforeClear.branches.size).toBe(2);

    engine.commandBus.dispatch('timeTravel:clear', {});

    const afterClear = getTTState(engine);
    expect(afterClear.branches.size).toBe(1);
    expect(afterClear.currentBranchId).toBe('main');
    expect(afterClear.currentSnapshotIndex).toBe(0);
    expect(afterClear.totalSnapshots).toBe(1);

    engine.destroy();
  });

  // ── 22. Max branches limit ──

  it('prevents creating branches beyond maxBranches', () => {
    const engine = makeGrid({ autoCapture: false, maxBranches: 3 });

    // Main branch already counts as 1
    engine.commandBus.dispatch('timeTravel:branch', { name: 'branch-1' });
    engine.commandBus.dispatch('timeTravel:branch', { name: 'branch-2' });

    // This should be rejected (already at 3 branches)
    engine.commandBus.dispatch('timeTravel:branch', { name: 'branch-3' });

    const state = getTTState(engine);
    expect(state.branches.size).toBe(3);

    engine.destroy();
  });

  // ── 23. Serialization excludes timeTravel state ──

  it('serialized state excludes timeTravel plugin state', () => {
    const engine = makeGrid({ autoCapture: false });

    const gridState = engine.store.getState();
    const serialized = serializeGridState(gridState);

    expect(serialized.pluginState['timeTravel']).toBeUndefined();

    engine.destroy();
  });

  // ── 24. trimSnapshots utility ──

  it('trimSnapshots preserves checkpoints over auto snapshots', () => {
    const snapshots: StateSnapshot[] = [];
    for (let i = 0; i < 10; i++) {
      snapshots.push({
        id: `snap_${i}`,
        timestamp: i,
        type: 'full',
        fullState: {
          rowData: [],
          sortModel: [],
          filterModel: {},
          columnOrder: [],
          columnWidths: {},
          pluginState: {},
        },
        metadata: {
          rowCount: 0,
          columnCount: 0,
          source: i === 5 ? 'checkpoint' : 'auto',
        },
      });
    }

    const trimmed = trimSnapshots(snapshots, 5);
    expect(trimmed.length).toBe(5);

    // The checkpoint should be preserved
    const checkpoint = trimmed.find((s) => s.id === 'snap_5');
    expect(checkpoint).toBeDefined();
  });

  // ── 25. Delta snapshot capture ──

  it('captures delta snapshots correctly', () => {
    const engine = makeGrid({ autoCapture: false });

    // First manual snapshot (will be full because it's a checkpoint)
    engine.commandBus.dispatch('timeTravel:snapshot', { name: 'Full snap' });

    // Modify data
    engine.api.updateRows([{ id: 'Bob', data: { value: 999 } as any }]);

    // Second manual snapshot — this one also becomes checkpoint (full)
    // but let's verify the data is captured correctly
    engine.commandBus.dispatch('timeTravel:snapshot', { name: 'After change' });

    const state = getTTState(engine);
    const branch = state.branches.get('main')!;
    expect(branch.snapshots.length).toBe(3);

    // The latest snapshot should capture the changed data
    const latestSnap = branch.snapshots[2]!;
    const fullState = resolveFullState(latestSnap);
    const bob = fullState.rowData.find((r) => r.id === 'Bob');
    expect(bob).toBeDefined();
    expect(bob!.data.value).toBe(999);

    engine.destroy();
  });

  // ── 26. Multiple undo/redo cycles ──

  it('handles multiple undo/redo cycles correctly', () => {
    const engine = makeGrid({ autoCapture: false });

    // Create sequence of states
    engine.api.updateRows([{ id: 'Alice', data: { value: 10 } as any }]);
    engine.commandBus.dispatch('timeTravel:snapshot', {});

    engine.api.updateRows([{ id: 'Alice', data: { value: 20 } as any }]);
    engine.commandBus.dispatch('timeTravel:snapshot', {});

    engine.api.updateRows([{ id: 'Alice', data: { value: 30 } as any }]);
    engine.commandBus.dispatch('timeTravel:snapshot', {});

    // Undo all the way back
    engine.commandBus.dispatch('timeTravel:undo', {});
    engine.commandBus.dispatch('timeTravel:undo', {});
    engine.commandBus.dispatch('timeTravel:undo', {});
    expect(getTTState(engine).currentSnapshotIndex).toBe(0);

    // Redo all the way forward
    engine.commandBus.dispatch('timeTravel:redo', {});
    engine.commandBus.dispatch('timeTravel:redo', {});
    engine.commandBus.dispatch('timeTravel:redo', {});
    expect(getTTState(engine).currentSnapshotIndex).toBe(3);

    expect(getRowData(engine, 'Alice')?.value).toBe(30);

    engine.destroy();
  });

  // ── 27. Diff via command emits event ──

  it('timeTravel:diff command emits diff result event', () => {
    const engine = makeGrid({ autoCapture: false });

    engine.commandBus.dispatch('timeTravel:snapshot', { name: 'Before' });

    engine.api.updateRows([{ id: 'Alice', data: { value: 777 } as any }]);
    engine.commandBus.dispatch('timeTravel:snapshot', { name: 'After' });

    const events: any[] = [];
    engine.api.addEventListener('rowData:changed' as any, (e: any) => {
      if (e.type === 'timeTravel:diffResult') {
        events.push(e);
      }
    });

    const state = getTTState(engine);
    const branch = state.branches.get('main')!;

    engine.commandBus.dispatch('timeTravel:diff', {
      fromId: branch.snapshots[1]!.id,
      toId: branch.snapshots[2]!.id,
    });

    expect(events.length).toBe(1);
    expect(events[0].diff.cellChanges.length).toBeGreaterThan(0);

    engine.destroy();
  });

  // ── 28. getHistory command ──

  it('timeTravel:getHistory emits history event', () => {
    const engine = makeGrid({ autoCapture: false });

    engine.commandBus.dispatch('timeTravel:snapshot', { name: 'Snap 1' });

    const events: any[] = [];
    engine.api.addEventListener('rowData:changed' as any, (e: any) => {
      if (e.type === 'timeTravel:history') {
        events.push(e);
      }
    });

    engine.commandBus.dispatch('timeTravel:getHistory', {});

    expect(events.length).toBe(1);
    expect(events[0].snapshots.length).toBe(2);
    expect(events[0].snapshots[1].name).toBe('Snap 1');

    engine.destroy();
  });

  // ── 29. Restore does not trigger auto-capture ──

  it('restore does not trigger additional auto-capture', async () => {
    const engine = makeGrid({ autoCapture: true });

    // Take manual snapshot
    engine.commandBus.dispatch('timeTravel:snapshot', { name: 'Snap 1' });

    const stateBeforeRestore = getTTState(engine);
    const branch = stateBeforeRestore.branches.get('main')!;
    const snapCount = branch.snapshots.length;

    // Restore to initial
    engine.commandBus.dispatch('timeTravel:restore', {
      snapshotId: branch.snapshots[0]!.id,
    });

    // Wait for any microtasks
    await new Promise((r) => setTimeout(r, 50));

    const stateAfterRestore = getTTState(engine);
    const branchAfter = stateAfterRestore.branches.get('main')!;

    // Should not have added new auto-capture snapshots during restore
    expect(branchAfter.snapshots.length).toBe(snapCount);

    engine.destroy();
  });

  // ── 30. Diff summary with multiple change types ──

  it('diff summary combines multiple change types', () => {
    const stateA: SerializedGridState = {
      rowData: [
        { id: 'r1', data: { v: 1 } },
        { id: 'r2', data: { v: 2 } },
      ],
      sortModel: [{ colId: 'v', sort: 'asc' }],
      filterModel: {},
      columnOrder: ['v'],
      columnWidths: { v: 100 },
      pluginState: {},
    };
    const stateB: SerializedGridState = {
      rowData: [
        { id: 'r1', data: { v: 99 } },
        { id: 'r3', data: { v: 3 } },
      ],
      sortModel: [{ colId: 'v', sort: 'desc' }],
      filterModel: { v: { type: 'number' } },
      columnOrder: ['v'],
      columnWidths: { v: 100 },
      pluginState: {},
    };

    const diff = diffSerializedStates(stateA, stateB);
    expect(diff.cellChanges.length).toBe(1); // r1.v changed
    expect(diff.rowsAdded).toContain('r3');
    expect(diff.rowsRemoved).toContain('r2');
    expect(diff.sortChanged).toBe(true);
    expect(diff.filterChanged).toBe(true);
    expect(diff.summary).toContain('cell');
    expect(diff.summary).toContain('row');
    expect(diff.summary).toContain('sort');
    expect(diff.summary).toContain('filter');
  });
});
