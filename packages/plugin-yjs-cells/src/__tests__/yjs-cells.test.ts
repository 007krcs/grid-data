// © 2025 GridStorm / Tekivex — All Rights Reserved
// CRDT convergence tests. The interesting property: two grids editing the
// same data concurrently MUST converge to the same final state regardless
// of edit order, with no last-writer-wins.

import { describe, expect, it, beforeEach } from 'vitest';
import { createGrid, type GridEngine } from '@gridstorm/core';
import {
  InMemoryCrdtTransport,
  YjsCellsPlugin,
  _resetInMemoryCrdtSessions,
  type YjsCellsState,
} from '../index';

interface Row {
  id: string;
  name: string;
  salary: number;
  status: string;
}

const FIXTURE: Row[] = [
  { id: '1', name: 'Alice', salary: 100000, status: 'active' },
  { id: '2', name: 'Bob', salary: 90000, status: 'active' },
  { id: '3', name: 'Carol', salary: 110000, status: 'inactive' },
];

function makeGrid(docId: string): GridEngine<Row> {
  return createGrid<Row>({
    columns: [
      { field: 'id' },
      { field: 'name', editable: true },
      { field: 'salary', editable: true },
      { field: 'status', editable: true },
    ],
    rowData: FIXTURE.map((r) => ({ ...r })),
    getRowId: ({ data }) => data.id,
    plugins: [
      YjsCellsPlugin({
        docId,
        transport: new InMemoryCrdtTransport({ docId }),
      }),
    ],
  });
}

function state(engine: GridEngine<Row>): YjsCellsState {
  return engine.store.getState().pluginState?.['yjsCells'] as YjsCellsState;
}

function emitCellChange(engine: GridEngine<Row>, rowId: string, colId: string, newValue: unknown): void {
  const node = engine.api.getRowNode?.(rowId);
  if (!node) throw new Error(`unknown row ${rowId}`);
  const oldValue = (node.data as Record<string, unknown>)[colId];
  // Mirror what the editing plugin does — mutate the node, then emit the event.
  (node.data as Record<string, unknown>)[colId] = newValue;
  node.version = (node.version ?? 0) + 1;
  engine.eventBus.emit('cell:valueChanged' as never, {
    node,
    colId,
    oldValue,
    newValue,
    cancelled: false,
  } as never);
}

function readCell(engine: GridEngine<Row>, rowId: string, colId: string): unknown {
  const node = engine.api.getRowNode?.(rowId);
  if (!node) return undefined;
  return (node.data as Record<string, unknown>)[colId];
}

beforeEach(() => {
  _resetInMemoryCrdtSessions();
});

describe('YjsCellsPlugin — basic lifecycle', () => {
  it('connects and reports state', async () => {
    const engine = makeGrid('doc-init');
    await Promise.resolve();
    expect(state(engine).connected).toBe(true);
    expect(state(engine).origin).toMatch(/^yjs-/);
    engine.destroy();
  });

  it('works as a local-only Y.Doc when no transport is provided', () => {
    const engine = createGrid<Row>({
      columns: [{ field: 'id' }, { field: 'name', editable: true }],
      rowData: FIXTURE.map((r) => ({ ...r })),
      getRowId: ({ data }) => data.id,
      plugins: [YjsCellsPlugin({ docId: 'local-only' })],
    });
    expect(state(engine).connected).toBe(false);
    expect(state(engine).origin).toMatch(/^yjs-/);
    emitCellChange(engine, '1', 'name', 'Alice X');
    // Y.Doc captures the change; cellCount reflects it.
    expect(state(engine).cellCount).toBe(1);
    engine.destroy();
  });
});

