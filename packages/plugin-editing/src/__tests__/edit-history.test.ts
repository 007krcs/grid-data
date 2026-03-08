import { describe, it, expect } from 'vitest';
import { EditHistory } from '../edit-history';
import type { EditRecord } from '../edit-history';
import {
  runValidation,
  required,
  minLength,
  maxLength,
  minValue,
  maxValue,
  pattern,
} from '../validators';

// ── Helper ──
function makeRecord(overrides: Partial<EditRecord> = {}): EditRecord {
  return {
    rowId: 'row-0',
    colId: 'name',
    oldValue: 'old',
    newValue: 'new',
    timestamp: Date.now(),
    ...overrides,
  };
}

// ─────────────────────────────
//  EditHistory
// ─────────────────────────────

describe('EditHistory', () => {
  describe('push', () => {
    it('adds a record', () => {
      const history = new EditHistory();
      history.push(makeRecord());

      expect(history.canUndo()).toBe(true);
      expect(history.getUndoCount()).toBe(1);
    });

    it('adds multiple records', () => {
      const history = new EditHistory();
      history.push(makeRecord({ colId: 'a' }));
      history.push(makeRecord({ colId: 'b' }));
      history.push(makeRecord({ colId: 'c' }));

      expect(history.getUndoCount()).toBe(3);
    });
  });

  describe('undo', () => {
    it('returns last record and removes it from undo stack', () => {
      const history = new EditHistory();
      const record1 = makeRecord({ colId: 'first' });
      const record2 = makeRecord({ colId: 'second' });
      history.push(record1);
      history.push(record2);

      const undone = history.undo();
      expect(undone).toEqual(record2);
      expect(history.getUndoCount()).toBe(1);
    });

    it('returns null when undo stack is empty', () => {
      const history = new EditHistory();
      expect(history.undo()).toBeNull();
    });

    it('moves record to redo stack', () => {
      const history = new EditHistory();
      history.push(makeRecord());

      history.undo();
      expect(history.canRedo()).toBe(true);
      expect(history.getRedoCount()).toBe(1);
    });
  });

  describe('redo', () => {
    it('returns previously undone record', () => {
      const history = new EditHistory();
      const record = makeRecord({ colId: 'test' });
      history.push(record);

      history.undo();
      const redone = history.redo();

      expect(redone).toEqual(record);
      expect(history.canUndo()).toBe(true);
      expect(history.canRedo()).toBe(false);
    });

    it('returns null when redo stack is empty', () => {
      const history = new EditHistory();
      expect(history.redo()).toBeNull();
    });

    it('moves record back to undo stack', () => {
      const history = new EditHistory();
      history.push(makeRecord());

      history.undo();
      expect(history.getUndoCount()).toBe(0);

      history.redo();
      expect(history.getUndoCount()).toBe(1);
      expect(history.getRedoCount()).toBe(0);
    });
  });

  describe('push clears redo stack', () => {
    it('clears redo stack when new edit is pushed', () => {
      const history = new EditHistory();
      history.push(makeRecord({ colId: 'a' }));
      history.push(makeRecord({ colId: 'b' }));

      // Undo to create redo entries
      history.undo();
      expect(history.canRedo()).toBe(true);

      // Push a new record — redo should be cleared
      history.push(makeRecord({ colId: 'c' }));
      expect(history.canRedo()).toBe(false);
      expect(history.getRedoCount()).toBe(0);
    });
  });

  describe('maxSize', () => {
    it('limits undo stack size', () => {
      const history = new EditHistory(3);
      history.push(makeRecord({ colId: 'a' }));
      history.push(makeRecord({ colId: 'b' }));
      history.push(makeRecord({ colId: 'c' }));
      history.push(makeRecord({ colId: 'd' }));

      expect(history.getUndoCount()).toBe(3);

      // The first record ('a') should have been evicted
      const r1 = history.undo();
      expect(r1!.colId).toBe('d');
      const r2 = history.undo();
      expect(r2!.colId).toBe('c');
      const r3 = history.undo();
      expect(r3!.colId).toBe('b');
      expect(history.undo()).toBeNull(); // 'a' was evicted
    });
  });

  describe('clear', () => {
    it('resets both undo and redo stacks', () => {
      const history = new EditHistory();
      history.push(makeRecord({ colId: 'a' }));
      history.push(makeRecord({ colId: 'b' }));
      history.undo();

      expect(history.canUndo()).toBe(true);
      expect(history.canRedo()).toBe(true);

      history.clear();

      expect(history.canUndo()).toBe(false);
      expect(history.canRedo()).toBe(false);
      expect(history.getUndoCount()).toBe(0);
      expect(history.getRedoCount()).toBe(0);
    });
  });

  describe('canUndo / canRedo', () => {
    it('canUndo returns false when empty', () => {
      const history = new EditHistory();
      expect(history.canUndo()).toBe(false);
    });

    it('canUndo returns true when records exist', () => {
      const history = new EditHistory();
      history.push(makeRecord());
      expect(history.canUndo()).toBe(true);
    });

    it('canRedo returns false when empty', () => {
      const history = new EditHistory();
      expect(history.canRedo()).toBe(false);
    });

    it('canRedo returns true after undo', () => {
      const history = new EditHistory();
      history.push(makeRecord());
      history.undo();
      expect(history.canRedo()).toBe(true);
    });

    it('canRedo returns false after redo', () => {
      const history = new EditHistory();
      history.push(makeRecord());
      history.undo();
      history.redo();
      expect(history.canRedo()).toBe(false);
    });
  });
});

// ─────────────────────────────
//  Validators
// ─────────────────────────────

