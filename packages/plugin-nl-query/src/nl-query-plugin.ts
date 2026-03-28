// ─── NL Query Plugin ───
// Parses natural language queries and translates them into GridStorm
// filter/sort/group commands using deterministic regex pattern matching.

import type { GridPlugin, PluginContext } from '@gridstorm/core';
import type {
  NlQueryOptions,
  ParsedQuery,
  QueryOperation,
  QueryFilterOp,
  QuerySortOp,
  QueryQuickFilterOp,
  QueryGroupOp,
  QueryClearOp,
  QueryHistoryEntry,
} from './types';

// ─── Parser ───

/**
 * Parse a natural language query string into structured operations.
 *
 * @param query - The raw query string
 * @param columnAliases - Map of alias -> canonical column ID
 * @param columns - Known column IDs for validation
 */
export function parseQuery(
  query: string,
  columnAliases: Record<string, string>,
  _columns: string[],
): ParsedQuery {
  const original = query;
  const normalized = query.trim();
  const q = normalized.toLowerCase();

  const operations: QueryOperation[] = [];
  const unrecognized: string[] = [];
  let matched = false;

  function resolveColumn(col: string): string {
    const lower = col.toLowerCase().trim();
    const aliasKey = Object.keys(columnAliases).find(
      (k) => k.toLowerCase() === lower,
    );
    if (aliasKey !== undefined) {
      return columnAliases[aliasKey] ?? lower;
    }
    return lower;
  }

  // ─── Clear filters ───
  if (/^(?:clear|remove|reset)\s+filters?\b/i.test(normalized)) {
    const op: QueryClearOp = { type: 'clearFilters' };
    operations.push(op);
    matched = true;
  }

  // ─── Clear sort ───
  if (!matched && /^(?:clear|remove|reset)\s+sort\b/i.test(normalized)) {
    const op: QueryClearOp = { type: 'clearSort' };
    operations.push(op);
    matched = true;
  }

  // ─── Group by ───
  if (!matched) {
    const groupMatch = /^group\s+by\s+(\S+)/i.exec(normalized);
    if (groupMatch !== null) {
      const colId = resolveColumn(groupMatch[1] ?? '');
      const op: QueryGroupOp = { type: 'group', columnId: colId };
      operations.push(op);
      matched = true;
    }
  }

  // ─── Sort patterns ───
  if (!matched) {
    // "sort by {col}" → asc
    const sortByMatch = /^sort\s+by\s+(\S+)$/i.exec(normalized);
    if (sortByMatch !== null) {
      const colId = resolveColumn(sortByMatch[1] ?? '');
      const op: QuerySortOp = { type: 'sort', columnId: colId, direction: 'asc' };
      operations.push(op);
      matched = true;
    }
  }

  if (!matched) {
    // "sort {col} asc/desc/ascending/descending" or "order by {col} asc/desc"
    const sortDirMatch =
      /^(?:sort|order\s+by)\s+(\S+)\s+(asc|desc|ascending|descending)$/i.exec(normalized);
    if (sortDirMatch !== null) {
      const colId = resolveColumn(sortDirMatch[1] ?? '');
      const dirRaw = (sortDirMatch[2] ?? 'asc').toLowerCase();
      const direction: 'asc' | 'desc' =
        dirRaw === 'desc' || dirRaw === 'descending' ? 'desc' : 'asc';
      const op: QuerySortOp = { type: 'sort', columnId: colId, direction };
      operations.push(op);
      matched = true;
    }
  }

  // ─── Quick filter patterns ───
  if (!matched) {
    const quickMatch = /^(?:show|search|find)\s+(.+)$/i.exec(normalized);
    if (quickMatch !== null) {
      const text = (quickMatch[1] ?? '').trim();
      const op: QueryQuickFilterOp = { type: 'quickFilter', text };
      operations.push(op);
      matched = true;
    }
  }

  // ─── Filter patterns ───

  if (!matched) {
    // "filter {col} > {val}" or "filter {col} < {val}" (symbolic)
    const filterSymMatch = /^(?:filter|where)\s+(\S+)\s+([><=!]+)\s+(.+)$/i.exec(normalized);
    if (filterSymMatch !== null) {
      const colId = resolveColumn(filterSymMatch[1] ?? '');
      const sym = (filterSymMatch[2] ?? '').trim();
      const rawVal = (filterSymMatch[3] ?? '').trim();
      const value = parseValue(rawVal);
      let operator: QueryFilterOp['operator'] = 'equals';
      if (sym === '>' || sym === 'gt') operator = 'greaterThan';
      else if (sym === '<' || sym === 'lt') operator = 'lessThan';
      else if (sym === '!=' || sym === '<>') operator = 'notEquals';
      else operator = 'equals';
      const op: QueryFilterOp = { type: 'filter', columnId: colId, operator, value };
      operations.push(op);
      matched = true;
    }
  }

  if (!matched) {
    // "filter {col} contains {val}" / "where {col} like {val}"
    const containsMatch =
      /^(?:filter|where)\s+(\S+)\s+(?:contains|like)\s+(.+)$/i.exec(normalized);
    if (containsMatch !== null) {
      const colId = resolveColumn(containsMatch[1] ?? '');
      const value = parseValue((containsMatch[2] ?? '').trim());
      const op: QueryFilterOp = { type: 'filter', columnId: colId, operator: 'contains', value };
      operations.push(op);
      matched = true;
    }
  }

  if (!matched) {
    // "filter {col} starts with {val}" / "where {col} begins with {val}"
    const startsMatch =
      /^(?:filter|where)\s+(\S+)\s+(?:starts?\s+with|begins?\s+with)\s+(.+)$/i.exec(normalized);
    if (startsMatch !== null) {
      const colId = resolveColumn(startsMatch[1] ?? '');
      const value = parseValue((startsMatch[2] ?? '').trim());
      const op: QueryFilterOp = {
        type: 'filter',
        columnId: colId,
        operator: 'startsWith',
        value,
      };
      operations.push(op);
      matched = true;
    }
  }

  if (!matched) {
    // "filter {col} greater than {val}" / "where {col} greater than {val}"
    const gtMatch =
      /^(?:filter|where)\s+(\S+)\s+greater\s+than\s+(.+)$/i.exec(normalized);
    if (gtMatch !== null) {
      const colId = resolveColumn(gtMatch[1] ?? '');
      const value = parseValue((gtMatch[2] ?? '').trim());
      const op: QueryFilterOp = {
        type: 'filter',
        columnId: colId,
        operator: 'greaterThan',
        value,
      };
      operations.push(op);
      matched = true;
    }
  }

  if (!matched) {
    // "filter {col} less than {val}" / "where {col} less than {val}"
    const ltMatch =
      /^(?:filter|where)\s+(\S+)\s+less\s+than\s+(.+)$/i.exec(normalized);
    if (ltMatch !== null) {
      const colId = resolveColumn(ltMatch[1] ?? '');
      const value = parseValue((ltMatch[2] ?? '').trim());
      const op: QueryFilterOp = {
        type: 'filter',
        columnId: colId,
        operator: 'lessThan',
        value,
      };
      operations.push(op);
      matched = true;
    }
  }

  if (!matched) {
    // "filter {col} = {val}" / "where {col} equals {val}" / "filter {col} is {val}"
    const equalsMatch =
      /^(?:filter|where)\s+(\S+)\s+(?:=|equals?|is)\s+(.+)$/i.exec(normalized);
    if (equalsMatch !== null) {
      const colId = resolveColumn(equalsMatch[1] ?? '');
      const value = parseValue((equalsMatch[2] ?? '').trim());
      const op: QueryFilterOp = {
        type: 'filter',
        columnId: colId,
        operator: 'equals',
        value,
      };
      operations.push(op);
      matched = true;
    }
  }

  if (!matched) {
    unrecognized.push(q);
  }

  const confidence = matched ? (operations.length > 0 ? 0.9 : 0.5) : 0.0;

  return {
    original,
    operations,
    confidence,
    unrecognized,
  };
}

