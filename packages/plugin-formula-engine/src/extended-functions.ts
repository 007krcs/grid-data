// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Extended Excel-Compatible Functions ───
// 40+ functions across Conditional, Lookup, Math, Text, Date, and Information categories.

import { makeError, isFormulaError } from './error-types';

// ── Helpers ──

function toNumber(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'boolean') return val ? 1 : 0;
  if (typeof val === 'number') return val;
  const n = Number(val);
  return n;
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
          for (const cell of row) {
            result.push(cell);
          }
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

/**
 * Excel-style criteria matching.
 * Supports: ">5", "<>0", ">=10", "<=3", "=exact", "text*" wildcards, plain equality.
 */
function matchesCriteria(value: unknown, criteria: unknown): boolean {
  if (criteria === null || criteria === undefined) return value === null || value === undefined;

  const critStr = String(criteria);

  // Operator-based numeric comparison
  const opMatch = critStr.match(/^(>=|<=|<>|>|<|=)(.*)$/);
  if (opMatch) {
    const op = opMatch[1]!;
    const comparand = opMatch[2]!;

    // "=" prefix means exact match
    if (op === '=') {
      const numComparand = Number(comparand);
      if (!isNaN(numComparand) && comparand !== '') {
        return toNumber(value) === numComparand;
      }
      return String(value).toLowerCase() === comparand.toLowerCase();
    }

    // "<>" means not equal
    if (op === '<>') {
      const numComparand = Number(comparand);
      if (!isNaN(numComparand) && comparand !== '') {
        return toNumber(value) !== numComparand;
      }
      return String(value).toLowerCase() !== comparand.toLowerCase();
    }

    // Numeric comparisons
    const numVal = toNumber(value);
    const numCrit = Number(comparand);
    if (isNaN(numCrit)) return false;

    switch (op) {
      case '>': return numVal > numCrit;
      case '<': return numVal < numCrit;
      case '>=': return numVal >= numCrit;
      case '<=': return numVal <= numCrit;
    }
  }

  // Wildcard matching (* and ?)
  if (typeof criteria === 'string' && (critStr.includes('*') || critStr.includes('?'))) {
    const regexStr = critStr
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');
    const regex = new RegExp(`^${regexStr}$`, 'i');
    return regex.test(String(value));
  }

  // Exact numeric match
  if (typeof criteria === 'number') {
    return toNumber(value) === criteria;
  }

  // Case-insensitive string equality
  return String(value).toLowerCase() === critStr.toLowerCase();
}

/**
 * Flatten a 2D range to a 1D array of values, preserving order.
 */
function flattenRange(range: unknown): unknown[] {
  if (!Array.isArray(range)) return [range];
  const result: unknown[] = [];
  for (const row of range) {
    if (Array.isArray(row)) {
      for (const cell of row) {
        result.push(cell);
      }
    } else {
      result.push(row);
    }
  }
  return result;
}

// ── Function interface matching the base formula plugin ──

interface FormulaFunction {
  name: string;
  minArgs: number;
  maxArgs: number;
  evaluate: (args: unknown[]) => unknown;
}

// ── Function Definitions ──

// --- Conditional ---

const SUMIF: FormulaFunction = {
  name: 'SUMIF',
  minArgs: 2,
  maxArgs: 3,
  evaluate(args) {
    const range = flattenRange(args[0]);
    const criteria = args[1];
    const sumRange = args.length >= 3 ? flattenRange(args[2]) : range;

    let sum = 0;
    for (let i = 0; i < range.length; i++) {
      if (matchesCriteria(range[i], criteria)) {
        const val = i < sumRange.length ? toNumber(sumRange[i]) : 0;
        if (!isNaN(val)) sum += val;
      }
    }
    return sum;
  },
};

const COUNTIF: FormulaFunction = {
  name: 'COUNTIF',
  minArgs: 2,
  maxArgs: 2,
  evaluate(args) {
    const range = flattenRange(args[0]);
    const criteria = args[1];
    let count = 0;
    for (const val of range) {
      if (matchesCriteria(val, criteria)) count++;
    }
    return count;
  },
};

