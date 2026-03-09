import { describe, it, expect, vi } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { MasterDetailPlugin } from '../master-detail-plugin';

// ─── Test Data ───

interface MasterRow {
  id: string;
  name: string;
  department: string;
}

interface DetailRow {
  taskId: string;
  task: string;
  status: string;
}

const masterData: MasterRow[] = [
  { id: 'm1', name: 'Alice', department: 'Engineering' },
  { id: 'm2', name: 'Bob', department: 'Marketing' },
  { id: 'm3', name: 'Charlie', department: 'Sales' },
];

const detailDataMap: Record<string, DetailRow[]> = {
  m1: [
    { taskId: 't1', task: 'Build API', status: 'done' },
    { taskId: 't2', task: 'Write tests', status: 'in-progress' },
  ],
  m2: [
    { taskId: 't3', task: 'Campaign', status: 'done' },
  ],
  m3: [],
};

function createMasterDetailGrid(pluginOptions: Partial<Parameters<typeof MasterDetailPlugin>[0]> = {}) {
  return createGrid<MasterRow>({
    columns: [
      { field: 'name', headerName: 'Name' },
      { field: 'department', headerName: 'Department' },
    ],
    rowData: masterData,
    getRowId: (params) => params.data.id,
    plugins: [
      MasterDetailPlugin({
        getDetailRowData: (params) => {
          const data = detailDataMap[params.node.id] ?? [];
          params.successCallback(data);
          return data;
        },
        ...pluginOptions,
      }),
    ],
  });
}

// ─── Tests ───

describe('MasterDetailPlugin — expand/collapse', () => {
  it('initially shows only master rows', () => {
    const engine = createMasterDetailGrid();
    const state = engine.store.getState();

    expect(state.displayedRowIds).toEqual(['m1', 'm2', 'm3']);

    engine.destroy();
  });

  it('expanding a master row inserts a detail row after it', () => {
    const engine = createMasterDetailGrid();

    engine.commandBus.dispatch('detail:expand', { nodeId: 'm1' });
    const displayed = engine.store.getState().displayedRowIds;

    expect(displayed).toEqual(['m1', '__detail__m1', 'm2', 'm3']);

    engine.destroy();
  });

  it('detail row has detail flag set to true', () => {
    const engine = createMasterDetailGrid();

    engine.commandBus.dispatch('detail:expand', { nodeId: 'm1' });
    const state = engine.store.getState();
    const detailNode = state.rowNodes.get('__detail__m1');

    expect(detailNode).toBeDefined();
    expect(detailNode!.detail).toBe(true);
    expect(detailNode!.selectable).toBe(false);

    engine.destroy();
  });

  it('collapsing a master row removes the detail row', () => {
    const engine = createMasterDetailGrid();

    engine.commandBus.dispatch('detail:expand', { nodeId: 'm1' });
    expect(engine.store.getState().displayedRowIds).toContain('__detail__m1');

    engine.commandBus.dispatch('detail:collapse', { nodeId: 'm1' });
    const displayed = engine.store.getState().displayedRowIds;

    expect(displayed).toEqual(['m1', 'm2', 'm3']);
    expect(displayed).not.toContain('__detail__m1');

    engine.destroy();
  });

  it('toggle command toggles detail row visibility', () => {
    const engine = createMasterDetailGrid();

    // Toggle open
    engine.commandBus.dispatch('detail:toggle', { nodeId: 'm2' });
    expect(engine.store.getState().displayedRowIds).toContain('__detail__m2');

    // Toggle closed
    engine.commandBus.dispatch('detail:toggle', { nodeId: 'm2' });
    expect(engine.store.getState().displayedRowIds).not.toContain('__detail__m2');

    engine.destroy();
  });

  it('expanding an already expanded row has no effect', () => {
    const engine = createMasterDetailGrid();

    engine.commandBus.dispatch('detail:expand', { nodeId: 'm1' });
    const afterFirst = [...engine.store.getState().displayedRowIds];

    engine.commandBus.dispatch('detail:expand', { nodeId: 'm1' });
    const afterSecond = engine.store.getState().displayedRowIds;

    expect(afterSecond).toEqual(afterFirst);

    engine.destroy();
  });

  it('collapsing a non-expanded row has no effect', () => {
    const engine = createMasterDetailGrid();

    const before = [...engine.store.getState().displayedRowIds];
    engine.commandBus.dispatch('detail:collapse', { nodeId: 'm1' });
    const after = engine.store.getState().displayedRowIds;

    expect(after).toEqual(before);

    engine.destroy();
  });
});

