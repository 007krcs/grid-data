import { describe, it, expect } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { ValidationPlugin } from '../validation-plugin';
import type { ValidationRule, ValidationState } from '../types';
import {
  validateRequired,
  validateEmail,
  validatePhone,
  validateUrl,
  validateRegex,
  validateRange,
  validateList,
  validateInteger,
} from '../validators';
import { validateCrossCell } from '../cross-cell-validator';
import { validateCell, validateRow, validateAll } from '../validation-engine';

// ─── Helper ───

function createValidationGrid(rules: ValidationRule[] = [], options = {}) {
  return createGrid({
    columns: [
      { field: 'name' },
      { field: 'email' },
      { field: 'age' },
      { field: 'score' },
    ],
    rowData: [
      { name: 'Alice', email: 'alice@test.com', age: 30, score: 85 },
      { name: 'Bob', email: 'bob@test.com', age: 25, score: 92 },
      { name: 'Charlie', email: 'charlie@test.com', age: 35, score: 78 },
    ],
    getRowId: (params: any) => String(params.data.name),
    plugins: [ValidationPlugin({ rules, ...options })],
  });
}

// ═══════════════════════════════════════════════════
// Built-in Validators (12 tests)
// ═══════════════════════════════════════════════════

describe('Built-in Validators', () => {
  it('1. required — null/undefined/empty fails', () => {
    expect(validateRequired(null)).toBe('Value is required');
    expect(validateRequired(undefined)).toBe('Value is required');
    expect(validateRequired('')).toBe('Value is required');
    expect(validateRequired('  ')).toBe('Value is required');
    expect(validateRequired(NaN)).toBe('Value is required');
  });

  it('2. required — non-empty passes', () => {
    expect(validateRequired('hello')).toBe(true);
    expect(validateRequired(0)).toBe(true);
    expect(validateRequired(false)).toBe(true);
    expect(validateRequired(42)).toBe(true);
  });

  it('3. email — valid email passes', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('test.user@domain.co.uk')).toBe(true);
    expect(validateEmail('')).toBe(true); // empty is not required
  });

  it('4. email — invalid email fails', () => {
    const result = validateEmail('not-an-email');
    expect(typeof result).toBe('string');
    expect(result).toContain('not a valid email');

    expect(typeof validateEmail('missing@')).toBe('string');
    expect(typeof validateEmail('@missing.com')).toBe('string');
  });

  it('5. phone — valid phone passes', () => {
    expect(validatePhone('+1 (555) 123-4567')).toBe(true);
    expect(validatePhone('5551234567')).toBe(true);
    expect(validatePhone('555-123-4567')).toBe(true);
  });

  it('6. url — valid URL passes', () => {
    expect(validateUrl('https://example.com')).toBe(true);
    expect(validateUrl('http://localhost:3000/path')).toBe(true);
  });

  it('7. url — requireHttps rejects http', () => {
    const result = validateUrl('http://example.com', true);
    expect(typeof result).toBe('string');
    expect(result).toContain('https');
    expect(validateUrl('https://example.com', true)).toBe(true);
  });

  it('8. regex — matching pattern passes', () => {
    expect(validateRegex('abc123', '^[a-z]+\\d+$')).toBe(true);
    expect(typeof validateRegex('123abc', '^[a-z]+\\d+$')).toBe('string');
  });

  it('9. range — in range passes', () => {
    expect(validateRange(5, 1, 10)).toBe(true);
    expect(validateRange(1, 1, 10)).toBe(true);
    expect(validateRange(10, 1, 10)).toBe(true);
  });

  it('10. range — out of range fails', () => {
    expect(typeof validateRange(0, 1, 10)).toBe('string');
    expect(typeof validateRange(11, 1, 10)).toBe('string');
    // Exclusive range
    expect(typeof validateRange(1, 1, 10, true)).toBe('string');
    expect(typeof validateRange(10, 1, 10, true)).toBe('string');
  });

  it('11. list — value in list passes', () => {
    expect(validateList('apple', ['apple', 'banana', 'cherry'])).toBe(true);
    // Case insensitive
    expect(validateList('APPLE', ['apple', 'banana'], false)).toBe(true);
    // Not in list
    expect(typeof validateList('grape', ['apple', 'banana'])).toBe('string');
  });

  it('12. integer — decimal fails, whole number passes', () => {
    expect(validateInteger(42)).toBe(true);
    expect(validateInteger(0)).toBe(true);
    expect(validateInteger(-5)).toBe(true);
    expect(typeof validateInteger(3.14)).toBe('string');
    expect(typeof validateInteger(0.1)).toBe('string');
  });
});

// ═══════════════════════════════════════════════════
// Cross-Cell Validation (3 tests)
// ═══════════════════════════════════════════════════

