import { describe, it, expect, beforeEach } from 'vitest';
import { detectFields, inferFieldType, resetFieldCounter } from '../field-detector';
import { mapDataToFields } from '../field-mapper';
import { validateFieldValue, formatFieldValue } from '../fill-engine';
import { createFormFillPlugin } from '../form-fill-plugin';
import type { FormField } from '../types';

beforeEach(() => {
  resetFieldCounter();
});

describe('field-detector', () => {
  it('detects fields from "Label:" pattern', () => {
    const lines = [
      { text: 'Full Name:', rect: [10, 10, 100, 25] as [number, number, number, number] },
      { text: 'Email:', rect: [10, 30, 100, 45] as [number, number, number, number] },
    ];
    const fields = detectFields(lines, 0);
    expect(fields).toHaveLength(2);
    expect(fields[0]!.label).toBe('Full Name');
    expect(fields[0]!.type).toBe('name');
    expect(fields[1]!.label).toBe('Email');
    expect(fields[1]!.type).toBe('email');
  });

  it('detects fields with underscores blank area for higher confidence', () => {
    const lines = [
      { text: 'Phone: __________', rect: [10, 10, 200, 25] as [number, number, number, number] },
    ];
    const fields = detectFields(lines, 0);
    expect(fields).toHaveLength(1);
    expect(fields[0]!.confidence).toBe(0.9);
  });

  it('detects standalone underscore lines as unknown fields', () => {
    const lines = [
      { text: '__________', rect: [10, 30, 200, 45] as [number, number, number, number] },
    ];
    const fields = detectFields(lines, 0);
    expect(fields).toHaveLength(1);
    expect(fields[0]!.label).toBe('Unknown');
    expect(fields[0]!.type).toBe('text');
    expect(fields[0]!.confidence).toBe(0.5);
  });

  it('detects required fields marked with *', () => {
    const lines = [
      { text: 'Name*:', rect: [10, 10, 100, 25] as [number, number, number, number] },
    ];
    const fields = detectFields(lines, 0);
    expect(fields).toHaveLength(1);
    expect(fields[0]!.required).toBe(true);
  });

  it('assigns unique IDs to fields', () => {
    const lines = [
      { text: 'A:', rect: [10, 10, 50, 25] as [number, number, number, number] },
      { text: 'B:', rect: [10, 30, 50, 45] as [number, number, number, number] },
    ];
    const fields = detectFields(lines, 0);
    expect(fields[0]!.id).not.toBe(fields[1]!.id);
  });
});

describe('inferFieldType', () => {
  it('infers email type', () => {
    expect(inferFieldType('Email')).toBe('email');
    expect(inferFieldType('E-mail Address')).toBe('email');
    expect(inferFieldType('email address')).toBe('email');
  });

  it('infers phone type', () => {
    expect(inferFieldType('Phone')).toBe('phone');
    expect(inferFieldType('Telephone')).toBe('phone');
    expect(inferFieldType('Mobile')).toBe('phone');
  });

  it('infers name type', () => {
    expect(inferFieldType('Full Name')).toBe('name');
    expect(inferFieldType('First Name')).toBe('name');
    expect(inferFieldType('Last Name')).toBe('name');
  });

  it('infers address type', () => {
    expect(inferFieldType('Address')).toBe('address');
    expect(inferFieldType('Street')).toBe('address');
    expect(inferFieldType('City')).toBe('address');
    expect(inferFieldType('Zip')).toBe('address');
  });

  it('infers date type', () => {
    expect(inferFieldType('Date')).toBe('date');
    expect(inferFieldType('Date of Birth')).toBe('date');
    expect(inferFieldType('DOB')).toBe('date');
  });

  it('infers signature type', () => {
    expect(inferFieldType('Signature')).toBe('signature');
    expect(inferFieldType('Authorized Signature')).toBe('signature');
  });

  it('infers number type', () => {
    expect(inferFieldType('Amount')).toBe('number');
    expect(inferFieldType('Total')).toBe('number');
    expect(inferFieldType('Quantity')).toBe('number');
  });

  it('defaults to text for unknown labels', () => {
    expect(inferFieldType('Company')).toBe('text');
    expect(inferFieldType('Notes')).toBe('text');
  });
});

