// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── NL Query Plugin Types ───

export type QueryOperationType = 'filter' | 'sort' | 'quickFilter' | 'group' | 'clearFilters' | 'clearSort';

export type FilterOperator = 'equals' | 'contains' | 'startsWith' | 'greaterThan' | 'lessThan' | 'notEquals' | 'between';

export interface QueryFilterOp {
  type: 'filter';
  columnId: string;
  operator: FilterOperator;
  value: unknown;
  value2?: unknown; // for 'between'
}

export interface QuerySortOp {
  type: 'sort';
  columnId: string;
  direction: 'asc' | 'desc';
}

export interface QueryQuickFilterOp {
  type: 'quickFilter';
  text: string;
}

export interface QueryGroupOp {
  type: 'group';
  columnId: string;
}

export interface QueryClearOp {
  type: 'clearFilters' | 'clearSort';
}

export type QueryOperation = QueryFilterOp | QuerySortOp | QueryQuickFilterOp | QueryGroupOp | QueryClearOp;

export interface ParsedQuery {
  original: string;
  operations: QueryOperation[];
  confidence: number;  // 0-1
  unrecognized: string[];  // parts of query that weren't parsed
}

export interface QueryHistoryEntry {
  query: string;
  parsed: ParsedQuery;
  appliedAt: number;
  success: boolean;
}

export interface NlQueryOptions {
  columnAliases?: Record<string, string>;  // "revenue" -> "annual_revenue_usd"
  maxHistory?: number;  // default 50
  caseSensitive?: boolean;  // default false
}
