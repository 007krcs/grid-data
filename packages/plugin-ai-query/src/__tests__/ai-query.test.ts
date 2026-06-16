// © 2025 GridStorm / Tekivex — All Rights Reserved
// Tests for plugin-ai-query. Uses EchoAdapter with a custom respond function
// so the LLM call is deterministic without any network or API key.

import { describe, expect, it, vi } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { EchoAdapter, type AIAdapter, type AIMessage } from '@gridstorm/ai-adapter';
import { AiQueryPlugin, validateAiQueryAction, type AiQueryAction, type AiQueryResolved, type AiQueryState } from '../index';

interface Row { id: string; name: string; salary: number; status: string; }

const ROWS: Row[] = [
  { id: '1', name: 'Alice', salary: 100, status: 'active' },
  { id: '2', name: 'Bob', salary: 80, status: 'inactive' },
];

const COLUMNS = {
  id: 'row identifier',
  name: 'employee full name',
  salary: 'annual salary',
  status: 'active or inactive',
};

/**
 * Build an EchoAdapter that returns a canned structured action regardless of
 * the prompt. completeStructured is overridden because the base Echo synthesizer
 * just walks the schema and emits zeros — we want specific responses per test.
 */
function fakeAdapter(action: AiQueryAction): AIAdapter {
  const base = new EchoAdapter();
  return {
    ...base,
    name: 'fake',
    complete: base.complete.bind(base),
    completeStructured: vi.fn(async (_messages: AIMessage[], options: any) => ({
      data: options.validate ? options.validate(action) : (action as any),
      usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
      finishReason: 'stop' as const,
    })),
  };
}

function makeGrid(adapter: AIAdapter, autoApply = true) {
  return createGrid<Row>({
    columns: [{ field: 'id' }, { field: 'name', sortable: true }, { field: 'salary', sortable: true, filterable: true }, { field: 'status', filterable: true }],
    rowData: ROWS.map((r) => ({ ...r })),
    getRowId: ({ data }) => data.id,
    plugins: [AiQueryPlugin({ adapter, columns: COLUMNS, autoApply })],
  });
}

function getState(engine: ReturnType<typeof makeGrid>): AiQueryState {
  return engine.store.getState().pluginState?.['aiQuery'] as AiQueryState;
}

describe('AiQueryPlugin — sort', () => {
  it('translates an NL query into a sort and auto-applies it', async () => {
    const adapter = fakeAdapter({
      type: 'sort',
      sortModel: [{ colId: 'salary', direction: 'desc' }],
    });
    const engine = makeGrid(adapter);

    const onResolved = vi.fn();
    engine.eventBus.on('aiQuery:resolved' as never, onResolved);

    await engine.commandBus.dispatchAsync('aiQuery:ask' as never, {
      text: 'sort by salary descending',
    } as never);

    expect(onResolved).toHaveBeenCalledOnce();
    const payload = onResolved.mock.calls[0]![0] as AiQueryResolved;
    expect(payload.action).toEqual({
      type: 'sort',
      sortModel: [{ colId: 'salary', direction: 'desc' }],
    });
    expect(payload.appliedAutomatically).toBe(true);
    expect(engine.store.getState().sortModel).toEqual([{ colId: 'salary', sort: 'desc' }]);
    expect(getState(engine).history).toHaveLength(1);
    engine.destroy();
  });
});

describe('AiQueryPlugin — filter', () => {
  it('translates an NL query into a filterModel and applies it', async () => {
    const adapter = fakeAdapter({
      type: 'filter',
      filterModel: {
        status: { filterType: 'text', operator: 'equals', value: 'active' },
      },
    });
    const engine = makeGrid(adapter);
    await engine.commandBus.dispatchAsync('aiQuery:ask' as never, {
      text: 'rows where status equals active',
    } as never);
    expect(engine.store.getState().filterModel).toEqual({
      status: { filterType: 'text', operator: 'equals', value: 'active' },
    });
    engine.destroy();
  });
});

