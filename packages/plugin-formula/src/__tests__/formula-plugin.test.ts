import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { FormulaPlugin } from '../formula-plugin';
import { tokenize } from '../tokenizer';
import { parse } from '../parser';
import { Evaluator } from '../evaluator';
import { DependencyGraph } from '../dependency-graph';
import { builtinFunctions, createFunctionRegistry } from '../functions';
import { columnLetterToIndex, columnIndexToLetter, cellKey } from '../utils';
import type { FormulaState } from '../types';

// ─── Utility Tests ───

describe('columnLetterToIndex', () => {
  it('converts single letters', () => {
    expect(columnLetterToIndex('A')).toBe(0);
    expect(columnLetterToIndex('B')).toBe(1);
    expect(columnLetterToIndex('Z')).toBe(25);
  });

  it('converts multi-letter columns', () => {
    expect(columnLetterToIndex('AA')).toBe(26);
    expect(columnLetterToIndex('AB')).toBe(27);
    expect(columnLetterToIndex('AZ')).toBe(51);
    expect(columnLetterToIndex('BA')).toBe(52);
  });
});

describe('columnIndexToLetter', () => {
  it('converts indices to letters', () => {
    expect(columnIndexToLetter(0)).toBe('A');
    expect(columnIndexToLetter(1)).toBe('B');
    expect(columnIndexToLetter(25)).toBe('Z');
    expect(columnIndexToLetter(26)).toBe('AA');
    expect(columnIndexToLetter(27)).toBe('AB');
  });

  it('round-trips with columnLetterToIndex', () => {
    for (let i = 0; i < 100; i++) {
      expect(columnLetterToIndex(columnIndexToLetter(i))).toBe(i);
    }
  });
});

// ─── Tokenizer Tests ───

describe('Tokenizer', () => {
  it('tokenizes numbers', () => {
    const tokens = tokenize('123');
    expect(tokens[0]).toMatchObject({ type: 'NUMBER', value: '123' });
  });

  it('tokenizes decimal numbers', () => {
    const tokens = tokenize('45.67');
    expect(tokens[0]).toMatchObject({ type: 'NUMBER', value: '45.67' });
  });

  it('tokenizes strings', () => {
    const tokens = tokenize('"hello world"');
    expect(tokens[0]).toMatchObject({ type: 'STRING', value: 'hello world' });
  });

  it('tokenizes booleans', () => {
    const tokens = tokenize('TRUE');
    expect(tokens[0]).toMatchObject({ type: 'BOOLEAN', value: 'TRUE' });
    const tokens2 = tokenize('FALSE');
    expect(tokens2[0]).toMatchObject({ type: 'BOOLEAN', value: 'FALSE' });
  });

  it('tokenizes cell references', () => {
    const tokens = tokenize('A1');
    expect(tokens[0]).toMatchObject({ type: 'CELL_REF', value: 'A1' });
  });

  it('tokenizes absolute cell references', () => {
    const tokens = tokenize('$A$1');
    expect(tokens[0]).toMatchObject({ type: 'CELL_REF', value: '$A$1' });
  });

  it('tokenizes operators', () => {
    const tokens = tokenize('1+2');
    expect(tokens).toHaveLength(4); // NUMBER, OPERATOR, NUMBER, EOF
    expect(tokens[1]).toMatchObject({ type: 'OPERATOR', value: '+' });
  });

  it('tokenizes multi-char operators', () => {
    const tokens = tokenize('1>=2');
    expect(tokens[1]).toMatchObject({ type: 'OPERATOR', value: '>=' });
  });

  it('tokenizes function names', () => {
    const tokens = tokenize('SUM(A1)');
    expect(tokens[0]).toMatchObject({ type: 'FUNCTION', value: 'SUM' });
    expect(tokens[1]).toMatchObject({ type: 'LPAREN', value: '(' });
  });

  it('skips whitespace', () => {
    const tokens = tokenize('1 + 2');
    expect(tokens).toHaveLength(4);
  });

  it('tokenizes complex expressions', () => {
    const tokens = tokenize('SUM(A1:B10, 5) + IF(C1>0, "yes", "no")');
    const types = tokens.map((t) => t.type);
    expect(types).toContain('FUNCTION');
    expect(types).toContain('CELL_REF');
    expect(types).toContain('COLON');
    expect(types).toContain('COMMA');
    expect(types).toContain('STRING');
  });
});