describe('MasterDetailPlugin — detail data fetching', () => {
  it('calls getDetailRowData when expanding', () => {
    const fetchSpy = vi.fn((params: any) => {
      const data = detailDataMap[params.node.id] ?? [];
      params.successCallback(data);
      return data;
    });

    const engine = createGrid<MasterRow>({
      columns: [{ field: 'name' }],
      rowData: masterData,
      getRowId: (params) => params.data.id,
      plugins: [
        MasterDetailPlugin({
          getDetailRowData: fetchSpy,
        }),
      ],
    });

    engine.commandBus.dispatch('detail:expand', { nodeId: 'm1' });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: masterData[0],
      }),
    );

    engine.destroy();
  });

  it('caches detail data after fetching', () => {
    const fetchSpy = vi.fn((params: any) => {
      const data = detailDataMap[params.node.id] ?? [];
      params.successCallback(data);
      return data;
    });

    const engine = createGrid<MasterRow>({
      columns: [{ field: 'name' }],
      rowData: masterData,
      getRowId: (params) => params.data.id,
      plugins: [
        MasterDetailPlugin({
          getDetailRowData: fetchSpy,
          keepDetailRows: true,
        }),
      ],
    });

    // Expand, collapse, re-expand — should only fetch once due to cache
    engine.commandBus.dispatch('detail:expand', { nodeId: 'm1' });
    engine.commandBus.dispatch('detail:collapse', { nodeId: 'm1' });
    engine.commandBus.dispatch('detail:expand', { nodeId: 'm1' });

    expect(fetchSpy).toHaveBeenCalledTimes(1);

    engine.destroy();
  });
});

describe('MasterDetailPlugin — expand all / collapse all', () => {
  it('expandAll opens all master rows', () => {
    const engine = createMasterDetailGrid();

    engine.commandBus.dispatch('detail:expandAll', {});
    const displayed = engine.store.getState().displayedRowIds;

    // Each master row followed by its detail row
    expect(displayed).toEqual([
      'm1', '__detail__m1',
      'm2', '__detail__m2',
      'm3', '__detail__m3',
    ]);

    engine.destroy();
  });

  it('collapseAll closes all detail rows', () => {
    const engine = createMasterDetailGrid();

    engine.commandBus.dispatch('detail:expandAll', {});
    expect(engine.store.getState().displayedRowIds).toHaveLength(6);

    engine.commandBus.dispatch('detail:collapseAll', {});
    const displayed = engine.store.getState().displayedRowIds;

    expect(displayed).toEqual(['m1', 'm2', 'm3']);

    engine.destroy();
  });

  it('expandAll then collapseAll cleans up detail nodes when keepDetailRows is false', () => {
    const engine = createMasterDetailGrid({ keepDetailRows: false });

    engine.commandBus.dispatch('detail:expandAll', {});
    const state1 = engine.store.getState();
    expect(state1.rowNodes.has('__detail__m1')).toBe(true);

    engine.commandBus.dispatch('detail:collapseAll', {});
    const state2 = engine.store.getState();
    expect(state2.rowNodes.has('__detail__m1')).toBe(false);

    engine.destroy();
  });
});

