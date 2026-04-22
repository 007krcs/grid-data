// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/** All translatable UI strings used by GridStorm */
export interface LocaleStrings {
  // Pagination
  page: string;
  of: string;
  to: string;
  rows: string;
  firstPage: string;
  previousPage: string;
  nextPage: string;
  lastPage: string;

  // Filtering
  filterPlaceholder: string;
  contains: string;
  notContains: string;
  equals: string;
  notEquals: string;
  startsWith: string;
  endsWith: string;
  greaterThan: string;
  lessThan: string;
  greaterThanOrEqual: string;
  lessThanOrEqual: string;
  inRange: string;
  noFilter: string;
  clearFilter: string;
  applyFilter: string;

  // Selection
  selectAll: string;
  deselectAll: string;
  selectedRows: string;

  // Sorting
  sortAscending: string;
  sortDescending: string;
  clearSort: string;

  // Column menu
  pinLeft: string;
  pinRight: string;
  unpin: string;
  autosizeColumn: string;
  autosizeAllColumns: string;
  resetColumns: string;

  // Groups
  expand: string;
  collapse: string;
  expandAll: string;
  collapseAll: string;
  group: string;

  // Editing
  copy: string;
  cut: string;
  paste: string;

  // General
  loading: string;
  noRowsToShow: string;
  search: string;

  // Accessibility
  ariaGridDescription: string;
  ariaSortAscending: string;
  ariaSortDescending: string;
  ariaColumnMenu: string;
}

export interface LocaleFormatters {
  /** Format a number according to locale rules */
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string;
  /** Format a date according to locale rules */
  formatDate(value: Date | string | number, options?: Intl.DateTimeFormatOptions): string;
  /** Format a currency value */
  formatCurrency(value: number, currency?: string): string;
  /** Format a percentage */
  formatPercent(value: number, decimals?: number): string;
  /** Collation-aware string comparison */
  compare(a: string, b: string): number;
}

export interface I18nConfig {
  /** BCP 47 locale tag. Default: 'en-US' */
  locale?: string;
  /** Custom string overrides (partial) */
  strings?: Partial<LocaleStrings>;
  /** Currency code for currency formatting. Default: 'USD' */
  currency?: string;
}
