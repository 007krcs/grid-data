// © 2025 GridStorm / Tekivex — All Rights Reserved
// Comments plugin tests — CRDT convergence across two grids, anchored to
// cells and rows, with add / edit / resolve / delete operations.

import { describe, expect, it, beforeEach, vi } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { InMemoryCrdtTransport, _resetInMemoryCrdtSessions } from '@gridstorm/plugin-yjs-cells';
import {
  cellAnchor,
  CommentsPlugin,
  rowAnchor,
  type Comment,
  type CommentsState,
} from '../index';

interface Row { id: string; name: string; }
const ROWS: Row[] = [{ id: '1', name: 'A' }, { id: '2', name: 'B' }];

function makeGrid(docId: string, displayName: string) {
  return createGrid<Row>({
    columns: [{ field: 'id' }, { field: 'name' }],
    rowData: ROWS.map((r) => ({ ...r })),
    getRowId: ({ data }) => data.id,
    plugins: [
      CommentsPlugin({
        docId,
        author: { userId: displayName.toLowerCase(), displayName },
        transport: new InMemoryCrdtTransport({ docId }),
      }),
    ],
  });
}

function getState(engine: ReturnType<typeof makeGrid>): CommentsState {
  return engine.store.getState().pluginState?.['comments'] as CommentsState;
}

beforeEach(() => {
  _resetInMemoryCrdtSessions();
});

describe('CommentsPlugin — local add/edit/delete', () => {
  it('adds a comment under the requested anchor', () => {
    const engine = makeGrid('doc-add', 'Alice');
    engine.commandBus.dispatch('comments:add' as never, {
      anchor: cellAnchor('1', 'name'),
      body: 'looks good',
    } as never);
    const state = getState(engine);
    expect(state.total).toBe(1);
    const list = state.byAnchor.get(cellAnchor('1', 'name'))!;
    expect(list).toHaveLength(1);
    expect(list[0]!.body).toBe('looks good');
    expect(list[0]!.author.displayName).toBe('Alice');
    engine.destroy();
  });

  it('edits a comment body and stamps editedAt', () => {
    const engine = makeGrid('doc-edit', 'Alice');
    engine.commandBus.dispatch('comments:add' as never, {
      anchor: rowAnchor('1'),
      body: 'draft',
    } as never);
    const before = getState(engine).byAnchor.get('1')![0]!;
    engine.commandBus.dispatch('comments:edit' as never, {
      anchor: '1',
      commentId: before.id,
      body: 'revised',
    } as never);
    const after = getState(engine).byAnchor.get('1')![0]!;
    expect(after.body).toBe('revised');
    expect(after.editedAt).toBeGreaterThanOrEqual(after.createdAt);
    engine.destroy();
  });

  it('marks a comment resolved without deleting it', () => {
    const engine = makeGrid('doc-resolve', 'Alice');
    engine.commandBus.dispatch('comments:add' as never, {
      anchor: '1',
      body: 'fix me',
    } as never);
    const id = getState(engine).byAnchor.get('1')![0]!.id;
    engine.commandBus.dispatch('comments:setResolved' as never, {
      anchor: '1',
      commentId: id,
      resolved: true,
    } as never);
    expect(getState(engine).byAnchor.get('1')![0]!.resolved).toBe(true);
    engine.destroy();
  });

  it('deletes a single comment from a thread', () => {
    const engine = makeGrid('doc-delete', 'Alice');
    engine.commandBus.dispatch('comments:add' as never, { anchor: '1', body: 'one' } as never);
    engine.commandBus.dispatch('comments:add' as never, { anchor: '1', body: 'two' } as never);
    const list = getState(engine).byAnchor.get('1')!;
    expect(list).toHaveLength(2);
    engine.commandBus.dispatch('comments:delete' as never, {
      anchor: '1',
      commentId: list[0]!.id,
    } as never);
    const after = getState(engine).byAnchor.get('1')!;
    expect(after).toHaveLength(1);
    expect(after[0]!.body).toBe('two');
    engine.destroy();
  });

  it('clears every comment on an anchor', () => {
    const engine = makeGrid('doc-clear', 'Alice');
    engine.commandBus.dispatch('comments:add' as never, { anchor: '1', body: 'a' } as never);
    engine.commandBus.dispatch('comments:add' as never, { anchor: '1', body: 'b' } as never);
    engine.commandBus.dispatch('comments:clearAnchor' as never, { anchor: '1' } as never);
    expect(getState(engine).byAnchor.has('1')).toBe(false);
    engine.destroy();
  });
});