describe('AiQueryPlugin — quickFilter and clear', () => {
  it('applies a quickFilter', async () => {
    const adapter = fakeAdapter({ type: 'quickFilter', text: 'Alice' });
    const engine = makeGrid(adapter);
    await engine.commandBus.dispatchAsync('aiQuery:ask' as never, { text: 'find Alice' } as never);
    expect(engine.store.getState().quickFilterText).toBe('Alice');
    engine.destroy();
  });

  it('clear:all wipes both sort and filter', async () => {
    const adapter = fakeAdapter({ type: 'clear', target: 'all' });
    const engine = makeGrid(adapter);
    // Pre-populate state.
    engine.api.setSortModel?.([{ colId: 'name', sort: 'asc' }]);
    engine.api.setQuickFilter?.('xxx');
    await engine.commandBus.dispatchAsync('aiQuery:ask' as never, { text: 'reset everything' } as never);
    expect(engine.store.getState().sortModel).toEqual([]);
    expect(engine.store.getState().quickFilterText).toBe('');
    engine.destroy();
  });
});

describe('AiQueryPlugin — autoApply=false', () => {
  it('emits resolved without mutating the grid', async () => {
    const adapter = fakeAdapter({
      type: 'sort',
      sortModel: [{ colId: 'salary', direction: 'desc' }],
    });
    const engine = makeGrid(adapter, false);
    const onResolved = vi.fn();
    engine.eventBus.on('aiQuery:resolved' as never, onResolved);
    await engine.commandBus.dispatchAsync('aiQuery:ask' as never, { text: 'sort' } as never);
    expect(onResolved).toHaveBeenCalled();
    expect(engine.store.getState().sortModel).toEqual([]); // not applied
    expect((onResolved.mock.calls[0]![0] as AiQueryResolved).appliedAutomatically).toBe(false);

    // Manual apply later.
    engine.commandBus.dispatch('aiQuery:apply' as never, {
      action: { type: 'sort', sortModel: [{ colId: 'salary', direction: 'desc' }] },
    } as never);
    expect(engine.store.getState().sortModel).toEqual([{ colId: 'salary', sort: 'desc' }]);
    engine.destroy();
  });
});

describe('AiQueryPlugin — errors', () => {
  it('emits aiQuery:error when the adapter rejects', async () => {
    const adapter: AIAdapter = {
      name: 'broken',
      complete: vi.fn(),
      completeStructured: vi.fn(async () => {
        throw new Error('api down');
      }),
    };
    const engine = makeGrid(adapter);
    const onError = vi.fn();
    engine.eventBus.on('aiQuery:error' as never, onError);
    await engine.commandBus.dispatchAsync('aiQuery:ask' as never, { text: 'sort by salary' } as never);
    expect(onError).toHaveBeenCalledOnce();
    expect(getState(engine).lastError?.message).toBe('api down');
    expect(getState(engine).busy).toBe(false);
    engine.destroy();
  });

  it('ignores empty queries', async () => {
    const adapter = fakeAdapter({ type: 'quickFilter', text: 'x' });
    const engine = makeGrid(adapter);
    await engine.commandBus.dispatchAsync('aiQuery:ask' as never, { text: '   ' } as never);
    expect(adapter.completeStructured).not.toHaveBeenCalled();
    engine.destroy();
  });
});

describe('validateAiQueryAction', () => {
  it('round-trips a valid sort action', () => {
    const action: AiQueryAction = { type: 'sort', sortModel: [{ colId: 'a', direction: 'asc' }] };
    expect(validateAiQueryAction(action)).toEqual(action);
  });
  it('throws for unknown type', () => {
    expect(() => validateAiQueryAction({ type: 'pivot' })).toThrow();
  });
  it('throws for bad sort direction', () => {
    expect(() => validateAiQueryAction({ type: 'sort', sortModel: [{ colId: 'a', direction: 'sideways' }] })).toThrow();
  });
});
