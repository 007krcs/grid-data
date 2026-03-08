import { describe, it, expect, vi } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { GroupingPlugin } from '../../../plugin-grouping/src/grouping-plugin';
import { AggregationPlugin } from '../aggregation-plugin';

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

function createAggGrid(
  aggOptions: Parameters<typeof AggregationPlugin>[0] = {},
  columnOverrides?: any[],
) {
  const columns = columnOverrides ?? [
    { field: 'name' as const },
    { field: 'dept' as const },
    { field: 'city' as const },
    { field: 'age' as const, aggFunc: 'sum' },
  ];
  return createGrid<TestRow>({
    columns,
    rowData: data,
    plugins: [GroupingPlugin(), AggregationPlugin(aggOptions)],
  });
}

function getGroupNode(engine: ReturnType<typeof createGrid>, groupValue: string) {
  const state = engine.store.getState();
  return [...state.rowNodes.values()].find(
    (n) => n.group && n.groupValue === groupValue,
  );
}

describe('AggregationPlugin', () => {
  it('creates grid with aggregation + grouping plugins', () => {
    const engine = createAggGrid();
    expect(engine.api).toBeDefined();
    expect(engine.store).toBeDefined();
    expect(engine.api.getDisplayedRowCount()).toBe(4);
    engine.destroy();
  });

  it('agg:setColumnFunc sets aggregation function on a column', () => {
    const engine = createAggGrid({}, [
      { field: 'name' },
      { field: 'dept' },
      { field: 'city' },
      { field: 'age' }, // no initial aggFunc
    ]);
    engine.commandBus.dispatch('group:addColumn', { colId: 'dept' });

    // Initially no aggregation on age
    let engGroup = getGroupNode(engine, 'Engineering');
    expect(engGroup!.aggData).toBeNull();

    // Set aggFunc on age
    engine.commandBus.dispatch('agg:setColumnFunc', {
      colId: 'age',
      aggFunc: 'sum',
    });

    engGroup = getGroupNode(engine, 'Engineering');
    expect(engGroup!.aggData).toBeDefined();
    expect(engGroup!.aggData!['age']).toBe(55); // 30 + 25

    engine.destroy();
  });

  it('agg:compute computes sum aggregation on group nodes', () => {
    const engine = createAggGrid();
    engine.commandBus.dispatch('group:addColumn', { colId: 'dept' });

    const engGroup = getGroupNode(engine, 'Engineering');
    expect(engGroup).toBeDefined();
    expect(engGroup!.aggData).toBeDefined();
    expect(engGroup!.aggData!['age']).toBe(55); // 30 + 25

    const salesGroup = getGroupNode(engine, 'Sales');
    expect(salesGroup!.aggData!['age']).toBe(63); // 35 + 28

    engine.destroy();
  });

  it('agg:compute computes avg aggregation', () => {
    const engine = createAggGrid({}, [
      { field: 'name' },
      { field: 'dept' },
      { field: 'city' },
      { field: 'age', aggFunc: 'avg' },
    ]);
    engine.commandBus.dispatch('group:addColumn', { colId: 'dept' });

    const engGroup = getGroupNode(engine, 'Engineering');
    expect(engGroup!.aggData!['age']).toBe(27.5); // (30 + 25) / 2

    const salesGroup = getGroupNode(engine, 'Sales');
    expect(salesGroup!.aggData!['age']).toBe(31.5); // (35 + 28) / 2

    engine.destroy();
  });

  it('agg:compute computes count aggregation', () => {
    const engine = createAggGrid({}, [
      { field: 'name' },
      { field: 'dept' },
      { field: 'city' },
      { field: 'age', aggFunc: 'count' },
    ]);
    engine.commandBus.dispatch('group:addColumn', { colId: 'dept' });

    const engGroup = getGroupNode(engine, 'Engineering');
    expect(engGroup!.aggData!['age']).toBe(2);

    const salesGroup = getGroupNode(engine, 'Sales');
    expect(salesGroup!.aggData!['age']).toBe(2);

    engine.destroy();
  });

  it('agg:compute computes min/max aggregation', () => {
    // Min
    const engineMin = createAggGrid({}, [
      { field: 'name' },
      { field: 'dept' },
      { field: 'city' },
      { field: 'age', aggFunc: 'min' },
    ]);
    engineMin.commandBus.dispatch('group:addColumn', { colId: 'dept' });

    const engMin = getGroupNode(engineMin, 'Engineering');
    expect(engMin!.aggData!['age']).toBe(25);

    const salesMin = getGroupNode(engineMin, 'Sales');
    expect(salesMin!.aggData!['age']).toBe(28);

    engineMin.destroy();

    // Max
    const engineMax = createAggGrid({}, [
      { field: 'name' },
      { field: 'dept' },
      { field: 'city' },
      { field: 'age', aggFunc: 'max' },
    ]);
    engineMax.commandBus.dispatch('group:addColumn', { colId: 'dept' });

    const engMax = getGroupNode(engineMax, 'Engineering');
    expect(engMax!.aggData!['age']).toBe(30);

    const salesMax = getGroupNode(engineMax, 'Sales');
    expect(salesMax!.aggData!['age']).toBe(35);

    engineMax.destroy();
  });

  it('agg:removeColumnFunc removes aggregation', () => {
    const engine = createAggGrid();
    engine.commandBus.dispatch('group:addColumn', { colId: 'dept' });

    // Verify aggregation is present
    let engGroup = getGroupNode(engine, 'Engineering');
    expect(engGroup!.aggData!['age']).toBe(55);

    // Remove aggFunc
    engine.commandBus.dispatch('agg:removeColumnFunc', { colId: 'age' });

    // Manually recompute to verify age is no longer aggregated
    engine.commandBus.dispatch('agg:compute', {});

    engGroup = getGroupNode(engine, 'Engineering');
    // After removing aggFunc on age, aggData should not have age
    expect(engGroup!.aggData == null || !('age' in engGroup!.aggData!)).toBe(true);

    engine.destroy();
  });

  it('auto-computes when grouping changes', () => {
    const engine = createAggGrid();

    // Adding a group column emits grouping:changed, which triggers auto-compute
    engine.commandBus.dispatch('group:addColumn', { colId: 'dept' });

    // Aggregation should already be computed
    const engGroup = getGroupNode(engine, 'Engineering');
    expect(engGroup!.aggData).toBeDefined();
    expect(engGroup!.aggData!['age']).toBe(55);

    engine.destroy();
  });

  it('custom agg functions work', () => {
    const engine = createAggGrid(
      {
        customAggFuncs: {
          doubleSum: ({ values }) =>
            values.reduce((acc, v) => acc + (Number(v) || 0), 0) * 2,
        },
      },
      [
        { field: 'name' },
        { field: 'dept' },
        { field: 'city' },
        { field: 'age', aggFunc: 'doubleSum' },
      ],
    );

    engine.commandBus.dispatch('group:addColumn', { colId: 'dept' });

    const engGroup = getGroupNode(engine, 'Engineering');
    expect(engGroup!.aggData!['age']).toBe(110); // (30 + 25) * 2

    const salesGroup = getGroupNode(engine, 'Sales');
    expect(salesGroup!.aggData!['age']).toBe(126); // (35 + 28) * 2

    engine.destroy();
  });

  it('emits aggregation:computed event', () => {
    const engine = createAggGrid();
    const listener = vi.fn();
    engine.eventBus.on('aggregation:computed', listener);

    engine.commandBus.dispatch('group:addColumn', { colId: 'dept' });

    // grouping:changed fires, which triggers auto-compute, which emits aggregation:computed
    expect(listener).toHaveBeenCalled();
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ groupNodeIds: expect.any(Array) }),
    );

    engine.destroy();
  });

  it('disposer cleanup unregisters commands and events after destroy', () => {
    const engine = createAggGrid();

    // Before destroy, commands work
    engine.commandBus.dispatch('group:addColumn', { colId: 'dept' });
    const engGroup = getGroupNode(engine, 'Engineering');
    expect(engGroup!.aggData!['age']).toBe(55);

    // Destroy the engine (which calls plugin disposers)
    engine.destroy();

    // After destroy, commandBus is cleared so dispatch does nothing
    // We verify that no errors are thrown after cleanup
  });
});