// ─── Parser Tests ───

describe('Parser', () => {
  it('parses number literals', () => {
    const tokens = tokenize('42');
    const ast = parse(tokens);
    expect(ast).toEqual({ type: 'NumberLiteral', value: 42 });
  });

  it('parses string literals', () => {
    const tokens = tokenize('"hello"');
    const ast = parse(tokens);
    expect(ast).toEqual({ type: 'StringLiteral', value: 'hello' });
  });

  it('parses boolean literals', () => {
    const tokens = tokenize('TRUE');
    const ast = parse(tokens);
    expect(ast).toEqual({ type: 'BooleanLiteral', value: true });
  });

  it('parses binary expressions', () => {
    const tokens = tokenize('1+2');
    const ast = parse(tokens);
    expect(ast.type).toBe('BinaryExpression');
    expect((ast as any).operator).toBe('+');
  });

  it('respects operator precedence (* before +)', () => {
    const tokens = tokenize('1+2*3');
    const ast = parse(tokens);
    // Should be: 1 + (2 * 3)
    expect(ast.type).toBe('BinaryExpression');
    const bin = ast as any;
    expect(bin.operator).toBe('+');
    expect(bin.left).toEqual({ type: 'NumberLiteral', value: 1 });
    expect(bin.right.operator).toBe('*');
  });

  it('parses function calls', () => {
    const tokens = tokenize('SUM(1, 2, 3)');
    const ast = parse(tokens);
    expect(ast.type).toBe('FunctionCall');
    expect((ast as any).name).toBe('SUM');
    expect((ast as any).args).toHaveLength(3);
  });

  it('parses nested function calls', () => {
    const tokens = tokenize('IF(A1>0, SUM(B1, B2), 0)');
    const ast = parse(tokens);
    expect(ast.type).toBe('FunctionCall');
    expect((ast as any).name).toBe('IF');
    expect((ast as any).args).toHaveLength(3);
  });

  it('parses cell references', () => {
    const tokens = tokenize('A1');
    const ast = parse(tokens);
    expect(ast.type).toBe('CellReference');
    expect((ast as any).col).toBe('A');
    expect((ast as any).row).toBe(1);
  });

  it('parses range references', () => {
    const tokens = tokenize('A1:B10');
    const ast = parse(tokens);
    expect(ast.type).toBe('RangeReference');
    expect((ast as any).start.col).toBe('A');
    expect((ast as any).end.col).toBe('B');
    expect((ast as any).end.row).toBe(10);
  });

  it('parses unary minus', () => {
    const tokens = tokenize('-5');
    const ast = parse(tokens);
    expect(ast.type).toBe('UnaryExpression');
    expect((ast as any).operator).toBe('-');
  });

  it('parses comparison operators', () => {
    const tokens = tokenize('A1>=10');
    const ast = parse(tokens);
    expect(ast.type).toBe('BinaryExpression');
    expect((ast as any).operator).toBe('>=');
  });

  it('parses concatenation operator', () => {
    const tokens = tokenize('"hello"&" world"');
    const ast = parse(tokens);
    expect(ast.type).toBe('BinaryExpression');
    expect((ast as any).operator).toBe('&');
  });

  it('parses parenthesized expressions', () => {
    const tokens = tokenize('(1+2)*3');
    const ast = parse(tokens);
    expect(ast.type).toBe('BinaryExpression');
    const bin = ast as any;
    expect(bin.operator).toBe('*');
    expect(bin.left.type).toBe('BinaryExpression');
    expect(bin.left.operator).toBe('+');
  });
});

// ─── Functions Tests ───

