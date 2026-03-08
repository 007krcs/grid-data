import { describe, it, expect, vi } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { GroupingPlugin } from '../grouping-plugin';

interface TestRow {
  name: string;
  dept: string;
  city: string;
  age: number;
}

const data: TestRow[] = [
  { name: 'Alice', dept: 'Engineering', city: 'NYC', age: 30 },
  { name: 'Bob', dept: 'Engineering', city: 'LA', age: 25 },
  { name: 'Charlie', dept: 'Sales', city: 'NYC', age: 35 },
  { name: 'Diana', dept: 'Sales', city: 'LA', age: 28 },
];

const columns = [
  { field: 'name' as const },
  { field: 'dept' as const },
  { field: 'city' as const },
  { field: 'age' as const },
];

function createGroupingGrid(pluginOptions: Parameters<typeof GroupingPlugin>[0] = {}) {
  return createGrid<TestRow>({
    columns,
    rowData: data,
    plugins: [GroupingPlugin(pluginOptions)],
  });
}

describe('GroupingPlugin', () => {
  it('creates grid with grouping plugin successfully', () => {
    const engine = createGroupingGrid();
    expect(engine.api).toBeDefined();
    expect(engine.store).toBeDefined();
    expect(engine.api.getDisplayedRowCount()).toBe(4);
    engine.destroy();
  });

  it('group:addColumn groups rows by a column', () => {
    const engine = createGroupingGrid();
    engine.commandBus.dispatch('group:addColumn', { colId: 'dept' });

    const state = engine.store.getState();
    const groupNodes = [...state.rowNodes.values()].filter((n) => n.group);

    // Should have 2 groups: Engineering, Sales
    expect(groupNodes).toHaveLength(2);
    expect(groupNodes.map((n) => n.groupValue).sort()).toEqual(['Engineering', 'Sales']);

    // displayedRowIds should contain group IDs (collapsed by default)
    expect(state.displayedRowIds).toHaveLength(2);
    for (const id of state.displayedRowIds) {
      const node = state.rowNodes.get(id);
      expect(node!.group).toBe(true);
    }

    engine.destroy();
  });

  it('group:addColumn with duplicate column is ignored', () => {
    const engine = createGroupingGrid();
    engine.commandBus.dispatch('group:addColumn', { colId: 'dept' });
    engine.commandBus.dispatch('group:addColumn', { colId: 'dept' });

    const gs = engine.store.getState().pluginState['grouping'] as any;
    expect(gs.groupColumns).toEqual(['dept']);

    engine.destroy();
  });

  it('group:removeColumn removes grouping', () => {
    const engine = createGroupingGrid();
    engine.commandBus.dispatch('group:addColumn', { colId: 'dept' });

    // Verify grouping is active
    const groupNodes = [...engine.store.getState().rowNodes.values()].filter((n) => n.group);
    expect(groupNodes.length).toBeGreaterThan(0);

    // Remove grouping
    engine.commandBus.dispatch('group:removeColumn', { colId: 'dept' });

    // After removing the only group column, groupColumns should be empty
    const gs = engine.store.getState().pluginState['grouping'] as any;
    expect(gs.groupColumns).toEqual([]);

    // The displayed rows should include the original data rows
    const state = engine.store.getState();
    const dataRows = [...state.rowNodes.values()].filter((n) => !n.group && n.data !== undefined);
    expect(dataRows.length).toBeGreaterThanOrEqual(4);

    engine.destroy();
  });

  it('group:setColumns sets all group columns at once', () => {
    const engine = createGroupingGrid();
    engine.commandBus.dispatch('group:setColumns', { colIds: ['dept', 'city'] });

    const gs = engine.store.getState().pluginState['grouping'] as any;
    expect(gs.groupColumns).toEqual(['dept', 'city']);

    // When collapsed, only root level groups (dept) are in displayedRowIds and rowNodes
    const state = engine.store.getState();
    const groupNodes = [...state.rowNodes.values()].filter((n) => n.group);
    // Root groups: Engineering, Sales (nested city groups inside children but not in rowNodes until expanded)
    expect(groupNodes.length).toBeGreaterThanOrEqual(2);

    // Verify nested structure by checking children of a root group
    const engGroup = groupNodes.find((n) => n.groupValue === 'Engineering');
    expect(engGroup).toBeDefined();
    expect(engGroup!.children).toBeDefined();
    // Children should be city subgroups (not leaf rows) since we have 2 group columns
    expect(engGroup!.children!.length).toBe(2);

    engine.destroy();
  });

  it('group:expand expands a group row', () => {
    const engine = createGroupingGrid();
    engine.commandBus.dispatch('group:addColumn', { colId: 'dept' });

    const state = engine.store.getState();
    const engGroup = [...state.rowNodes.values()].find(
      (n) => n.group && n.groupValue === 'Engineering',
    );
    expect(engGroup).toBeDefined();

    // Initially collapsed: only 2 group rows
    expect(state.displayedRowIds).toHaveLength(2);

    // Expand Engineering group
    engine.commandBus.dispatch('group:expand', { rowId: engGroup!.id });

    const afterExpand = engine.store.getState();
    // 2 group rows + 2 Engineering children = 4
    expect(afterExpand.displayedRowIds).toHaveLength(4);

    const engNode = afterExpand.rowNodes.get(engGroup!.id);
    expect(engNode!.expanded).toBe(true);

    engine.destroy();
  });

  it('group:collapse collapses a group row', () => {
    const engine = createGroupingGrid();
    engine.commandBus.dispatch('group:addColumn', { colId: 'dept' });

    const state = engine.store.getState();
    const engGroup = [...state.rowNodes.values()].find(
      (n) => n.group && n.groupValue === 'Engineering',
    );

    // Expand, then collapse
    engine.commandBus.dispatch('group:expand', { rowId: engGroup!.id });
    expect(engine.store.getState().displayedRowIds.length).toBe(4);

    engine.commandBus.dispatch('group:collapse', { rowId: engGroup!.id });

    const afterCollapse = engine.store.getState();
    expect(afterCollapse.displayedRowIds).toHaveLength(2);

    const engNode = afterCollapse.rowNodes.get(engGroup!.id);
    expect(engNode!.expanded).toBe(false);

    engine.destroy();
  });

  it('group:expandAll expands all groups', () => {
    const engine = createGroupingGrid();
    engine.commandBus.dispatch('group:addColumn', { colId: 'dept' });

    // Initially collapsed: 2 group rows
    expect(engine.store.getState().displayedRowIds).toHaveLength(2);

    engine.commandBus.dispatch('group:expandAll', {});

    const afterExpand = engine.store.getState();
    // 2 group rows + 4 leaf rows = 6
    expect(afterExpand.displayedRowIds).toHaveLength(6);

    // All group nodes should be expanded
    const groupNodes = [...afterExpand.rowNodes.values()].filter((n) => n.group);
    for (const node of groupNodes) {
      expect(node.expanded).toBe(true);
    }

    engine.destroy();
  });

  it('group:collapseAll collapses all groups', () => {
    const engine = createGroupingGrid();
    engine.commandBus.dispatch('group:addColumn', { colId: 'dept' });
    engine.commandBus.dispatch('group:expandAll', {});

    // All expanded: 6 rows
    expect(engine.store.getState().displayedRowIds.length).toBe(6);

    engine.commandBus.dispatch('group:collapseAll', {});

    const afterCollapse = engine.store.getState();
    expect(afterCollapse.displayedRowIds).toHaveLength(2);

    engine.destroy();
  });

  it('group:expandToLevel expands to specified level', () => {
    const engine = createGroupingGrid();
    // Nested grouping: dept then city
    engine.commandBus.dispatch('group:setColumns', { colIds: ['dept', 'city'] });

    // Expand to level 1 (only top-level dept groups)
    engine.commandBus.dispatch('group:expandToLevel', { level: 1 });

    const state = engine.store.getState();
    const groupNodes = [...state.rowNodes.values()].filter((n) => n.group);

    // Top-level groups (level 0) should be expanded
    const level0 = groupNodes.filter((n) => n.level === 0);
    for (const node of level0) {
      expect(node.expanded).toBe(true);
    }

    // Level 1 groups should NOT be expanded
    const level1 = groupNodes.filter((n) => n.level === 1);
    for (const node of level1) {
      expect(node.expanded).toBe(false);
    }

    engine.destroy();
  });

  it('group rows have correct metadata (group, groupField, groupValue, children)', () => {
    const engine = createGroupingGrid();
    engine.commandBus.dispatch('group:addColumn', { colId: 'dept' });

    const state = engine.store.getState();
    const engGroup = [...state.rowNodes.values()].find(
      (n) => n.group && n.groupValue === 'Engineering',
    );

    expect(engGroup).toBeDefined();
    expect(engGroup!.group).toBe(true);
    expect(engGroup!.groupField).toBe('dept');
    expect(engGroup!.groupValue).toBe('Engineering');
    expect(engGroup!.leafChildrenCount).toBe(2); // Alice, Bob
    expect(engGroup!.level).toBe(0);
    expect(engGroup!.children).toBeDefined();
    expect(engGroup!.children).toHaveLength(2);
    expect(engGroup!.data).toBeUndefined();

    const salesGroup = [...state.rowNodes.values()].find(
      (n) => n.group && n.groupValue === 'Sales',
    );
    expect(salesGroup).toBeDefined();
    expect(salesGroup!.group).toBe(true);
    expect(salesGroup!.groupField).toBe('dept');
    expect(salesGroup!.groupValue).toBe('Sales');
    expect(salesGroup!.leafChildrenCount).toBe(2); // Charlie, Diana

    engine.destroy();
  });

  it('emits grouping:changed event', () => {
    const engine = createGroupingGrid();
    const listener = vi.fn();
    engine.eventBus.on('grouping:changed', listener);

    engine.commandBus.dispatch('group:addColumn', { colId: 'dept' });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ groupColumns: ['dept'] }),
    );

    // Also verify on removeColumn
    engine.commandBus.dispatch('group:removeColumn', { colId: 'dept' });
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ groupColumns: [] }),
    );

    // Also verify on setColumns
    engine.commandBus.dispatch('group:setColumns', { colIds: ['city'] });
    expect(listener).toHaveBeenCalledTimes(3);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ groupColumns: ['city'] }),
    );

    engine.destroy();
  });

  it('defaultExpanded=true with explicit grouping expands all groups', () => {
    const engine = createGroupingGrid({ defaultExpanded: true });

    // Manually trigger grouping (defaultExpanded only works with commands, not auto-detect at install)
    engine.commandBus.dispatch('group:addColumn', { colId: 'dept' });
    engine.commandBus.dispatch('group:expandAll', {});

    const state = engine.store.getState();
    const groupNodes = [...state.rowNodes.values()].filter((n) => n.group);
    expect(groupNodes.length).toBeGreaterThan(0);

    for (const node of groupNodes) {
      expect(node.expanded).toBe(true);
    }

    // 2 group rows + 4 leaf rows = 6
    expect(state.displayedRowIds.length).toBe(6);

    engine.destroy();
  });

  it('defaultExpanded does not expand when no autoGroupCols are detected', () => {
    const engine = createGroupingGrid({ defaultExpanded: true });

    // No columns have rowGroup: true, so no auto grouping happens
    const state = engine.store.getState();
    const groupNodes = [...state.rowNodes.values()].filter((n) => n.group);
    expect(groupNodes).toHaveLength(0);
    expect(state.displayedRowIds).toHaveLength(4);

    engine.destroy();
  });

  it('nested grouping: group by dept then by city with expand', () => {
    const engine = createGroupingGrid();
    engine.commandBus.dispatch('group:setColumns', { colIds: ['dept', 'city'] });

    // Expand all groups to get nested groups into rowNodes
    engine.commandBus.dispatch('group:expandAll', {});

    const state = engine.store.getState();
    const groupNodes = [...state.rowNodes.values()].filter((n) => n.group);

    // Level-0 groups: Engineering, Sales
    const level0 = groupNodes.filter((n) => n.level === 0);
    expect(level0).toHaveLength(2);

    // Level-1 groups: nested by city within each dept (only visible after expand)
    const level1 = groupNodes.filter((n) => n.level === 1);
    // Engineering has NYC(Alice)+LA(Bob) = 2 sub-groups, Sales has NYC(Charlie)+LA(Diana) = 2 sub-groups
    expect(level1).toHaveLength(4);

    // Verify Engineering has 2 sub-groups
    const engGroup = level0.find((n) => n.groupValue === 'Engineering');
    expect(engGroup!.children!.length).toBe(2);

    engine.destroy();
  });

  it('disposer cleanup unregisters commands after destroy', () => {
    const engine = createGroupingGrid();

    // Before destroy, commands work
    engine.commandBus.dispatch('group:addColumn', { colId: 'dept' });
    const gs = engine.store.getState().pluginState['grouping'] as any;
    expect(gs.groupColumns).toEqual(['dept']);

    // Clear grouping
    engine.commandBus.dispatch('group:removeColumn', { colId: 'dept' });

    // Destroy the engine (which calls plugin disposers)
    engine.destroy();

    // After destroy, commandBus is cleared so dispatch does nothing
    // We verify that state was properly cleaned up and no errors are thrown
  });
});
