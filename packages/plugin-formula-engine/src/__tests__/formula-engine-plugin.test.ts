import { describe, it, expect, beforeEach } from 'vitest';
import { FormulaEnginePlugin } from '../formula-engine-plugin';
import { createExtendedFunctions } from '../extended-functions';
import { isValidRangeName, preprocessFormula, createNamedRange } from '../named-ranges';
import { isArrayFormula, unwrapArrayFormula, calculateSpillRange } from '../array-formula';
import { makeError, isFormulaError } from '../error-types';
import type { FormulaEngineState } from '../types';

// ── Helper: create mock context ──
function createMockContext() {
  const eventHandlers = new Map<string, Set<Function>>();
  const commandHandlers = new Map<string, Function>();
  const pluginState = new Map<string, any>();
  const dispatched: Array<{ command: string; payload: any }> = [];

  const ctx: any = {
    api: {},
    store: {
      getState: () => ({
        columns: [
          { colId: 'A', field: 'a', headerName: 'A' },
          { colId: 'B', field: 'b', headerName: 'B' },
        ],
        displayedRowIds: ['r0', 'r1', 'r2'],
      }),
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
        dispatched.push({ command, payload });
        commandHandlers.get(command)?.(payload);
      },
      registerHandler(command: string, handler: Function) {
        commandHandlers.set(command, handler);
        return () => commandHandlers.delete(command);
      },
    },
    registerState<S>(key: string, initial: S) {
      pluginState.set(key, initial);
    },
    getState<S>(key: string): S {
      return pluginState.get(key);
    },
    setState<S>(key: string, updater: (prev: S) => S) {
      const prev = pluginState.get(key);
      pluginState.set(key, updater(prev));
    },
    getPlugin: () => undefined,
  };

  return { ctx, eventHandlers, commandHandlers, pluginState, dispatched };
}

describe('FormulaEnginePlugin', () => {
  let mock: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    mock = createMockContext();
  });

  it('creates plugin with correct metadata', () => {
    const plugin = FormulaEnginePlugin();
    expect(plugin.id).toBe('formula-engine');
    expect(plugin.dependencies).toEqual(['formula']);
  });

  it('registers extended functions on install', () => {
    const plugin = FormulaEnginePlugin();
    plugin.install(mock.ctx);

    const regCall = mock.dispatched.find((d) => d.command === 'formula:registerFunctions');
    expect(regCall).toBeDefined();
    expect(regCall!.payload.functions.length).toBeGreaterThan(25);
  });

  it('initializes named ranges from options', () => {
    const plugin = FormulaEnginePlugin({
      namedRanges: { SALES: 'A1:A10', COSTS: 'B1:B10' },
    });
    plugin.install(mock.ctx);

    const state = mock.pluginState.get('formula-engine') as FormulaEngineState;
    expect(state.namedRanges.size).toBe(2);
    expect(state.namedRanges.get('SALES')?.range).toBe('A1:A10');
  });

  it('handles setNamedRange command', () => {
    const plugin = FormulaEnginePlugin();
    plugin.install(mock.ctx);

    mock.ctx.commandBus.dispatch('formula-engine:setNamedRange', {
      name: 'Revenue',
      range: 'C1:C100',
    });

    const state = mock.pluginState.get('formula-engine') as FormulaEngineState;
    expect(state.namedRanges.get('REVENUE')?.range).toBe('C1:C100');
  });

  it('handles removeNamedRange command', () => {
    const plugin = FormulaEnginePlugin({
      namedRanges: { SALES: 'A1:A10' },
    });
    plugin.install(mock.ctx);

    mock.ctx.commandBus.dispatch('formula-engine:removeNamedRange', {
      name: 'Sales',
    });

    const state = mock.pluginState.get('formula-engine') as FormulaEngineState;
    expect(state.namedRanges.has('SALES')).toBe(false);
  });

  it('rejects invalid named range names', () => {
    const plugin = FormulaEnginePlugin();
    plugin.install(mock.ctx);

    mock.ctx.commandBus.dispatch('formula-engine:setNamedRange', {
      name: 'A1', // Looks like cell ref
      range: 'B1:B10',
    });

    const state = mock.pluginState.get('formula-engine') as FormulaEngineState;
    expect(state.namedRanges.has('A1')).toBe(false);
  });
});

