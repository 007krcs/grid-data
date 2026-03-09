import { describe, it, expect, vi } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { TreeDataPlugin } from '../tree-data-plugin';

// ─── Flat data with parentId ───

interface FlatRow {
  id: string;
  name: string;
  parentId: string | null;
}

const flatData: FlatRow[] = [
  { id: '1', name: 'Root A', parentId: null },
  { id: '2', name: 'Root B', parentId: null },
  { id: '1-1', name: 'Child A1', parentId: '1' },
  { id: '1-2', name: 'Child A2', parentId: '1' },
  { id: '2-1', name: 'Child B1', parentId: '2' },
  { id: '1-1-1', name: 'Grandchild A1-1', parentId: '1-1' },
];

function createFlatTreeGrid(pluginOptions: Parameters<typeof TreeDataPlugin>[0] = {}) {
  return createGrid<FlatRow>({
    columns: [{ field: 'name' }],
    rowData: flatData,
    getRowId: (params) => params.data.id,
    plugins: [
      TreeDataPlugin({
        getParentId: (data: FlatRow) => data.parentId,
        childrenField: undefined,
        ...pluginOptions,
      }),
    ],
  });
}

// ─── Nested data with children field ───

interface NestedRow {
  id: string;
  name: string;
  children?: NestedRow[];
}

const nestedRoot1: NestedRow = {
  id: 'r1',
  name: 'Root 1',
  children: [
    { id: 'r1-c1', name: 'Child 1-1' },
    {
      id: 'r1-c2',
      name: 'Child 1-2',
      children: [{ id: 'r1-c2-g1', name: 'Grandchild 1-2-1' }],
    },
  ],
};

const nestedRoot2: NestedRow = {
  id: 'r2',
  name: 'Root 2',
};

// Flatten nested data into a flat array (the grid needs all rows in rowData)
function flattenNested(rows: NestedRow[]): NestedRow[] {
  const result: NestedRow[] = [];
  for (const row of rows) {
    result.push(row);
    if (row.children) {
      result.push(...flattenNested(row.children));
    }
  }
  return result;
}

const nestedData: NestedRow[] = flattenNested([nestedRoot1, nestedRoot2]);

function createNestedTreeGrid(pluginOptions: Parameters<typeof TreeDataPlugin>[0] = {}) {
  return createGrid<NestedRow>({
    columns: [{ field: 'name' }],
    rowData: nestedData,
    getRowId: (params) => params.data.id,
    plugins: [
      TreeDataPlugin({
        childrenField: 'children',
        ...pluginOptions,
      }),
    ],
  });
}