describe('MasterDetailPlugin — cache behavior', () => {
  it('keepDetailRows=true preserves cache on collapse', () => {
    const fetchSpy = vi.fn((params: any) => {
      const data = detailDataMap[params.node.id] ?? [];
      params.successCallback(data);
      return data;
    });

    const engine = createGrid<MasterRow>({
      columns: [{ field: 'name' }],
      rowData: masterData,
      getRowId: (params) => params.data.id,
      plugins: [
        MasterDetailPlugin({
          getDetailRowData: fetchSpy,
          keepDetailRows: true,
        }),
      ],
    });

    engine.commandBus.dispatch('detail:expand', { nodeId: 'm1' });
    engine.commandBus.dispatch('detail:collapse', { nodeId: 'm1' });

    // Detail node should still exist in rowNodes
    const state = engine.store.getState();
    expect(state.rowNodes.has('__detail__m1')).toBe(true);

    engine.destroy();
  });

  it('keepDetailRows=false removes cache on collapse', () => {
    const fetchSpy = vi.fn((params: any) => {
      const data = detailDataMap[params.node.id] ?? [];
      params.successCallback(data);
      return data;
    });

    const engine = createGrid<MasterRow>({
      columns: [{ field: 'name' }],
      rowData: masterData,
      getRowId: (params) => params.data.id,
      plugins: [
        MasterDetailPlugin({
          getDetailRowData: fetchSpy,
          keepDetailRows: false,
        }),
      ],
    });

    engine.commandBus.dispatch('detail:expand', { nodeId: 'm1' });
    engine.commandBus.dispatch('detail:collapse', { nodeId: 'm1' });

    // Detail node should be removed
    const state = engine.store.getState();
    expect(state.rowNodes.has('__detail__m1')).toBe(false);

    engine.destroy();
  });

  it('refreshDetail clears cached data', () => {
    const fetchSpy = vi.fn((params: any) => {
      const data = detailDataMap[params.node.id] ?? [];
      params.successCallback(data);
      return data;
    });

    const engine = createGrid<MasterRow>({
      columns: [{ field: 'name' }],
      rowData: masterData,
      getRowId: (params) => params.data.id,
      plugins: [
        MasterDetailPlugin({
          getDetailRowData: fetchSpy,
          keepDetailRows: true,
        }),
      ],
    });

    engine.commandBus.dispatch('detail:expand', { nodeId: 'm1' });
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    engine.commandBus.dispatch('detail:refreshDetail', { nodeId: 'm1' });
    // Should re-fetch since cache was cleared
    expect(fetchSpy).toHaveBeenCalledTimes(2);

    engine.destroy();
  });
});

describe('MasterDetailPlugin — detail row properties', () => {
  it('detail row has correct level (master level + 1)', () => {
    const engine = createMasterDetailGrid();

    engine.commandBus.dispatch('detail:expand', { nodeId: 'm1' });
    const state = engine.store.getState();
    const masterNode = state.rowNodes.get('m1')!;
    const detailNode = state.rowNodes.get('__detail__m1')!;

    expect(detailNode.level).toBe(masterNode.level + 1);

    engine.destroy();
  });

  it('detail row has correct parent reference', () => {
    const engine = createMasterDetailGrid();

    engine.commandBus.dispatch('detail:expand', { nodeId: 'm1' });
    const state = engine.store.getState();
    const masterNode = state.rowNodes.get('m1')!;
    const detailNode = state.rowNodes.get('__detail__m1')!;

    expect(detailNode.parent).toBe(masterNode);

    engine.destroy();
  });

  it('detail row has custom height when detailRowHeight is a number', () => {
    const engine = createGrid<MasterRow>({
      columns: [{ field: 'name' }],
      rowData: masterData,
      getRowId: (params) => params.data.id,
      plugins: [
        MasterDetailPlugin({
          getDetailRowData: (params) => {
            const data = detailDataMap[params.node.id] ?? [];
            params.successCallback(data);
            return data;
          },
          detailRowHeight: 300,
        }),
      ],
    });

    engine.commandBus.dispatch('detail:expand', { nodeId: 'm1' });
    const detailNode = engine.store.getState().rowNodes.get('__detail__m1')!;

    expect(detailNode.rowHeight).toBe(300);

    engine.destroy();
  });

  it('multiple master rows can be expanded simultaneously', () => {
    const engine = createMasterDetailGrid();

    engine.commandBus.dispatch('detail:expand', { nodeId: 'm1' });
    engine.commandBus.dispatch('detail:expand', { nodeId: 'm3' });

    const displayed = engine.store.getState().displayedRowIds;

    expect(displayed).toEqual([
      'm1', '__detail__m1',
      'm2',
      'm3', '__detail__m3',
    ]);

    engine.destroy();
  });
});