// ── Extended Functions Tests ──

describe('Extended Functions', () => {
  const functions = createExtendedFunctions();
  const findFn = (name: string) => functions.find((f) => f.name === name)!;

  // Conditional
  describe('SUMIF', () => {
    it('sums values matching criteria', () => {
      const sumif = findFn('SUMIF');
      // range = [[10], [20], [30], [40]], criteria = ">15", sumRange = [[1], [2], [3], [4]]
      const result = sumif.evaluate([[[10], [20], [30], [40]], '>15', [[1], [2], [3], [4]]]);
      expect(result).toBe(9); // 2+3+4
    });

    it('sums from same range when no sumRange', () => {
      const sumif = findFn('SUMIF');
      const result = sumif.evaluate([[[10], [20], [30]], '>15']);
      expect(result).toBe(50); // 20+30
    });
  });

  describe('COUNTIF', () => {
    it('counts values matching criteria', () => {
      const countif = findFn('COUNTIF');
      const result = countif.evaluate([[[5], [10], [15], [20]], '>=10']);
      expect(result).toBe(3);
    });

    it('handles text criteria with wildcards', () => {
      const countif = findFn('COUNTIF');
      const result = countif.evaluate([[['apple'], ['banana'], ['avocado']], 'a*']);
      expect(result).toBe(2); // apple, avocado
    });
  });

  describe('AVERAGEIF', () => {
    it('averages values matching criteria', () => {
      const avgif = findFn('AVERAGEIF');
      const result = avgif.evaluate([[[10], [20], [30]], '>10', [[100], [200], [300]]]);
      expect(result).toBe(250); // (200+300)/2
    });
  });

  describe('SUMIFS', () => {
    it('sums with multiple criteria', () => {
      const sumifs = findFn('SUMIFS');
      const result = sumifs.evaluate([
        [[10], [20], [30], [40]], // sumRange
        [[1], [2], [3], [4]], // criteriaRange1
        '>=2', // criteria1
        [[1], [2], [3], [4]], // criteriaRange2
        '<=3', // criteria2
      ]);
      expect(result).toBe(50); // 20+30 (indices 1,2 match both criteria)
    });
  });

  describe('COUNTIFS', () => {
    it('counts with multiple criteria', () => {
      const countifs = findFn('COUNTIFS');
      const result = countifs.evaluate([
        [[10], [20], [30]], // criteriaRange1
        '>5', // criteria1
        [['a'], ['b'], ['a']], // criteriaRange2
        'a', // criteria2
      ]);
      expect(result).toBe(2); // indices 0 and 2
    });
  });

  describe('IFS', () => {
    it('returns first true condition value', () => {
      const ifs = findFn('IFS');
      expect(ifs.evaluate([false, 'a', true, 'b', true, 'c'])).toBe('b');
    });

    it('returns #N/A if no condition is true', () => {
      const ifs = findFn('IFS');
      const result = ifs.evaluate([false, 'a', false, 'b']);
      expect(result).toHaveProperty('type', '#N/A');
    });
  });

  describe('SWITCH', () => {
    it('matches expression to case', () => {
      const sw = findFn('SWITCH');
      expect(sw.evaluate([2, 1, 'one', 2, 'two', 3, 'three'])).toBe('two');
    });

    it('returns default if no match', () => {
      const sw = findFn('SWITCH');
      expect(sw.evaluate([99, 1, 'one', 2, 'two', 'default'])).toBe('default');
    });

    it('returns #N/A if no match and no default', () => {
      const sw = findFn('SWITCH');
      const result = sw.evaluate([99, 1, 'one', 2, 'two']);
      expect(result).toHaveProperty('type', '#N/A');
    });
  });

  // Lookup
  describe('HLOOKUP', () => {
    it('looks up value horizontally', () => {
      const hlookup = findFn('HLOOKUP');
      const table = [['a', 'b', 'c'], [1, 2, 3], [4, 5, 6]];
      expect(hlookup.evaluate(['b', table, 3, false])).toBe(5);
    });

    it('returns #N/A when not found', () => {
      const hlookup = findFn('HLOOKUP');
      const table = [['a', 'b', 'c'], [1, 2, 3]];
      const result = hlookup.evaluate(['z', table, 2, false]);
      expect(result).toHaveProperty('type', '#N/A');
    });
  });

  describe('XLOOKUP', () => {
    it('looks up value in array and returns from return array', () => {
      const xlookup = findFn('XLOOKUP');
      const lookup = [['cat'], ['dog'], ['bird']];
      const ret = [[10], [20], [30]];
      expect(xlookup.evaluate(['dog', lookup, ret])).toBe(20);
    });

    it('returns ifNotFound when not found', () => {
      const xlookup = findFn('XLOOKUP');
      const lookup = [['cat'], ['dog']];
      const ret = [[10], [20]];
      expect(xlookup.evaluate(['fish', lookup, ret, 'missing'])).toBe('missing');
    });

    it('returns #N/A by default when not found', () => {
      const xlookup = findFn('XLOOKUP');
      const result = xlookup.evaluate(['x', [['a']], [['b']]]);
      expect(result).toHaveProperty('type', '#N/A');
    });
  });

  // Math
  describe('ROUNDUP', () => {
    it('rounds up away from zero', () => {
      const roundup = findFn('ROUNDUP');
      expect(roundup.evaluate([3.2, 0])).toBe(4);
      expect(roundup.evaluate([-3.2, 0])).toBe(-4);
    });

    it('rounds up with decimal places', () => {
      const roundup = findFn('ROUNDUP');
      expect(roundup.evaluate([3.14159, 2])).toBeCloseTo(3.15);
    });
  });

  describe('ROUNDDOWN', () => {
    it('rounds down toward zero', () => {
      const rounddown = findFn('ROUNDDOWN');
      expect(rounddown.evaluate([3.9, 0])).toBe(3);
      expect(rounddown.evaluate([-3.9, 0])).toBe(-3);
    });
  });

  describe('CEILING', () => {
    it('rounds up to nearest multiple', () => {
      const ceiling = findFn('CEILING');
      expect(ceiling.evaluate([2.5, 1])).toBe(3);
      expect(ceiling.evaluate([7, 5])).toBe(10);
    });
  });

  describe('FLOOR', () => {
    it('rounds down to nearest multiple', () => {
      const floor = findFn('FLOOR');
      expect(floor.evaluate([7, 5])).toBe(5);
      expect(floor.evaluate([12, 5])).toBe(10);
    });
  });

  describe('SIGN', () => {
    it('returns sign of number', () => {
      const sign = findFn('SIGN');
      expect(sign.evaluate([5])).toBe(1);
      expect(sign.evaluate([0])).toBe(0);
      expect(sign.evaluate([-3])).toBe(-1);
    });
  });

  describe('LOG', () => {
    it('computes log base 10 by default', () => {
      const log = findFn('LOG');
      expect(log.evaluate([100])).toBeCloseTo(2);
    });

    it('computes log with custom base', () => {
      const log = findFn('LOG');
      expect(log.evaluate([8, 2])).toBeCloseTo(3);
    });
  });

  describe('LN', () => {
    it('computes natural log', () => {
      const ln = findFn('LN');
      expect(ln.evaluate([Math.E])).toBeCloseTo(1);
    });
  });

  describe('EXP', () => {
    it('computes e^n', () => {
      const exp = findFn('EXP');
      expect(exp.evaluate([1])).toBeCloseTo(Math.E);
      expect(exp.evaluate([0])).toBe(1);
    });
  });

  describe('PI', () => {
    it('returns pi', () => {
      expect(findFn('PI').evaluate([])).toBeCloseTo(Math.PI);
    });
  });

  describe('RANDBETWEEN', () => {
    it('returns integer in range', () => {
      const rb = findFn('RANDBETWEEN');
      for (let i = 0; i < 50; i++) {
        const result = rb.evaluate([1, 10]) as number;
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(10);
        expect(Number.isInteger(result)).toBe(true);
      }
    });
  });

  describe('PRODUCT', () => {
    it('multiplies all arguments', () => {
      const product = findFn('PRODUCT');
      expect(product.evaluate([2, 3, 4])).toBe(24);
    });

    it('handles nested arrays', () => {
      const product = findFn('PRODUCT');
      expect(product.evaluate([[[2], [3], [4]]])).toBe(24);
    });
  });

  describe('SUMPRODUCT', () => {
    it('sums element-wise products of arrays', () => {
      const sp = findFn('SUMPRODUCT');
      expect(sp.evaluate([[[1], [2], [3]], [[4], [5], [6]]])).toBe(32); // 1*4+2*5+3*6
    });
  });

  // Text
  describe('FIND', () => {
    it('finds text case-sensitively', () => {
      expect(findFn('FIND').evaluate(['World', 'Hello World'])).toBe(7);
    });

    it('returns #VALUE! when not found', () => {
      const result = findFn('FIND').evaluate(['xyz', 'Hello']);
      expect(result).toHaveProperty('type', '#VALUE!');
    });

    it('supports start position', () => {
      expect(findFn('FIND').evaluate(['l', 'Hello World', 4])).toBe(4);
    });
  });

  describe('SEARCH', () => {
    it('finds text case-insensitively', () => {
      expect(findFn('SEARCH').evaluate(['world', 'Hello World'])).toBe(7);
    });
  });

  describe('REPLACE', () => {
    it('replaces text by position', () => {
      expect(findFn('REPLACE').evaluate(['Hello World', 7, 5, 'Earth'])).toBe('Hello Earth');
    });
  });

  describe('SUBSTITUTE', () => {
    it('replaces all occurrences', () => {
      expect(findFn('SUBSTITUTE').evaluate(['Hello World', 'World', 'Earth'])).toBe('Hello Earth');
    });

    it('replaces nth occurrence', () => {
      expect(findFn('SUBSTITUTE').evaluate(['a-b-c-d', '-', '_', 2])).toBe('a-b_c-d');
    });
  });

  describe('REPT', () => {
    it('repeats text', () => {
      expect(findFn('REPT').evaluate(['ab', 3])).toBe('ababab');
    });
  });

  describe('EXACT', () => {
    it('compares case-sensitively', () => {
      expect(findFn('EXACT').evaluate(['Hello', 'Hello'])).toBe(true);
      expect(findFn('EXACT').evaluate(['Hello', 'hello'])).toBe(false);
    });
  });

  describe('VALUE', () => {
    it('converts text to number', () => {
      expect(findFn('VALUE').evaluate(['42'])).toBe(42);
      expect(findFn('VALUE').evaluate(['3.14'])).toBe(3.14);
    });

    it('returns #VALUE! for non-numeric text', () => {
      const result = findFn('VALUE').evaluate(['abc']);
      expect(result).toHaveProperty('type', '#VALUE!');
    });
  });

  describe('PROPER', () => {
    it('capitalizes first letter of each word', () => {
      expect(findFn('PROPER').evaluate(['hello world test'])).toBe('Hello World Test');
    });
  });

  describe('CLEAN', () => {
    it('removes non-printable characters', () => {
      expect(findFn('CLEAN').evaluate(['hello\x00\x01world'])).toBe('helloworld');
    });
  });

  describe('CHAR', () => {
    it('returns character from code', () => {
      expect(findFn('CHAR').evaluate([65])).toBe('A');
      expect(findFn('CHAR').evaluate([97])).toBe('a');
    });
  });

  describe('CODE', () => {
    it('returns code from character', () => {
      expect(findFn('CODE').evaluate(['A'])).toBe(65);
    });
  });

  // Date
  describe('DATE', () => {
    it('creates date value', () => {
      const result = findFn('DATE').evaluate([2024, 3, 15]) as number;
      const d = new Date(result);
      expect(d.getFullYear()).toBe(2024);
      expect(d.getMonth()).toBe(2); // 0-indexed
      expect(d.getDate()).toBe(15);
    });
  });

  describe('TODAY', () => {
    it('returns a timestamp for today', () => {
      const result = findFn('TODAY').evaluate([]) as number;
      const d = new Date(result);
      const now = new Date();
      expect(d.getFullYear()).toBe(now.getFullYear());
      expect(d.getMonth()).toBe(now.getMonth());
      expect(d.getDate()).toBe(now.getDate());
    });
  });

  describe('NOW', () => {
    it('returns a recent timestamp', () => {
      const before = Date.now();
      const result = findFn('NOW').evaluate([]) as number;
      const after = Date.now();
      expect(result).toBeGreaterThanOrEqual(before);
      expect(result).toBeLessThanOrEqual(after);
    });
  });

  describe('YEAR/MONTH/DAY', () => {
    it('extracts components', () => {
      const ts = new Date(2024, 5, 20).getTime();
      expect(findFn('YEAR').evaluate([ts])).toBe(2024);
      expect(findFn('MONTH').evaluate([ts])).toBe(6);
      expect(findFn('DAY').evaluate([ts])).toBe(20);
    });
  });

  // Information
  describe('ISBLANK', () => {
    it('detects blank values', () => {
      const isblank = findFn('ISBLANK');
      expect(isblank.evaluate([null])).toBe(true);
      expect(isblank.evaluate([undefined])).toBe(true);
      expect(isblank.evaluate([''])).toBe(true);
      expect(isblank.evaluate([0])).toBe(false);
    });
  });

  describe('ISNUMBER', () => {
    it('detects numbers', () => {
      expect(findFn('ISNUMBER').evaluate([42])).toBe(true);
      expect(findFn('ISNUMBER').evaluate(['text'])).toBe(false);
      expect(findFn('ISNUMBER').evaluate([NaN])).toBe(false);
    });
  });

  describe('ISTEXT', () => {
    it('detects text', () => {
      expect(findFn('ISTEXT').evaluate(['hello'])).toBe(true);
      expect(findFn('ISTEXT').evaluate([42])).toBe(false);
    });
  });

  describe('ISERROR', () => {
    it('detects errors', () => {
      expect(findFn('ISERROR').evaluate([makeError('#N/A', '')])).toBe(true);
      expect(findFn('ISERROR').evaluate([42])).toBe(false);
    });
  });

  describe('ISNA', () => {
    it('detects #N/A errors', () => {
      expect(findFn('ISNA').evaluate([makeError('#N/A', '')])).toBe(true);
      expect(findFn('ISNA').evaluate([makeError('#VALUE!', '')])).toBe(false);
    });
  });

  describe('TYPE', () => {
    it('returns type codes', () => {
      const type = findFn('TYPE');
      expect(type.evaluate([42])).toBe(1); // number
      expect(type.evaluate(['text'])).toBe(2); // text
      expect(type.evaluate([true])).toBe(4); // boolean
      expect(type.evaluate([makeError('#N/A', '')])).toBe(16); // error
      expect(type.evaluate([[1, 2]])).toBe(64); // array
    });
  });
});