describe('TreeDataPlugin — flat data with parentId', () => {
  it('builds correct tree from flat data', () => {
    const engine = createFlatTreeGrid();
    const state = engine.store.getState();

    // Root nodes should be group=true (they have children)
    const root1 = state.rowNodes.get('1')!;
    const root2 = state.rowNodes.get('2')!;
    expect(root1.group).toBe(true);
    expect(root2.group).toBe(true);

    // Leaf nodes should be group=false
    const leaf = state.rowNodes.get('1-2')!;
    expect(leaf.group).toBe(false);

    engine.destroy();
  });

  it('root nodes have level 0', () => {
    const engine = createFlatTreeGrid();
    const state = engine.store.getState();

    const root1 = state.rowNodes.get('1')!;
    const root2 = state.rowNodes.get('2')!;
    expect(root1.level).toBe(0);
    expect(root2.level).toBe(0);

    engine.destroy();
  });

  it('child nodes have correct level', () => {
    const engine = createFlatTreeGrid();
    const state = engine.store.getState();

    // Direct children of root should be level 1
    const child = state.rowNodes.get('1-1')!;
    expect(child.level).toBe(1);

    // Grandchild should be level 2
    const grandchild = state.rowNodes.get('1-1-1')!;
    expect(grandchild.level).toBe(2);

    engine.destroy();
  });

  it('collapsed nodes hide children from displayed rows', () => {
    const engine = createFlatTreeGrid({ defaultExpanded: false });
    const state = engine.store.getState();

    // Only root nodes should be in displayed rows when collapsed
    expect(state.displayedRowIds).toEqual(['1', '2']);

    engine.destroy();
  });

  it('expand/collapse commands work', () => {
    const engine = createFlatTreeGrid({ defaultExpanded: false });

    // Initially collapsed: only roots shown
    expect(engine.store.getState().displayedRowIds).toEqual(['1', '2']);

    // Expand root 1
    engine.commandBus.dispatch('tree:expand', { nodeId: '1' });
    let displayed = engine.store.getState().displayedRowIds;
    // Root 1 expanded: shows 1, 1-1, 1-2, then root 2
    expect(displayed).toContain('1');
    expect(displayed).toContain('1-1');
    expect(displayed).toContain('1-2');
    expect(displayed).toContain('2');
    // Grandchild not visible yet (1-1 is still collapsed)
    expect(displayed).not.toContain('1-1-1');

    // Collapse root 1
    engine.commandBus.dispatch('tree:collapse', { nodeId: '1' });
    displayed = engine.store.getState().displayedRowIds;
    expect(displayed).toEqual(['1', '2']);

    engine.destroy();
  });

  it('expandAll/collapseAll commands work', () => {
    const engine = createFlatTreeGrid({ defaultExpanded: false });

    // Initially only roots
    expect(engine.store.getState().displayedRowIds).toEqual(['1', '2']);

    // Expand all
    engine.commandBus.dispatch('tree:expandAll', {});
    let displayed = engine.store.getState().displayedRowIds;
    // All 6 rows should be visible
    expect(displayed).toHaveLength(6);
    expect(displayed).toContain('1');
    expect(displayed).toContain('1-1');
    expect(displayed).toContain('1-1-1');
    expect(displayed).toContain('1-2');
    expect(displayed).toContain('2');
    expect(displayed).toContain('2-1');

    // Collapse all
    engine.commandBus.dispatch('tree:collapseAll', {});
    displayed = engine.store.getState().displayedRowIds;
    expect(displayed).toEqual(['1', '2']);

    engine.destroy();
  });

  it('leaf nodes cannot be expanded', () => {
    const engine = createFlatTreeGrid({ defaultExpanded: false });

    // '1-2' is a leaf node (no children)
    // First expand root 1 so '1-2' is visible
    engine.commandBus.dispatch('tree:expand', { nodeId: '1' });
    const beforeToggle = engine.store.getState().displayedRowIds;

    // Try to toggle leaf — should have no effect
    engine.commandBus.dispatch('tree:toggle', { nodeId: '1-2' });
    const afterToggle = engine.store.getState().displayedRowIds;

    expect(afterToggle).toEqual(beforeToggle);

    engine.destroy();
  });

  it('toggle command works on non-leaf nodes', () => {
    const engine = createFlatTreeGrid({ defaultExpanded: false });

    // Toggle root 1 (collapsed -> expanded)
    engine.commandBus.dispatch('tree:toggle', { nodeId: '1' });
    let displayed = engine.store.getState().displayedRowIds;
    expect(displayed).toContain('1-1');
    expect(displayed).toContain('1-2');

    // Toggle root 1 again (expanded -> collapsed)
    engine.commandBus.dispatch('tree:toggle', { nodeId: '1' });
    displayed = engine.store.getState().displayedRowIds;
    expect(displayed).toEqual(['1', '2']);

    engine.destroy();
  });

  it('default expanded option works', () => {
    const engine = createFlatTreeGrid({ defaultExpanded: true });
    const displayed = engine.store.getState().displayedRowIds;

    // All nodes should be visible when defaultExpanded is true
    expect(displayed).toHaveLength(6);
    expect(displayed).toContain('1');
    expect(displayed).toContain('1-1');
    expect(displayed).toContain('1-1-1');
    expect(displayed).toContain('1-2');
    expect(displayed).toContain('2');
    expect(displayed).toContain('2-1');

    engine.destroy();
  });

  it('tree rebuilds when data changes', () => {
    const engine = createFlatTreeGrid({ defaultExpanded: false });

    // Initially 2 root nodes
    expect(engine.store.getState().displayedRowIds).toEqual(['1', '2']);

    // Set new data with 3 root nodes
    engine.api.setRowData([
      { id: 'a', name: 'New Root A', parentId: null },
      { id: 'b', name: 'New Root B', parentId: null },
      { id: 'c', name: 'New Root C', parentId: null },
      { id: 'a1', name: 'Child of A', parentId: 'a' },
    ]);

    const displayed = engine.store.getState().displayedRowIds;
    // 3 root nodes visible (collapsed, child hidden)
    expect(displayed).toHaveLength(3);
    expect(displayed).toContain('a');
    expect(displayed).toContain('b');
    expect(displayed).toContain('c');

    engine.destroy();
  });
});

describe('TreeDataPlugin — nested data with children field', () => {
  it('builds correct tree from nested data', () => {
    const engine = createNestedTreeGrid({ defaultExpanded: false });
    const state = engine.store.getState();

    // Root 1 has children
    const root1 = state.rowNodes.get('r1')!;
    expect(root1.group).toBe(true);

    // Root 2 has no children
    const root2 = state.rowNodes.get('r2')!;
    expect(root2.group).toBe(false);

    // Only roots should be displayed when collapsed
    // r2 is a leaf (no children), so it's displayed
    expect(state.displayedRowIds).toContain('r1');
    expect(state.displayedRowIds).toContain('r2');
    // Children should not be visible
    expect(state.displayedRowIds).not.toContain('r1-c1');

    engine.destroy();
  });

  it('nested expand shows children correctly', () => {
    const engine = createNestedTreeGrid({ defaultExpanded: false });

    // Expand root 1
    engine.commandBus.dispatch('tree:expand', { nodeId: 'r1' });
    let displayed = engine.store.getState().displayedRowIds;
    expect(displayed).toContain('r1');
    expect(displayed).toContain('r1-c1');
    expect(displayed).toContain('r1-c2');
    expect(displayed).toContain('r2');
    // Grandchild not yet visible
    expect(displayed).not.toContain('r1-c2-g1');

    // Expand child 1-2 to reveal grandchild
    engine.commandBus.dispatch('tree:expand', { nodeId: 'r1-c2' });
    displayed = engine.store.getState().displayedRowIds;
    expect(displayed).toContain('r1-c2-g1');

    engine.destroy();
  });
});
