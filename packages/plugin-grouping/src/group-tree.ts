// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Group Tree Builder ───
// Builds a hierarchical group tree from flat row data.

import type { RowNode, ColumnState } from '@gridstorm/core';
import { getValueFromData } from '@gridstorm/core';

/**
 * Build a group tree from flat rows.
 * Groups rows by distinct values in each group column, creating nested group RowNodes.
 */
export function buildGroupTree<TData = any>(
  rows: RowNode<TData>[],
  groupColumns: string[],
  columns: ColumnState[],
): RowNode<TData>[] {
  if (groupColumns.length === 0) return rows;

  return groupByColumn(rows, groupColumns, columns, 0, '');
}

function groupByColumn<TData>(
  rows: RowNode<TData>[],
  groupColumns: string[],
  columns: ColumnState[],
  level: number,
  parentPath: string,
): RowNode<TData>[] {
  if (level >= groupColumns.length) return rows;

  const colId = groupColumns[level]!;
  const col = columns.find((c) => c.colId === colId);
  const field = col?.field ?? colId;

  // Group by distinct values
  const groups = new Map<any, RowNode<TData>[]>();
  for (const row of rows) {
    const value = getValueFromData(row.data, field);
    const key = value ?? '__null__';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const result: RowNode<TData>[] = [];

  for (const [key, children] of groups) {
    const groupValue = key === '__null__' ? null : key;
    const groupId = parentPath
      ? `${parentPath}/group:${colId}:${String(groupValue)}`
      : `group:${colId}:${String(groupValue)}`;

    // Recursively group children at next level
    const groupedChildren = groupByColumn(children, groupColumns, columns, level + 1, groupId);

    const groupNode: RowNode<TData> = {
      id: groupId,
      data: undefined as any,
      sourceIndex: -1,
      displayIndex: -1,
      level,
      rowHeight: 40,
      rowTop: 0,
      parent: null,
      children: groupedChildren,
      expanded: false,
      group: true,
      groupField: field,
      groupValue,
      leafChildrenCount: countLeaves(groupedChildren),
      aggData: null,
      selected: false,
      selectable: false,
      detail: false,
      rowPinned: null,
      version: 0,
    };

    // Set parent references
    for (const child of groupedChildren) {
      child.parent = groupNode;
      child.level = level + 1;
    }

    result.push(groupNode);
  }

  return result;
}

function countLeaves<TData>(nodes: RowNode<TData>[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.group && node.children) {
      count += countLeaves(node.children);
    } else {
      count++;
    }
  }
  return count;
}

/**
 * Flatten a group tree into a linear list of row IDs, respecting expand/collapse state.
 */
export function flattenGroupTree<TData = any>(
  roots: RowNode<TData>[],
  expandedGroups: Set<string>,
  rowNodes: Map<string, RowNode<TData>>,
): string[] {
  const result: string[] = [];

  function walk(nodes: RowNode<TData>[]) {
    for (const node of nodes) {
      // Register group node in rowNodes map
      rowNodes.set(node.id, node);

      result.push(node.id);

      if (node.group && node.children && expandedGroups.has(node.id)) {
        node.expanded = true;
        walk(node.children);
      } else if (node.group) {
        node.expanded = false;
      }
    }
  }

  walk(roots);
  return result;
}