// ── Named Ranges Tests ──

describe('Named Ranges', () => {
  it('validates range names', () => {
    expect(isValidRangeName('SALES')).toBe(true);
    expect(isValidRangeName('my_range')).toBe(true);
    expect(isValidRangeName('A1')).toBe(false); // Cell reference
    expect(isValidRangeName('BC99')).toBe(false); // Cell reference
    expect(isValidRangeName('123')).toBe(false); // Starts with digit
  });

  it('creates named ranges with uppercase name', () => {
    const nr = createNamedRange('sales', 'A1:A10');
    expect(nr.name).toBe('SALES');
    expect(nr.range).toBe('A1:A10');
  });

  it('preprocesses formula with named ranges', () => {
    const ranges = new Map<string, { name: string; range: string }>();
    ranges.set('SALES', { name: 'SALES', range: 'A1:A10' });
    ranges.set('COSTS', { name: 'COSTS', range: 'B1:B10' });

    expect(preprocessFormula('SUM(SALES)', ranges)).toBe('SUM(A1:A10)');
    expect(preprocessFormula('SALES-COSTS', ranges)).toBe('A1:A10-B1:B10');
  });

  it('handles empty named ranges', () => {
    const ranges = new Map();
    expect(preprocessFormula('SUM(A1:A10)', ranges)).toBe('SUM(A1:A10)');
  });

  it('is case-insensitive when replacing', () => {
    const ranges = new Map<string, { name: string; range: string }>();
    ranges.set('SALES', { name: 'SALES', range: 'A1:A10' });

    expect(preprocessFormula('SUM(sales)', ranges)).toBe('SUM(A1:A10)');
  });
});

