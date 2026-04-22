// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
import type { FieldType } from './types';

const DEFAULT_VALIDATORS: Record<FieldType, RegExp> = {
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  phone: /^[\d\s\-\+\(\)]{7,20}$/,
  date: /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/,
  number: /^-?\d+\.?\d*$/,
  name: /^[a-zA-Z\s\-'.]{2,}$/,
  address: /^.{5,}$/,
  text: /^.+$/,
  checkbox: /^(true|false|yes|no|1|0)$/i,
  signature: /^.+$/,
  custom: /^.+$/,
};

export function validateFieldValue(
  value: string,
  type: FieldType,
  customValidators?: Record<FieldType, RegExp>,
): { valid: boolean; error?: string } {
  const validators = { ...DEFAULT_VALIDATORS, ...customValidators };
  const regex = validators[type];

  if (!regex) return { valid: true };

  if (!regex.test(value)) {
    return { valid: false, error: `Invalid ${type} format` };
  }

  return { valid: true };
}

export function formatFieldValue(value: string, type: FieldType): string {
  switch (type) {
    case 'phone': return value.replace(/[^\d\+\-\(\)\s]/g, '');
    case 'email': return value.trim().toLowerCase();
    case 'name': return value.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    case 'number': return value.replace(/[^\d.\-]/g, '');
    default: return value.trim();
  }
}
