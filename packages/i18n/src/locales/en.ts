import type { LocaleStrings } from '../types';

export const defaultStrings: LocaleStrings = {
  // Pagination
  page: 'Page',
  of: 'of',
  to: 'to',
  rows: 'Rows',
  firstPage: 'First Page',
  previousPage: 'Previous Page',
  nextPage: 'Next Page',
  lastPage: 'Last Page',

  // Filtering
  filterPlaceholder: 'Filter...',
  contains: 'Contains',
  notContains: 'Does not contain',
  equals: 'Equals',
  notEquals: 'Does not equal',
  startsWith: 'Starts with',
  endsWith: 'Ends with',
  greaterThan: 'Greater than',
  lessThan: 'Less than',
  greaterThanOrEqual: 'Greater than or equal to',
  lessThanOrEqual: 'Less than or equal to',
  inRange: 'In range',
  noFilter: 'No filter',
  clearFilter: 'Clear filter',
  applyFilter: 'Apply filter',

  // Selection
  selectAll: 'Select all',
  deselectAll: 'Deselect all',
  selectedRows: 'Selected rows',

  // Sorting
  sortAscending: 'Sort ascending',
  sortDescending: 'Sort descending',
  clearSort: 'Clear sort',

  // Column menu
  pinLeft: 'Pin left',
  pinRight: 'Pin right',
  unpin: 'Unpin',
  autosizeColumn: 'Autosize column',
  autosizeAllColumns: 'Autosize all columns',
  resetColumns: 'Reset columns',

  // Groups
  expand: 'Expand',
  collapse: 'Collapse',
  expandAll: 'Expand all',
  collapseAll: 'Collapse all',
  group: 'Group',

  // Editing
  copy: 'Copy',
  cut: 'Cut',
  paste: 'Paste',

  // General
  loading: 'Loading...',
  noRowsToShow: 'No rows to show',
  search: 'Search',

  // Accessibility
  ariaGridDescription: 'Data grid',
  ariaSortAscending: 'Sorted ascending',
  ariaSortDescending: 'Sorted descending',
  ariaColumnMenu: 'Column menu',
};