describe('Built-in Functions', () => {
  it('SUM adds numbers', () => {
    const fn = builtinFunctions.get('SUM')!;
    expect(fn.evaluate([1, 2, 3])).toBe(6);
  });

  it('SUM flattens arrays', () => {
    const fn = builtinFunctions.get('SUM')!;
    expect(fn.evaluate([[[1, 2], [3, 4]]])).toBe(10);
  });

  it('AVERAGE computes mean', () => {
    const fn = builtinFunctions.get('AVERAGE')!;
    expect(fn.evaluate([10, 20, 30])).toBe(20);
  });

  it('AVERAGE returns #DIV/0! for empty', () => {
    const fn = builtinFunctions.get('AVERAGE')!;
    const result = fn.evaluate([["not a number"]]) as any;
    expect(result.type).toBe('#DIV/0!');
  });

  it('COUNT counts numeric values', () => {
    const fn = builtinFunctions.get('COUNT')!;
    expect(fn.evaluate([1, "hello", 3, true, "5"])).toBe(3);
  });

  it('MIN/MAX work', () => {
    const min = builtinFunctions.get('MIN')!;
    const max = builtinFunctions.get('MAX')!;
    expect(min.evaluate([5, 1, 3])).toBe(1);
    expect(max.evaluate([5, 1, 3])).toBe(5);
  });

  it('IF returns correct branch', () => {
    const fn = builtinFunctions.get('IF')!;
    expect(fn.evaluate([true, 'yes', 'no'])).toBe('yes');
    expect(fn.evaluate([false, 'yes', 'no'])).toBe('no');
    expect(fn.evaluate([0, 'yes', 'no'])).toBe('no');
  });

  it('CONCATENATE joins strings', () => {
    const fn = builtinFunctions.get('CONCATENATE')!;
    expect(fn.evaluate(['hello', ' ', 'world'])).toBe('hello world');
  });

  it('LEFT/RIGHT/MID extract substrings', () => {
    const left = builtinFunctions.get('LEFT')!;
    const right = builtinFunctions.get('RIGHT')!;
    const mid = builtinFunctions.get('MID')!;
    expect(left.evaluate(['hello', 3])).toBe('hel');
    expect(right.evaluate(['hello', 3])).toBe('llo');
    expect(mid.evaluate(['hello', 2, 3])).toBe('ell');
  });

  it('LEN returns string length', () => {
    const fn = builtinFunctions.get('LEN')!;
    expect(fn.evaluate(['hello'])).toBe(5);
  });

  it('UPPER/LOWER change case', () => {
    const upper = builtinFunctions.get('UPPER')!;
    const lower = builtinFunctions.get('LOWER')!;
    expect(upper.evaluate(['hello'])).toBe('HELLO');
    expect(lower.evaluate(['HELLO'])).toBe('hello');
  });

  it('VLOOKUP finds values', () => {
    const fn = builtinFunctions.get('VLOOKUP')!;
    const table = [
      ['Alice', 30, 'LA'],
      ['Bob', 25, 'SF'],
      ['Charlie', 35, 'NYC'],
    ];
    expect(fn.evaluate(['Bob', table, 2])).toBe(25);
    expect(fn.evaluate(['Charlie', table, 3])).toBe('NYC');
  });

  it('VLOOKUP returns #N/A for missing value', () => {
    const fn = builtinFunctions.get('VLOOKUP')!;
    const table = [['Alice', 30]];
    const result = fn.evaluate(['Dave', table, 2]) as any;
    expect(result.type).toBe('#N/A');
  });

  it('IFERROR catches errors', () => {
    const fn = builtinFunctions.get('IFERROR')!;
    expect(fn.evaluate([42, 'default'])).toBe(42);
    expect(fn.evaluate([{ type: '#DIV/0!', message: 'err' }, 'default'])).toBe('default');
  });

  it('AND/OR/NOT work', () => {
    const and = builtinFunctions.get('AND')!;
    const or = builtinFunctions.get('OR')!;
    const not = builtinFunctions.get('NOT')!;
    expect(and.evaluate([true, true])).toBe(true);
    expect(and.evaluate([true, false])).toBe(false);
    expect(or.evaluate([false, true])).toBe(true);
    expect(or.evaluate([false, false])).toBe(false);
    expect(not.evaluate([true])).toBe(false);
    expect(not.evaluate([false])).toBe(true);
  });

  it('ROUND rounds correctly', () => {
    const fn = builtinFunctions.get('ROUND')!;
    expect(fn.evaluate([3.14159, 2])).toBe(3.14);
    expect(fn.evaluate([3.5])).toBe(4);
  });

  it('MOD computes modulus', () => {
    const fn = builtinFunctions.get('MOD')!;
    expect(fn.evaluate([10, 3])).toBe(1);
  });

  it('MOD returns #DIV/0! for zero divisor', () => {
    const fn = builtinFunctions.get('MOD')!;
    const result = fn.evaluate([10, 0]) as any;
    expect(result.type).toBe('#DIV/0!');
  });

  it('SQRT computes square root', () => {
    const fn = builtinFunctions.get('SQRT')!;
    expect(fn.evaluate([16])).toBe(4);
  });

  it('custom functions can be registered', () => {
    const registry = createFunctionRegistry([
      {
        name: 'DOUBLE',
        minArgs: 1,
        maxArgs: 1,
        evaluate: (args) => (args[0] as number) * 2,
      },
    ]);
    expect(registry.has('DOUBLE')).toBe(true);
    expect(registry.get('DOUBLE')!.evaluate([5])).toBe(10);
  });
});

