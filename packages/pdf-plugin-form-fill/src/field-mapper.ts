// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
import type { FormField, FillResult } from './types';

export function mapDataToFields(
  fields: FormField[],
  data: Record<string, string>,
): FillResult[] {
  const results: FillResult[] = [];

  for (const field of fields) {
    // Try exact match by field label
    const labelLower = field.label.toLowerCase().replace(/[*:]/g, '').trim();

    let value: string | undefined;

    // Try exact key match
    for (const [key, val] of Object.entries(data)) {
      if (key.toLowerCase() === labelLower) {
        value = val;
        break;
      }
    }

    // Try partial match
    if (!value) {
      for (const [key, val] of Object.entries(data)) {
        if (labelLower.includes(key.toLowerCase()) || key.toLowerCase().includes(labelLower)) {
          value = val;
          break;
        }
      }
    }

    // Try type-based match
    if (!value) {
      for (const [key, val] of Object.entries(data)) {
        if (field.type === 'email' && key.toLowerCase().includes('email')) { value = val; break; }
        if (field.type === 'phone' && key.toLowerCase().includes('phone')) { value = val; break; }
        if (field.type === 'name' && key.toLowerCase().includes('name')) { value = val; break; }
        if (field.type === 'address' && key.toLowerCase().includes('address')) { value = val; break; }
        if (field.type === 'date' && key.toLowerCase().includes('date')) { value = val; break; }
      }
    }

    if (value) {
      results.push({ fieldId: field.id, filled: true, value });
    } else {
      results.push({ fieldId: field.id, filled: false, value: '', error: 'No matching data found' });
    }
  }

  return results;
}
