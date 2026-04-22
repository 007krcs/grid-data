// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Validation Engine ───
// Central validation logic for cells, rows, and the entire grid.

import type { ValidationRule, ValidationError, ValidationParams } from './types';
import {
  validateRequired,
  validateEmail,
  validatePhone,
  validateUrl,
  validateRegex,
  validateRange,
  validateList,
  validateLength,
  validateInteger,
} from './validators';
import { validateCrossCell } from './cross-cell-validator';

/**
 * Run a single validator against a value.
 * Returns true if valid, or an error message string if invalid.
 */
function runValidator(
  params: ValidationParams,
  value: unknown,
  rowData: Record<string, unknown>,
): boolean | string {
  switch (params.type) {
    case 'required':
      return validateRequired(value);
    case 'email':
      return validateEmail(value);
    case 'phone':
      return validatePhone(value, params.countryCode);
    case 'url':
      return validateUrl(value, params.requireHttps);
    case 'regex':
      return validateRegex(value, params.pattern, params.flags);
    case 'range':
      return validateRange(value, params.min, params.max, params.exclusive);
    case 'list':
      return validateList(value, params.values, params.caseSensitive);
    case 'length':
      return validateLength(value, params.min, params.max);
    case 'integer':
      return validateInteger(value);
    case 'custom':
      return params.validate(value, rowData);
    case 'crossCell': {
      const targetValue = rowData[params.targetField];
      return validateCrossCell(value, targetValue, params.operator);
    }
    case 'unique':
      // Unique validation requires all row data — handled separately
      return true;
    default:
      return true;
  }
}

/**
 * Validate a single cell value against all applicable rules.
 */
export function validateCell(
  value: unknown,
  rowId: string,
  colId: string,
  rowData: Record<string, unknown>,
  rules: ValidationRule[],
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const rule of rules) {
    // Skip rules that target a different column
    if (rule.colId !== undefined && rule.colId !== colId) continue;

    // Skip unique rules (handled at grid level)
    if (rule.type === 'unique') continue;

    const result = runValidator(rule.params, value, rowData);
    if (result !== true) {
      const message = rule.message || (typeof result === 'string' ? result : 'Validation failed');
      errors.push({
        ruleId: rule.id,
        rowId,
        colId,
        field: colId,
        message,
        severity: rule.severity || 'error',
        value,
      });
    }
  }

  return errors;
}

/**
 * Validate all cells in a row.
 */
export function validateRow(
  rowId: string,
  rowData: Record<string, unknown>,
  columnIds: string[],
  rules: ValidationRule[],
): Map<string, ValidationError[]> {
  const errorMap = new Map<string, ValidationError[]>();

  for (const colId of columnIds) {
    const value = rowData[colId];
    const cellErrors = validateCell(value, rowId, colId, rowData, rules);
    if (cellErrors.length > 0) {
      const key = `${rowId}:${colId}`;
      errorMap.set(key, cellErrors);
    }
  }

  return errorMap;
}

/**
 * Validate the entire grid, including unique column checks.
 * allRows is a Map of rowId -> rowData.
 */
export function validateAll(
  allRows: Map<string, Record<string, unknown>>,
  columnIds: string[],
  rules: ValidationRule[],
): Map<string, ValidationError[]> {
  const errorMap = new Map<string, ValidationError[]>();

  // Regular per-cell validation
  for (const [rowId, rowData] of allRows) {
    const rowErrors = validateRow(rowId, rowData, columnIds, rules);
    for (const [key, errors] of rowErrors) {
      errorMap.set(key, errors);
    }
  }

  // Unique validation: check for duplicates per column
  const uniqueRules = rules.filter((r) => r.type === 'unique');
  for (const rule of uniqueRules) {
    const targetColIds = rule.colId ? [rule.colId] : columnIds;

    for (const colId of targetColIds) {
      // Collect all values for this column
      const valueCounts = new Map<string, string[]>(); // normalized value -> rowIds

      for (const [rowId, rowData] of allRows) {
        const value = rowData[colId];
        if (value === null || value === undefined || value === '') continue;
        const normalized = String(value);
        const existing = valueCounts.get(normalized) || [];
        existing.push(rowId);
        valueCounts.set(normalized, existing);
      }

      // Report errors for duplicates
      for (const [_normalizedValue, rowIds] of valueCounts) {
        if (rowIds.length > 1) {
          for (const rowId of rowIds) {
            const key = `${rowId}:${colId}`;
            const existing = errorMap.get(key) || [];
            const message = rule.message || `Value must be unique in column "${colId}"`;
            existing.push({
              ruleId: rule.id,
              rowId,
              colId,
              field: colId,
              message,
              severity: rule.severity || 'error',
              value: allRows.get(rowId)?.[colId],
            });
            errorMap.set(key, existing);
          }
        }
      }
    }
  }

  return errorMap;
}