const AVERAGEIF: FormulaFunction = {
  name: 'AVERAGEIF',
  minArgs: 2,
  maxArgs: 3,
  evaluate(args) {
    const range = flattenRange(args[0]);
    const criteria = args[1];
    const avgRange = args.length >= 3 ? flattenRange(args[2]) : range;

    let sum = 0;
    let count = 0;
    for (let i = 0; i < range.length; i++) {
      if (matchesCriteria(range[i], criteria)) {
        const val = i < avgRange.length ? toNumber(avgRange[i]) : 0;
        if (!isNaN(val)) {
          sum += val;
          count++;
        }
      }
    }
    return count === 0 ? makeError('#DIV/0!', 'No matching values') : sum / count;
  },
};

const SUMIFS: FormulaFunction = {
  name: 'SUMIFS',
  minArgs: 3,
  maxArgs: 255,
  evaluate(args) {
    const sumRange = flattenRange(args[0]);
    // Pairs: criteriaRange1, criteria1, criteriaRange2, criteria2, ...
    const pairs: Array<{ range: unknown[]; criteria: unknown }> = [];
    for (let i = 1; i < args.length - 1; i += 2) {
      pairs.push({ range: flattenRange(args[i]), criteria: args[i + 1] });
    }

    let sum = 0;
    for (let i = 0; i < sumRange.length; i++) {
      const allMatch = pairs.every((p) => i < p.range.length && matchesCriteria(p.range[i], p.criteria));
      if (allMatch) {
        const val = toNumber(sumRange[i]);
        if (!isNaN(val)) sum += val;
      }
    }
    return sum;
  },
};

const COUNTIFS: FormulaFunction = {
  name: 'COUNTIFS',
  minArgs: 2,
  maxArgs: 255,
  evaluate(args) {
    // Pairs: criteriaRange1, criteria1, criteriaRange2, criteria2, ...
    const pairs: Array<{ range: unknown[]; criteria: unknown }> = [];
    for (let i = 0; i < args.length - 1; i += 2) {
      pairs.push({ range: flattenRange(args[i]), criteria: args[i + 1] });
    }

    if (pairs.length === 0) return 0;
    const len = pairs[0]!.range.length;
    let count = 0;
    for (let i = 0; i < len; i++) {
      const allMatch = pairs.every((p) => i < p.range.length && matchesCriteria(p.range[i], p.criteria));
      if (allMatch) count++;
    }
    return count;
  },
};

const IFS: FormulaFunction = {
  name: 'IFS',
  minArgs: 2,
  maxArgs: 254,
  evaluate(args) {
    for (let i = 0; i < args.length - 1; i += 2) {
      if (args[i]) return args[i + 1];
    }
    return makeError('#N/A', 'No TRUE condition in IFS');
  },
};

const SWITCH: FormulaFunction = {
  name: 'SWITCH',
  minArgs: 3,
  maxArgs: 254,
  evaluate(args) {
    const expression = args[0];
    // Pairs after expression: case1, result1, case2, result2, ..., [default]
    const remaining = args.slice(1);
    for (let i = 0; i < remaining.length - 1; i += 2) {
      if (remaining[i] === expression) return remaining[i + 1];
    }
    // If odd number of remaining args, last is default
    if (remaining.length % 2 === 1) return remaining[remaining.length - 1];
    return makeError('#N/A', 'No match in SWITCH');
  },
};

// --- Lookup ---

