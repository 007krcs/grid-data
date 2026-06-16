// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// ─── Cross-plugin wiring integration test ──────────────────────────────────
//
// Builds two grids with the full Pillar 1 + 2 stack:
//   • plugin-presence — who is here?
//   • plugin-yjs-cells — CRDT cell editing
//   • plugin-comments — CRDT comments
//   • plugin-ai-query — LLM NL → grid ops
//   • plugin-cell-autocomplete — LLM cell suggestions
//
// Then exercises a "session" — user A and user B collaborating — and asserts
// that every plugin's events fire and every state slice converges. This is
// the "proper wiring" test the user asked for. Lives in the comments package
// because comments has dev-time deps on yjs-cells already; adding the rest
// here doesn't change publish boundaries.

import { describe, expect, it, beforeEach, vi } from 'vitest';
import { createGrid, type GridEngine } from '@gridstorm/core';
import {
  EchoAdapter,
  type AIAdapter,
  type AIMessage,
} from '@gridstorm/ai-adapter';
import {
  InMemoryPresenceAdapter,
  PresencePlugin,
  _resetInMemoryPresenceSessions,
  type PresenceState,
} from '@gridstorm/plugin-presence';
import {
  InMemoryCrdtTransport,
  YjsCellsPlugin,
  _resetInMemoryCrdtSessions,
} from '@gridstorm/plugin-yjs-cells';
import { AiQueryPlugin, type AiQueryAction, type AiQueryState } from '@gridstorm/plugin-ai-query';
import { CellAutocompletePlugin, type AutocompleteSuggestion } from '@gridstorm/plugin-cell-autocomplete';
import { cellAnchor, CommentsPlugin, type CommentsState } from '../index';

interface Row {
  id: string;
  name: string;
  salary: number;
  status: string;
}

const ROWS: Row[] = [
  { id: '1', name: 'Alice', salary: 100, status: 'active' },
  { id: '2', name: 'Bob', salary: 80, status: 'inactive' },
];

const COLUMNS = {
  id: 'row identifier',
  name: 'full name',
  salary: 'annual salary in USD thousands',
  status: 'employment status',
};

/** Build a fully-wired grid for a single user. */
function makeFullyWiredGrid(opts: {
  userId: string;
  displayName: string;
  presenceSessionId: string;
  cellsDocId: string;
  commentsDocId: string;
  aiAction: AiQueryAction;
  autocompleteText: string;
}): GridEngine<Row> {
  // Custom AI adapter that returns canned structured + plain-text results,
  // depending on which path the plugin takes. completeStructured returns the
  // pre-baked action; complete returns the autocomplete text.
  const baseEcho = new EchoAdapter({ respond: opts.autocompleteText });
  const adapter: AIAdapter = {
    name: 'fixture',
    complete: baseEcho.complete.bind(baseEcho),
    completeStructured: vi.fn(async (_messages: AIMessage[], options: any) => ({
      data: options.validate ? options.validate(opts.aiAction) : (opts.aiAction as any),
      finishReason: 'stop' as const,
      usage: undefined,
    })),
  };

  return createGrid<Row>({
    columns: [
      { field: 'id' },
      { field: 'name', sortable: true, editable: true },
      { field: 'salary', sortable: true, editable: true },
      { field: 'status', filterable: true },
    ],
    rowData: ROWS.map((r) => ({ ...r })),
    getRowId: ({ data }) => data.id,
    plugins: [
      PresencePlugin({
        userId: opts.userId,
        displayName: opts.displayName,
        adapter: new InMemoryPresenceAdapter({ sessionId: opts.presenceSessionId }),
        broadcastSelection: true,
        broadcastViewport: false,
        throttleMs: 5,
      }),
      YjsCellsPlugin({
        docId: opts.cellsDocId,
        transport: new InMemoryCrdtTransport({ docId: opts.cellsDocId }),
      }),
      CommentsPlugin({
        docId: opts.commentsDocId,
        author: { userId: opts.userId, displayName: opts.displayName },
        transport: new InMemoryCrdtTransport({ docId: opts.commentsDocId }),
      }),
      AiQueryPlugin({
        adapter,
        columns: COLUMNS,
        autoApply: true,
      }),
      CellAutocompletePlugin({
        adapter,
        columns: COLUMNS,
        debounceMs: 1,
      }),
    ],
  });
}

beforeEach(() => {
  _resetInMemoryPresenceSessions();
  _resetInMemoryCrdtSessions();
});

