// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Natural Language Query Parser ───
// Parses human-readable queries into GridAction commands using regex patterns.
// Works entirely locally — no LLM or API calls required for basic queries.

import type { GridAction, ColumnInfo, NLPattern } from './ai-plugin';

// ─── Built-in Patterns ───

interface PatternDef {
  regex: RegExp;
  parse: (match: RegExpMatchArray, columns: ColumnInfo[]) => GridAction | null;
}

/**
 * Resolve a user-typed column reference (name, field, or header) to a ColumnInfo.
 * Matching is case-insensitive and supports partial matches.
 */
function resolveColumn(text: string, columns: ColumnInfo[]): ColumnInfo | undefined {
  const lower = text.toLowerCase().trim();

  // Exact match on id, field, or headerName
  const exact = columns.find(
    (c) =>
      c.id.toLowerCase() === lower ||
      c.field.toLowerCase() === lower ||
      (c.headerName && c.headerName.toLowerCase() === lower),
  );
  if (exact) return exact;

  // Partial match — column name starts with the given text
  return columns.find(
    (c) =>
      c.id.toLowerCase().startsWith(lower) ||
      c.field.toLowerCase().startsWith(lower) ||
      (c.headerName && c.headerName.toLowerCase().startsWith(lower)),
  );
}

/**
 * Parse a direction string like "ascending", "desc", "highest first", etc.
 */
function parseDirection(text: string): 'asc' | 'desc' {
  const lower = text.toLowerCase().trim();
  if (
    lower.includes('desc') ||
    lower.includes('high') ||
    lower.includes('largest') ||
    lower.includes('biggest') ||
    lower.includes('most') ||
    lower.includes('top') ||
    lower.includes('z-a') ||
    lower.includes('reverse')
  ) {
    return 'desc';
  }
  return 'asc';
}

/**
 * Parse a filter operator from natural language.
 */
function parseFilterOp(text: string): { filterType: string; negated: boolean } {
  const lower = text.toLowerCase().trim();

  if (lower.includes('not equal') || lower.includes('!=') || lower.includes('is not')) {
    return { filterType: 'notEquals', negated: false };
  }
  if (lower.includes('>=') || lower.includes('greater than or equal') || lower.includes('at least')) {
    return { filterType: 'gte', negated: false };
  }
  if (lower.includes('<=') || lower.includes('less than or equal') || lower.includes('at most')) {
    return { filterType: 'lte', negated: false };
  }
  if (lower.includes('>') || lower.includes('greater') || lower.includes('more than') || lower.includes('above') || lower.includes('over')) {
    return { filterType: 'gt', negated: false };
  }
  if (lower.includes('<') || lower.includes('less') || lower.includes('fewer') || lower.includes('below') || lower.includes('under')) {
    return { filterType: 'lt', negated: false };
  }
  if (lower.includes('contain') || lower.includes('includes') || lower.includes('has')) {
    return { filterType: 'contains', negated: false };
  }
  if (lower.includes('starts with') || lower.includes('begins with')) {
    return { filterType: 'startsWith', negated: false };
  }
  if (lower.includes('ends with')) {
    return { filterType: 'endsWith', negated: false };
  }
  if (lower === '=' || lower.includes('equal') || lower.includes('is') || lower.includes('==')) {
    return { filterType: 'equals', negated: false };
  }

  return { filterType: 'equals', negated: false };
}

// ─── Built-in Pattern Definitions ───

