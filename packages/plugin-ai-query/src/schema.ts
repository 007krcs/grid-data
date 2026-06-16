// © 2025 GridStorm / Tekivex — All Rights Reserved
// JSON Schema used by completeStructured to constrain the LLM output.
// Keep in sync with the AiQueryAction union in types.ts — schema describes
// the union as an object with a discriminator `type` plus the variant-
// specific fields. Many vendors' structured-output engines don't yet do
// JSON Schema `oneOf` reliably, so we model the union as a flat object with
// every variant's fields optional and validate at parse time.

import type { JSONSchema } from '@gridstorm/ai-adapter';
import type { AiQueryAction } from './types';

/** Schema fed to AIAdapter.completeStructured. */
export const AI_QUERY_SCHEMA: JSONSchema = {
  type: 'object',
  description:
    'A single grid operation to execute. Set `type` and ONLY the fields for that variant.',
  properties: {
    type: {
      type: 'string',
      enum: ['sort', 'filter', 'quickFilter', 'clear'],
      description: 'Which kind of operation to apply.',
    },
    sortModel: {
      type: 'array',
      description:
        'For type=sort: list of columns to sort by, in order. Each item: {colId, direction}.',
      items: {
        type: 'object',
        properties: {
          colId: { type: 'string', description: 'Column identifier.' },
          direction: { type: 'string', enum: ['asc', 'desc'] },
        },
        required: ['colId', 'direction'],
      },
    },
    filterModel: {
      type: 'object',
      description:
        'For type=filter: column-keyed object. Each value: {filterType, operator?, value?, valueTo?}.',
      properties: {},
    },
    text: {
      type: 'string',
      description:
        'For type=quickFilter: the substring to match across all columns.',
    },
    target: {
      type: 'string',
      enum: ['sort', 'filter', 'all'],
      description: 'For type=clear: which model to clear.',
    },
  },
  required: ['type'],
};

/**
 * Validate the raw LLM output and normalize it into an AiQueryAction. The
 * adapter has already enforced the schema at the wire level; this validator
 * does cross-field consistency (e.g. a `type:sort` action MUST carry a
 * sortModel) and throws a clear error if the LLM produced a malformed
 * variant.
 */
export function validateAiQueryAction(raw: unknown): AiQueryAction {
  if (!raw || typeof raw !== 'object') {
    throw new Error('AI returned non-object');
  }
  const r = raw as Record<string, unknown>;
  switch (r.type) {
    case 'sort': {
      const m = r.sortModel;
      if (!Array.isArray(m)) throw new Error('type=sort requires sortModel array');
      const sortModel = m.map((entry, i) => {
        if (!entry || typeof entry !== 'object') {
          throw new Error(`sortModel[${i}] is not an object`);
        }
        const e = entry as Record<string, unknown>;
        if (typeof e.colId !== 'string') throw new Error(`sortModel[${i}].colId missing`);
        if (e.direction !== 'asc' && e.direction !== 'desc') {
          throw new Error(`sortModel[${i}].direction must be 'asc' or 'desc'`);
        }
        return { colId: e.colId, direction: e.direction as 'asc' | 'desc' };
      });
      return { type: 'sort', sortModel };
    }
    case 'filter': {
      const fm = r.filterModel;
      if (!fm || typeof fm !== 'object') throw new Error('type=filter requires filterModel object');
      return { type: 'filter', filterModel: fm as AiQueryAction extends { type: 'filter' } ? AiQueryAction['filterModel'] : never };
    }
    case 'quickFilter': {
      if (typeof r.text !== 'string') throw new Error('type=quickFilter requires text');
      return { type: 'quickFilter', text: r.text };
    }
    case 'clear': {
      if (r.target !== 'sort' && r.target !== 'filter' && r.target !== 'all') {
        throw new Error(`type=clear target must be sort | filter | all`);
      }
      return { type: 'clear', target: r.target };
    }
    default:
      throw new Error(`unknown action type: ${String(r.type)}`);
  }
}
