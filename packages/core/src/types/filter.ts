// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Filter Model Types ───

/**
 * Supported filter categories.
 *
 * - `'text'` - String-based filters (contains, starts with, equals, etc.).
 * - `'number'` - Numeric filters (less than, greater than, in range, etc.).
 * - `'date'` - Date-based filters using date range comparisons.
 * - `'set'` - Set-based filter allowing selection of specific values from a list.
 * - `'custom'` - Custom filter with arbitrary payload handled by plugin logic.
 *
 * @see {@link FilterModel.filterType}
 */
export type FilterType = 'text' | 'number' | 'date' | 'set' | 'custom';

/**
 * Describes the active filter configuration for a single column.
 *
 * The filter model is a serializable object that can be saved, restored,
 * and sent to a server for server-side filtering. Different filter types
 * use different subsets of the available properties.
 *
 * @see {@link GridApi.setFilterModel}
 * @see {@link GridApi.getFilterModel}
 *
 * @example
 * ```ts
 * // Text filter
 * const textFilter: FilterModel = {
 *   filterType: 'text',
 *   type: 'contains',
 *   filter: 'Smith',
 * };
 *
 * // Number range filter
 * const rangeFilter: FilterModel = {
 *   filterType: 'number',
 *   type: 'inRange',
 *   filter: 50000,
 *   filterTo: 100000,
 * };
 * ```
 */
export interface FilterModel {
  /**
   * The category of filter being applied.
   *
   * @see {@link FilterType}
   */
  filterType: FilterType;

  /**
   * The comparison operator to use (e.g., `'equals'`, `'contains'`, `'lessThan'`).
   *
   * @default undefined
   * @see {@link FilterOperator}
   */
  type?: FilterOperator;

  /**
   * The primary filter value for text and number filters.
   *
   * For `'inRange'` operator, this is the "from" value (used with {@link filterTo}).
   *
   * @default undefined
   */
  filter?: string | number | null;

  /**
   * The upper bound value for range-based filters (used with `type: 'inRange'`).
   *
   * @default undefined
   */
  filterTo?: string | number | null;

  /**
   * Start date string for date filters (ISO 8601 format or locale-specific).
   *
   * @default undefined
   */
  dateFrom?: string | null;

  /**
   * End date string for date range filters (ISO 8601 format or locale-specific).
   *
   * @default undefined
   */
  dateTo?: string | null;

  /**
   * Array of values for set-based filters.
   *
   * Rows are included if the cell value matches any value in this array.
   *
   * @default undefined
   *
   * @example
   * ```ts
   * { filterType: 'set', values: ['Engineering', 'Sales', 'Marketing'] }
   * ```
   */
  values?: any[];

  /**
   * Logical operator for combining multiple filter conditions.
   *
   * - `'AND'` - All conditions must match.
   * - `'OR'` - At least one condition must match.
   *
   * @default 'AND'
   */
  operator?: 'AND' | 'OR';

  /**
   * Array of child filter conditions for compound filters.
   *
   * When provided, the filter operates as a compound filter combining
   * multiple conditions using the {@link operator}.
   *
   * @default undefined
   *
   * @example
   * ```ts
   * {
   *   filterType: 'number',
   *   operator: 'OR',
   *   conditions: [
   *     { filterType: 'number', type: 'lessThan', filter: 20 },
   *     { filterType: 'number', type: 'greaterThan', filter: 80 },
   *   ],
   * }
   * ```
   */
  conditions?: FilterModel[];

  /**
   * Index signature for custom filter payloads.
   *
   * Custom filter implementations can attach arbitrary properties
   * to the filter model for plugin-specific filtering logic.
   */
  [key: string]: unknown;
}

/**
 * Comparison operators available for column filters.
 *
 * Not all operators are valid for all filter types:
 * - Text filters: `equals`, `notEqual`, `contains`, `notContains`, `startsWith`, `endsWith`, `blank`, `notBlank`
 * - Number filters: `equals`, `notEqual`, `lessThan`, `lessThanOrEqual`, `greaterThan`, `greaterThanOrEqual`, `inRange`, `blank`, `notBlank`
 * - Date filters: `equals`, `notEqual`, `lessThan`, `greaterThan`, `inRange`, `blank`, `notBlank`
 *
 * @see {@link FilterModel.type}
 */
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

/**
 * A compiled filter predicate function used for fast row evaluation.
 *
 * Built internally from a {@link FilterModel} by the filtering plugin.
 * Returns `true` if the row data passes the filter, `false` otherwise.
 *
 * @typeParam TData - The row data type.
 *
 * @example
 * ```ts
 * const predicate: FilterPredicate<Employee> = (data) => data.salary > 50000;
 * ```
 */
export type FilterPredicate<TData = any> = (data: TData) => boolean;