const HLOOKUP: FormulaFunction = {
  name: 'HLOOKUP',
  minArgs: 3,
  maxArgs: 4,
  evaluate(args) {
    const lookupValue = args[0];
    const table = args[1] as unknown[][];
    const rowIndex = toNumber(args[2]);
    const rangeLookup = args.length >= 4 ? Boolean(args[3]) : true;

    if (!Array.isArray(table) || table.length === 0) {
      return makeError('#REF!', 'Invalid table');
    }
    if (rowIndex < 1 || rowIndex > table.length) {
      return makeError('#REF!', 'Row index out of bounds');
    }

    const headerRow = table[0]!;
    let colIdx = -1;

    if (!rangeLookup) {
      // Exact match
      colIdx = headerRow.indexOf(lookupValue);
      if (colIdx === -1) {
        // Try numeric comparison
        for (let i = 0; i < headerRow.length; i++) {
          if (toNumber(headerRow[i]) === toNumber(lookupValue) && typeof lookupValue === 'number') {
            colIdx = i;
            break;
          }
        }
      }
    } else {
      // Approximate match (sorted ascending) - find largest value <= lookupValue
      for (let i = 0; i < headerRow.length; i++) {
        if (toNumber(headerRow[i]) <= toNumber(lookupValue)) {
          colIdx = i;
        } else {
          break;
        }
      }
    }

    if (colIdx === -1) return makeError('#N/A', 'Value not found');
    const resultRow = table[rowIndex - 1];
    return resultRow ? resultRow[colIdx] : makeError('#REF!', 'Row index out of bounds');
  },
};

const XLOOKUP: FormulaFunction = {
  name: 'XLOOKUP',
  minArgs: 3,
  maxArgs: 5,
  evaluate(args) {
    const lookupValue = args[0];
    const lookupArray = flattenRange(args[1]);
    const returnArray = flattenRange(args[2]);
    const ifNotFound = args.length >= 4 ? args[3] : makeError('#N/A', 'Not found');
    const matchMode = args.length >= 5 ? toNumber(args[4]) : 0;

    for (let i = 0; i < lookupArray.length; i++) {
      const val = lookupArray[i];
      let matched = false;

      if (matchMode === 0) {
        // Exact match
        if (val === lookupValue) matched = true;
        else if (typeof lookupValue === 'number' && toNumber(val) === lookupValue) matched = true;
        else if (typeof lookupValue === 'string' && String(val).toLowerCase() === lookupValue.toLowerCase()) matched = true;
      } else if (matchMode === -1) {
        // Exact match or next smaller
        matched = val === lookupValue;
      } else if (matchMode === 1) {
        // Exact match or next larger
        matched = val === lookupValue;
      } else if (matchMode === 2) {
        // Wildcard match
        matched = matchesCriteria(val, lookupValue);
      }

      if (matched) {
        return i < returnArray.length ? returnArray[i] : makeError('#N/A', 'Return array too short');
      }
    }

    return ifNotFound;
  },
};

// --- Math ---

const ROUNDUP: FormulaFunction = {
  name: 'ROUNDUP',
  minArgs: 2,
  maxArgs: 2,
  evaluate(args) {
    const num = toNumber(args[0]);
    const digits = toNumber(args[1]);
    if (isNaN(num)) return makeError('#VALUE!', 'Not a number');
    const factor = Math.pow(10, digits);
    return num >= 0
      ? Math.ceil(num * factor) / factor
      : -Math.ceil(Math.abs(num) * factor) / factor;
  },
};

const ROUNDDOWN: FormulaFunction = {
  name: 'ROUNDDOWN',
  minArgs: 2,
  maxArgs: 2,
  evaluate(args) {
    const num = toNumber(args[0]);
    const digits = toNumber(args[1]);
    if (isNaN(num)) return makeError('#VALUE!', 'Not a number');
    const factor = Math.pow(10, digits);
    return num >= 0
      ? Math.floor(num * factor) / factor
      : -Math.floor(Math.abs(num) * factor) / factor;
  },
};

const CEILING: FormulaFunction = {
  name: 'CEILING',
  minArgs: 2,
  maxArgs: 2,
  evaluate(args) {
    const num = toNumber(args[0]);
    const significance = toNumber(args[1]);
    if (isNaN(num) || isNaN(significance)) return makeError('#VALUE!', 'Not a number');
    if (significance === 0) return 0;
    return Math.ceil(num / significance) * significance;
  },
};

const FLOOR_FN: FormulaFunction = {
  name: 'FLOOR',
  minArgs: 2,
  maxArgs: 2,
  evaluate(args) {
    const num = toNumber(args[0]);
    const significance = toNumber(args[1]);
    if (isNaN(num) || isNaN(significance)) return makeError('#VALUE!', 'Not a number');
    if (significance === 0) return 0;
    return Math.floor(num / significance) * significance;
  },
};

