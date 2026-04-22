// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Tree Builder ───
// Build tree structures from flat or nested data.

import type { RowNode } from '@gridstorm/core';
import type { TreeNodeState } from './types';

/**
 * Build tree structure from flat data using parent-child relationships.
 * Supports two modes:
 * 1. Flat data with parent ID field (getParentId)
 * 2. Nested data with children array (childrenField)
 */
export function buildTree(params: {
  rowNodes: Map<string, RowNode>;
  getParentId?: (data: any) => string | null | undefined;
  childrenField?: string;
  defaultExpanded: boolean;
}): Map<string, TreeNodeState> {
  const { rowNodes, getParentId, childrenField, defaultExpanded } = params;
  const treeState = new Map<string, TreeNodeState>();

  if (childrenField) {
    buildFromNestedData(rowNodes, childrenField, defaultExpanded, treeState);
  } else if (getParentId) {
    buildFromFlatData(rowNodes, getParentId, defaultExpanded, treeState);
  }

  return treeState;
}

/**
 * Build tree from flat data using a parent ID function.
 */
function buildFromFlatData(
  rowNodes: Map<string, RowNode>,
  getParentId: (data: any) => string | null | undefined,
  defaultExpanded: boolean,
  treeState: Map<string, TreeNodeState>,
): void {
  // First pass: determine parent-child relationships
  const childrenMap = new Map<string, string[]>();

  for (const [id, node] of rowNodes) {
    if (!node.data) continue;
    const parentId = getParentId(node.data) ?? null;

    // Initialize this node in tree state
    treeState.set(id, {
      expanded: defaultExpanded,
      level: 0,
      hasChildren: false,
      parentId,
      childIds: [],
      isLeaf: true,
    });

    // Track children for each parent
    if (parentId !== null) {
      if (!childrenMap.has(parentId)) {
        childrenMap.set(parentId, []);
      }
      childrenMap.get(parentId)!.push(id);
    }
  }

  // Second pass: assign children and mark parents
  for (const [parentId, childIds] of childrenMap) {
    const parentState = treeState.get(parentId);
    if (parentState) {
      parentState.childIds = childIds;
      parentState.hasChildren = true;
      parentState.isLeaf = false;
    }
  }

  // Third pass: compute levels using BFS from roots
  const roots: string[] = [];
  for (const [id, state] of treeState) {
    if (state.parentId === null) {
      roots.push(id);
      state.level = 0;
    }
  }

  const queue = [...roots];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const nodeState = treeState.get(nodeId)!;

    for (const childId of nodeState.childIds) {
      const childState = treeState.get(childId);
      if (childState) {
        childState.level = nodeState.level + 1;
        queue.push(childId);
      }
    }
  }
}

/**
 * Build tree from nested data with a children field.
 * The row nodes in this case include parent rows whose data contains
 * a children array. We need to discover the hierarchy from the data.
 */
function buildFromNestedData(
  rowNodes: Map<string, RowNode>,
  childrenField: string,
  defaultExpanded: boolean,
  treeState: Map<string, TreeNodeState>,
): void {
  // Build a lookup from data reference to node ID
  const dataToId = new Map<any, string>();
  for (const [id, node] of rowNodes) {
    if (node.data) {
      dataToId.set(node.data, id);
    }
  }

  // For nested data, identify parent-child by checking the children field
  const childParentMap = new Map<string, string>();

  for (const [id, node] of rowNodes) {
    if (!node.data) continue;
    const children = node.data[childrenField];
    const childIds: string[] = [];

    if (Array.isArray(children)) {
      for (const childData of children) {
        const childId = dataToId.get(childData);
        if (childId) {
          childIds.push(childId);
          childParentMap.set(childId, id);
        }
      }
    }

    treeState.set(id, {
      expanded: defaultExpanded,
      level: 0,
      hasChildren: childIds.length > 0,
      parentId: null, // Will be set below
      childIds,
      isLeaf: childIds.length === 0,
    });
  }

  // Set parent IDs
  for (const [childId, parentId] of childParentMap) {
    const childState = treeState.get(childId);
    if (childState) {
      childState.parentId = parentId;
    }
  }

  // Compute levels from roots via BFS
  const roots: string[] = [];
  for (const [id, state] of treeState) {
    if (state.parentId === null) {
      roots.push(id);
      state.level = 0;
    }
  }

  const queue = [...roots];
  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const nodeState = treeState.get(nodeId)!;

    for (const childId of nodeState.childIds) {
      const childState = treeState.get(childId);
      if (childState) {
        childState.level = nodeState.level + 1;
        queue.push(childId);
      }
    }
  }
}

/**
 * Flatten the tree into display order, respecting expanded/collapsed state.
 */
export function flattenTree(params: {
  treeState: Map<string, TreeNodeState>;
  rowNodes: Map<string, RowNode>;
  rootIds: string[];
}): string[] {
  const { treeState, rowNodes, rootIds } = params;
  const result: string[] = [];

  function walk(nodeId: string): void {
    // Only include nodes that exist in rowNodes
    if (!rowNodes.has(nodeId)) return;

    result.push(nodeId);

    const nodeState = treeState.get(nodeId);
    if (nodeState && nodeState.expanded && nodeState.hasChildren) {
      for (const childId of nodeState.childIds) {
        walk(childId);
      }
    }
  }

  for (const rootId of rootIds) {
    walk(rootId);
  }

  return result;
}