describe('field-mapper', () => {
  const fields: FormField[] = [
    { id: 'f1', label: 'Full Name', type: 'name', pageIndex: 0, labelRect: [0, 0, 0, 0], valueRect: [0, 0, 0, 0], value: '', required: false, confidence: 0.9 },
    { id: 'f2', label: 'Email', type: 'email', pageIndex: 0, labelRect: [0, 0, 0, 0], valueRect: [0, 0, 0, 0], value: '', required: false, confidence: 0.9 },
    { id: 'f3', label: 'Phone', type: 'phone', pageIndex: 0, labelRect: [0, 0, 0, 0], valueRect: [0, 0, 0, 0], value: '', required: false, confidence: 0.9 },
  ];

  it('maps data by exact label match', () => {
    const results = mapDataToFields(fields, { 'full name': 'John Doe' });
    expect(results[0]!.filled).toBe(true);
    expect(results[0]!.value).toBe('John Doe');
  });

  it('maps data by partial match', () => {
    const results = mapDataToFields(fields, { 'name': 'Jane' });
    expect(results[0]!.filled).toBe(true);
    expect(results[0]!.value).toBe('Jane');
  });

  it('maps data by type-based match', () => {
    const results = mapDataToFields(fields, { 'my_email': 'test@example.com' });
    expect(results[1]!.filled).toBe(true);
    expect(results[1]!.value).toBe('test@example.com');
  });

  it('returns error for unmatched fields', () => {
    const results = mapDataToFields(fields, { 'unrelated': 'value' });
    expect(results[0]!.filled).toBe(false);
    expect(results[0]!.error).toBe('No matching data found');
  });
});

describe('validateFieldValue', () => {
  it('validates correct email', () => {
    const result = validateFieldValue('user@example.com', 'email');
    expect(result.valid).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = validateFieldValue('not-an-email', 'email');
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid email format');
  });

  it('validates correct phone', () => {
    const result = validateFieldValue('+1 (555) 123-4567', 'phone');
    expect(result.valid).toBe(true);
  });

  it('rejects invalid phone', () => {
    const result = validateFieldValue('abc', 'phone');
    expect(result.valid).toBe(false);
  });

  it('validates correct date', () => {
    const result = validateFieldValue('01/15/2025', 'date');
    expect(result.valid).toBe(true);
  });

  it('rejects invalid date', () => {
    const result = validateFieldValue('not-a-date', 'date');
    expect(result.valid).toBe(false);
  });

  it('validates correct number', () => {
    const result = validateFieldValue('42.5', 'number');
    expect(result.valid).toBe(true);
  });

  it('validates name', () => {
    const result = validateFieldValue("John O'Brien", 'name');
    expect(result.valid).toBe(true);
  });

  it('uses custom validators when provided', () => {
    const custom = { email: /^.+@company\.com$/ } as Record<any, RegExp>;
    const valid = validateFieldValue('user@company.com', 'email', custom);
    expect(valid.valid).toBe(true);
    const invalid = validateFieldValue('user@other.com', 'email', custom);
    expect(invalid.valid).toBe(false);
  });
});

describe('formatFieldValue', () => {
  it('formats phone by stripping non-phone chars', () => {
    expect(formatFieldValue('abc123-456', 'phone')).toBe('123-456');
  });

  it('formats email to lowercase trimmed', () => {
    expect(formatFieldValue('  User@Example.COM  ', 'email')).toBe('user@example.com');
  });

  it('formats name with title case', () => {
    expect(formatFieldValue('john doe', 'name')).toBe('John Doe');
    expect(formatFieldValue('JANE SMITH', 'name')).toBe('Jane Smith');
  });

  it('formats number by stripping non-numeric', () => {
    expect(formatFieldValue('$1,234.56', 'number')).toBe('1234.56');
  });

  it('trims text by default', () => {
    expect(formatFieldValue('  hello  ', 'text')).toBe('hello');
  });
});

describe('createFormFillPlugin', () => {
  it('creates a valid plugin object', () => {
    const plugin = createFormFillPlugin();
    expect(plugin.id).toBe('form-fill');
    expect(plugin.name).toBe('Smart Form Fill');
    expect(plugin.version).toBe('0.1.0');
    expect(plugin.dependencies).toContain('text');
    expect(typeof plugin.install).toBe('function');
  });

  it('accepts optional config', () => {
    const plugin = createFormFillPlugin({ autoDetect: true });
    expect(plugin.id).toBe('form-fill');
  });
});
