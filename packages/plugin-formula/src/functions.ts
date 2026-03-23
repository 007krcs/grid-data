// ─── Built-in Formula Functions ───

import type { FormulaFunction, FormulaError } from './types';

function toNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 1 : 0;
  if (typeof val === 'string') {
    const n = parseFloat(val);
    if (!isNaN(n)) return n;
  }
  return NaN;
}

function toString(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val);
}

function flattenArgs(args: unknown[]): unknown[] {
  const result: unknown[] = [];
  for (const arg of args) {
    if (Array.isArray(arg)) {
      for (const row of arg) {
        if (Array.isArray(row)) {
          result.push(...row);
        } else {
          result.push(row);
        }
      }
    } else {
      result.push(arg);
    }
  }
  return result;
}

function flattenNumbers(args: unknown[]): number[] {
  return flattenArgs(args)
    .map(toNumber)
    .filter((n) => !isNaN(n));
}

function makeError(type: FormulaError['type'], message: string): FormulaError {
  return { type, message } as FormulaError;
}

// ─── Math Functions ───

const SUM: FormulaFunction = {
  name: 'SUM',
  minArgs: 1,
  maxArgs: Infinity,
  evaluate: (args) => {
    const nums = flattenNumbers(args);
    return nums.reduce((a, b) => a + b, 0);
  },
};

const AVERAGE: FormulaFunction = {
  name: 'AVERAGE',
  minArgs: 1,
  maxArgs: Infinity,
  evaluate: (args) => {
    const nums = flattenNumbers(args);
    if (nums.length === 0) return makeError('#DIV/0!', 'No numeric values for AVERAGE');
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  },
};

const COUNT: FormulaFunction = {
  name: 'COUNT',
  minArgs: 1,
  maxArgs: Infinity,
  evaluate: (args) => {
    const flat = flattenArgs(args);
    return flat.filter((v) => typeof v === 'number' || (typeof v === 'string' && !isNaN(parseFloat(v)))).length;
  },
};

const COUNTA: FormulaFunction = {
  name: 'COUNTA',
  minArgs: 1,
  maxArgs: Infinity,
  evaluate: (args) => {
    const flat = flattenArgs(args);
    return flat.filter((v) => v !== null && v !== undefined && v !== '').length;
  },
};

const MIN_FN: FormulaFunction = {
  name: 'MIN',
  minArgs: 1,
  maxArgs: Infinity,
  evaluate: (args) => {
    const nums = flattenNumbers(args);
    if (nums.length === 0) return 0;
    return Math.min(...nums);
  },
};

const MAX_FN: FormulaFunction = {
  name: 'MAX',
  minArgs: 1,
  maxArgs: Infinity,
  evaluate: (args) => {
    const nums = flattenNumbers(args);
    if (nums.length === 0) return 0;
    return Math.max(...nums);
  },
};

const ABS_FN: FormulaFunction = {
  name: 'ABS',
  minArgs: 1,
  maxArgs: 1,
  evaluate: (args) => {
    const n = toNumber(args[0]);
    if (isNaN(n)) return makeError('#VALUE!', 'ABS requires a number');
    return Math.abs(n);
  },
};

const ROUND: FormulaFunction = {
  name: 'ROUND',
  minArgs: 1,
  maxArgs: 2,
  evaluate: (args) => {
    const n = toNumber(args[0]);
    const decimals = args.length > 1 ? toNumber(args[1]) : 0;
    if (isNaN(n)) return makeError('#VALUE!', 'ROUND requires a number');
    const factor = Math.pow(10, decimals);
    return Math.round(n * factor) / factor;
  },
};

const FLOOR_FN: FormulaFunction = {
  name: 'FLOOR',
  minArgs: 1,
  maxArgs: 1,
  evaluate: (args) => {
    const n = toNumber(args[0]);
    if (isNaN(n)) return makeError('#VALUE!', 'FLOOR requires a number');
    return Math.floor(n);
  },
};