// ─── Evaluator Tests ───

describe('Evaluator', () => {
  const resolver = (_row: number, _col: number): unknown => {
    // Simple grid: row 0 has [10, 20, 30], row 1 has [40, 50, 60]
    const data = [
      [10, 20, 30],
      [40, 50, 60],
      [70, 80, 90],
    ];
    if (_row >= 0 && _row < data.length && _col >= 0 && _col < data[_row]!.length) {
      return data[_row]![_col];
    }
    return undefined;
  };

  function evalFormula(formula: string): unknown {
    const tokens = tokenize(formula);
    const ast = parse(tokens);
    const evaluator = new Evaluator(builtinFunctions, resolver);
    return evaluator.evaluate(ast);
  }

  it('evaluates simple arithmetic', () => {
    expect(evalFormula('1+2')).toBe(3);
    expect(evalFormula('10-3')).toBe(7);
    expect(evalFormula('4*5')).toBe(20);
    expect(evalFormula('15/3')).toBe(5);
  });

  it('evaluates cell references', () => {
    // A1 = row 0, col 0 = 10
    expect(evalFormula('A1')).toBe(10);
    // B2 = row 1, col 1 = 50
    expect(evalFormula('B2')).toBe(50);
  });

  it('evaluates SUM with range', () => {
    // A1:C1 = [10, 20, 30] -> sum = 60
    expect(evalFormula('SUM(A1:C1)')).toBe(60);
  });

  it('evaluates nested expressions', () => {
    expect(evalFormula('SUM(A1, B1) + 5')).toBe(35); // 10 + 20 + 5
  });

  it('evaluates division by zero', () => {
    const result = evalFormula('10/0') as any;
    expect(result.type).toBe('#DIV/0!');
  });

  it('evaluates string concatenation', () => {
    expect(evalFormula('"hello"&" world"')).toBe('hello world');
  });

  it('evaluates comparison operators', () => {
    expect(evalFormula('5>3')).toBe(true);
    expect(evalFormula('5<3')).toBe(false);
    expect(evalFormula('5=5')).toBe(true);
    expect(evalFormula('5<>3')).toBe(true);
  });

  it('evaluates IF with cell reference', () => {
    // A1=10, IF(A1>5, "big", "small") -> "big"
    expect(evalFormula('IF(A1>5, "big", "small")')).toBe('big');
  });

  it('returns #NAME? for unknown functions', () => {
    const result = evalFormula('UNKNOWN(1)') as any;
    expect(result.type).toBe('#NAME?');
  });

  it('evaluates unary negation', () => {
    expect(evalFormula('-5')).toBe(-5);
    expect(evalFormula('-A1')).toBe(-10);
  });

  it('evaluates power', () => {
    expect(evalFormula('2^3')).toBe(8);
  });
});

// ─── Dependency Graph Tests ───

