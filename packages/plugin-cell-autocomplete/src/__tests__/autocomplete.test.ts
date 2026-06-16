// © 2025 GridStorm / Tekivex — All Rights Reserved
// Tests for cell autocomplete. Uses EchoAdapter with respond functions so
// the LLM call is deterministic. Verifies the full lifecycle: trigger ->
// suggest -> accept / dismiss, and the auto-trigger wiring to editing
// events.

import { describe, expect, it, vi } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { EchoAdapter, type AIAdapter, type AIMessage } from '@gridstorm/ai-adapter';
import {
  CellAutocompletePlugin,
  type AutocompleteSuggestion,
  type CellAutocompleteState,
} from '../index';

interface Row { id: string; firstName: string; lastName: string; email: string; }

const ROWS: Row[] = [
  { id: '1', firstName: 'Alice', lastName: 'Smith', email: 'alice@example.com' },
  { id: '2', firstName: 'Bob', lastName: 'Jones', email: '' },
];

const COLUMNS = {
  id: 'row id',
  firstName: 'employee first name',
  lastName: 'employee last name',
  email: 'work email address',
};

function makeGrid(
  respond: string | ((messages: AIMessage[]) => string),
  extra: Partial<Parameters<typeof CellAutocompletePlugin>[0]> = {},
) {
  const adapter: AIAdapter = new EchoAdapter({ respond });
  const engine = createGrid<Row>({
    columns: [
      { field: 'id' },
      { field: 'firstName', editable: true },
      { field: 'lastName', editable: true },
      { field: 'email', editable: true },
    ],
    rowData: ROWS.map((r) => ({ ...r })),
    getRowId: ({ data }) => data.id,
    plugins: [
      CellAutocompletePlugin({
        adapter,
        columns: COLUMNS,
        debounceMs: 1, // tight for tests
        ...extra,
      }),
    ],
  });
  return engine;
}

function getState(engine: ReturnType<typeof makeGrid>): CellAutocompleteState {
  return engine.store.getState().pluginState?.['cellAutocomplete'] as CellAutocompleteState;
}

function waitTick(ms = 20): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

describe('CellAutocompletePlugin — request lifecycle', () => {
  it('produces a suggestion when autocomplete:request is dispatched', async () => {
    const engine = makeGrid('jones@example.com');
    const onSuggested = vi.fn();
    engine.eventBus.on('autocomplete:suggested' as never, onSuggested);

    engine.commandBus.dispatch('autocomplete:request' as never, {
      rowId: '2',
      colId: 'email',
    } as never);
    await waitTick();

    expect(onSuggested).toHaveBeenCalledOnce();
    const payload = onSuggested.mock.calls[0]![0] as { suggestion: AutocompleteSuggestion };
    expect(payload.suggestion.colId).toBe('email');
    expect(payload.suggestion.rowId).toBe('2');
    expect(payload.suggestion.text).toBe('jones@example.com');
    expect(getState(engine).current?.text).toBe('jones@example.com');
    expect(getState(engine).requestCount).toBe(1);
    engine.destroy();
  });

  it('accepts a suggestion and writes the value into the row', async () => {
    const engine = makeGrid('Smith');
    engine.commandBus.dispatch('autocomplete:request' as never, {
      rowId: '1',
      colId: 'lastName',
    } as never);
    await waitTick();

    const onAccepted = vi.fn();
    engine.eventBus.on('autocomplete:accepted' as never, onAccepted);
    engine.commandBus.dispatch('autocomplete:accept' as never, {} as never);

    expect(onAccepted).toHaveBeenCalledOnce();
    const node = engine.api.getRowNode?.('1');
    expect((node?.data as Row).lastName).toBe('Smith');
    expect(getState(engine).current).toBeNull();
    expect(getState(engine).acceptCount).toBe(1);
    engine.destroy();
  });

  it('dismisses a suggestion without applying it', async () => {
    const engine = makeGrid('this should not stick');
    engine.commandBus.dispatch('autocomplete:request' as never, {
      rowId: '1',
      colId: 'firstName',
    } as never);
    await waitTick();
    expect(getState(engine).current).not.toBeNull();

    const onDismissed = vi.fn();
    engine.eventBus.on('autocomplete:dismissed' as never, onDismissed);
    engine.commandBus.dispatch('autocomplete:dismiss' as never, {} as never);

    expect(onDismissed).toHaveBeenCalledOnce();
    const node = engine.api.getRowNode?.('1');
    expect((node?.data as Row).firstName).toBe('Alice'); // unchanged
    expect(getState(engine).current).toBeNull();
    engine.destroy();
  });
});