describe('CommentsPlugin — two-grid CRDT convergence', () => {
  it('comment added on grid A appears on grid B', async () => {
    const a = makeGrid('doc-conv', 'Alice');
    const b = makeGrid('doc-conv', 'Bob');
    await Promise.resolve();
    await Promise.resolve();

    const onAdded = vi.fn();
    b.eventBus.on('comments:added' as never, onAdded);

    a.commandBus.dispatch('comments:add' as never, {
      anchor: cellAnchor('1', 'name'),
      body: 'A wrote this',
    } as never);

    expect(onAdded).toHaveBeenCalledOnce();
    const bState = getState(b);
    expect(bState.total).toBe(1);
    const bList = bState.byAnchor.get(cellAnchor('1', 'name'))!;
    expect(bList[0]!.body).toBe('A wrote this');
    expect(bList[0]!.author.displayName).toBe('Alice');
    a.destroy();
    b.destroy();
  });

  it('concurrent adds on the same anchor preserve both comments', async () => {
    const a = makeGrid('doc-concurrent-adds', 'Alice');
    const b = makeGrid('doc-concurrent-adds', 'Bob');
    await Promise.resolve();
    await Promise.resolve();

    a.commandBus.dispatch('comments:add' as never, {
      anchor: '1',
      body: 'A says hi',
    } as never);
    b.commandBus.dispatch('comments:add' as never, {
      anchor: '1',
      body: 'B says hi',
    } as never);

    const aList = getState(a).byAnchor.get('1')!;
    const bList = getState(b).byAnchor.get('1')!;
    expect(aList).toHaveLength(2);
    expect(bList).toHaveLength(2);
    // Both grids see both bodies (sort order by createdAt).
    const bodiesA = aList.map((c) => c.body).sort();
    const bodiesB = bList.map((c) => c.body).sort();
    expect(bodiesA).toEqual(['A says hi', 'B says hi']);
    expect(bodiesA).toEqual(bodiesB);
    a.destroy();
    b.destroy();
  });

  it('an edit on A propagates to B', async () => {
    const a = makeGrid('doc-edit-prop', 'Alice');
    const b = makeGrid('doc-edit-prop', 'Bob');
    await Promise.resolve();
    await Promise.resolve();

    a.commandBus.dispatch('comments:add' as never, { anchor: '1', body: 'draft' } as never);
    const id = getState(a).byAnchor.get('1')![0]!.id;
    a.commandBus.dispatch('comments:edit' as never, {
      anchor: '1',
      commentId: id,
      body: 'revised',
    } as never);
    expect(getState(b).byAnchor.get('1')![0]!.body).toBe('revised');
    a.destroy();
    b.destroy();
  });

  it('a delete on A propagates to B', async () => {
    const a = makeGrid('doc-del-prop', 'Alice');
    const b = makeGrid('doc-del-prop', 'Bob');
    await Promise.resolve();
    await Promise.resolve();

    a.commandBus.dispatch('comments:add' as never, { anchor: '1', body: 'one' } as never);
    a.commandBus.dispatch('comments:add' as never, { anchor: '1', body: 'two' } as never);
    const id = getState(a).byAnchor.get('1')![0]!.id;
    a.commandBus.dispatch('comments:delete' as never, { anchor: '1', commentId: id } as never);
    expect(getState(b).byAnchor.get('1')!).toHaveLength(1);
    expect(getState(b).byAnchor.get('1')![0]!.body).toBe('two');
    a.destroy();
    b.destroy();
  });
});

describe('CommentsPlugin — anchor helpers', () => {
  it('cellAnchor includes row + col', () => {
    expect(cellAnchor('r1', 'c1')).toBe('r1:c1');
  });
  it('rowAnchor is just the rowId', () => {
    expect(rowAnchor('r1')).toBe('r1');
  });
});

describe('CommentsPlugin — local-only', () => {
  it('works without a transport (no sync)', () => {
    const engine = createGrid<Row>({
      columns: [{ field: 'id' }],
      rowData: [...ROWS],
      getRowId: ({ data }) => data.id,
      plugins: [
        CommentsPlugin({
          docId: 'local-only',
          author: { userId: 'a', displayName: 'A' },
        }),
      ],
    });
    engine.commandBus.dispatch('comments:add' as never, {
      anchor: '1',
      body: 'note to self',
    } as never);
    expect(getState(engine).total).toBe(1);
    expect(getState(engine).connected).toBe(false);
    engine.destroy();
  });
});