describe('YjsCellsPlugin — two-grid convergence', () => {
  it('A and B converge after A edits a cell', async () => {
    const a = makeGrid('doc-conv');
    const b = makeGrid('doc-conv');
    await Promise.resolve();
    await Promise.resolve();

    emitCellChange(a, '1', 'name', 'Alice Smith');
    // Propagation through InMemoryCrdtTransport is synchronous.
    expect(readCell(b, '1', 'name')).toBe('Alice Smith');

    a.destroy();
    b.destroy();
  });

  it('both grids see each other after a sequence of edits', async () => {
    const a = makeGrid('doc-bidir');
    const b = makeGrid('doc-bidir');
    await Promise.resolve();
    await Promise.resolve();

    emitCellChange(a, '1', 'name', 'A1');
    emitCellChange(b, '2', 'salary', 95000);
    emitCellChange(a, '3', 'status', 'pending');

    expect(readCell(b, '1', 'name')).toBe('A1');
    expect(readCell(a, '2', 'salary')).toBe(95000);
    expect(readCell(b, '3', 'status')).toBe('pending');

    a.destroy();
    b.destroy();
  });

  it('concurrent edits on the same cell converge to a single value (Yjs decides which)', async () => {
    const a = makeGrid('doc-concurrent');
    const b = makeGrid('doc-concurrent');
    await Promise.resolve();
    await Promise.resolve();

    // Two grids edit the same cell at "the same time" — InMemoryCrdtTransport
    // is synchronous so we can't truly simulate latency, but the property
    // we want is "deterministic and equal at the end", not "what the latency
    // happened to be." Edit both, then assert convergence.
    emitCellChange(a, '1', 'name', 'A-version');
    emitCellChange(b, '1', 'name', 'B-version');

    // After both updates propagate, both grids agree on a single value.
    // The winner is determined by Yjs's algorithm (later client/clock wins
    // deterministically); we just assert they MATCH each other.
    const valueA = readCell(a, '1', 'name');
    const valueB = readCell(b, '1', 'name');
    expect(valueA).toBe(valueB);
    // And the value must be one of the two attempted writes (not undefined,
    // not corrupted).
    expect(['A-version', 'B-version']).toContain(valueA);

    a.destroy();
    b.destroy();
  });

  it('late joiner receives the cumulative state of edits made before they joined', async () => {
    const a = makeGrid('doc-late');
    await Promise.resolve();
    emitCellChange(a, '1', 'name', 'before-late');
    emitCellChange(a, '2', 'salary', 99999);

    const b = makeGrid('doc-late');
    await Promise.resolve();
    await Promise.resolve();

    expect(readCell(b, '1', 'name')).toBe('before-late');
    expect(readCell(b, '2', 'salary')).toBe(99999);

    a.destroy();
    b.destroy();
  });

  it('does NOT re-broadcast cells we ourselves wrote (no loop)', async () => {
    const a = makeGrid('doc-no-loop');
    const b = makeGrid('doc-no-loop');
    await Promise.resolve();
    await Promise.resolve();

    // Count remote-change events on A. A's own edit should NOT count.
    let remoteOnA = 0;
    a.eventBus.on('yjsCells:remoteChange' as never, (() => { remoteOnA++; }) as never);
    emitCellChange(a, '1', 'name', 'A wrote this');
    // A should not see its own edit reflected as a remoteChange.
    expect(remoteOnA).toBe(0);

    // But B should see it.
    let remoteOnB = 0;
    b.eventBus.on('yjsCells:remoteChange' as never, (() => { remoteOnB++; }) as never);
    emitCellChange(a, '2', 'salary', 12345);
    expect(remoteOnB).toBe(1);

    a.destroy();
    b.destroy();
  });
});

describe('YjsCellsPlugin — column filtering', () => {
  it('respects syncedColumns and ignores unsynced columns', async () => {
    const a = createGrid<Row>({
      columns: [
        { field: 'id' },
        { field: 'name', editable: true },
        { field: 'salary', editable: true },
        { field: 'status', editable: true },
      ],
      rowData: FIXTURE.map((r) => ({ ...r })),
      getRowId: ({ data }) => data.id,
      plugins: [
        YjsCellsPlugin({
          docId: 'doc-cols',
          syncedColumns: ['name'],
          transport: new InMemoryCrdtTransport({ docId: 'doc-cols' }),
        }),
      ],
    });
    const b = createGrid<Row>({
      columns: [
        { field: 'id' },
        { field: 'name', editable: true },
        { field: 'salary', editable: true },
      ],
      rowData: FIXTURE.map((r) => ({ ...r })),
      getRowId: ({ data }) => data.id,
      plugins: [
        YjsCellsPlugin({
          docId: 'doc-cols',
          syncedColumns: ['name'],
          transport: new InMemoryCrdtTransport({ docId: 'doc-cols' }),
        }),
      ],
    });
    await Promise.resolve();
    await Promise.resolve();

    // Synced column propagates.
    emitCellChange(a, '1', 'name', 'synced');
    expect(readCell(b, '1', 'name')).toBe('synced');

    // Unsynced column does NOT propagate.
    emitCellChange(a, '2', 'salary', 12345);
    expect(readCell(b, '2', 'salary')).toBe(90000); // unchanged from fixture

    a.destroy();
    b.destroy();
  });
});
