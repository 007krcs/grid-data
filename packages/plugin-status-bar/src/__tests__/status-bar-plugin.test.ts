import { describe, it, expect } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { StatusBarPlugin } from '../status-bar-plugin';
import type { StatusBarState, AggregationResult } from '../status-bar-plugin';

function makeRowData() {
  return [
    { name: 'Alice', age: 30, score: 85, city: 'NYC' },
    { name: 'Bob', age: 25, score: 90, city: 'LA' },
    { name: 'Charlie', age: 35, score: 75, city: 'SF' },
  ];
}

function makeColumns() {
  return [
    { field: 'name' },
    { field: 'age' },
    { field: 'score' },
    { field: 'city' },
  ];
}

function getStatusBarState(engine: ReturnType<typeof createGrid>): StatusBarState {
  return engine.store.getState().pluginState?.['statusBar'] as StatusBarState;
}

describe('StatusBarPlugin', () => {
  it('creates grid with status bar plugin successfully', () => {
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [StatusBarPlugin()],
    });

    expect(engine.api).toBeDefined();
    expect(engine.store).toBeDefined();

    const state = getStatusBarState(engine);
    expect(state).toBeDefined();
    expect(state.visible).toBe(true);

    engine.destroy();
  });

  it('initial calculation provides aggregations for numeric columns', () => {
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [StatusBarPlugin()],
    });

    const state = getStatusBarState(engine);
    // age and score are numeric columns, should have aggregation results
    expect(state.aggregations['age']).toBeDefined();
    expect(state.aggregations['score']).toBeDefined();

    engine.destroy();
  });

  it('aggregations include sum, avg, min, max, count correctly', () => {
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [StatusBarPlugin()],
    });

    const state = getStatusBarState(engine);
    const ageAgg = state.aggregations['age'] as AggregationResult;

    // age values: 30, 25, 35
    expect(ageAgg.sum).toBe(90);
    expect(ageAgg.avg).toBe(30);
    expect(ageAgg.min).toBe(25);
    expect(ageAgg.max).toBe(35);
    expect(ageAgg.count).toBe(3);
    expect(ageAgg.first).toBe(30);
    expect(ageAgg.last).toBe(35);

    const scoreAgg = state.aggregations['score'] as AggregationResult;
    // score values: 85, 90, 75
    expect(scoreAgg.sum).toBe(250);
    expect(scoreAgg.avg).toBeCloseTo(250 / 3);
    expect(scoreAgg.min).toBe(75);
    expect(scoreAgg.max).toBe(90);
    expect(scoreAgg.count).toBe(3);

    engine.destroy();
  });

  it('statusBar:toggle command toggles visibility', () => {
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [StatusBarPlugin()],
    });

    expect(getStatusBarState(engine).visible).toBe(true);

    engine.commandBus.dispatch('statusBar:toggle', {});
    expect(getStatusBarState(engine).visible).toBe(false);

    engine.commandBus.dispatch('statusBar:toggle', {});
    expect(getStatusBarState(engine).visible).toBe(true);

    engine.destroy();
  });

  it('statusBar:setPanels command updates panels', () => {
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [StatusBarPlugin()],
    });

    expect(getStatusBarState(engine).panels).toEqual([]);

    const newPanels = [
      { id: 'panel-1', label: 'Summary', align: 'left' as const },
      { id: 'panel-2', label: 'Total', align: 'right' as const },
    ];
    engine.commandBus.dispatch('statusBar:setPanels', { panels: newPanels });

    const state = getStatusBarState(engine);
    expect(state.panels).toHaveLength(2);
    expect(state.panels[0]!.id).toBe('panel-1');
    expect(state.panels[1]!.label).toBe('Total');

    engine.destroy();
  });

  it('statusBar:calculate command recalculates on demand', () => {
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [StatusBarPlugin()],
    });

    // Initial state has aggregations
    const stateBefore = getStatusBarState(engine);
    expect(Object.keys(stateBefore.aggregations).length).toBeGreaterThan(0);

    // Recalculate explicitly
    engine.commandBus.dispatch('statusBar:calculate', {});

    const stateAfter = getStatusBarState(engine);
    expect(stateAfter.aggregations['age']).toBeDefined();
    expect((stateAfter.aggregations['age'] as AggregationResult).count).toBe(3);

    engine.destroy();
  });

  it('non-numeric columns are excluded from aggregations when only numeric aggregation types requested', () => {
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [StatusBarPlugin({ defaultAggregations: ['sum', 'avg', 'min', 'max', 'count'] })],
    });

    const state = getStatusBarState(engine);
    // 'name' and 'city' are string columns with no numeric data
    // They should be skipped since first/last are not requested
    expect(state.aggregations['name']).toBeUndefined();
    expect(state.aggregations['city']).toBeUndefined();

    // Numeric columns should still be present
    expect(state.aggregations['age']).toBeDefined();
    expect(state.aggregations['score']).toBeDefined();

    engine.destroy();
  });

  it('showForAllRows=false means empty aggregations when no selection', () => {
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      // Exclude first/last so columns with no numeric data are truly skipped
      plugins: [StatusBarPlugin({
        showForAllRows: false,
        defaultAggregations: ['sum', 'avg', 'min', 'max', 'count'],
      })],
    });

    const state = getStatusBarState(engine);
    // No selection and showForAllRows=false => no rows to aggregate
    // With first/last excluded, columns with no numeric values are skipped entirely
    expect(Object.keys(state.aggregations)).toHaveLength(0);

    engine.destroy();
  });

  it('only requested aggregation types are computed', () => {
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [StatusBarPlugin({ defaultAggregations: ['sum', 'count'] })],
    });

    const state = getStatusBarState(engine);
    const ageAgg = state.aggregations['age'] as AggregationResult;

    // sum and count should be computed
    expect(ageAgg.sum).toBe(90);
    expect(ageAgg.count).toBe(3);

    // avg, min, max should remain at 0 (not computed)
    expect(ageAgg.avg).toBe(0);
    expect(ageAgg.min).toBe(0);
    expect(ageAgg.max).toBe(0);

    engine.destroy();
  });

  it('initial panels option is stored in state', () => {
    const panels = [
      { id: 'total', label: 'Total', align: 'left' as const },
    ];
    const engine = createGrid({
      columns: makeColumns(),
      rowData: makeRowData(),
      plugins: [StatusBarPlugin({ panels })],
    });

    const state = getStatusBarState(engine);
    expect(state.panels).toHaveLength(1);
    expect(state.panels[0]!.id).toBe('total');

    engine.destroy();
  });
});
