// ─── Built-in Validators ───
// Each returns true if valid, or an error message string if invalid.

export function validateRequired(value: unknown): boolean | string {
  if (value === null || value === undefined) return 'Value is required';
  if (typeof value === 'string' && value.trim() === '') return 'Value is required';
  if (typeof value === 'number' && isNaN(value)) return 'Value is required';
  return true;
}

export function validateEmail(value: unknown): boolean | string {
  if (value === null || value === undefined || value === '') return true; // not required
  const str = String(value);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(str)) return `"${str}" is not a valid email address`;
  return true;
}

export function validatePhone(value: unknown, _countryCode?: string): boolean | string {
  if (value === null || value === undefined || value === '') return true;
  const str = String(value);
  // Allow digits, spaces, dashes, parens, +
  if (!/^[0-9\s\-\(\)\+]+$/.test(str)) return `"${str}" is not a valid phone number`;
  // At least 7 digits
  const digitCount = str.replace(/\D/g, '').length;
  if (digitCount < 7) return `Phone number must contain at least 7 digits`;
  return true;
}

export function validateUrl(value: unknown, requireHttps?: boolean): boolean | string {
  if (value === null || value === undefined || value === '') return true;
  const str = String(value);
  if (requireHttps) {
    if (!str.startsWith('https://')) return `URL must start with https://`;
  } else {
    if (!str.startsWith('http://') && !str.startsWith('https://')) {
      return `URL must start with http:// or https://`;
    }
  }
  // Basic structure check
  try {
    new URL(str);
    return true;
  } catch {
    return `"${str}" is not a valid URL`;
  }
}

export function validateRegex(value: unknown, pattern: string, flags?: string): boolean | string {
  if (value === null || value === undefined || value === '') return true;
  const str = String(value);
  const regex = new RegExp(pattern, flags);
  if (!regex.test(str)) return `Value does not match pattern /${pattern}/${flags || ''}`;
  return true;
}

export function validateRange(
  value: unknown,
  min?: number,
  max?: number,
  exclusive?: boolean,
): boolean | string {
  if (value === null || value === undefined || value === '') return true;
  const num = Number(value);
  if (isNaN(num)) return `Value must be a number`;

  if (exclusive) {
    if (min !== undefined && num <= min) return `Value must be greater than ${min}`;
    if (max !== undefined && num >= max) return `Value must be less than ${max}`;
  } else {
    if (min !== undefined && num < min) return `Value must be at least ${min}`;
    if (max !== undefined && num > max) return `Value must be at most ${max}`;
  }
  return true;
}

export function validateList(
  value: unknown,
  values: unknown[],
  caseSensitive?: boolean,
): boolean | string {
  if (value === null || value === undefined || value === '') return true;

  if (caseSensitive === false && typeof value === 'string') {
    const lowerValue = value.toLowerCase();
    const found = values.some(
      (v) => typeof v === 'string' && v.toLowerCase() === lowerValue,
    );
    if (!found) return `Value must be one of: ${values.join(', ')}`;
    return true;
  }

  if (!values.includes(value)) return `Value must be one of: ${values.join(', ')}`;
  return true;
}

export function validateLength(
  value: unknown,
  min?: number,
  max?: number,
): boolean | string {
  if (value === null || value === undefined || value === '') return true;
  const str = String(value);
  if (min !== undefined && str.length < min) return `Length must be at least ${min}`;
  if (max !== undefined && str.length > max) return `Length must be at most ${max}`;
  return true;
}

export function validateInteger(value: unknown): boolean | string {
  if (value === null || value === undefined || value === '') return true;
  const num = Number(value);
  if (isNaN(num)) return `Value must be an integer`;
  if (!Number.isInteger(num)) return `Value must be an integer (no decimals)`;
  return true;
}
