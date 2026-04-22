// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Snapshot Store ───
// Manages snapshot capture, storage, and restoration for the time-travel plugin.

import type { GridState, PluginStoreAccess } from '@gridstorm/core';
import type {
  StateSnapshot,
  SerializedGridState,
  StateDelta,
  CellDelta,
} from './types';

// ─── ID generation ───

let snapshotCounter = 0;

export function generateSnapshotId(): string {
  snapshotCounter += 1;
  return `snap_${Date.now()}_${snapshotCounter}`;
}

/** Reset counter — useful for tests. */
export function resetSnapshotCounter(): void {
  snapshotCounter = 0;
}

// ─── Serialization ───

export function serializeGridState(state: GridState): SerializedGridState {
  const rowData: Array<{ id: string; data: Record<string, unknown> }> = [];
  state.rowNodes.forEach((node, id) => {
    if (node.data != null) {
      // Deep clone the data to avoid mutation
      const data: Record<string, unknown> = {};
      const raw = node.data as Record<string, unknown>;
      for (const key of Object.keys(raw)) {
        data[key] = raw[key];
      }
      rowData.push({ id, data });
    }
  });

  const columnOrder: string[] = [];
  const columnWidths: Record<string, number> = {};
  for (const col of state.columns) {
    columnOrder.push(col.colId);
    columnWidths[col.colId] = col.width;
  }

  const sortModel = state.sortModel.map((s) => ({
    colId: s.colId,
    sort: s.sort,
  }));

  // Clone filterModel
  const filterModel: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(state.filterModel)) {
    filterModel[key] = val;
  }

  // Exclude timeTravel from pluginState to avoid circular snapshots
  const pluginState: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(state.pluginState)) {
    if (key !== 'timeTravel') {
      pluginState[key] = val;
    }
  }

  return { rowData, sortModel, filterModel, columnOrder, columnWidths, pluginState };
}

// ─── Full Snapshot ───

export function captureFullSnapshot(
  state: GridState,
  name?: string,
  source: 'auto' | 'manual' | 'checkpoint' = 'auto',
): StateSnapshot {
  const serialized = serializeGridState(state);
  return {
    id: generateSnapshotId(),
    name,
    timestamp: Date.now(),
    type: 'full',
    fullState: serialized,
    metadata: {
      rowCount: serialized.rowData.length,
      columnCount: serialized.columnOrder.length,
      source,
    },
  };
}

// ─── Delta Snapshot ───

export function computeDelta(
  prevSerialized: SerializedGridState,
  currentSerialized: SerializedGridState,
  prevSnapshotId: string,
): StateDelta {
  const cellChanges: CellDelta[] = [];
  const rowsAdded: Array<{ id: string; data: Record<string, unknown> }> = [];
  const rowsRemoved: string[] = [];

  // Build lookup maps
  const prevRowMap = new Map<string, Record<string, unknown>>();
  for (const row of prevSerialized.rowData) {
    prevRowMap.set(row.id, row.data);
  }

  const currentRowMap = new Map<string, Record<string, unknown>>();
  for (const row of currentSerialized.rowData) {
    currentRowMap.set(row.id, row.data);
  }

  // Find changed and added rows
  for (const row of currentSerialized.rowData) {
    const prevData = prevRowMap.get(row.id);
    if (!prevData) {
      rowsAdded.push({ id: row.id, data: row.data });
    } else {
      // Compare fields
      const allFields = new Set([...Object.keys(prevData), ...Object.keys(row.data)]);
      for (const field of allFields) {
        const oldVal = prevData[field];
        const newVal = row.data[field];
        if (oldVal !== newVal) {
          cellChanges.push({
            rowId: row.id,
            field,
            oldValue: oldVal,
            newValue: newVal,
          });
        }
      }
    }
  }

  // Find removed rows
  for (const row of prevSerialized.rowData) {
    if (!currentRowMap.has(row.id)) {
      rowsRemoved.push(row.id);
    }
  }

  const delta: StateDelta = {
    cellChanges,
    rowsAdded,
    rowsRemoved,
    prevSnapshotId,
  };

  // Check sort model changes
  const prevSort = JSON.stringify(prevSerialized.sortModel);
  const curSort = JSON.stringify(currentSerialized.sortModel);
  if (prevSort !== curSort) {
    delta.sortModelChanged = {
      from: prevSerialized.sortModel,
      to: currentSerialized.sortModel,
    };
  }

  // Check filter model changes
  const prevFilter = JSON.stringify(prevSerialized.filterModel);
  const curFilter = JSON.stringify(currentSerialized.filterModel);
  if (prevFilter !== curFilter) {
    delta.filterModelChanged = {
      from: prevSerialized.filterModel,
      to: currentSerialized.filterModel,
    };
  }

  return delta;
}

