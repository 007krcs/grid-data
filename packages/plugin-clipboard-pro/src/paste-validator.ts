// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
import type { RejectedCell } from './types';

/**
 * Validate pasted values against column validation rules.
 * Returns arrays of valid and rejected cells.
 */
export function validatePastedValues(
  ctx: any,
  grid: unknown[][],
  startRowIndex: number,
  startColIndex: number,
): { valid: { rowIndex: number; colIndex: number; value: unknown }[]; rejected: RejectedCell[] } {
  const valid: { rowIndex: number; colIndex: number; value: unknown }[] = [];
  const rejected: RejectedCell[] = [];

  const validationPlugin = ctx.getPlugin?.('validation');

  for (let r = 0; r < grid.length; r++) {
    const row = grid[r]!;
    for (let c = 0; c < row.length; c++) {
      const rowIdx = startRowIndex + r;
      const colIdx = startColIndex + c;
      const value = row[c];

      const state = ctx.store.getState();
      const col = state.columns[colIdx];

      if (!col) {
        rejected.push({ rowIndex: rowIdx, colIndex: colIdx, value: String(value), reason: 'Column out of bounds' });
        continue;
      }

      // Check editable
      const isEditable = typeof col.editable === 'function'
        ? col.editable({ value, colDef: col.originalDef })
        : col.editable !== false;

      if (!isEditable) {
        rejected.push({ rowIndex: rowIdx, colIndex: colIdx, value: String(value), reason: 'Column is read-only' });
        continue;
      }

      // Validate via validation plugin if available
      if (validationPlugin) {
        try {
          const rules = col.originalDef?.validationRules ?? col.originalDef?.cellValidator;
          if (rules) {
            // Try using the validation plugin's validate function
            const errors = validateWithRules(value, rules);
            if (errors.length > 0) {
              rejected.push({
                rowIndex: rowIdx,
                colIndex: colIdx,
                value: String(value),
                reason: errors[0]!,
              });
              continue;
            }
          }
        } catch {
          // Validation plugin API mismatch, skip
        }
      }

      valid.push({ rowIndex: rowIdx, colIndex: colIdx, value });
    }
  }

  return { valid, rejected };
}

function validateWithRules(value: unknown, rules: any): string[] {
  const errors: string[] = [];
  if (!rules) return errors;

  const ruleArray = Array.isArray(rules) ? rules : [rules];
  for (const rule of ruleArray) {
    if (typeof rule === 'function') {
      const result = rule(value);
      if (result === false || (typeof result === 'string' && result.length > 0)) {
        errors.push(typeof result === 'string' ? result : 'Validation failed');
      }
    } else if (rule?.validate) {
      const result = rule.validate(value);
      if (result === false || (typeof result === 'string' && result.length > 0)) {
        errors.push(typeof result === 'string' ? result : rule.message ?? 'Validation failed');
      }
    }
  }
  return errors;
}