const CEIL_FN: FormulaFunction = {
  name: 'CEIL',
  minArgs: 1,
  maxArgs: 1,
  evaluate: (args) => {
    const n = toNumber(args[0]);
    if (isNaN(n)) return makeError('#VALUE!', 'CEIL requires a number');
    return Math.ceil(n);
  },
};

const MOD: FormulaFunction = {
  name: 'MOD',
  minArgs: 2,
  maxArgs: 2,
  evaluate: (args) => {
    const n = toNumber(args[0]);
    const d = toNumber(args[1]);
    if (isNaN(n) || isNaN(d)) return makeError('#VALUE!', 'MOD requires numbers');
    if (d === 0) return makeError('#DIV/0!', 'Division by zero in MOD');
    return n - d * Math.floor(n / d);
  },
};

const POWER: FormulaFunction = {
  name: 'POWER',
  minArgs: 2,
  maxArgs: 2,
  evaluate: (args) => {
    const base = toNumber(args[0]);
    const exp = toNumber(args[1]);
    if (isNaN(base) || isNaN(exp)) return makeError('#VALUE!', 'POWER requires numbers');
    return Math.pow(base, exp);
  },
};

const SQRT_FN: FormulaFunction = {
  name: 'SQRT',
  minArgs: 1,
  maxArgs: 1,
  evaluate: (args) => {
    const n = toNumber(args[0]);
    if (isNaN(n)) return makeError('#VALUE!', 'SQRT requires a number');
    if (n < 0) return makeError('#VALUE!', 'SQRT of negative number');
    return Math.sqrt(n);
  },
};

const INT_FN: FormulaFunction = {
  name: 'INT',
  minArgs: 1,
  maxArgs: 1,
  evaluate: (args) => {
    const n = toNumber(args[0]);
    if (isNaN(n)) return makeError('#VALUE!', 'INT requires a number');
    return Math.floor(n);
  },
};

const RAND: FormulaFunction = {
  name: 'RAND',
  minArgs: 0,
  maxArgs: 0,
  evaluate: () => Math.random(),
};

// ─── Text Functions ───

const CONCATENATE: FormulaFunction = {
  name: 'CONCATENATE',
  minArgs: 1,
  maxArgs: Infinity,
  evaluate: (args) => {
    const flat = flattenArgs(args);
    return flat.map(toString).join('');
  },
};

const LEFT: FormulaFunction = {
  name: 'LEFT',
  minArgs: 1,
  maxArgs: 2,
  evaluate: (args) => {
    const str = toString(args[0]);
    const count = args.length > 1 ? toNumber(args[1]) : 1;
    if (isNaN(count)) return makeError('#VALUE!', 'LEFT count must be a number');
    return str.substring(0, count);
  },
};

const RIGHT: FormulaFunction = {
  name: 'RIGHT',
  minArgs: 1,
  maxArgs: 2,
  evaluate: (args) => {
    const str = toString(args[0]);
    const count = args.length > 1 ? toNumber(args[1]) : 1;
    if (isNaN(count)) return makeError('#VALUE!', 'RIGHT count must be a number');
    return str.substring(str.length - count);
  },
};

const MID: FormulaFunction = {
  name: 'MID',
  minArgs: 3,
  maxArgs: 3,
  evaluate: (args) => {
    const str = toString(args[0]);
    const start = toNumber(args[1]);
    const count = toNumber(args[2]);
    if (isNaN(start) || isNaN(count)) return makeError('#VALUE!', 'MID requires numeric start and count');
    // Excel MID is 1-based
    return str.substring(start - 1, start - 1 + count);
  },
};

const LEN: FormulaFunction = {
  name: 'LEN',
  minArgs: 1,
  maxArgs: 1,
  evaluate: (args) => toString(args[0]).length,
};

const TRIM_FN: FormulaFunction = {
  name: 'TRIM',
  minArgs: 1,
  maxArgs: 1,
  evaluate: (args) => toString(args[0]).trim(),
};

const UPPER: FormulaFunction = {
  name: 'UPPER',
  minArgs: 1,
  maxArgs: 1,
  evaluate: (args) => toString(args[0]).toUpperCase(),
};