describe('Integration — five plugins in two grids', () => {
  it('A and B exchange presence; A drives an AI query; A edits a cell; A leaves a comment; B sees everything', async () => {
    const a = makeFullyWiredGrid({
      userId: 'alice',
      displayName: 'Alice',
      presenceSessionId: 'integration',
      cellsDocId: 'integration-cells',
      commentsDocId: 'integration-comments',
      aiAction: {
        type: 'sort',
        sortModel: [{ colId: 'salary', direction: 'desc' }],
      },
      autocompleteText: 'Alice Suggested',
    });
    const b = makeFullyWiredGrid({
      userId: 'bob',
      displayName: 'Bob',
      presenceSessionId: 'integration',
      cellsDocId: 'integration-cells',
      commentsDocId: 'integration-comments',
      aiAction: {
        type: 'quickFilter',
        text: 'active',
      },
      autocompleteText: 'Bob Suggested',
    });

    // Let presence + CRDT connect.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    // ── Presence: A and B see each other ────────────────────────────────
    const aPresence = a.store.getState().pluginState?.['presence'] as PresenceState;
    const bPresence = b.store.getState().pluginState?.['presence'] as PresenceState;
    expect(aPresence.peers.has('bob')).toBe(true);
    expect(bPresence.peers.has('alice')).toBe(true);

    // ── AI query on A: sort by salary desc, auto-applied ───────────────
    const onResolved = vi.fn();
    a.eventBus.on('aiQuery:resolved' as never, onResolved);
    await a.commandBus.dispatchAsync('aiQuery:ask' as never, {
      text: 'sort by salary descending',
    } as never);
    expect(onResolved).toHaveBeenCalledOnce();
    expect(a.store.getState().sortModel).toEqual([{ colId: 'salary', sort: 'desc' }]);
    const aQueryState = a.store.getState().pluginState?.['aiQuery'] as AiQueryState;
    expect(aQueryState.history).toHaveLength(1);

    // ── Cell edit on A → propagates to B via CRDT ──────────────────────
    const onRemoteB = vi.fn();
    b.eventBus.on('yjsCells:remoteChange' as never, onRemoteB);
    const aliceNode = a.api.getRowNode?.('1');
    if (aliceNode) {
      (aliceNode.data as Row).name = 'Alice Updated';
      aliceNode.version = (aliceNode.version ?? 0) + 1;
      a.eventBus.emit('cell:valueChanged' as never, {
        node: aliceNode,
        colId: 'name',
        oldValue: 'Alice',
        newValue: 'Alice Updated',
        cancelled: false,
      } as never);
    }
    // B sees the remote change applied to its own row data.
    expect(onRemoteB).toHaveBeenCalled();
    const bAliceNode = b.api.getRowNode?.('1');
    expect((bAliceNode?.data as Row).name).toBe('Alice Updated');

    // ── A leaves a comment on the cell; B sees it via comments CRDT ────
    const onCommentAddedB = vi.fn();
    b.eventBus.on('comments:added' as never, onCommentAddedB);
    a.commandBus.dispatch('comments:add' as never, {
      anchor: cellAnchor('1', 'name'),
      body: 'updated the name',
    } as never);
    expect(onCommentAddedB).toHaveBeenCalledOnce();
    const bComments = b.store.getState().pluginState?.['comments'] as CommentsState;
    const bList = bComments.byAnchor.get(cellAnchor('1', 'name'))!;
    expect(bList).toHaveLength(1);
    expect(bList[0]!.body).toBe('updated the name');
    expect(bList[0]!.author.displayName).toBe('Alice'); // signed by A

    // ── Autocomplete on B: trigger via editing event ────────────────────
    const onSuggested = vi.fn();
    b.eventBus.on('autocomplete:suggested' as never, onSuggested);
    b.eventBus.emit('cell:editingStarted' as never, {
      node: { id: '2' },
      colId: 'name',
    } as never);
    // Debounce window in this test is 1ms; give a few ticks for the
    // adapter promise to resolve.
    await new Promise((r) => setTimeout(r, 20));
    expect(onSuggested).toHaveBeenCalledOnce();
    const suggestion = (onSuggested.mock.calls[0]![0] as { suggestion: AutocompleteSuggestion }).suggestion;
    expect(suggestion.text).toBe('Bob Suggested');

    // ── Pillar 1.2 wiring: A's selection change broadcasts to B via presence
    // Emit on A and let presence throttle (5ms in test) settle.
    a.eventBus.emit('cell:focused' as never, { rowId: '1', colId: 'name' } as never);
    await new Promise((r) => setTimeout(r, 15));
    const bSeesAlice = (b.store.getState().pluginState?.['presence'] as PresenceState).peers.get('alice');
    expect(bSeesAlice?.focusedCell).toEqual({ rowId: '1', colId: 'name' });

    a.destroy();
    b.destroy();
  });
});
