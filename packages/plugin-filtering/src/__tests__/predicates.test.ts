import { describe, it, expect } from 'vitest';
import {
  createFilterPredicate,
  textMatches,
  numberMatches,
  dateMatches,
  setMatches,
} from '../predicates';

describe('textMatches', () => {
  describe('equals', () => {
    it('returns true when cell value equals filter value', () => {
      expect(textMatches('Alice', 'Alice', 'equals', true)).toBe(true);
    });

    it('returns false when cell value does not equal filter value', () => {
      expect(textMatches('Alice', 'Bob', 'equals', true)).toBe(false);
    });
  });

  describe('notEqual', () => {
    it('returns true when cell value does not equal filter value', () => {
      expect(textMatches('Alice', 'Bob', 'notEqual', true)).toBe(true);
    });

    it('returns false when cell value equals filter value', () => {
      expect(textMatches('Alice', 'Alice', 'notEqual', true)).toBe(false);
    });
  });

  describe('contains', () => {
    it('returns true when cell value contains filter value', () => {
      expect(textMatches('Hello World', 'World', 'contains', true)).toBe(true);
    });

    it('returns false when cell value does not contain filter value', () => {
      expect(textMatches('Hello World', 'Foo', 'contains', true)).toBe(false);
    });
  });

  describe('startsWith', () => {
    it('returns true when cell value starts with filter value', () => {
      expect(textMatches('Hello World', 'Hello', 'startsWith', true)).toBe(true);
    });

    it('returns false when cell value does not start with filter value', () => {
      expect(textMatches('Hello World', 'World', 'startsWith', true)).toBe(false);
    });
  });

  describe('endsWith', () => {
    it('returns true when cell value ends with filter value', () => {
      expect(textMatches('Hello World', 'World', 'endsWith', true)).toBe(true);
    });

    it('returns false when cell value does not end with filter value', () => {
      expect(textMatches('Hello World', 'Hello', 'endsWith', true)).toBe(false);
    });
  });

  describe('case insensitive mode', () => {
    it('matches regardless of case when caseSensitive is false', () => {
      expect(textMatches('Alice', 'alice', 'equals', false)).toBe(true);
      expect(textMatches('HELLO WORLD', 'hello', 'contains', false)).toBe(true);
      expect(textMatches('Hello World', 'hello', 'startsWith', false)).toBe(true);
      expect(textMatches('Hello World', 'WORLD', 'endsWith', false)).toBe(true);
    });

    it('does not match different case when caseSensitive is true', () => {
      expect(textMatches('Alice', 'alice', 'equals', true)).toBe(false);
      expect(textMatches('HELLO', 'hello', 'contains', true)).toBe(false);
    });
  });

  describe('null handling', () => {
    it('returns false for null cell value on non-blank type', () => {
      expect(textMatches(null, 'Alice', 'equals', true)).toBe(false);
    });

    it('returns true for null cell value on blank type', () => {
      expect(textMatches(null, '', 'blank', true)).toBe(true);
    });
  });
});

describe('numberMatches', () => {
  describe('equals', () => {
    it('returns true when number equals filter value', () => {
      expect(numberMatches(42, 42, null, 'equals')).toBe(true);
    });

    it('returns false when number does not equal filter value', () => {
      expect(numberMatches(42, 43, null, 'equals')).toBe(false);
    });
  });

  describe('lessThan', () => {
    it('returns true when number is less than filter value', () => {
      expect(numberMatches(10, 20, null, 'lessThan')).toBe(true);
    });

    it('returns false when number is not less than filter value', () => {
      expect(numberMatches(20, 10, null, 'lessThan')).toBe(false);
    });
  });

  describe('greaterThan', () => {
    it('returns true when number is greater than filter value', () => {
      expect(numberMatches(20, 10, null, 'greaterThan')).toBe(true);
    });

    it('returns false when number is not greater than filter value', () => {
      expect(numberMatches(10, 20, null, 'greaterThan')).toBe(false);
    });
  });

  describe('inRange', () => {
    it('returns true when number is within range', () => {
      expect(numberMatches(15, 10, 20, 'inRange')).toBe(true);
    });

    it('returns true for boundary values (inclusive)', () => {
      expect(numberMatches(10, 10, 20, 'inRange')).toBe(true);
      expect(numberMatches(20, 10, 20, 'inRange')).toBe(true);
    });

    it('returns false when number is outside range', () => {
      expect(numberMatches(25, 10, 20, 'inRange')).toBe(false);
    });
  });

  describe('null handling', () => {
    it('returns false for null cell value on non-blank type', () => {
      expect(numberMatches(null, 10, null, 'equals')).toBe(false);
    });

    it('returns false for NaN cell value', () => {
      expect(numberMatches('abc', 10, null, 'equals')).toBe(false);
    });
  });
});

