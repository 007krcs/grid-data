import { describe, it, expect } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { ConditionalFormattingPlugin } from '../conditional-formatting-plugin';
import type { FormattingRule } from '../conditional-formatting-plugin';

function makeGrid(rules: FormattingRule[] = []) {
  return createGrid({
    columns: [
      { field: 'name' },
      { field: 'age' },
      { field: 'salary' },
      { field: 'department' },
    ],
    rowData: [
      { name: 'Alice', age: 30, salary: 50000, department: 'Engineering' },
      { name: 'Bob', age: 45, salary: 120000, department: 'Sales' },
      { name: 'Charlie', age: 25, salary: 60000, department: 'Engineering' },
      { name: 'Diana', age: 55, salary: 200000, department: 'Executive' },
      { name: 'Eve', age: 35, salary: 75000, department: 'Marketing' },
    ],
    plugins: [ConditionalFormattingPlugin({ rules })],
  });
}

interface ConditionalFormattingState {
  rules: FormattingRule[];
  computedStyles: Map<string, unknown>;
}

function getPluginState(engine: ReturnType<typeof createGrid>): ConditionalFormattingState {
  return engine.store.getState().pluginState?.['conditionalFormatting'] as ConditionalFormattingState;
}

describe('ConditionalFormattingPlugin', () => {
  it('creates grid with conditional formatting plugin', () => {
    const engine = makeGrid();
    expect(engine.api).toBeDefined();
    const state = getPluginState(engine);
    expect(state).toBeDefined();
    expect(state.rules).toEqual([]);
    expect(state.computedStyles).toBeDefined();
    engine.destroy();
  });

  it('formatting:addRule adds a rule to state', () => {
    const engine = makeGrid();
    const rule: FormattingRule = {
      id: 'r1',
      columns: ['salary'],
      condition: { type: 'greaterThan', value: 100000 },
      style: { backgroundColor: '#ff0000' },
    };
    engine.commandBus.dispatch('formatting:addRule', { rule });
    const state = getPluginState(engine);
    expect(state.rules).toHaveLength(1);
    expect(state.rules[0]!.id).toBe('r1');
    expect(state.rules[0]!.enabled).toBe(true);
    engine.destroy();
  });

  it('formatting:removeRule removes a rule by id', () => {
    const engine = makeGrid();
    engine.commandBus.dispatch('formatting:addRule', {
      rule: { id: 'r1', condition: { type: 'greaterThan', value: 100 }, style: { color: 'red' } },
    });
    engine.commandBus.dispatch('formatting:addRule', {
      rule: { id: 'r2', condition: { type: 'lessThan', value: 50 }, style: { color: 'blue' } },
    });
    expect(getPluginState(engine).rules).toHaveLength(2);

    engine.commandBus.dispatch('formatting:removeRule', { ruleId: 'r1' });
    const state = getPluginState(engine);
    expect(state.rules).toHaveLength(1);
    expect(state.rules[0]!.id).toBe('r2');
    engine.destroy();
  });

  it('formatting:clearRules clears all rules', () => {
    const engine = makeGrid();
    engine.commandBus.dispatch('formatting:addRule', {
      rule: { id: 'r1', condition: { type: 'greaterThan', value: 100 }, style: { color: 'red' } },
    });
    engine.commandBus.dispatch('formatting:addRule', {
      rule: { id: 'r2', condition: { type: 'lessThan', value: 50 }, style: { color: 'blue' } },
    });
    expect(getPluginState(engine).rules).toHaveLength(2);

    engine.commandBus.dispatch('formatting:clearRules', {});
    const state = getPluginState(engine);
    expect(state.rules).toHaveLength(0);
    expect(state.computedStyles.size).toBe(0);
    engine.destroy();
  });

  it('formatting:setRules replaces all rules', () => {
    const engine = makeGrid();
    engine.commandBus.dispatch('formatting:addRule', {
      rule: { id: 'old', condition: { type: 'greaterThan', value: 1 }, style: {} },
    });

    const newRules: FormattingRule[] = [
      { id: 'new1', condition: { type: 'lessThan', value: 40 }, style: { color: 'green' } },
      { id: 'new2', condition: { type: 'equals', value: 'Alice' }, style: { fontWeight: 'bold' } },
    ];
    engine.commandBus.dispatch('formatting:setRules', { rules: newRules });
    const state = getPluginState(engine);
    expect(state.rules).toHaveLength(2);
    expect(state.rules[0]!.id).toBe('new1');
    expect(state.rules[1]!.id).toBe('new2');
    expect(state.rules[0]!.enabled).toBe(true);
    engine.destroy();
  });

  it('greaterThan condition evaluates correctly', () => {
    const engine = makeGrid();
    engine.commandBus.dispatch('formatting:addRule', {
      rule: {
        id: 'gt-rule',
        columns: ['salary'],
        condition: { type: 'greaterThan', value: 100000 },
        style: { backgroundColor: '#ff0000' },
      },
    });
    const state = getPluginState(engine);
    // Bob (120000) and Diana (200000) should match
    // Row IDs are row-0 through row-4
    const bobKey = 'row-1:salary';
    const dianaKey = 'row-3:salary';
    const aliceKey = 'row-0:salary';

    expect(state.computedStyles.has(bobKey)).toBe(true);
    expect(state.computedStyles.has(dianaKey)).toBe(true);
    expect(state.computedStyles.has(aliceKey)).toBe(false);
    engine.destroy();
  });

  it('lessThan condition evaluates correctly', () => {
    const engine = makeGrid();
    engine.commandBus.dispatch('formatting:addRule', {
      rule: {
        id: 'lt-rule',
        columns: ['age'],
        condition: { type: 'lessThan', value: 30 },
        style: { color: '#0000ff' },
      },
    });
    const state = getPluginState(engine);
    // Charlie (25) should match, Alice (30) should NOT (not strictly less)
    expect(state.computedStyles.has('row-2:age')).toBe(true);
    expect(state.computedStyles.has('row-0:age')).toBe(false);
    engine.destroy();
  });

  it('between condition evaluates correctly', () => {
    const engine = makeGrid();
    engine.commandBus.dispatch('formatting:addRule', {
      rule: {
        id: 'between-rule',
        columns: ['age'],
        condition: { type: 'between', min: 30, max: 45 },
        style: { fontWeight: 'bold' },
      },
    });
    const state = getPluginState(engine);
    // Alice (30), Bob (45), Eve (35) should match (inclusive)
    expect(state.computedStyles.has('row-0:age')).toBe(true); // Alice 30
    expect(state.computedStyles.has('row-1:age')).toBe(true); // Bob 45
    expect(state.computedStyles.has('row-4:age')).toBe(true); // Eve 35
    // Charlie (25) and Diana (55) should not match
    expect(state.computedStyles.has('row-2:age')).toBe(false);
    expect(state.computedStyles.has('row-3:age')).toBe(false);
    engine.destroy();
  });

  it('contains condition evaluates correctly for strings', () => {
    const engine = makeGrid();
    engine.commandBus.dispatch('formatting:addRule', {
      rule: {
        id: 'contains-rule',
        columns: ['name'],
        condition: { type: 'contains', value: 'li' },
        style: { textDecoration: 'underline' },
      },
    });
    const state = getPluginState(engine);
    // Alice and Charlie contain 'li'
    expect(state.computedStyles.has('row-0:name')).toBe(true); // Alice
    expect(state.computedStyles.has('row-2:name')).toBe(true); // Charlie
    expect(state.computedStyles.has('row-1:name')).toBe(false); // Bob
    engine.destroy();
  });

  it('multiple rules can apply to same cell', () => {
    const engine = makeGrid();
    engine.commandBus.dispatch('formatting:addRule', {
      rule: {
        id: 'r1',
        columns: ['salary'],
        condition: { type: 'greaterThan', value: 100000 },
        style: { backgroundColor: '#ff0000' },
        priority: 1,
      },
    });
    engine.commandBus.dispatch('formatting:addRule', {
      rule: {
        id: 'r2',
        columns: ['salary'],
        condition: { type: 'greaterThan', value: 50000 },
        style: { fontWeight: 'bold' },
        cssClass: 'highlight',
        priority: 2,
      },
    });
    const state = getPluginState(engine);
    // Diana (200000) matches both rules
    const dianaFormat = state.computedStyles.get('row-3:salary') as {
      style: Record<string, string>;
      cssClasses: string[];
    };
    expect(dianaFormat).toBeDefined();
    expect(dianaFormat.style.backgroundColor).toBe('#ff0000');
    expect(dianaFormat.style.fontWeight).toBe('bold');
    expect(dianaFormat.cssClasses).toContain('highlight');
    engine.destroy();
  });

  it('formatting:evaluate recalculates styles', () => {
    const engine = makeGrid();
    engine.commandBus.dispatch('formatting:addRule', {
      rule: {
        id: 'r1',
        columns: ['salary'],
        condition: { type: 'greaterThan', value: 100000 },
        style: { color: 'red' },
      },
    });
    const state1 = getPluginState(engine);
    expect(state1.computedStyles.size).toBeGreaterThan(0);

    // Force re-evaluation
    engine.commandBus.dispatch('formatting:evaluate', {});
    const state2 = getPluginState(engine);
    expect(state2.computedStyles.size).toBeGreaterThan(0);
    expect(state2.computedStyles.has('row-1:salary')).toBe(true);
    expect(state2.computedStyles.has('row-3:salary')).toBe(true);
    engine.destroy();
  });

  it('colorScale condition produces interpolated colors', () => {
    const engine = makeGrid();
    engine.commandBus.dispatch('formatting:addRule', {
      rule: {
        id: 'color-scale',
        columns: ['salary'],
        condition: { type: 'colorScale', min: 0, max: 200000, minColor: '#00ff00', maxColor: '#ff0000' },
        style: {},
      },
    });
    const state = getPluginState(engine);

    // Alice (50000) => ratio = 50000/200000 = 0.25
    const aliceFormat = state.computedStyles.get('row-0:salary') as {
      style: { backgroundColor?: string };
    };
    expect(aliceFormat).toBeDefined();
    expect(aliceFormat.style.backgroundColor).toBeDefined();
    // At 0.25 ratio, green channel should be dominant
    // #00ff00 -> #ff0000: r goes 0->255, g goes 255->0
    // At 0.25: r = 64 (0x40), g = 191 (0xbf) => #40bf00
    expect(aliceFormat.style.backgroundColor).toMatch(/^#[0-9a-f]{6}$/);

    // Diana (200000) => ratio = 1.0 => should be maxColor #ff0000
    const dianaFormat = state.computedStyles.get('row-3:salary') as {
      style: { backgroundColor?: string };
    };
    expect(dianaFormat).toBeDefined();
    expect(dianaFormat.style.backgroundColor).toBe('#ff0000');
    engine.destroy();
  });

  it('formatting:updateRule updates an existing rule', () => {
    const engine = makeGrid();
    engine.commandBus.dispatch('formatting:addRule', {
      rule: {
        id: 'r1',
        columns: ['salary'],
        condition: { type: 'greaterThan', value: 100000 },
        style: { color: 'red' },
      },
    });
    engine.commandBus.dispatch('formatting:updateRule', {
      ruleId: 'r1',
      updates: { style: { color: 'blue' } },
    });
    const state = getPluginState(engine);
    expect(state.rules[0]!.style.color).toBe('blue');
    engine.destroy();
  });

  it('disabled rules are not evaluated', () => {
    const engine = makeGrid();
    engine.commandBus.dispatch('formatting:addRule', {
      rule: {
        id: 'r1',
        columns: ['salary'],
        condition: { type: 'greaterThan', value: 100000 },
        style: { color: 'red' },
        enabled: false,
      },
    });
    const state = getPluginState(engine);
    // No cell should be formatted since rule is disabled
    expect(state.computedStyles.size).toBe(0);
    engine.destroy();
  });

  it('rules without columns apply to all columns', () => {
    const engine = makeGrid();
    engine.commandBus.dispatch('formatting:addRule', {
      rule: {
        id: 'equals-rule',
        condition: { type: 'equals', value: 'Engineering' },
        style: { color: 'green' },
      },
    });
    const state = getPluginState(engine);
    // "Engineering" appears in department column for Alice (row-0) and Charlie (row-2)
    expect(state.computedStyles.has('row-0:department')).toBe(true);
    expect(state.computedStyles.has('row-2:department')).toBe(true);
    engine.destroy();
  });

  it('dataBar condition produces linear-gradient background', () => {
    const engine = makeGrid();
    engine.commandBus.dispatch('formatting:addRule', {
      rule: {
        id: 'databar-rule',
        columns: ['salary'],
        condition: { type: 'dataBar', min: 0, max: 200000, color: '#4caf50' },
        style: {},
      },
    });
    const state = getPluginState(engine);
    // Bob (120000): pct = (120000/200000)*100 = 60%
    const bobFormat = state.computedStyles.get('row-1:salary') as {
      style: { backgroundColor?: string };
      dataBarPercent?: number;
    };
    expect(bobFormat).toBeDefined();
    expect(bobFormat.style.backgroundColor).toContain('linear-gradient');
    expect(bobFormat.dataBarPercent).toBe(60);
    engine.destroy();
  });
});
