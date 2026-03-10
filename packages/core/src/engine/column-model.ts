// ─── Column Model ───
// Processes ColumnDef[] into resolved ColumnState[].
// Handles defaults, flattening of groups, flex sizing, and state tracking.

import type { ColumnDef, ColumnState } from '../types/column';
import { generateId } from '../utils/id';

const DEFAULT_COL_WIDTH = 200;
const DEFAULT_MIN_WIDTH = 50;
const DEFAULT_MAX_WIDTH = Infinity;

/**
 * Resolve raw ColumnDef[] into flat ColumnState[].
 * Handles column groups, defaults, and initial sort state.
 */
export function resolveColumns<TData>(
  defs: ColumnDef<TData>[],
  defaults?: Partial<ColumnDef<TData>>,
): ColumnState[] {
  const result: ColumnState[] = [];
  flattenColumns(defs, defaults, result);
  return result;
}

function flattenColumns<TData>(
  defs: ColumnDef<TData>[],
  defaults: Partial<ColumnDef<TData>> | undefined,
  result: ColumnState[],
): void {
  for (const def of defs) {
    if (def.children && def.children.length > 0) {
      // Column group — recurse into children
      flattenColumns(def.children, defaults, result);
    } else {
      // Leaf column
      const merged = defaults ? { ...defaults, ...def } : def;
      result.push(resolveColumnState(merged));
    }
  }
}

function resolveColumnState<TData>(def: ColumnDef<TData>): ColumnState {
  const colId = def.colId ?? def.field ?? generateId('col');

  return {
    colId,
    field: def.field as string | undefined,
    headerName: def.headerName ?? def.field ?? colId,
    width: def.width ?? DEFAULT_COL_WIDTH,
    minWidth: def.minWidth ?? DEFAULT_MIN_WIDTH,
    maxWidth: def.maxWidth ?? DEFAULT_MAX_WIDTH,
    flex: def.flex ?? null,
    hide: def.hide ?? false,
    pinned: def.pinned ?? null,
    sort: def.sort ?? null,
    sortIndex: def.sortIndex ?? null,
    sortable: def.sortable ?? false,
    filterable: def.filterable ?? false,
    resizable: def.resizable ?? true,
    editable: def.editable ?? false,
    rowGroup: def.rowGroup ?? false,
    rowGroupIndex: def.rowGroupIndex ?? null,
    pivot: def.pivot ?? false,
    pivotIndex: def.pivotIndex ?? null,
    aggFunc: (def.aggFunc as string) ?? null,
    originalDef: def,
  };
}

/**
 * Calculate flex column widths given a container width.
 */
export function applyFlexSizing(columns: ColumnState[], containerWidth: number): ColumnState[] {
  const fixedWidth = columns
    .filter((c) => !c.hide && c.flex === null)
    .reduce((sum, c) => sum + c.width, 0);

  const flexColumns = columns.filter((c) => !c.hide && c.flex !== null);
  const totalFlex = flexColumns.reduce((sum, c) => sum + (c.flex ?? 0), 0);
  const availableWidth = Math.max(0, containerWidth - fixedWidth);

  if (totalFlex <= 0 || flexColumns.length === 0) return columns;

  return columns.map((col) => {
    if (col.hide || col.flex === null) return col;

    const flexWidth = Math.round((col.flex! / totalFlex) * availableWidth);
    const clamped = Math.max(col.minWidth, Math.min(col.maxWidth, flexWidth));

    return { ...col, width: clamped };
  });
}

/**
 * Separate columns into pinned-left, center, pinned-right groups.
 * Maintains order within each group.
 */
export function partitionColumns(columns: ColumnState[]): {
  left: ColumnState[];
  center: ColumnState[];
  right: ColumnState[];
} {
  const left: ColumnState[] = [];
  const center: ColumnState[] = [];
  const right: ColumnState[] = [];

  for (const col of columns) {
    if (col.hide) continue;
    if (col.pinned === 'left') left.push(col);
    else if (col.pinned === 'right') right.push(col);
    else center.push(col);
  }

  return { left, center, right };
}

/**
 * Find a column by ID.
 */
export function findColumn(columns: ColumnState[], colId: string): ColumnState | undefined {
  return columns.find((c) => c.colId === colId);
}

/**
 * Update a single column's state.
 */
export function updateColumn(
  columns: ColumnState[],
  colId: string,
  updates: Partial<ColumnState>,
): ColumnState[] {
  return columns.map((col) => (col.colId === colId ? { ...col, ...updates } : col));
}

// ─── Column Group Resolution ───

/**
 * Describes a resolved column group for multi-level headers.
 * Built from ColumnDef.children hierarchy.
 */
export interface ColumnGroupInfo {
  /** Unique group identifier. */
  groupId: string;
  /** Display name for the group header. */
  headerName: string;
  /** Nesting level: 0 = top-most group. */
  level: number;
  /** colIds of direct leaf column children. */
  children: string[];
  /** groupIds of direct child groups. */
  childGroups: string[];
  /** All leaf colIds under this group (recursive). */
  leafColIds: string[];
  /** When true, child columns cannot be separated by reorder. */
  marryChildren: boolean;
  /** Reference to the original ColumnDef that defined this group. */
  originalDef: ColumnDef;
}

/**
 * Resolve column group hierarchy from ColumnDef[] tree.
 * Returns flat list of ColumnGroupInfo and the maximum depth.
 * Columns without children are not included.
 */
export function resolveColumnGroups<TData>(
  defs: ColumnDef<TData>[],
): { groups: ColumnGroupInfo[]; maxDepth: number } {
  const groups: ColumnGroupInfo[] = [];
  let maxDepth = 0;

  function walk(
    items: ColumnDef<TData>[],
    level: number,
  ): void {
    for (const def of items) {
      if (!def.children || def.children.length === 0) continue;

      const groupId = def.groupId ?? def.headerName ?? generateId('grp');

      // Collect direct children info
      const directLeaves: string[] = [];
      const directChildGroups: string[] = [];
      const allLeaves: string[] = [];

      for (const child of def.children) {
        if (child.children && child.children.length > 0) {
          const childGroupId = child.groupId ?? child.headerName ?? generateId('grp');
          directChildGroups.push(childGroupId);
          // Collect all leaves from child group
          collectLeaves(child, allLeaves);
        } else {
          const colId = child.colId ?? child.field ?? generateId('col');
          directLeaves.push(colId);
          allLeaves.push(colId);
        }
      }

      groups.push({
        groupId,
        headerName: def.headerName ?? groupId,
        level,
        children: directLeaves,
        childGroups: directChildGroups,
        leafColIds: allLeaves,
        marryChildren: def.marryChildren ?? false,
        originalDef: def as ColumnDef,
      });

      if (level > maxDepth) maxDepth = level;

      // Recurse into child groups
      walk(def.children, level + 1);
    }
  }

  walk(defs, 0);

  return { groups, maxDepth: groups.length > 0 ? maxDepth + 1 : 0 };
}

/** Recursively collect all leaf colIds from a ColumnDef tree. */
function collectLeaves<TData>(def: ColumnDef<TData>, result: string[]): void {
  if (!def.children || def.children.length === 0) {
    result.push(def.colId ?? def.field ?? '');
    return;
  }
  for (const child of def.children) {
    collectLeaves(child, result);
  }
}