export function captureDeltaSnapshot(
  prevSnapshot: StateSnapshot,
  currentState: GridState,
  source: 'auto' | 'manual' | 'checkpoint' = 'auto',
): StateSnapshot {
  const prevSerialized = resolveFullState(prevSnapshot);
  const currentSerialized = serializeGridState(currentState);
  const delta = computeDelta(prevSerialized, currentSerialized, prevSnapshot.id);

  return {
    id: generateSnapshotId(),
    timestamp: Date.now(),
    type: 'delta',
    delta,
    metadata: {
      rowCount: currentSerialized.rowData.length,
      columnCount: currentSerialized.columnOrder.length,
      source,
    },
  };
}

// ─── State Resolution ───

/**
 * Resolve the full serialized state from a snapshot.
 * For full snapshots, return the state directly.
 * For delta snapshots, this only works if the snapshot carries cached fullState
 * (which we set during chain resolution in the plugin).
 */
export function resolveFullState(snapshot: StateSnapshot): SerializedGridState {
  if (snapshot.type === 'full' && snapshot.fullState) {
    return snapshot.fullState;
  }
  // For delta snapshots that have been pre-resolved, check if fullState was attached
  if (snapshot.fullState) {
    return snapshot.fullState;
  }
  // Fallback: return empty state (should not happen in normal flow)
  return {
    rowData: [],
    sortModel: [],
    filterModel: {},
    columnOrder: [],
    columnWidths: {},
    pluginState: {},
  };
}

/**
 * Resolve all delta snapshots in a branch by walking back through the chain.
 * Attaches fullState to each delta snapshot for efficient lookups.
 */
export function resolveSnapshotChain(snapshots: StateSnapshot[]): void {
  for (let i = 0; i < snapshots.length; i++) {
    const snap = snapshots[i];
    if (snap == null) continue;
    if (snap.type === 'full') continue;
    if (snap.fullState) continue;

    // Walk back to find the nearest full state
    const prevSnap = i > 0 ? snapshots[i - 1] : undefined;
    if (prevSnap) {
      const prevState = resolveFullState(prevSnap);
      snap.fullState = applyDeltaToState(prevState, snap.delta!);
    }
  }
}

/**
 * Apply a delta to a serialized state to produce the resulting state.
 */
export function applyDeltaToState(
  base: SerializedGridState,
  delta: StateDelta,
): SerializedGridState {
  // Start with a copy of row data
  const rowMap = new Map<string, Record<string, unknown>>();
  for (const row of base.rowData) {
    rowMap.set(row.id, { ...row.data });
  }

  // Apply cell changes
  for (const change of delta.cellChanges) {
    const existing = rowMap.get(change.rowId);
    if (existing) {
      existing[change.field] = change.newValue;
    }
  }

  // Add new rows
  for (const row of delta.rowsAdded) {
    rowMap.set(row.id, { ...row.data });
  }

  // Remove rows
  for (const id of delta.rowsRemoved) {
    rowMap.delete(id);
  }

  const rowData: Array<{ id: string; data: Record<string, unknown> }> = [];
  rowMap.forEach((data, id) => {
    rowData.push({ id, data });
  });

  return {
    rowData,
    sortModel: delta.sortModelChanged
      ? (delta.sortModelChanged.to as SerializedGridState['sortModel'])
      : [...base.sortModel],
    filterModel: delta.filterModelChanged
      ? (delta.filterModelChanged.to as Record<string, unknown>)
      : { ...base.filterModel },
    columnOrder: [...base.columnOrder],
    columnWidths: { ...base.columnWidths },
    pluginState: { ...base.pluginState },
  };
}

