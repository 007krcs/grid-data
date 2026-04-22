// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Filter Predicates ───
// Built-in filter predicate factories for common filter types.
// Each function returns a predicate: (value: any) => boolean.

import type { FilterModel } from '@gridstorm/core';

// ── Text filter predicates ──

export function textMatches(
  cellValue: any,
  filterValue: string,
  type: string,
  caseSensitive: boolean,
): boolean {
  if (cellValue == null) return type === 'blank';
  const cell = caseSensitive ? String(cellValue) : String(cellValue).toLowerCase();
  const filter = caseSensitive ? filterValue : filterValue.toLowerCase();

  switch (type) {
    case 'equals': return cell === filter;
    case 'notEqual': return cell !== filter;
    case 'contains': return cell.includes(filter);
    case 'notContains': return !cell.includes(filter);
    case 'startsWith': return cell.startsWith(filter);
    case 'endsWith': return cell.endsWith(filter);
    case 'blank': return cell.trim() === '';
    case 'notBlank': return cell.trim() !== '';
    default: return true;
  }
}

// ── Number filter predicates ──

export function numberMatches(
  cellValue: any,
  filterValue: number | null | undefined,
  filterTo: number | null | undefined,
  type: string,
): boolean {
  if (cellValue == null) return type === 'blank';
  const num = Number(cellValue);
  if (isNaN(num)) return false;

  switch (type) {
    case 'equals': return num === filterValue;
    case 'notEqual': return num !== filterValue;
    case 'lessThan': return filterValue != null && num < filterValue;
    case 'lessThanOrEqual': return filterValue != null && num <= filterValue;
    case 'greaterThan': return filterValue != null && num > filterValue;
    case 'greaterThanOrEqual': return filterValue != null && num >= filterValue;
    case 'inRange': return filterValue != null && filterTo != null && num >= filterValue && num <= filterTo;
    case 'blank': return false;
    case 'notBlank': return true;
    default: return true;
  }
}

// ── Date filter predicates ──

export function dateMatches(
  cellValue: any,
  dateFrom: string | null | undefined,
  dateTo: string | null | undefined,
  type: string,
): boolean {
  if (cellValue == null) return type === 'blank';
  const cellDate = new Date(cellValue).getTime();
  if (isNaN(cellDate)) return false;

  const from = dateFrom ? new Date(dateFrom).getTime() : null;
  const to = dateTo ? new Date(dateTo).getTime() : null;

  switch (type) {
    case 'equals': return from != null && cellDate === from;
    case 'notEqual': return from != null && cellDate !== from;
    case 'lessThan': return from != null && cellDate < from;
    case 'greaterThan': return from != null && cellDate > from;
    case 'inRange': return from != null && to != null && cellDate >= from && cellDate <= to;
    case 'blank': return false;
    case 'notBlank': return true;
    default: return true;
  }
}

// ── Set filter predicates ──

export function setMatches(cellValue: any, values: any[]): boolean {
  if (values.length === 0) return true;
  return values.includes(cellValue);
}

// ── Master predicate factory ──

export function createFilterPredicate(
  model: FilterModel,
  caseSensitive = false,
): (value: any) => boolean {
  const { filterType, type = 'contains' } = model;

  // Compound filter (AND/OR of conditions)
  if (model.conditions && model.conditions.length > 0) {
    const subPredicates = model.conditions.map((c) => createFilterPredicate(c, caseSensitive));
    const op = model.operator ?? 'AND';
    return op === 'AND'
      ? (v) => subPredicates.every((p) => p(v))
      : (v) => subPredicates.some((p) => p(v));
  }

  switch (filterType) {
    case 'text':
      return (v) => textMatches(v, String(model.filter ?? ''), type, caseSensitive);

    case 'number':
      return (v) => numberMatches(v, model.filter as number, model.filterTo as number, type);

    case 'date':
      return (v) => dateMatches(v, model.dateFrom, model.dateTo, type);

    case 'set':
      return (v) => setMatches(v, model.values ?? []);

    default:
      return () => true;
  }
}