const SIGN: FormulaFunction = {
  name: 'SIGN',
  minArgs: 1,
  maxArgs: 1,
  evaluate(args) {
    const num = toNumber(args[0]);
    if (isNaN(num)) return makeError('#VALUE!', 'Not a number');
    return Math.sign(num);
  },
};

const LOG: FormulaFunction = {
  name: 'LOG',
  minArgs: 1,
  maxArgs: 2,
  evaluate(args) {
    const num = toNumber(args[0]);
    const base = args.length >= 2 ? toNumber(args[1]) : 10;
    if (isNaN(num) || num <= 0) return makeError('#NUM!', 'Invalid argument');
    if (isNaN(base) || base <= 0 || base === 1) return makeError('#NUM!', 'Invalid base');
    return Math.log(num) / Math.log(base);
  },
};

const LN: FormulaFunction = {
  name: 'LN',
  minArgs: 1,
  maxArgs: 1,
  evaluate(args) {
    const num = toNumber(args[0]);
    if (isNaN(num) || num <= 0) return makeError('#NUM!', 'Invalid argument');
    return Math.log(num);
  },
};

const EXP: FormulaFunction = {
  name: 'EXP',
  minArgs: 1,
  maxArgs: 1,
  evaluate(args) {
    const num = toNumber(args[0]);
    if (isNaN(num)) return makeError('#VALUE!', 'Not a number');
    return Math.exp(num);
  },
};

const PI: FormulaFunction = {
  name: 'PI',
  minArgs: 0,
  maxArgs: 0,
  evaluate(_args) {
    return Math.PI;
  },
};

const RANDBETWEEN: FormulaFunction = {
  name: 'RANDBETWEEN',
  minArgs: 2,
  maxArgs: 2,
  evaluate(args) {
    const bottom = Math.ceil(toNumber(args[0]));
    const top = Math.floor(toNumber(args[1]));
    if (isNaN(bottom) || isNaN(top)) return makeError('#VALUE!', 'Not a number');
    if (bottom > top) return makeError('#NUM!', 'Bottom > top');
    return Math.floor(Math.random() * (top - bottom + 1)) + bottom;
  },
};

const PRODUCT: FormulaFunction = {
  name: 'PRODUCT',
  minArgs: 1,
  maxArgs: 255,
  evaluate(args) {
    const nums = flattenNumbers(args);
    if (nums.length === 0) return 0;
    let result = 1;
    for (const n of nums) result *= n;
    return result;
  },
};

const SUMPRODUCT: FormulaFunction = {
  name: 'SUMPRODUCT',
  minArgs: 1,
  maxArgs: 255,
  evaluate(args) {
    // Each arg is a 2D array; flatten each to 1D, then multiply element-wise and sum
    const arrays = args.map((a) => flattenRange(a).map(toNumber));
    if (arrays.length === 0) return 0;
    const len = arrays[0]!.length;

    let sum = 0;
    for (let i = 0; i < len; i++) {
      let product = 1;
      for (const arr of arrays) {
        const val = i < arr.length ? (arr[i] ?? 0) : 0;
        product *= isNaN(val) ? 0 : val;
      }
      sum += product;
    }
    return sum;
  },
};

// --- Text ---

const FIND: FormulaFunction = {
  name: 'FIND',
  minArgs: 2,
  maxArgs: 3,
  evaluate(args) {
    const findText = toString(args[0]);
    const withinText = toString(args[1]);
    const startNum = args.length >= 3 ? toNumber(args[2]) - 1 : 0;

    const idx = withinText.indexOf(findText, startNum);
    if (idx === -1) return makeError('#VALUE!', 'Text not found');
    return idx + 1; // 1-based
  },
};

const SEARCH: FormulaFunction = {
  name: 'SEARCH',
  minArgs: 2,
  maxArgs: 3,
  evaluate(args) {
    const findText = toString(args[0]).toLowerCase();
    const withinText = toString(args[1]).toLowerCase();
    const startNum = args.length >= 3 ? toNumber(args[2]) - 1 : 0;

    const idx = withinText.indexOf(findText, startNum);
    if (idx === -1) return makeError('#VALUE!', 'Text not found');
    return idx + 1; // 1-based
  },
};

