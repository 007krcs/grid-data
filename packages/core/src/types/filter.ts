// ─── Filter Model Types ───

export type FilterType = 'text' | 'number' | 'date' | 'set' | 'custom';

export interface FilterModel {
  filterType: FilterType;
  type?: FilterOperator;
  filter?: string | number | null;
  filterTo?: string | number | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  values?: any[];
  operator?: 'AND' | 'OR';
  conditions?: FilterModel[];
  /** For custom filters — arbitrary payload. */
  [key: string]: unknown;
}

export type FilterOperator =
  | 'equals'
  | 'notEqual'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'lessThan'
  | 'lessThanOrEqual'
  | 'greaterThan'
  | 'greaterThanOrEqual'
  | 'inRange'
  | 'blank'
  | 'notBlank';

/** A compiled filter predicate. Built from FilterModel for fast evaluation. */
export type FilterPredicate<TData = any> = (data: TData) => boolean;