describe('DependencyGraph', () => {
  let graph: DependencyGraph;

  beforeEach(() => {
    graph = new DependencyGraph();
  });

  it('tracks dependencies and dependents', () => {
    graph.setDependencies('0:2', ['0:0', '0:1']);
    const deps = graph.getDependents('0:0');
    expect(deps).toContain('0:2');
  });

  it('returns correct topological order', () => {
    // C depends on A and B
    graph.setDependencies('0:2', ['0:0', '0:1']);
    const order = graph.topologicalSort(['0:0', '0:1', '0:2']);
    expect(order).not.toBeNull();
    const idxA = order!.indexOf('0:0');
    const idxB = order!.indexOf('0:1');
    const idxC = order!.indexOf('0:2');
    // A and B should come before C
    expect(idxA).toBeLessThan(idxC);
    expect(idxB).toBeLessThan(idxC);
  });

  it('detects circular references', () => {
    graph.setDependencies('0:0', ['0:1']);
    graph.setDependencies('0:1', ['0:0']);
    const cycle = graph.detectCycle(['0:0', '0:1']);
    expect(cycle).not.toBeNull();
  });

  it('detects no cycle in acyclic graph', () => {
    graph.setDependencies('0:1', ['0:0']);
    graph.setDependencies('0:2', ['0:1']);
    const cycle = graph.detectCycle(['0:0', '0:1', '0:2']);
    expect(cycle).toBeNull();
  });

  it('wouldCreateCycle detects potential cycles', () => {
    graph.setDependencies('0:1', ['0:0']);
    // Adding 0:0 -> 0:1 would create cycle
    expect(graph.wouldCreateCycle('0:0', ['0:1'])).toBe(true);
    // Adding 0:2 -> 0:0 would not
    expect(graph.wouldCreateCycle('0:2', ['0:0'])).toBe(false);
  });

  it('removes dependencies cleanly', () => {
    graph.setDependencies('0:2', ['0:0', '0:1']);
    graph.removeDependencies('0:2');
    const deps = graph.getDependents('0:0');
    expect(deps).not.toContain('0:2');
  });

  it('topologicalSort returns null for circular graph', () => {
    graph.setDependencies('0:0', ['0:1']);
    graph.setDependencies('0:1', ['0:0']);
    const order = graph.topologicalSort(['0:0', '0:1']);
    expect(order).toBeNull();
  });
});

// ─── Plugin Integration Tests ───

