import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClipboardProPlugin } from '../clipboard-pro-plugin';
import { parseTSVAdvanced, serializeRangeToTSV } from '../range-serializer';
import { coerceValue, coerceGrid } from '../type-coercion';
import type { ClipboardProState } from '../types';

function createMockContext(opts: { selectedRows?: string[]; rangeSelection?: any; focusedCell?: any; columns?: any[]; rowData?: Record<string, any>[] } = {}) {
  const eventHandlers = new Map<string, Set<Function>>();
  const commandHandlers = new Map<string, Function>();
  const pluginState = new Map<string, any>();

  const columns = opts.columns ?? [
    { colId: 'name', field: 'name', headerName: 'Name', editable: true, hide: false, originalDef: { sortable: true } },
    { colId: 'age', field: 'age', headerName: 'Age', editable: true, hide: false, originalDef: { sortable: true } },
    { colId: 'city', field: 'city', headerName: 'City', editable: true, hide: false, originalDef: { sortable: true } },
  ];

  const data = opts.rowData ?? [
    { name: 'Alice', age: 30, city: 'NYC' },
    { name: 'Bob', age: 25, city: 'LA' },
    { name: 'Carol', age: 35, city: 'SF' },
  ];

  const rowNodes = new Map<string, any>();
  const displayedRowIds: string[] = [];
  data.forEach((d, i) => {
    const id = `row-${i}`;
    rowNodes.set(id, { id, data: { ...d }, selected: opts.selectedRows?.includes(id) ?? false, version: 0 });
    displayedRowIds.push(id);
  });

  const selectedRowIds = new Set(opts.selectedRows ?? []);

  const ctx: any = {
    api: { __gsRootEl: document.createElement('div') },
    store: {
      getState: () => ({
        columns,
        rowNodes,
        displayedRowIds,
        selection: {
          selectedRowIds,
          rangeSelections: opts.rangeSelection ? [opts.rangeSelection] : [],
        },
        focusedCell: opts.focusedCell ?? null,
        editing: null,
      }),
      batch: (fn: Function) => fn(),
      subscribe: vi.fn(() => () => {}),
    },
    eventBus: {
      on(event: string, handler: Function) {
        if (!eventHandlers.has(event)) eventHandlers.set(event, new Set());
        eventHandlers.get(event)!.add(handler);
        return () => eventHandlers.get(event)?.delete(handler);
      },
      emit(event: string, payload: any) {
        for (const handler of eventHandlers.get(event) ?? []) handler(payload);
      },
    },
    commandBus: {
      dispatch(command: string, payload: any) {
        return commandHandlers.get(command)?.(payload);
      },
      registerHandler(command: string, handler: Function) {
        commandHandlers.set(command, handler);
        return () => commandHandlers.delete(command);
      },
    },
    registerState<S>(key: string, initial: S) { pluginState.set(key, initial); },
    getState<S>(key: string): S { return pluginState.get(key); },
    setState<S>(key: string, updater: (prev: S) => S) {
      pluginState.set(key, updater(pluginState.get(key)));
    },
    getPlugin: () => undefined,
  };

  return { ctx, eventHandlers, commandHandlers, pluginState, rowNodes, displayedRowIds };
}

describe('ClipboardProPlugin', () => {
  it('creates plugin with correct metadata', () => {
    const plugin = ClipboardProPlugin();
    expect(plugin.id).toBe('clipboard');
    expect(plugin.name).toBe('Clipboard Pro (Excel-Compatible)');
    expect(plugin.dependencies).toEqual(['selection']);
  });

  it('registers state on install', () => {
    const { ctx, pluginState } = createMockContext();
    const plugin = ClipboardProPlugin();
    plugin.install(ctx);

    const state = pluginState.get('clipboard-pro') as ClipboardProState;
    expect(state.lastOperation).toBeNull();
  });

  it('handles paste with type coercion', async () => {
    const { ctx, pluginState, rowNodes } = createMockContext({
      focusedCell: { rowIndex: 0, colId: 'age' },
    });
    const plugin = ClipboardProPlugin();
    plugin.install(ctx);

    await ctx.commandBus.dispatch('clipboard:paste', { text: '42' });

    const node = rowNodes.get('row-0');
    expect(node.data.age).toBe(42);
  });

  it('handles multi-cell paste', async () => {
    const { ctx, rowNodes } = createMockContext({
      focusedCell: { rowIndex: 0, colId: 'name' },
    });
    const plugin = ClipboardProPlugin();
    plugin.install(ctx);

    await ctx.commandBus.dispatch('clipboard:paste', {
      text: 'Dave\t28\tBoston\nEve\t32\tDenver',
    });

    expect(rowNodes.get('row-0').data.name).toBe('Dave');
    expect(rowNodes.get('row-0').data.age).toBe(28);
    expect(rowNodes.get('row-0').data.city).toBe('Boston');
    expect(rowNodes.get('row-1').data.name).toBe('Eve');
    expect(rowNodes.get('row-1').data.age).toBe(32);
  });

  it('handles cut operation', async () => {
    const { ctx, pluginState, rowNodes } = createMockContext({
      rangeSelection: { startRow: 0, endRow: 0, startColId: 'name', endColId: 'age', columns: ['name', 'age'] },
    });
    const plugin = ClipboardProPlugin();
    plugin.install(ctx);

    await ctx.commandBus.dispatch('clipboard:cut', {});

    const state = pluginState.get('clipboard-pro') as ClipboardProState;
    expect(state.lastOperation).toBe('cut');
    expect(rowNodes.get('row-0').data.name).toBeNull();
    expect(rowNodes.get('row-0').data.age).toBeNull();
  });
});

