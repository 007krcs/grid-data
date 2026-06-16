// © 2025 GridStorm / Tekivex — All Rights Reserved
// Tests for the presence plugin. Covers:
//  • Two grids sharing a session see each other via InMemoryPresenceAdapter.
//  • Local-state throttling actually coalesces.
//  • Pillar 1.2 selection / focused-cell broadcast wiring.

import { describe, expect, it, beforeEach, vi } from 'vitest';
import { createGrid } from '@gridstorm/core';
import {
  InMemoryPresenceAdapter,
  PresencePlugin,
  _resetInMemoryPresenceSessions,
  type PresenceState,
  type UserPresence,
} from '../index';

interface Row {
  id: string;
  name: string;
}

const fixture: Row[] = [
  { id: '1', name: 'Alice' },
  { id: '2', name: 'Bob' },
  { id: '3', name: 'Carol' },
];

function makeGrid(userId: string, displayName: string, sessionId: string, extra: Partial<Parameters<typeof PresencePlugin>[0]> = {}) {
  return createGrid<Row>({
    columns: [{ field: 'id' }, { field: 'name' }],
    rowData: fixture,
    getRowId: ({ data }) => data.id,
    plugins: [
      PresencePlugin({
        userId,
        displayName,
        adapter: new InMemoryPresenceAdapter({ sessionId }),
        // Use a much shorter throttle for tests so we don't have to wait long.
        throttleMs: 10,
        ...extra,
      }),
    ],
  });
}

function getPresenceState(engine: ReturnType<typeof makeGrid>): PresenceState {
  return engine.store.getState().pluginState?.['presence'] as PresenceState;
}

beforeEach(() => {
  _resetInMemoryPresenceSessions();
});

describe('PresencePlugin — basic lifecycle', () => {
  it('initializes with the local user populated', () => {
    const engine = makeGrid('alice', 'Alice', 'session-1');
    const state = getPresenceState(engine);
    expect(state.localUser?.userId).toBe('alice');
    expect(state.localUser?.displayName).toBe('Alice');
    expect(state.localUser?.color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(state.peers.size).toBe(0);
    engine.destroy();
  });

  it('assigns a stable color from the userId hash', () => {
    const a1 = makeGrid('alice', 'Alice', 's1');
    const a2 = makeGrid('alice', 'Alice', 's2');
    expect(getPresenceState(a1).localUser?.color).toBe(getPresenceState(a2).localUser?.color);
    a1.destroy();
    a2.destroy();
  });

  it('emits presence:connected after the adapter resolves', async () => {
    const engine = createGrid<Row>({
      columns: [{ field: 'id' }],
      rowData: fixture,
      plugins: [
        PresencePlugin({
          userId: 'alice',
          displayName: 'Alice',
          adapter: new InMemoryPresenceAdapter({ sessionId: 'session-2' }),
          throttleMs: 10,
        }),
      ],
    });
    const onConnected = vi.fn();
    engine.eventBus.on('presence:connected' as never, onConnected);
    // Synchronous InMemoryPresenceAdapter resolves on the next microtask.
    await Promise.resolve();
    await Promise.resolve();
    expect(onConnected).toHaveBeenCalledOnce();
    expect(getPresenceState(engine).connected).toBe(true);
    engine.destroy();
  });
});

describe('PresencePlugin — two-grid session', () => {
  it('grid B sees grid A after both connect to the same session', async () => {
    const a = makeGrid('alice', 'Alice', 'collab');
    await Promise.resolve(); // let A's connect resolve

    const peerJoinedB = vi.fn();
    const b = createGrid<Row>({
      columns: [{ field: 'id' }],
      rowData: fixture,
      plugins: [
        PresencePlugin({
          userId: 'bob',
          displayName: 'Bob',
          adapter: new InMemoryPresenceAdapter({ sessionId: 'collab' }),
          throttleMs: 10,
        }),
      ],
    });
    b.eventBus.on('presence:peer-joined' as never, peerJoinedB);

    // After install, B sees A immediately via the initial snapshot.
    const peersB = getPresenceState(b).peers;
    expect(peersB.size).toBe(1);
    expect(peersB.get('alice')?.displayName).toBe('Alice');

    a.destroy();
    b.destroy();
  });

  it('grid A sees grid B join after A is already connected', async () => {
    const a = makeGrid('alice', 'Alice', 'late-arrival');
    await Promise.resolve();

    const peerJoinedA = vi.fn();
    a.eventBus.on('presence:peer-joined' as never, peerJoinedA);

    const b = makeGrid('bob', 'Bob', 'late-arrival');
    await Promise.resolve();

    expect(peerJoinedA).toHaveBeenCalled();
    const peersA = getPresenceState(a).peers;
    expect(peersA.has('bob')).toBe(true);

    a.destroy();
    b.destroy();
  });

  it('emits presence:peer-left when a peer disconnects', async () => {
    const a = makeGrid('alice', 'Alice', 'leaving');
    const b = makeGrid('bob', 'Bob', 'leaving');
    await Promise.resolve();
    const peerLeftA = vi.fn();
    a.eventBus.on('presence:peer-left' as never, peerLeftA);
    b.destroy();
    expect(peerLeftA).toHaveBeenCalledWith(expect.objectContaining({ peer: expect.objectContaining({ userId: 'bob' }) }));
    a.destroy();
  });
});

describe('PresencePlugin — throttling', () => {
  it('coalesces N rapid update-self dispatches into one broadcast', async () => {
    const adapter = new InMemoryPresenceAdapter({ sessionId: 'throttle-test' });
    const updateLocalSpy = vi.spyOn(adapter, 'updateLocal');
    const engine = createGrid<Row>({
      columns: [{ field: 'id' }],
      rowData: fixture,
      plugins: [
        PresencePlugin({
          userId: 'alice',
          displayName: 'Alice',
          adapter,
          throttleMs: 50,
        }),
      ],
    });
    await Promise.resolve(); // let connect resolve so we don't count that

    updateLocalSpy.mockClear();
    for (let i = 0; i < 10; i++) {
      engine.commandBus.dispatch('presence:update-self' as never, {
        focusedCell: { rowId: String(i), colId: 'name' },
      } as never);
    }
    // Before the throttle window elapses, no broadcasts should have fired.
    expect(updateLocalSpy).not.toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 80));
    // After it elapses, exactly one broadcast with the LAST value.
    expect(updateLocalSpy).toHaveBeenCalledOnce();
    const lastCall = updateLocalSpy.mock.calls[0]![0] as UserPresence;
    expect(lastCall.focusedCell).toEqual({ rowId: '9', colId: 'name' });
    engine.destroy();
  });

  it('immediately broadcasts identity changes (no throttle)', async () => {
    const adapter = new InMemoryPresenceAdapter({ sessionId: 'identity-test' });
    const updateLocalSpy = vi.spyOn(adapter, 'updateLocal');
    const engine = createGrid<Row>({
      columns: [{ field: 'id' }],
      rowData: fixture,
      plugins: [
        PresencePlugin({
          userId: 'alice',
          displayName: 'Alice',
          adapter,
          throttleMs: 1000,
        }),
      ],
    });
    await Promise.resolve();
    updateLocalSpy.mockClear();
    engine.commandBus.dispatch('presence:set-identity' as never, {
      displayName: 'Alice Smith',
    } as never);
    // Synchronous broadcast — no throttle.
    expect(updateLocalSpy).toHaveBeenCalledOnce();
    expect((updateLocalSpy.mock.calls[0]![0] as UserPresence).displayName).toBe('Alice Smith');
    engine.destroy();
  });
});

