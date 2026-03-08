// ─── Cell Validators ───
// Validation utilities for cell editing.

export interface ValidationRule {
  validate: (value: any, data: any) => boolean | string | Promise<boolean | string>;
  message?: string;
}

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

/** Run a set of validation rules against a value. Returns on first failure. */
export async function runValidation(
  rules: ValidationRule[],
  value: any,
  data: any,
): Promise<ValidationResult> {
  for (const rule of rules) {
    const result = await rule.validate(value, data);
    if (result === false) {
      return { valid: false, message: rule.message ?? 'Validation failed' };
    }
    if (typeof result === 'string') {
      return { valid: false, message: result };
    }
  }
  return { valid: true };
}

// ── Built-in validation rules ──

export function required(message = 'Value is required'): ValidationRule {
  return {
    validate: (value) => value != null && String(value).trim() !== '',
    message,
  };
}

export function minLength(min: number, message?: string): ValidationRule {
  return {
    validate: (value) => String(value ?? '').length >= min,
    message: message ?? `Minimum length is ${min}`,
  };
}

export function maxLength(max: number, message?: string): ValidationRule {
  return {
    validate: (value) => String(value ?? '').length <= max,
    message: message ?? `Maximum length is ${max}`,
  };
}

export function minValue(min: number, message?: string): ValidationRule {
  return {
    validate: (value) => Number(value) >= min,
    message: message ?? `Minimum value is ${min}`,
  };
}

export function maxValue(max: number, message?: string): ValidationRule {
  return {
    validate: (value) => Number(value) <= max,
    message: message ?? `Maximum value is ${max}`,
  };
}

export function pattern(regex: RegExp, message = 'Invalid format'): ValidationRule {
  return {
    validate: (value) => regex.test(String(value ?? '')),
    message,
  };
}