// ── Array Formula Tests ──

describe('Array Formulas', () => {
  it('detects array formulas', () => {
    expect(isArrayFormula('{=SUM(A1:A10*B1:B10)}')).toBe(true);
    expect(isArrayFormula('=SUM(A1:A10)')).toBe(false);
    expect(isArrayFormula('{=TRANSPOSE(A1:D1)}')).toBe(true);
  });

  it('unwraps array formula', () => {
    expect(unwrapArrayFormula('{=SUM(A1:A10*B1:B10)}')).toBe('=SUM(A1:A10*B1:B10)');
  });

  it('calculates spill range', () => {
    const keys = calculateSpillRange(0, 0, [[1, 2], [3, 4]], (r, c) => `R${r}C${c}`);
    // Skips origin (0,0)
    expect(keys).toEqual(['R0C1', 'R1C0', 'R1C1']);
  });

  it('handles single-cell result', () => {
    const keys = calculateSpillRange(0, 0, [[42]], (r, c) => `R${r}C${c}`);
    expect(keys).toEqual([]);
  });

  it('handles offset origin', () => {
    const keys = calculateSpillRange(5, 3, [[1, 2], [3, 4]], (r, c) => `R${r}C${c}`);
    expect(keys).toEqual(['R5C4', 'R6C3', 'R6C4']);
  });
});

// ── Error Types Tests ──

describe('Error Types', () => {
  it('creates formula errors', () => {
    const err = makeError('#NUM!', 'Invalid number');
    expect(err.type).toBe('#NUM!');
    expect(err.message).toBe('Invalid number');
  });

  it('detects formula errors', () => {
    expect(isFormulaError(makeError('#N/A', 'Not found'))).toBe(true);
    expect(isFormulaError({ type: '#VALUE!', message: 'Bad value' })).toBe(true);
    expect(isFormulaError('not an error')).toBe(false);
    expect(isFormulaError(null)).toBe(false);
    expect(isFormulaError(42)).toBe(false);
    expect(isFormulaError(undefined)).toBe(false);
  });

  it('supports all error types', () => {
    expect(isFormulaError(makeError('#NULL!', ''))).toBe(true);
    expect(isFormulaError(makeError('#NUM!', ''))).toBe(true);
    expect(isFormulaError(makeError('#CALC!', ''))).toBe(true);
    expect(isFormulaError(makeError('#REF!', ''))).toBe(true);
    expect(isFormulaError(makeError('#NAME?', ''))).toBe(true);
    expect(isFormulaError(makeError('#DIV/0!', ''))).toBe(true);
  });
});