const REPLACE: FormulaFunction = {
  name: 'REPLACE',
  minArgs: 4,
  maxArgs: 4,
  evaluate(args) {
    const oldText = toString(args[0]);
    const startNum = toNumber(args[1]);
    const numChars = toNumber(args[2]);
    const newText = toString(args[3]);

    const before = oldText.substring(0, startNum - 1);
    const after = oldText.substring(startNum - 1 + numChars);
    return before + newText + after;
  },
};

const SUBSTITUTE: FormulaFunction = {
  name: 'SUBSTITUTE',
  minArgs: 3,
  maxArgs: 4,
  evaluate(args) {
    const text = toString(args[0]);
    const oldText = toString(args[1]);
    const newText = toString(args[2]);
    const instanceNum = args.length >= 4 ? toNumber(args[3]) : undefined;

    if (oldText === '') return text;

    if (instanceNum === undefined) {
      // Replace all occurrences
      return text.split(oldText).join(newText);
    }

    // Replace nth occurrence
    let count = 0;
    let result = '';
    let remaining = text;
    while (remaining.length > 0) {
      const idx = remaining.indexOf(oldText);
      if (idx === -1) {
        result += remaining;
        break;
      }
      count++;
      if (count === instanceNum) {
        result += remaining.substring(0, idx) + newText;
        result += remaining.substring(idx + oldText.length);
        break;
      }
      result += remaining.substring(0, idx + oldText.length);
      remaining = remaining.substring(idx + oldText.length);
    }
    return result;
  },
};

const REPT: FormulaFunction = {
  name: 'REPT',
  minArgs: 2,
  maxArgs: 2,
  evaluate(args) {
    const text = toString(args[0]);
    const times = Math.floor(toNumber(args[1]));
    if (isNaN(times) || times < 0) return makeError('#VALUE!', 'Invalid repeat count');
    return text.repeat(times);
  },
};

const EXACT: FormulaFunction = {
  name: 'EXACT',
  minArgs: 2,
  maxArgs: 2,
  evaluate(args) {
    return toString(args[0]) === toString(args[1]);
  },
};

const VALUE: FormulaFunction = {
  name: 'VALUE',
  minArgs: 1,
  maxArgs: 1,
  evaluate(args) {
    const n = Number(args[0]);
    if (isNaN(n)) return makeError('#VALUE!', 'Cannot convert to number');
    return n;
  },
};

const PROPER: FormulaFunction = {
  name: 'PROPER',
  minArgs: 1,
  maxArgs: 1,
  evaluate(args) {
    const text = toString(args[0]);
    return text.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\B\w/g, (c) => c.toLowerCase());
  },
};

const CLEAN: FormulaFunction = {
  name: 'CLEAN',
  minArgs: 1,
  maxArgs: 1,
  evaluate(args) {
    const text = toString(args[0]);
    // Remove non-printable ASCII characters (0-31)
    return text.replace(/[\x00-\x1F]/g, '');
  },
};

const CHAR: FormulaFunction = {
  name: 'CHAR',
  minArgs: 1,
  maxArgs: 1,
  evaluate(args) {
    const num = toNumber(args[0]);
    if (isNaN(num) || num < 1 || num > 65535) return makeError('#VALUE!', 'Invalid character code');
    return String.fromCharCode(num);
  },
};

const CODE: FormulaFunction = {
  name: 'CODE',
  minArgs: 1,
  maxArgs: 1,
  evaluate(args) {
    const text = toString(args[0]);
    if (text.length === 0) return makeError('#VALUE!', 'Empty text');
    return text.charCodeAt(0);
  },
};

// --- Date ---

const DATE: FormulaFunction = {
  name: 'DATE',
  minArgs: 3,
  maxArgs: 3,
  evaluate(args) {
    const year = toNumber(args[0]);
    const month = toNumber(args[1]);
    const day = toNumber(args[2]);
    // Month is 1-based in Excel, 0-based in JS Date
    return new Date(year, month - 1, day).getTime();
  },
};