function parseValue(raw: string): unknown {
  const trimmed = raw.trim();
  // Strip surrounding quotes
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  const num = Number(trimmed);
  if (!isNaN(num) && trimmed !== '') return num;
  return trimmed;
}

// ─── Plugin factory ───

export function NlQueryPlugin(options: NlQueryOptions = {}): GridPlugin {
  const {
    columnAliases = {},
    maxHistory = 50,
  } = options;

  const history: QueryHistoryEntry[] = [];

  return {
    id: 'nl-query',
    name: 'NL Query',
    version: '0.1.0',

    install(ctx: PluginContext) {
      const unsubscribers: Array<() => void> = [];

      // Helper: get all column IDs from the grid
      function getColumnIds(): string[] {
        return ctx.api.getAllColumns().map((c) => c.colId);
      }

      // Helper: apply a parsed query to the grid
      function applyParsedQuery(parsed: ParsedQuery): number {
        let applied = 0;
        for (const op of parsed.operations) {
          if (op.type === 'sort') {
            ctx.api.setSortModel([{ colId: op.columnId, sort: op.direction }]);
            applied++;
          } else if (op.type === 'filter') {
            const current = ctx.api.getFilterModel();
            ctx.api.setFilterModel({
              ...current,
              [op.columnId]: { type: op.operator, filter: op.value },
            });
            applied++;
          } else if (op.type === 'quickFilter') {
            ctx.api.setQuickFilter(op.text);
            applied++;
          } else if (op.type === 'group') {
            // group ops are recorded but no direct API call for grouping in core
            applied++;
          } else if (op.type === 'clearFilters') {
            ctx.api.setFilterModel({});
            applied++;
          } else if (op.type === 'clearSort') {
            ctx.api.setSortModel([]);
            applied++;
          }
        }
        return applied;
      }

      // ─── nlquery:execute ───
      unsubscribers.push(
        ctx.commandBus.registerHandler(
          'nlquery:execute',
          (payload: { query: string }) => {
            const columns = getColumnIds();
            const parsed = parseQuery(payload.query, columnAliases, columns);

            (ctx.eventBus as unknown as { emit: (e: string, p: unknown) => void }).emit(
              'nlquery:parsed',
              { query: parsed },
            );

            if (parsed.operations.length === 0) {
              (ctx.eventBus as unknown as { emit: (e: string, p: unknown) => void }).emit(
                'nlquery:failed',
                { query: payload.query, reason: 'No operations recognized in query' },
              );
              const entry: QueryHistoryEntry = {
                query: payload.query,
                parsed,
                appliedAt: Date.now(),
                success: false,
              };
              history.unshift(entry);
              if (history.length > maxHistory) history.splice(maxHistory);
              return;
            }

            const operationsApplied = applyParsedQuery(parsed);

            (ctx.eventBus as unknown as { emit: (e: string, p: unknown) => void }).emit(
              'nlquery:applied',
              { query: parsed, operationsApplied },
            );

            const entry: QueryHistoryEntry = {
              query: payload.query,
              parsed,
              appliedAt: Date.now(),
              success: true,
            };
            history.unshift(entry);
            if (history.length > maxHistory) history.splice(maxHistory);
          },
        ),
      );

      // ─── nlquery:clear ───
      unsubscribers.push(
        ctx.commandBus.registerHandler('nlquery:clear', () => {
          ctx.api.setFilterModel({});
          ctx.api.setSortModel([]);
        }),
      );

      // ─── nlquery:history ───
      unsubscribers.push(
        ctx.commandBus.registerHandler('nlquery:history', () => {
          (ctx.eventBus as unknown as { emit: (e: string, p: unknown) => void }).emit(
            'nlquery:history-listed',
            { history: [...history] },
          );
        }),
      );

      // ─── nlquery:suggestions ───
      unsubscribers.push(
        ctx.commandBus.registerHandler('nlquery:suggestions', () => {
          const suggestions = history
            .filter((e) => e.success)
            .slice(0, 10)
            .map((e) => e.query);
          (ctx.eventBus as unknown as { emit: (e: string, p: unknown) => void }).emit(
            'nlquery:suggestions-listed',
            { suggestions },
          );
        }),
      );

      return () => {
        for (const u of unsubscribers) u();
      };
    },
  };
}