describe('PresencePlugin — Pillar 1.2 selection / cursor broadcast', () => {
  it('dispatches presence:update-self with focusedCell when selection plugin emits cell:focused', async () => {
    const engine = makeGrid('alice', 'Alice', 'p1.2-focus', { broadcastSelection: true });
    await Promise.resolve();
    engine.eventBus.emit('cell:focused' as never, { rowId: '2', colId: 'name' } as never);
    // Throttle is 10ms in tests.
    await new Promise((r) => setTimeout(r, 30));
    const local = getPresenceState(engine).localUser;
    expect(local?.focusedCell).toEqual({ rowId: '2', colId: 'name' });
    engine.destroy();
  });

  it('dispatches presence:update-self with selection on selection:changed', async () => {
    const engine = makeGrid('alice', 'Alice', 'p1.2-sel', { broadcastSelection: true });
    await Promise.resolve();
    engine.eventBus.emit('selection:changed' as never, {
      selectedRowIds: ['1', '2'],
      selectedColIds: ['name'],
    } as never);
    await new Promise((r) => setTimeout(r, 30));
    const local = getPresenceState(engine).localUser;
    expect(local?.selection).toEqual({ rowIds: ['1', '2'], colIds: ['name'] });
    engine.destroy();
  });

  it('treats an empty selection as null', async () => {
    const engine = makeGrid('alice', 'Alice', 'p1.2-empty', { broadcastSelection: true });
    await Promise.resolve();
    engine.eventBus.emit('selection:changed' as never, {
      selectedRowIds: [],
      selectedColIds: [],
    } as never);
    await new Promise((r) => setTimeout(r, 30));
    expect(getPresenceState(engine).localUser?.selection).toBeNull();
    engine.destroy();
  });

  it('dispatches viewport updates when broadcastViewport is enabled', async () => {
    const engine = makeGrid('alice', 'Alice', 'p1.2-view', { broadcastViewport: true });
    await Promise.resolve();
    engine.eventBus.emit('viewport:changed' as never, { firstRow: 100, lastRow: 130 } as never);
    await new Promise((r) => setTimeout(r, 30));
    expect(getPresenceState(engine).localUser?.viewport).toEqual({ firstRow: 100, lastRow: 130 });
    engine.destroy();
  });

  it('does NOT dispatch viewport when broadcastViewport is off (default)', async () => {
    const engine = makeGrid('alice', 'Alice', 'p1.2-no-view');
    await Promise.resolve();
    engine.eventBus.emit('viewport:changed' as never, { firstRow: 100, lastRow: 130 } as never);
    await new Promise((r) => setTimeout(r, 30));
    expect(getPresenceState(engine).localUser?.viewport).toBeUndefined();
    engine.destroy();
  });
});

describe('PresencePlugin — no-adapter mode', () => {
  it('works as a single-user no-op when adapter is omitted', () => {
    const engine = createGrid<Row>({
      columns: [{ field: 'id' }],
      rowData: fixture,
      plugins: [PresencePlugin({ userId: 'alice', displayName: 'Alice' })],
    });
    const state = getPresenceState(engine);
    expect(state.localUser?.userId).toBe('alice');
    expect(state.connected).toBe(false);
    expect(state.peers.size).toBe(0);
    // Dispatching update-self should not throw even with no adapter.
    expect(() =>
      engine.commandBus.dispatch('presence:update-self' as never, {
        focusedCell: { rowId: '1', colId: 'name' },
      } as never),
    ).not.toThrow();
    engine.destroy();
  });
});