// ── Range Serializer Tests ──

describe('parseTSVAdvanced', () => {
  it('parses simple TSV', () => {
    expect(parseTSVAdvanced('a\tb\nc\td')).toEqual([['a', 'b'], ['c', 'd']]);
  });

  it('handles quoted values with embedded tabs', () => {
    expect(parseTSVAdvanced('"a\tb"\tc')).toEqual([['a\tb', 'c']]);
  });

  it('handles quoted values with embedded newlines', () => {
    expect(parseTSVAdvanced('"line1\nline2"\tb')).toEqual([['line1\nline2', 'b']]);
  });

  it('handles escaped quotes', () => {
    expect(parseTSVAdvanced('"say ""hello"""\tb')).toEqual([['say "hello"', 'b']]);
  });

  it('handles empty cells', () => {
    expect(parseTSVAdvanced('a\t\tc')).toEqual([['a', '', 'c']]);
  });

  it('handles CRLF line endings', () => {
    expect(parseTSVAdvanced('a\tb\r\nc\td')).toEqual([['a', 'b'], ['c', 'd']]);
  });
});

describe('serializeRangeToTSV', () => {
  it('serializes a range', () => {
    const state = {
      columns: [
        { colId: 'name', field: 'name', headerName: 'Name' },
        { colId: 'age', field: 'age', headerName: 'Age' },
      ],
      displayedRowIds: ['r0', 'r1'],
      rowNodes: new Map([
        ['r0', { id: 'r0', data: { name: 'Alice', age: 30 } }],
        ['r1', { id: 'r1', data: { name: 'Bob', age: 25 } }],
      ]),
    };

    const result = serializeRangeToTSV(() => state, { startRow: 0, endRow: 1, startCol: 0, endCol: 1 }, {});
    expect(result).toBe('Alice\t30\nBob\t25');
  });

  it('includes headers when requested', () => {
    const state = {
      columns: [{ colId: 'name', field: 'name', headerName: 'Name' }],
      displayedRowIds: ['r0'],
      rowNodes: new Map([['r0', { id: 'r0', data: { name: 'Alice' } }]]),
    };

    const result = serializeRangeToTSV(() => state, { startRow: 0, endRow: 0, startCol: 0, endCol: 0 }, { includeHeaders: true });
    expect(result).toBe('Name\nAlice');
  });
});

// ── Type Coercion Tests ──

describe('coerceValue', () => {
  it('coerces empty to null', () => {
    expect(coerceValue('')).toBeNull();
  });

  it('coerces booleans', () => {
    expect(coerceValue('true')).toBe(true);
    expect(coerceValue('FALSE')).toBe(false);
  });

  it('coerces integers', () => {
    expect(coerceValue('42')).toBe(42);
    expect(coerceValue('-7')).toBe(-7);
  });

  it('coerces floats', () => {
    expect(coerceValue('3.14')).toBe(3.14);
  });

  it('coerces numbers with commas', () => {
    expect(coerceValue('1,234,567')).toBe(1234567);
  });

  it('coerces percentages', () => {
    expect(coerceValue('45%')).toBeCloseTo(0.45);
    expect(coerceValue('12.5%')).toBeCloseTo(0.125);
  });

  it('coerces currency', () => {
    expect(coerceValue('$1,234.56')).toBe(1234.56);
    expect(coerceValue('€100')).toBe(100);
  });

  it('preserves plain text', () => {
    expect(coerceValue('hello world')).toBe('hello world');
  });

  it('coerces ISO dates', () => {
    const result = coerceValue('2024-03-15');
    expect(typeof result).toBe('string');
    expect((result as string).startsWith('2024-03-15')).toBe(true);
  });

  it('coerces scientific notation', () => {
    expect(coerceValue('1.5e10')).toBe(1.5e10);
  });
});

describe('coerceGrid', () => {
  it('coerces a 2D grid', () => {
    const result = coerceGrid([['42', 'true', 'hello']], true);
    expect(result).toEqual([[42, true, 'hello']]);
  });

  it('passes through when disabled', () => {
    const result = coerceGrid([['42']], false);
    expect(result).toEqual([['42']]);
  });
});