describe('dateMatches', () => {
  describe('equals', () => {
    it('returns true when dates are equal', () => {
      expect(dateMatches('2024-01-15', '2024-01-15', null, 'equals')).toBe(true);
    });

    it('returns false when dates are not equal', () => {
      expect(dateMatches('2024-01-15', '2024-02-15', null, 'equals')).toBe(false);
    });
  });

  describe('lessThan', () => {
    it('returns true when cell date is before filter date', () => {
      expect(dateMatches('2024-01-01', '2024-06-01', null, 'lessThan')).toBe(true);
    });

    it('returns false when cell date is after filter date', () => {
      expect(dateMatches('2024-06-01', '2024-01-01', null, 'lessThan')).toBe(false);
    });
  });

  describe('greaterThan', () => {
    it('returns true when cell date is after filter date', () => {
      expect(dateMatches('2024-06-01', '2024-01-01', null, 'greaterThan')).toBe(true);
    });

    it('returns false when cell date is before filter date', () => {
      expect(dateMatches('2024-01-01', '2024-06-01', null, 'greaterThan')).toBe(false);
    });
  });

  describe('inRange', () => {
    it('returns true when date is within range', () => {
      expect(
        dateMatches('2024-03-15', '2024-01-01', '2024-06-01', 'inRange'),
      ).toBe(true);
    });

    it('returns true for boundary values (inclusive)', () => {
      expect(
        dateMatches('2024-01-01', '2024-01-01', '2024-06-01', 'inRange'),
      ).toBe(true);
    });

    it('returns false when date is outside range', () => {
      expect(
        dateMatches('2024-12-01', '2024-01-01', '2024-06-01', 'inRange'),
      ).toBe(false);
    });
  });

  describe('null handling', () => {
    it('returns false for null cell value on non-blank type', () => {
      expect(dateMatches(null, '2024-01-01', null, 'equals')).toBe(false);
    });

    it('returns true for null cell value on blank type', () => {
      expect(dateMatches(null, null, null, 'blank')).toBe(true);
    });
  });
});

describe('setMatches', () => {
  it('returns true when value is in the set', () => {
    expect(setMatches('apple', ['apple', 'banana', 'cherry'])).toBe(true);
  });

  it('returns false when value is not in the set', () => {
    expect(setMatches('grape', ['apple', 'banana', 'cherry'])).toBe(false);
  });

  it('returns true when values array is empty (no filter)', () => {
    expect(setMatches('anything', [])).toBe(true);
  });

  it('handles null value correctly', () => {
    expect(setMatches(null, ['apple', 'banana'])).toBe(false);
    expect(setMatches(null, [null, 'banana'])).toBe(true);
  });
});