const TODAY: FormulaFunction = {
  name: 'TODAY',
  minArgs: 0,
  maxArgs: 0,
  evaluate(_args) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  },
};

const NOW: FormulaFunction = {
  name: 'NOW',
  minArgs: 0,
  maxArgs: 0,
  evaluate(_args) {
    return Date.now();
  },
};

const YEAR: FormulaFunction = {
  name: 'YEAR',
  minArgs: 1,
  maxArgs: 1,
  evaluate(args) {
    const d = new Date(toNumber(args[0]));
    if (isNaN(d.getTime())) return makeError('#VALUE!', 'Invalid date');
    return d.getFullYear();
  },
};

const MONTH: FormulaFunction = {
  name: 'MONTH',
  minArgs: 1,
  maxArgs: 1,
  evaluate(args) {
    const d = new Date(toNumber(args[0]));
    if (isNaN(d.getTime())) return makeError('#VALUE!', 'Invalid date');
    return d.getMonth() + 1; // 1-based
  },
};

const DAY: FormulaFunction = {
  name: 'DAY',
  minArgs: 1,
  maxArgs: 1,
  evaluate(args) {
    const d = new Date(toNumber(args[0]));
    if (isNaN(d.getTime())) return makeError('#VALUE!', 'Invalid date');
    return d.getDate();
  },
};

// --- Information ---

const ISBLANK: FormulaFunction = {
  name: 'ISBLANK',
  minArgs: 1,
  maxArgs: 1,
  evaluate(args) {
    const val = args[0];
    return val === null || val === undefined || val === '';
  },
};

const ISNUMBER: FormulaFunction = {
  name: 'ISNUMBER',
  minArgs: 1,
  maxArgs: 1,
  evaluate(args) {
    const val = args[0];
    return typeof val === 'number' && isFinite(val);
  },
};

const ISTEXT: FormulaFunction = {
  name: 'ISTEXT',
  minArgs: 1,
  maxArgs: 1,
  evaluate(args) {
    return typeof args[0] === 'string';
  },
};

const ISERROR: FormulaFunction = {
  name: 'ISERROR',
  minArgs: 1,
  maxArgs: 1,
  evaluate(args) {
    return isFormulaError(args[0]);
  },
};

const ISNA: FormulaFunction = {
  name: 'ISNA',
  minArgs: 1,
  maxArgs: 1,
  evaluate(args) {
    return isFormulaError(args[0]) && args[0].type === '#N/A';
  },
};

const TYPE: FormulaFunction = {
  name: 'TYPE',
  minArgs: 1,
  maxArgs: 1,
  evaluate(args) {
    const val = args[0];
    if (typeof val === 'number') return 1;
    if (typeof val === 'string') return 2;
    if (typeof val === 'boolean') return 4;
    if (isFormulaError(val)) return 16;
    if (Array.isArray(val)) return 64;
    return 1; // Default to number
  },
};

// ── Export ──

export function createExtendedFunctions(): FormulaFunction[] {
  return [
    // Conditional
    SUMIF,
    COUNTIF,
    AVERAGEIF,
    SUMIFS,
    COUNTIFS,
    IFS,
    SWITCH,
    // Lookup
    HLOOKUP,
    XLOOKUP,
    // Math
    ROUNDUP,
    ROUNDDOWN,
    CEILING,
    FLOOR_FN,
    SIGN,
    LOG,
    LN,
    EXP,
    PI,
    RANDBETWEEN,
    PRODUCT,
    SUMPRODUCT,
    // Text
    FIND,
    SEARCH,
    REPLACE,
    SUBSTITUTE,
    REPT,
    EXACT,
    VALUE,
    PROPER,
    CLEAN,
    CHAR,
    CODE,
    // Date
    DATE,
    TODAY,
    NOW,
    YEAR,
    MONTH,
    DAY,
    // Information
    ISBLANK,
    ISNUMBER,
    ISTEXT,
    ISERROR,
    ISNA,
    TYPE,
  ];
}
