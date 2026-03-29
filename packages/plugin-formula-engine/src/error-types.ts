// ─── Extended Error Types ───

import type { ExtendedErrorType, ExtendedFormulaError } from './types';

export function makeError(type: ExtendedErrorType, message: string): ExtendedFormulaError {
  return { type, message };
}

export function isFormulaError(value: unknown): value is ExtendedFormulaError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'message' in value &&
    typeof (value as any).type === 'string' &&
    (value as any).type.startsWith('#')
  );
}