const LOWER: FormulaFunction = {
  name: 'LOWER',
  minArgs: 1,
  maxArgs: 1,
  evaluate: (args) => toString(args[0]).toLowerCase(),
};

const SUBSTITUTE: FormulaFunction = {
  name: 'SUBSTITUTE',
  minArgs: 3,
  maxArgs: 4,
  evaluate: (args) => {
    const str = toString(args[0]);
    const oldText = toString(args[1]);
    const newText = toString(args[2]);
    if (args.length > 3) {
      // Replace nth occurrence
      const nth = toNumber(args[3]);
      if (isNaN(nth) || nth < 1) return makeError('#VALUE!', 'SUBSTITUTE instance must be >= 1');
      let count = 0;
      return str.replace(new RegExp(escapeRegex(oldText), 'g'), (match) => {
        count++;
        return count === nth ? newText : match;
      });
    }
    // Replace all occurrences
    return str.split(oldText).join(newText);
  },
};

const TEXT: FormulaFunction = {
  name: 'TEXT',
  minArgs: 2,
  maxArgs: 2,
  evaluate: (args) => {
    const val = toNumber(args[0]);
    const fmt = toString(args[1]);
    if (isNaN(val)) return toString(args[0]);
    // Simple format support: 0, 0.00, #,##0, etc.
    if (fmt.includes('.')) {
      const decimalPlaces = (fmt.split('.')[1] || '').replace(/[^0#]/g, '').length;
      return val.toFixed(decimalPlaces);
    }
    return val.toFixed(0);
  },
};

// ─── Logical Functions ───

const IF_FN: FormulaFunction = {
  name: 'IF',
  minArgs: 2,
  maxArgs: 3,
  evaluate: (args) => {
    const condition = args[0];
    const truthy = Boolean(condition) && condition !== 0 && condition !== '';
    if (truthy) return args[1];
    return args.length > 2 ? args[2] : false;
  },
};

const AND_FN: FormulaFunction = {
  name: 'AND',
  minArgs: 1,
  maxArgs: Infinity,
  evaluate: (args) => {
    const flat = flattenArgs(args);
    return flat.every((v) => Boolean(v) && v !== 0 && v !== '');
  },
};

const OR_FN: FormulaFunction = {
  name: 'OR',
  minArgs: 1,
  maxArgs: Infinity,
  evaluate: (args) => {
    const flat = flattenArgs(args);
    return flat.some((v) => Boolean(v) && v !== 0 && v !== '');
  },
};

const NOT_FN: FormulaFunction = {
  name: 'NOT',
  minArgs: 1,
  maxArgs: 1,
  evaluate: (args) => {
    const val = args[0];
    return !(Boolean(val) && val !== 0 && val !== '');
  },
};

const IFERROR: FormulaFunction = {
  name: 'IFERROR',
  minArgs: 2,
  maxArgs: 2,
  evaluate: (args) => {
    const val = args[0];
    if (val && typeof val === 'object' && 'type' in val && 'message' in val) {
      return args[1];
    }
    return val;
  },
};

// ─── Lookup Functions ───

const VLOOKUP: FormulaFunction = {
  name: 'VLOOKUP',
  minArgs: 3,
  maxArgs: 4,
  evaluate: (args) => {
    const lookupValue = args[0];
    const tableArray = args[1];
    const colIndexNum = toNumber(args[2]);
    // exactMatch param (4th arg): 0/FALSE = exact, TRUE = approximate (ignored, always exact)
    void (args.length > 3 ? args[3] : undefined);

    if (!Array.isArray(tableArray)) {
      return makeError('#VALUE!', 'VLOOKUP table_array must be a range');
    }
    if (isNaN(colIndexNum) || colIndexNum < 1) {
      return makeError('#VALUE!', 'VLOOKUP col_index_num must be >= 1');
    }

    // tableArray is a 2D array
    for (const row of tableArray) {
      if (!Array.isArray(row)) continue;
      if (row[0] === lookupValue || String(row[0]) === String(lookupValue)) {
        const idx = colIndexNum - 1;
        if (idx >= row.length) {
          return makeError('#REF!', 'VLOOKUP column index out of range');
        }
        return row[idx];
      }
    }
    return makeError('#N/A', 'VLOOKUP value not found');
  },
};

const INDEX_FN: FormulaFunction = {
  name: 'INDEX',
  minArgs: 2,
  maxArgs: 3,
  evaluate: (args) => {
    const array = args[0];
    const rowNum = toNumber(args[1]);
    const colNum = args.length > 2 ? toNumber(args[2]) : 1;

    if (!Array.isArray(array)) return makeError('#VALUE!', 'INDEX requires an array');
    if (isNaN(rowNum)) return makeError('#VALUE!', 'INDEX row_num must be a number');

    const rowIdx = rowNum - 1;
    if (rowIdx < 0 || rowIdx >= array.length) {
      return makeError('#REF!', 'INDEX row out of range');
    }

    const row = array[rowIdx];
    if (Array.isArray(row)) {
      const colIdx = colNum - 1;
      if (colIdx < 0 || colIdx >= row.length) {
        return makeError('#REF!', 'INDEX column out of range');
      }
      return row[colIdx];
    }
    return row;
  },
};

const MATCH_FN: FormulaFunction = {
  name: 'MATCH',
  minArgs: 2,
  maxArgs: 3,
  evaluate: (args) => {
    const lookupValue = args[0];
    const lookupArray = args[1];
    // matchType param (3rd arg): 0 = exact, 1 = less-than, -1 = greater-than (ignored, always exact)
    void (args.length > 2 ? args[2] : undefined);

    if (!Array.isArray(lookupArray)) {
      return makeError('#VALUE!', 'MATCH requires an array');
    }

    // Flatten 2D array to 1D
    const flat = lookupArray.flat();
    for (let i = 0; i < flat.length; i++) {
      if (flat[i] === lookupValue || String(flat[i]) === String(lookupValue)) {
        return i + 1; // 1-based
      }
    }
    return makeError('#N/A', 'MATCH value not found');
  },
};

const CHOOSE: FormulaFunction = {
  name: 'CHOOSE',
  minArgs: 2,
  maxArgs: Infinity,
  evaluate: (args) => {
    const idx = toNumber(args[0]);
    if (isNaN(idx) || idx < 1 || idx >= args.length) {
      return makeError('#VALUE!', 'CHOOSE index out of range');
    }
    return args[idx];
  },
};

// ─── Registry ───

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const builtinFunctions: Map<string, FormulaFunction> = new Map([
  // Math
  ['SUM', SUM],
  ['AVERAGE', AVERAGE],
  ['COUNT', COUNT],
  ['COUNTA', COUNTA],
  ['MIN', MIN_FN],
  ['MAX', MAX_FN],
  ['ABS', ABS_FN],
  ['ROUND', ROUND],
  ['FLOOR', FLOOR_FN],
  ['CEIL', CEIL_FN],
  ['MOD', MOD],
  ['POWER', POWER],
  ['SQRT', SQRT_FN],
  ['INT', INT_FN],
  ['RAND', RAND],
  // Text
  ['CONCATENATE', CONCATENATE],
  ['LEFT', LEFT],
  ['RIGHT', RIGHT],
  ['MID', MID],
  ['LEN', LEN],
  ['TRIM', TRIM_FN],
  ['UPPER', UPPER],
  ['LOWER', LOWER],
  ['SUBSTITUTE', SUBSTITUTE],
  ['TEXT', TEXT],
  // Logical
  ['IF', IF_FN],
  ['AND', AND_FN],
  ['OR', OR_FN],
  ['NOT', NOT_FN],
  ['IFERROR', IFERROR],
  // Lookup
  ['VLOOKUP', VLOOKUP],
  ['INDEX', INDEX_FN],
  ['MATCH', MATCH_FN],
  ['CHOOSE', CHOOSE],
]);

export function createFunctionRegistry(
  customFunctions?: FormulaFunction[],
): Map<string, FormulaFunction> {
  const registry = new Map(builtinFunctions);
  if (customFunctions) {
    for (const fn of customFunctions) {
      registry.set(fn.name.toUpperCase(), fn);
    }
  }
  return registry;
}