describe('Validators', () => {
  describe('required', () => {
    it('rejects empty string', async () => {
      const rule = required();
      expect(rule.validate('', {})).toBe(false);
    });

    it('rejects null', async () => {
      const rule = required();
      expect(rule.validate(null, {})).toBe(false);
    });

    it('rejects undefined', async () => {
      const rule = required();
      expect(rule.validate(undefined, {})).toBe(false);
    });

    it('rejects whitespace-only string', async () => {
      const rule = required();
      expect(rule.validate('   ', {})).toBe(false);
    });

    it('accepts non-empty values', async () => {
      const rule = required();
      expect(rule.validate('hello', {})).toBe(true);
      expect(rule.validate(42, {})).toBe(true);
      expect(rule.validate(0, {})).toBe(true);
    });

    it('uses custom error message', () => {
      const rule = required('Name cannot be empty');
      expect(rule.message).toBe('Name cannot be empty');
    });
  });

  describe('minLength', () => {
    it('rejects strings shorter than minimum', () => {
      const rule = minLength(5);
      expect(rule.validate('abc', {})).toBe(false);
    });

    it('accepts strings at minimum length', () => {
      const rule = minLength(3);
      expect(rule.validate('abc', {})).toBe(true);
    });

    it('accepts strings longer than minimum', () => {
      const rule = minLength(3);
      expect(rule.validate('abcdef', {})).toBe(true);
    });

    it('uses custom error message', () => {
      const rule = minLength(5, 'Too short!');
      expect(rule.message).toBe('Too short!');
    });
  });

  describe('maxLength', () => {
    it('rejects strings longer than maximum', () => {
      const rule = maxLength(3);
      expect(rule.validate('abcdef', {})).toBe(false);
    });

    it('accepts strings at maximum length', () => {
      const rule = maxLength(3);
      expect(rule.validate('abc', {})).toBe(true);
    });

    it('accepts strings shorter than maximum', () => {
      const rule = maxLength(5);
      expect(rule.validate('ab', {})).toBe(true);
    });

    it('uses default error message', () => {
      const rule = maxLength(10);
      expect(rule.message).toBe('Maximum length is 10');
    });
  });

  describe('minValue', () => {
    it('rejects numbers below minimum', () => {
      const rule = minValue(10);
      expect(rule.validate(5, {})).toBe(false);
    });

    it('accepts numbers at minimum', () => {
      const rule = minValue(10);
      expect(rule.validate(10, {})).toBe(true);
    });

    it('accepts numbers above minimum', () => {
      const rule = minValue(10);
      expect(rule.validate(20, {})).toBe(true);
    });
  });

  describe('maxValue', () => {
    it('rejects numbers above maximum', () => {
      const rule = maxValue(100);
      expect(rule.validate(150, {})).toBe(false);
    });

    it('accepts numbers at maximum', () => {
      const rule = maxValue(100);
      expect(rule.validate(100, {})).toBe(true);
    });

    it('accepts numbers below maximum', () => {
      const rule = maxValue(100);
      expect(rule.validate(50, {})).toBe(true);
    });
  });

  describe('pattern', () => {
    it('rejects non-matching strings', () => {
      const rule = pattern(/^\d+$/);
      expect(rule.validate('abc', {})).toBe(false);
    });

    it('accepts matching strings', () => {
      const rule = pattern(/^\d+$/);
      expect(rule.validate('12345', {})).toBe(true);
    });

    it('uses custom error message', () => {
      const rule = pattern(/^\d+$/, 'Numbers only');
      expect(rule.message).toBe('Numbers only');
    });

    it('handles email pattern', () => {
      const rule = pattern(/^[^@]+@[^@]+\.[^@]+$/);
      expect(rule.validate('user@example.com', {})).toBe(true);
      expect(rule.validate('not-an-email', {})).toBe(false);
    });
  });

  describe('runValidation', () => {
    it('returns valid:true when all rules pass', async () => {
      const result = await runValidation(
        [required(), minLength(2), maxLength(10)],
        'hello',
        {},
      );
      expect(result.valid).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it('returns error messages when rules fail', async () => {
      const result = await runValidation(
        [required('Name is required')],
        '',
        {},
      );
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Name is required');
    });

    it('returns first failing rule message', async () => {
      const result = await runValidation(
        [required('Required'), minLength(10, 'Too short')],
        'hi',
        {},
      );
      // 'hi' passes required but fails minLength
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Too short');
    });

    it('handles async validators', async () => {
      const asyncRule = {
        validate: async (value: any, _data: any) => {
          // Simulate async validation (e.g., server-side uniqueness check)
          return value === 'taken' ? 'Username is already taken' : true;
        },
        message: 'Async validation failed',
      };

      const validResult = await runValidation([asyncRule], 'available', {});
      expect(validResult.valid).toBe(true);

      const invalidResult = await runValidation([asyncRule], 'taken', {});
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.message).toBe('Username is already taken');
    });

    it('handles empty rules array', async () => {
      const result = await runValidation([], 'anything', {});
      expect(result.valid).toBe(true);
    });

    it('returns false with default message when validate returns false without custom message', async () => {
      const rule = {
        validate: () => false,
      };
      const result = await runValidation([rule], 'value', {});
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Validation failed');
    });

    it('supports mixed sync and async validators', async () => {
      const syncRule = required('Cannot be empty');
      const asyncRule = {
        validate: async (value: any, _data: any): Promise<boolean | string> => {
          return String(value).length >= 3 ? true : 'Must be at least 3 chars';
        },
      };

      const result = await runValidation([syncRule, asyncRule], 'ab', {});
      expect(result.valid).toBe(false);
      expect(result.message).toBe('Must be at least 3 chars');

      const valid = await runValidation([syncRule, asyncRule], 'abc', {});
      expect(valid.valid).toBe(true);
    });
  });
});
