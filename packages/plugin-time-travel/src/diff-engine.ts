// ─── Diff Engine ───
// Computes human-readable diffs between two snapshots.

import type {
  StateSnapshot,
  SerializedGridState,
  CellDelta,
  DiffResult,
} from './types';
import { resolveFullState } from './snapshot-store';

/**
 * Compare two serialized grid states and produce a DiffResult.
 */
export function diffSerializedStates(
  stateA: SerializedGridState,
  stateB: SerializedGridState,
): DiffResult {
  const cellChanges: CellDelta[] = [];
  const rowsAdded: string[] = [];
  const rowsRemoved: string[] = [];

  // Build row lookup maps
  const mapA = new Map<string, Record<string, unknown>>();
  for (const row of stateA.rowData) {
    mapA.set(row.id, row.data);
  }

  const mapB = new Map<string, Record<string, unknown>>();
  for (const row of stateB.rowData) {
    mapB.set(row.id, row.data);
  }

  // Find changes and additions
  for (const row of stateB.rowData) {
    const prevData = mapA.get(row.id);
    if (!prevData) {
      rowsAdded.push(row.id);
    } else {
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

  // Find removals
  for (const row of stateA.rowData) {
    if (!mapB.has(row.id)) {
      rowsRemoved.push(row.id);
    }
  }

  // Check sort and filter changes
  const sortChanged =
    JSON.stringify(stateA.sortModel) !== JSON.stringify(stateB.sortModel);
  const filterChanged =
    JSON.stringify(stateA.filterModel) !== JSON.stringify(stateB.filterModel);

  // Build summary
  const parts: string[] = [];
  if (cellChanges.length > 0) {
    parts.push(`${cellChanges.length} cell${cellChanges.length === 1 ? '' : 's'} changed`);
  }
  if (rowsAdded.length > 0) {
    parts.push(`${rowsAdded.length} row${rowsAdded.length === 1 ? '' : 's'} added`);
  }
  if (rowsRemoved.length > 0) {
    parts.push(`${rowsRemoved.length} row${rowsRemoved.length === 1 ? '' : 's'} removed`);
  }
  if (sortChanged) {
    parts.push('sort changed');
  }
  if (filterChanged) {
    parts.push('filter changed');
  }
  const summary = parts.length > 0 ? parts.join(', ') : 'no changes';

  return {
    cellChanges,
    rowsAdded,
    rowsRemoved,
    sortChanged,
    filterChanged,
    summary,
  };
}

/**
 * Compute a diff between two snapshots.
 */
export function computeDiff(
  snapshotA: StateSnapshot,
  snapshotB: StateSnapshot,
): DiffResult {
  const stateA = resolveFullState(snapshotA);
  const stateB = resolveFullState(snapshotB);
  return diffSerializedStates(stateA, stateB);
}