describe('createFilterPredicate', () => {
  describe('text filter', () => {
    it('creates a text filter predicate', () => {
      const predicate = createFilterPredicate({
        filterType: 'text',
        type: 'contains',
        filter: 'lic',
      });

      expect(predicate('Alice')).toBe(true);
      expect(predicate('Bob')).toBe(false);
    });

    it('respects case sensitivity', () => {
      const caseInsensitive = createFilterPredicate(
        { filterType: 'text', type: 'equals', filter: 'alice' },
        false,
      );
      expect(caseInsensitive('Alice')).toBe(true);

      const caseSensitive = createFilterPredicate(
        { filterType: 'text', type: 'equals', filter: 'alice' },
        true,
      );
      expect(caseSensitive('Alice')).toBe(false);
    });
  });

  describe('number filter', () => {
    it('creates a number filter predicate', () => {
      const predicate = createFilterPredicate({
        filterType: 'number',
        type: 'greaterThan',
        filter: 50,
      });

      expect(predicate(100)).toBe(true);
      expect(predicate(30)).toBe(false);
    });

    it('handles inRange filter', () => {
      const predicate = createFilterPredicate({
        filterType: 'number',
        type: 'inRange',
        filter: 10,
        filterTo: 50,
      });

      expect(predicate(25)).toBe(true);
      expect(predicate(100)).toBe(false);
    });
  });

  describe('compound filter with AND', () => {
    it('returns true only when all conditions pass', () => {
      const predicate = createFilterPredicate({
        filterType: 'number',
        operator: 'AND',
        conditions: [
          { filterType: 'number', type: 'greaterThan', filter: 10 },
          { filterType: 'number', type: 'lessThan', filter: 50 },
        ],
      });

      expect(predicate(25)).toBe(true); // > 10 AND < 50
      expect(predicate(5)).toBe(false); // not > 10
      expect(predicate(60)).toBe(false); // not < 50
    });
  });

  describe('compound filter with OR', () => {
    it('returns true when any condition passes', () => {
      const predicate = createFilterPredicate({
        filterType: 'number',
        operator: 'OR',
        conditions: [
          { filterType: 'number', type: 'lessThan', filter: 10 },
          { filterType: 'number', type: 'greaterThan', filter: 90 },
        ],
      });

      expect(predicate(5)).toBe(true); // < 10
      expect(predicate(95)).toBe(true); // > 90
      expect(predicate(50)).toBe(false); // neither < 10 nor > 90
    });
  });

  describe('blank and notBlank operators', () => {
    it('handles blank operator for text', () => {
      const predicate = createFilterPredicate({
        filterType: 'text',
        type: 'blank',
      });

      expect(predicate(null)).toBe(true);
      expect(predicate('')).toBe(true);
      expect(predicate('  ')).toBe(true);
      expect(predicate('hello')).toBe(false);
    });

    it('handles notBlank operator for text', () => {
      const predicate = createFilterPredicate({
        filterType: 'text',
        type: 'notBlank',
      });

      expect(predicate('hello')).toBe(true);
      expect(predicate(null)).toBe(false);
      expect(predicate('')).toBe(false);
      expect(predicate('  ')).toBe(false);
    });

    it('handles blank operator for number', () => {
      const predicate = createFilterPredicate({
        filterType: 'number',
        type: 'blank',
      });

      expect(predicate(null)).toBe(true);
      expect(predicate(42)).toBe(false);
    });

    it('handles notBlank operator for number', () => {
      const predicate = createFilterPredicate({
        filterType: 'number',
        type: 'notBlank',
      });

      expect(predicate(42)).toBe(true);
      expect(predicate(null)).toBe(false);
    });
  });

  describe('date filter', () => {
    it('creates a date filter predicate', () => {
      const predicate = createFilterPredicate({
        filterType: 'date',
        type: 'greaterThan',
        dateFrom: '2024-06-01',
      });

      expect(predicate('2024-09-01')).toBe(true);
      expect(predicate('2024-01-01')).toBe(false);
    });

    it('handles date inRange filter', () => {
      const predicate = createFilterPredicate({
        filterType: 'date',
        type: 'inRange',
        dateFrom: '2024-01-01',
        dateTo: '2024-06-01',
      });

      expect(predicate('2024-03-15')).toBe(true);
      expect(predicate('2024-09-01')).toBe(false);
    });
  });

  describe('set filter', () => {
    it('creates a set filter predicate', () => {
      const predicate = createFilterPredicate({
        filterType: 'set',
        values: ['Engineering', 'Sales'],
      });

      expect(predicate('Engineering')).toBe(true);
      expect(predicate('Sales')).toBe(true);
      expect(predicate('Marketing')).toBe(false);
    });

    it('returns true for all values when values array is empty', () => {
      const predicate = createFilterPredicate({
        filterType: 'set',
        values: [],
      });

      expect(predicate('anything')).toBe(true);
    });
  });

  describe('unknown filter type', () => {
    it('returns true for unknown filter types', () => {
      const predicate = createFilterPredicate({
        filterType: 'unknown' as any,
      });

      expect(predicate('anything')).toBe(true);
    });
  });
});