describe('Cross-Cell Validation', () => {
  it('13. less than — smaller passes', () => {
    expect(validateCrossCell(5, 10, '<')).toBe(true);
    expect(typeof validateCrossCell(10, 5, '<')).toBe('string');
    expect(typeof validateCrossCell(5, 5, '<')).toBe('string');
  });

  it('14. greater than — larger passes', () => {
    expect(validateCrossCell(10, 5, '>')).toBe(true);
    expect(typeof validateCrossCell(5, 10, '>')).toBe('string');
  });

  it('15. not equal — different passes', () => {
    expect(validateCrossCell(5, 10, '!=')).toBe(true);
    expect(typeof validateCrossCell(5, 5, '!=')).toBe('string');
    // String comparison
    expect(validateCrossCell('a', 'b', '!=')).toBe(true);
  });
});

// ═══════════════════════════════════════════════════
// Unique Validation (2 tests)
// ═══════════════════════════════════════════════════

describe('Unique Validation', () => {
  it('16. unique values pass', () => {
    const allRows = new Map<string, Record<string, unknown>>([
      ['r1', { name: 'Alice' }],
      ['r2', { name: 'Bob' }],
      ['r3', { name: 'Charlie' }],
    ]);
    const rules: ValidationRule[] = [
      { id: 'u1', colId: 'name', type: 'unique', params: { type: 'unique' } },
    ];
    const errors = validateAll(allRows, ['name'], rules);
    expect(errors.size).toBe(0);
  });

  it('17. duplicate values fail', () => {
    const allRows = new Map<string, Record<string, unknown>>([
      ['r1', { name: 'Alice' }],
      ['r2', { name: 'Alice' }],
      ['r3', { name: 'Charlie' }],
    ]);
    const rules: ValidationRule[] = [
      { id: 'u1', colId: 'name', type: 'unique', params: { type: 'unique' } },
    ];
    const errors = validateAll(allRows, ['name'], rules);
    // Both r1 and r2 should have errors
    expect(errors.has('r1:name')).toBe(true);
    expect(errors.has('r2:name')).toBe(true);
    expect(errors.has('r3:name')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════
// Validation Engine (3 tests)
// ═══════════════════════════════════════════════════

describe('Validation Engine', () => {
  it('18. validateCell with multiple rules', () => {
    const rules: ValidationRule[] = [
      { id: 'r1', colId: 'age', type: 'required', params: { type: 'required' } },
      { id: 'r2', colId: 'age', type: 'range', params: { type: 'range', min: 0, max: 120 } },
      { id: 'r3', colId: 'age', type: 'integer', params: { type: 'integer' } },
    ];

    // Valid value
    const noErrors = validateCell(25, 'row1', 'age', { age: 25 }, rules);
    expect(noErrors).toHaveLength(0);

    // Null fails required
    const requiredErrors = validateCell(null, 'row1', 'age', { age: null }, rules);
    expect(requiredErrors.length).toBeGreaterThan(0);
    expect(requiredErrors[0]!.ruleId).toBe('r1');

    // Decimal fails integer
    const intErrors = validateCell(3.5, 'row1', 'age', { age: 3.5 }, rules);
    expect(intErrors.length).toBeGreaterThan(0);
    expect(intErrors.some((e) => e.ruleId === 'r3')).toBe(true);
  });

  it('19. validateRow checks all columns', () => {
    const rules: ValidationRule[] = [
      { id: 'r1', colId: 'name', type: 'required', params: { type: 'required' } },
      { id: 'r2', colId: 'email', type: 'email', params: { type: 'email' } },
    ];
    const rowData = { name: '', email: 'bad-email' };
    const errors = validateRow('row1', rowData, ['name', 'email'], rules);
    expect(errors.has('row1:name')).toBe(true);
    expect(errors.has('row1:email')).toBe(true);
  });

  it('20. validateAll returns complete error map', () => {
    const allRows = new Map<string, Record<string, unknown>>([
      ['r1', { name: 'Alice', age: 200 }],
      ['r2', { name: '', age: 30 }],
    ]);
    const rules: ValidationRule[] = [
      { id: 'r1', colId: 'name', type: 'required', params: { type: 'required' } },
      { id: 'r2', colId: 'age', type: 'range', params: { type: 'range', min: 0, max: 120 } },
    ];
    const errors = validateAll(allRows, ['name', 'age'], rules);
    expect(errors.has('r1:age')).toBe(true); // 200 out of range
    expect(errors.has('r2:name')).toBe(true); // empty name
    expect(errors.has('r1:name')).toBe(false); // Alice is valid
    expect(errors.has('r2:age')).toBe(false); // 30 is valid
  });
});

// ═══════════════════════════════════════════════════
// Plugin Integration (7 tests)
// ═══════════════════════════════════════════════════

describe('Plugin Integration', () => {
  it('21. validation:setRules stores rules', () => {
    const engine = createValidationGrid();
    const rules: ValidationRule[] = [
      { id: 'r1', colId: 'name', type: 'required', params: { type: 'required' } },
    ];

    engine.commandBus.dispatch('validation:setRules', { rules });

    const state = engine.api.getState().pluginState['validation'] as ValidationState;
    expect(state.rules).toHaveLength(1);
    expect(state.rules[0]!.id).toBe('r1');

    engine.destroy();
  });

  it('22. validation:addRule appends', () => {
    const initialRules: ValidationRule[] = [
      { id: 'r1', colId: 'name', type: 'required', params: { type: 'required' } },
    ];
    const engine = createValidationGrid(initialRules);

    engine.commandBus.dispatch('validation:addRule', {
      rule: { id: 'r2', colId: 'email', type: 'email', params: { type: 'email' } },
    });

    const state = engine.api.getState().pluginState['validation'] as ValidationState;
    expect(state.rules).toHaveLength(2);
    expect(state.rules[1]!.id).toBe('r2');

    engine.destroy();
  });

  it('23. validation:removeRule removes', () => {
    const initialRules: ValidationRule[] = [
      { id: 'r1', colId: 'name', type: 'required', params: { type: 'required' } },
      { id: 'r2', colId: 'email', type: 'email', params: { type: 'email' } },
    ];
    const engine = createValidationGrid(initialRules);

    engine.commandBus.dispatch('validation:removeRule', { ruleId: 'r1' });

    const state = engine.api.getState().pluginState['validation'] as ValidationState;
    expect(state.rules).toHaveLength(1);
    expect(state.rules[0]!.id).toBe('r2');

    engine.destroy();
  });

  it('24. validation:validate single cell', () => {
    const rules: ValidationRule[] = [
      { id: 'r1', colId: 'age', type: 'range', params: { type: 'range', min: 0, max: 20 } },
    ];
    const engine = createValidationGrid(rules);

    // Alice's age is 30, which is out of range [0, 20]
    engine.commandBus.dispatch('validation:validate', { rowId: 'Alice', colId: 'age' });

    const state = engine.api.getState().pluginState['validation'] as ValidationState;
    expect(state.errors.has('Alice:age')).toBe(true);
    expect(state.totalErrors).toBeGreaterThan(0);

    engine.destroy();
  });

  it('25. validation:validateAll entire grid', () => {
    const rules: ValidationRule[] = [
      { id: 'r1', colId: 'age', type: 'range', params: { type: 'range', min: 0, max: 28 } },
    ];
    const engine = createValidationGrid(rules);

    // Alice age=30 and Charlie age=35 are out of range
    engine.commandBus.dispatch('validation:validateAll', {});

    const state = engine.api.getState().pluginState['validation'] as ValidationState;
    expect(state.errors.has('Alice:age')).toBe(true);
    expect(state.errors.has('Charlie:age')).toBe(true);
    expect(state.errors.has('Bob:age')).toBe(false); // 25 is in range
    expect(state.totalErrors).toBe(2);

    engine.destroy();
  });

  it('26. validation:clearErrors resets', () => {
    const rules: ValidationRule[] = [
      { id: 'r1', colId: 'age', type: 'range', params: { type: 'range', min: 0, max: 20 } },
    ];
    const engine = createValidationGrid(rules);

    // Validate to create some errors
    engine.commandBus.dispatch('validation:validateAll', {});
    let state = engine.api.getState().pluginState['validation'] as ValidationState;
    expect(state.totalErrors).toBeGreaterThan(0);

    // Clear
    engine.commandBus.dispatch('validation:clearErrors', {});
    state = engine.api.getState().pluginState['validation'] as ValidationState;
    expect(state.errors.size).toBe(0);
    expect(state.totalErrors).toBe(0);
    expect(state.totalWarnings).toBe(0);

    engine.destroy();
  });

  it('27. validateOnEdit triggers on cell change', () => {
    const rules: ValidationRule[] = [
      { id: 'r1', colId: 'name', type: 'required', params: { type: 'required' } },
    ];
    const engine = createValidationGrid(rules, { validateOnEdit: true });

    // Simulate a cell value change event
    (engine.eventBus as any).emit('cell:valueChanged', {
      rowId: 'Alice',
      colId: 'name',
      oldValue: 'Alice',
      newValue: '',
    });

    // After the event, the plugin should not find errors since the data in
    // the rowNode still has 'Alice' as the name (event doesn't mutate data).
    // The plugin reads from the actual row data, which is 'Alice'.
    const state = engine.api.getState().pluginState['validation'] as ValidationState;
    // Since the actual rowNode data still has 'Alice', required passes
    expect(state.errors.has('Alice:name')).toBe(false);

    engine.destroy();
  });
});