describe('CellAutocompletePlugin — auto-trigger on edit', () => {
  it('auto-fetches when cell:editingStarted fires', async () => {
    const engine = makeGrid('Bob Jr');
    const onSuggested = vi.fn();
    engine.eventBus.on('autocomplete:suggested' as never, onSuggested);
    engine.eventBus.emit('cell:editingStarted' as never, {
      node: { id: '2' },
      colId: 'firstName',
    } as never);
    await waitTick();
    expect(onSuggested).toHaveBeenCalledOnce();
    engine.destroy();
  });

  it('does NOT auto-fetch when autoTrigger=false', async () => {
    const engine = makeGrid('xxx', { autoTrigger: false });
    const onSuggested = vi.fn();
    engine.eventBus.on('autocomplete:suggested' as never, onSuggested);
    engine.eventBus.emit('cell:editingStarted' as never, {
      node: { id: '2' },
      colId: 'firstName',
    } as never);
    await waitTick();
    expect(onSuggested).not.toHaveBeenCalled();
    engine.destroy();
  });

  it('skips excluded columns', async () => {
    const engine = makeGrid('xxx', { excludeColumns: ['email'] });
    const onSuggested = vi.fn();
    engine.eventBus.on('autocomplete:suggested' as never, onSuggested);
    engine.eventBus.emit('cell:editingStarted' as never, {
      node: { id: '1' },
      colId: 'email',
    } as never);
    await waitTick();
    expect(onSuggested).not.toHaveBeenCalled();
    engine.destroy();
  });
});

describe('CellAutocompletePlugin — debouncing', () => {
  it('cancels a pending request when a new one arrives', async () => {
    let callCount = 0;
    const adapter: AIAdapter = {
      name: 'counter',
      complete: vi.fn(async () => {
        callCount++;
        return { text: 'result', finishReason: 'stop' as const, usage: undefined };
      }),
      completeStructured: vi.fn() as any,
    };
    const engine = createGrid<Row>({
      columns: [{ field: 'id' }, { field: 'firstName', editable: true }],
      rowData: ROWS.map((r) => ({ ...r })),
      getRowId: ({ data }) => data.id,
      plugins: [
        CellAutocompletePlugin({
          adapter,
          columns: COLUMNS,
          debounceMs: 50,
        }),
      ],
    });
    engine.commandBus.dispatch('autocomplete:request' as never, {
      rowId: '1',
      colId: 'firstName',
    } as never);
    engine.commandBus.dispatch('autocomplete:request' as never, {
      rowId: '2',
      colId: 'firstName',
    } as never);
    engine.commandBus.dispatch('autocomplete:request' as never, {
      rowId: '1',
      colId: 'firstName',
    } as never);
    await waitTick(120);
    // Three rapid dispatches collapse into one actual adapter.complete call
    // because each new request cancels the prior debounce timer.
    expect(callCount).toBe(1);
    engine.destroy();
  });
});

describe('CellAutocompletePlugin — errors', () => {
  it('emits autocomplete:error when the adapter throws', async () => {
    const adapter: AIAdapter = {
      name: 'broken',
      complete: vi.fn(async () => {
        throw new Error('llm down');
      }),
      completeStructured: vi.fn() as any,
    };
    const engine = createGrid<Row>({
      columns: [{ field: 'id' }, { field: 'firstName', editable: true }],
      rowData: ROWS.map((r) => ({ ...r })),
      getRowId: ({ data }) => data.id,
      plugins: [
        CellAutocompletePlugin({ adapter, columns: COLUMNS, debounceMs: 1 }),
      ],
    });
    const onError = vi.fn();
    engine.eventBus.on('autocomplete:error' as never, onError);
    engine.commandBus.dispatch('autocomplete:request' as never, {
      rowId: '1',
      colId: 'firstName',
    } as never);
    await waitTick();
    expect(onError).toHaveBeenCalledOnce();
    expect(getState(engine).lastError?.message).toBe('llm down');
    engine.destroy();
  });
});