// ─── Restore ───

/**
 * Apply a snapshot's serialized state back to the grid store.
 */
export function restoreSnapshot(
  snapshot: StateSnapshot,
  store: PluginStoreAccess,
): void {
  const serialized = resolveFullState(snapshot);

  store.setState((prevState) => {
    // Rebuild rowNodes from serialized data
    const newRowNodes = new Map(prevState.rowNodes);
    const restoredIds = new Set<string>();

    for (const row of serialized.rowData) {
      restoredIds.add(row.id);
      const existing = newRowNodes.get(row.id);
      if (existing) {
        // Update data in-place on a cloned node
        newRowNodes.set(row.id, {
          ...existing,
          data: row.data as any,
        });
      } else {
        // Create new node with all required RowNode fields
        newRowNodes.set(row.id, {
          id: row.id,
          data: row.data as any,
          sourceIndex: -1,
          displayIndex: -1,
          level: 0,
          rowHeight: 40,
          rowTop: 0,
          parent: null,
          children: null,
          expanded: false,
          group: false,
          groupField: null,
          groupValue: undefined,
          leafChildrenCount: 0,
          aggData: null,
          selected: false,
          selectable: true,
          detail: false,
          rowPinned: null,
          version: 0,
        });
      }
    }

    // Remove rows not in snapshot
    for (const id of newRowNodes.keys()) {
      if (!restoredIds.has(id)) {
        newRowNodes.delete(id);
      }
    }

    // Rebuild displayedRowIds
    const displayedRowIds = serialized.rowData.map((r) => r.id);

    // Restore sort model
    const sortModel = serialized.sortModel.map((s) => ({
      colId: s.colId,
      sort: s.sort as 'asc' | 'desc',
    }));

    // Restore filter model
    const filterModel = serialized.filterModel as Record<string, any>;

    // Restore column widths
    const columns = prevState.columns.map((col) => {
      const width = serialized.columnWidths[col.colId];
      if (width != null) {
        return { ...col, width };
      }
      return col;
    });

    return {
      ...prevState,
      rowNodes: newRowNodes,
      displayedRowIds,
      sortModel,
      filterModel,
      columns,
    };
  });
}

// ─── Memory Management ───

/**
 * Trim snapshots to stay within maxSnapshots limit.
 * Removes oldest non-checkpoint snapshots first.
 */
export function trimSnapshots(
  snapshots: StateSnapshot[],
  maxSnapshots: number,
): StateSnapshot[] {
  if (snapshots.length <= maxSnapshots) return snapshots;

  // Separate checkpoints from auto/manual snapshots
  const result: StateSnapshot[] = [];
  const removable: Array<{ index: number; snapshot: StateSnapshot }> = [];

  for (let i = 0; i < snapshots.length; i++) {
    const snap = snapshots[i];
    if (snap == null) continue;
    if (snap.metadata.source === 'checkpoint') {
      result.push(snap);
    } else {
      removable.push({ index: i, snapshot: snap });
    }
  }

  // If even with only checkpoints we exceed, keep the most recent ones
  if (result.length >= maxSnapshots) {
    return result.slice(-maxSnapshots);
  }

  // Fill remaining slots with the most recent removable snapshots
  const slotsLeft = maxSnapshots - result.length;
  const kept = removable.slice(-slotsLeft);

  // Merge and sort by original position to maintain order
  const all = [
    ...result.map((s, _i) => ({ snapshot: s, origIdx: snapshots.indexOf(s) })),
    ...kept.map((r) => ({ snapshot: r.snapshot, origIdx: r.index })),
  ];
  all.sort((a, b) => a.origIdx - b.origIdx);

  return all.map((a) => a.snapshot);
}
