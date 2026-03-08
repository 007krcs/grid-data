// ─── Built-in Aggregation Functions ───

import type { AggFunc } from './types';

export const builtInAggFuncs: Record<string, AggFunc> = {
  sum: ({ values }) => {
    return values.reduce((acc, v) => acc + (Number(v) || 0), 0);
  },

  avg: ({ values }) => {
    const nums = values.filter((v) => v != null && !isNaN(Number(v)));
    if (nums.length === 0) return null;
    return nums.reduce((acc, v) => acc + Number(v), 0) / nums.length;
  },

  count: ({ values }) => {
    return values.filter((v) => v != null).length;
  },

  min: ({ values }) => {
    const nums = values.filter((v) => v != null && !isNaN(Number(v))).map(Number);
    return nums.length > 0 ? Math.min(...nums) : null;
  },

  max: ({ values }) => {
    const nums = values.filter((v) => v != null && !isNaN(Number(v))).map(Number);
    return nums.length > 0 ? Math.max(...nums) : null;
  },

  first: ({ values }) => {
    return values.length > 0 ? values[0] : null;
  },

  last: ({ values }) => {
    return values.length > 0 ? values[values.length - 1] : null;
  },
};