describe('FormulaPlugin Integration', () => {
  function createFormulaGrid() {
    return createGrid({
      columns: [
        { field: 'a', colId: 'a' },
        { field: 'b', colId: 'b' },
        { field: 'c', colId: 'c' },
      ],
      rowData: [
        { a: 10, b: 20, c: 0 },
        { a: 30, b: 40, c: 0 },
        { a: 50, b: 60, c: 0 },
      ],
      getRowId: (params) => String(params.index),
      plugins: [FormulaPlugin()],
    });
  }

  it('creates grid with formula plugin', () => {
    const engine = createFormulaGrid();
    expect(engine.api).toBeDefined();
    engine.destroy();
  });

  it('formula:set evaluates and writes value', () => {
    const engine = createFormulaGrid();

    // Set formula: C1 = A1 + B1 = 10 + 20 = 30
    engine.commandBus.dispatch('formula:set', {
      rowId: '0',
      colId: 'c',
      formula: '=A1+B1',
    });

    const row = engine.api.getRowNode('0');
    expect(row?.data?.c).toBe(30);

    engine.destroy();
  });

  it('formula:set handles SUM function', () => {
    const engine = createFormulaGrid();

    // Set formula: C1 = SUM(A1:B1)
    engine.commandBus.dispatch('formula:set', {
      rowId: '0',
      colId: 'c',
      formula: '=SUM(A1:B1)',
    });

    const row = engine.api.getRowNode('0');
    expect(row?.data?.c).toBe(30);

    engine.destroy();
  });

  it('formula:remove clears a formula', () => {
    const engine = createFormulaGrid();

    engine.commandBus.dispatch('formula:set', {
      rowId: '0',
      colId: 'c',
      formula: '=A1+B1',
    });

    engine.commandBus.dispatch('formula:remove', {
      rowId: '0',
      colId: 'c',
    });

    const state = engine.api.getState();
    const formulaState = state.pluginState['formula'] as FormulaState;
    expect(formulaState.formulas.size).toBe(0);

    engine.destroy();
  });

  it('formula:evaluateAll recalculates in order', () => {
    const engine = createFormulaGrid();

    // C1 = A1 + B1
    engine.commandBus.dispatch('formula:set', {
      rowId: '0',
      colId: 'c',
      formula: '=A1+B1',
    });

    // C2 = A2 + B2
    engine.commandBus.dispatch('formula:set', {
      rowId: '1',
      colId: 'c',
      formula: '=A2+B2',
    });

    engine.commandBus.dispatch('formula:evaluateAll', {});

    expect(engine.api.getRowNode('0')?.data?.c).toBe(30);
    expect(engine.api.getRowNode('1')?.data?.c).toBe(70);

    engine.destroy();
  });

  it('formula:set detects circular references', () => {
    const engine = createFormulaGrid();

    // A1 = C1 (A depends on C)
    engine.commandBus.dispatch('formula:set', {
      rowId: '0',
      colId: 'a',
      formula: '=C1',
    });

    // C1 = A1 (C depends on A — circular!)
    engine.commandBus.dispatch('formula:set', {
      rowId: '0',
      colId: 'c',
      formula: '=A1',
    });

    const state = engine.api.getState();
    const formulaState = state.pluginState['formula'] as FormulaState;
    // Should have an error for the circular reference
    expect(formulaState.errors.size).toBeGreaterThan(0);
    const errors = Array.from(formulaState.errors.values());
    expect(errors.some((e) => e.type === '#CIRC!')).toBe(true);

    engine.destroy();
  });

  it('formula:bulkSet sets multiple formulas', () => {
    const engine = createFormulaGrid();

    engine.commandBus.dispatch('formula:bulkSet', {
      formulas: [
        { rowId: '0', colId: 'c', formula: '=A1+B1' },
        { rowId: '1', colId: 'c', formula: '=A2+B2' },
      ],
    });

    expect(engine.api.getRowNode('0')?.data?.c).toBe(30);
    expect(engine.api.getRowNode('1')?.data?.c).toBe(70);

    engine.destroy();
  });

  it('handles division by zero error gracefully', () => {
    const engine = createFormulaGrid();

    // Set a cell value to 0 and divide by it
    engine.commandBus.dispatch('formula:set', {
      rowId: '0',
      colId: 'c',
      formula: '=A1/0',
    });

    const state = engine.api.getState();
    const formulaState = state.pluginState['formula'] as FormulaState;
    const key = cellKey(0, 2); // row 0, col 2 (c)
    expect(formulaState.errors.has(key)).toBe(true);
    expect(formulaState.errors.get(key)?.type).toBe('#DIV/0!');

    engine.destroy();
  });

  it('handles formulas with string operations', () => {
    const engine = createGrid({
      columns: [
        { field: 'name', colId: 'name' },
        { field: 'greeting', colId: 'greeting' },
      ],
      rowData: [
        { name: 'World', greeting: '' },
      ],
      getRowId: (params) => String(params.index),
      plugins: [FormulaPlugin()],
    });

    engine.commandBus.dispatch('formula:set', {
      rowId: '0',
      colId: 'greeting',
      formula: '=CONCATENATE("Hello, ", A1)',
    });

    expect(engine.api.getRowNode('0')?.data?.greeting).toBe('Hello, World');

    engine.destroy();
  });

  it('supports custom functions via options', () => {
    const engine = createGrid({
      columns: [
        { field: 'a', colId: 'a' },
        { field: 'b', colId: 'b' },
      ],
      rowData: [{ a: 5, b: 0 }],
      getRowId: (params) => String(params.index),
      plugins: [
        FormulaPlugin({
          customFunctions: [
            {
              name: 'DOUBLE',
              minArgs: 1,
              maxArgs: 1,
              evaluate: (args) => (args[0] as number) * 2,
            },
          ],
        }),
      ],
    });

    engine.commandBus.dispatch('formula:set', {
      rowId: '0',
      colId: 'b',
      formula: '=DOUBLE(A1)',
    });

    expect(engine.api.getRowNode('0')?.data?.b).toBe(10);

    engine.destroy();
  });

  it('disposer cleans up properly', () => {
    const engine = createFormulaGrid();

    engine.commandBus.dispatch('formula:set', {
      rowId: '0',
      colId: 'c',
      formula: '=A1+B1',
    });

    engine.destroy();
    // After destroy, no errors should be thrown
  });
});