const BUILTIN_PATTERNS: PatternDef[] = [
  // "sort by <column> [ascending|descending]"
  {
    regex: /sort\s+(?:by\s+)?(.+?)(?:\s+(asc(?:ending)?|desc(?:ending)?|highest|lowest|a-z|z-a|reverse))?\s*$/i,
    parse(match, columns) {
      const colText = match[1]!;
      const dirText = match[2] || 'asc';
      const col = resolveColumn(colText, columns);
      if (!col) return null;
      return { type: 'sort', colId: col.id, direction: parseDirection(dirText) };
    },
  },

  // "show rows where <column> <operator> <value>" / "filter <column> <operator> <value>"
  {
    regex: /(?:show\s+(?:rows?\s+)?where|filter(?:\s+by)?|where)\s+(.+?)\s+(is not|is|equals?|!=|>=|<=|>|<|==|greater than|less than|more than|fewer than|above|below|over|under|at least|at most|contains?|includes?|starts?\s+with|ends?\s+with|has)\s+(.+)/i,
    parse(match, columns) {
      const colText = match[1]!;
      const opText = match[2]!;
      const valueText = match[3]!.trim();
      const col = resolveColumn(colText, columns);
      if (!col) return null;

      const { filterType } = parseFilterOp(opText);

      // Attempt to parse numeric values
      const numValue = Number(valueText);
      const value = isNaN(numValue) ? valueText.replace(/^["']|["']$/g, '') : numValue;

      return { type: 'filter', colId: col.id, filterType, value };
    },
  },

  // "group by <column> [and <column>...]"
  {
    regex: /group\s+by\s+(.+)/i,
    parse(match, columns) {
      const colTexts = match[1]!.split(/\s*(?:,|and)\s*/i);
      const colIds: string[] = [];
      for (const text of colTexts) {
        const col = resolveColumn(text.trim(), columns);
        if (col) colIds.push(col.id);
      }
      if (colIds.length === 0) return null;
      return { type: 'group', colIds };
    },
  },

  // "find top <N> by <column>" / "top <N> <column>"
  {
    regex: /(?:find\s+)?top\s+(\d+)\s+(?:by\s+)?(.+)/i,
    parse(match, columns) {
      const colText = match[2]!;
      const col = resolveColumn(colText, columns);
      if (!col) return null;
      return { type: 'sort', colId: col.id, direction: 'desc' };
    },
  },

  // "find bottom <N> by <column>" / "bottom <N> <column>"
  {
    regex: /(?:find\s+)?bottom\s+(\d+)\s+(?:by\s+)?(.+)/i,
    parse(match, columns) {
      const colText = match[2]!;
      const col = resolveColumn(colText, columns);
      if (!col) return null;
      return { type: 'sort', colId: col.id, direction: 'asc' };
    },
  },

  // "average|sum|min|max|count <column> [by <groupColumn>]"
  {
    regex: /(?:calculate\s+|compute\s+|get\s+)?(?:the\s+)?(average|avg|sum|total|min|minimum|max|maximum|count)\s+(?:of\s+)?(.+?)(?:\s+(?:by|per|for each|grouped?\s+by)\s+(.+))?$/i,
    parse(match, columns) {
      const funcText = match[1]!.toLowerCase();
      const colText = match[2]!;
      const groupText = match[3];

      const col = resolveColumn(colText, columns);
      if (!col) return null;

      // Normalize aggregation function name
      let func: string;
      if (funcText === 'avg' || funcText === 'average') func = 'avg';
      else if (funcText === 'sum' || funcText === 'total') func = 'sum';
      else if (funcText === 'min' || funcText === 'minimum') func = 'min';
      else if (funcText === 'max' || funcText === 'maximum') func = 'max';
      else func = 'count';

      // If there's a "by" clause, return a group action instead
      if (groupText) {
        const groupCol = resolveColumn(groupText, columns);
        if (groupCol) {
          return { type: 'group', colIds: [groupCol.id] };
        }
      }

      return { type: 'aggregate', colId: col.id, func };
    },
  },

  // "hide column <column>" / "hide <column>"
  {
    regex: /hide\s+(?:column\s+)?(.+)/i,
    parse(match, columns) {
      const colText = match[1]!;
      const col = resolveColumn(colText, columns);
      if (!col) return null;
      // Hiding a column doesn't map directly to a standard GridAction type,
      // so we return 'none' with a reason — the plugin can handle it via command dispatch
      return { type: 'none', reason: `hide:${col.id}` };
    },
  },

  // "show all" / "clear filters" / "reset"
  {
    regex: /(?:show\s+all|clear\s+filters?|reset\s+filters?|remove\s+filters?)/i,
    parse(_match, _columns) {
      return { type: 'filter', colId: '*', filterType: 'clear', value: null };
    },
  },
];

// ─── Public API ───

/**
 * Parse a natural language query into a GridAction using built-in regex patterns.
 *
 * @param query - The natural language query string.
 * @param columns - Available column information for resolution.
 * @param customPatterns - Optional additional patterns to try before built-in ones.
 * @returns A GridAction if a pattern matched, or null if no pattern matched.
 */
export function parseNaturalLanguage(
  query: string,
  columns: ColumnInfo[],
  customPatterns?: NLPattern[],
): GridAction | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  // Try custom patterns first (if any)
  if (customPatterns) {
    for (const pattern of customPatterns) {
      const match = trimmed.match(pattern.regex);
      if (match) {
        const action = pattern.toAction(match, columns);
        if (action) return action;
      }
    }
  }

  // Try built-in patterns
  for (const pattern of BUILTIN_PATTERNS) {
    const match = trimmed.match(pattern.regex);
    if (match) {
      const action = pattern.parse(match, columns);
      if (action) return action;
    }
  }

  return null;
}
