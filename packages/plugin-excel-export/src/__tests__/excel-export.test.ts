import { describe, it, expect } from 'vitest';
import {
  buildCsvContent,
  buildExcelXml,
  toCellData,
  detectCellType,
} from '../excel-builder';
import type { CellData } from '../types';

// ─── CSV Builder Tests ───

describe('buildCsvContent', () => {
  it('generates CSV with headers and data rows', () => {
    const headers = ['Name', 'Age', 'City'];
    const rows = [
      ['Alice', '30', 'New York'],
      ['Bob', '25', 'London'],
    ];

    const csv = buildCsvContent(headers, rows);
    const lines = csv.split('\n');

    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('Name,Age,City');
    expect(lines[1]).toBe('Alice,30,New York');
    expect(lines[2]).toBe('Bob,25,London');
  });

  it('generates CSV without headers when headers array is empty', () => {
    const rows = [
      ['Alice', '30'],
      ['Bob', '25'],
    ];

    const csv = buildCsvContent([], rows);
    const lines = csv.split('\n');

    expect(lines).toHaveLength(2);
    expect(lines[0]).toBe('Alice,30');
  });

  it('escapes commas in cell values', () => {
    const headers = ['Name', 'Description'];
    const rows = [['Alice', 'New York, NY']];

    const csv = buildCsvContent(headers, rows);
    const lines = csv.split('\n');

    expect(lines[1]).toBe('Alice,"New York, NY"');
  });

  it('escapes double quotes in cell values', () => {
    const headers = ['Name', 'Quote'];
    const rows = [['Alice', 'She said "hello"']];

    const csv = buildCsvContent(headers, rows);
    const lines = csv.split('\n');

    expect(lines[1]).toBe('Alice,"She said ""hello"""');
  });

  it('escapes newlines in cell values', () => {
    const headers = ['Name', 'Bio'];
    const rows = [['Alice', 'Line 1\nLine 2']];

    const csv = buildCsvContent(headers, rows);
    const lines = csv.split('\n');

    // The entire CSV will have the newline inside a quoted field
    expect(csv).toContain('"Line 1\nLine 2"');
  });

  it('handles empty rows', () => {
    const csv = buildCsvContent(['A', 'B'], []);
    expect(csv).toBe('A,B');
  });

  it('handles empty values', () => {
    const csv = buildCsvContent(['A', 'B'], [['', '']]);
    const lines = csv.split('\n');
    expect(lines[1]).toBe(',');
  });
});

// ─── Cell Type Detection Tests ───

describe('detectCellType', () => {
  it('detects Number type for numeric values', () => {
    expect(detectCellType(42)).toBe('Number');
    expect(detectCellType(3.14)).toBe('Number');
    expect(detectCellType(0)).toBe('Number');
    expect(detectCellType(-100)).toBe('Number');
  });

  it('detects String type for string values', () => {
    expect(detectCellType('hello')).toBe('String');
    expect(detectCellType('')).toBe('String');
  });

  it('detects DateTime type for Date objects', () => {
    expect(detectCellType(new Date())).toBe('DateTime');
  });

  it('detects DateTime type for ISO date strings', () => {
    expect(detectCellType('2024-01-15T10:30:00Z')).toBe('DateTime');
    expect(detectCellType('2024-01-15 10:30:00')).toBe('DateTime');
  });

  it('returns String for null/undefined', () => {
    expect(detectCellType(null)).toBe('String');
    expect(detectCellType(undefined)).toBe('String');
  });

  it('returns String for NaN', () => {
    expect(detectCellType(NaN)).toBe('String');
  });
});

// ─── toCellData Tests ───

describe('toCellData', () => {
  it('converts number to CellData', () => {
    const result = toCellData(42);
    expect(result).toEqual({ value: '42', type: 'Number' });
  });

  it('converts string to CellData', () => {
    const result = toCellData('hello');
    expect(result).toEqual({ value: 'hello', type: 'String' });
  });

  it('converts Date to CellData', () => {
    const date = new Date('2024-01-15T10:30:00Z');
    const result = toCellData(date);
    expect(result.type).toBe('DateTime');
    expect(result.value).toContain('2024-01-15');
  });

  it('converts null to empty string CellData', () => {
    const result = toCellData(null);
    expect(result).toEqual({ value: '', type: 'String' });
  });

  it('converts undefined to empty string CellData', () => {
    const result = toCellData(undefined);
    expect(result).toEqual({ value: '', type: 'String' });
  });
});

// ─── Excel XML Builder Tests ───

describe('buildExcelXml', () => {
  it('generates valid XML structure', () => {
    const headers = ['Name', 'Value'];
    const rows: CellData[][] = [
      [
        { value: 'Alice', type: 'String' },
        { value: '100', type: 'Number' },
      ],
    ];

    const xml = buildExcelXml('Sheet1', headers, rows);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<Workbook');
    expect(xml).toContain('ss:Name="Sheet1"');
    expect(xml).toContain('</Workbook>');
  });

  it('includes header row with bold style', () => {
    const headers = ['Name'];
    const rows: CellData[][] = [];

    const xml = buildExcelXml('Sheet1', headers, rows);

    expect(xml).toContain('ss:StyleID="Header"');
    expect(xml).toContain('ss:Type="String">Name</Data>');
  });

  it('includes data rows with correct types', () => {
    const headers: string[] = [];
    const rows: CellData[][] = [
      [
        { value: 'Alice', type: 'String' },
        { value: '42', type: 'Number' },
      ],
    ];

    const xml = buildExcelXml('Sheet1', headers, rows);

    expect(xml).toContain('ss:Type="String">Alice</Data>');
    expect(xml).toContain('ss:Type="Number">42</Data>');
  });

  it('applies DateStyle to DateTime cells', () => {
    const headers: string[] = [];
    const rows: CellData[][] = [
      [{ value: '2024-01-15T10:30:00.000Z', type: 'DateTime' }],
    ];

    const xml = buildExcelXml('Sheet1', headers, rows);

    expect(xml).toContain('ss:StyleID="DateStyle"');
    expect(xml).toContain('ss:Type="DateTime"');
  });

  it('escapes XML special characters', () => {
    const headers = ['Name & Title'];
    const rows: CellData[][] = [
      [{ value: '<script>alert("xss")</script>', type: 'String' }],
    ];

    const xml = buildExcelXml('Sheet1', headers, rows);

    expect(xml).toContain('Name &amp; Title');
    expect(xml).toContain('&lt;script&gt;');
    expect(xml).not.toContain('<script>');
  });

  it('uses custom sheet name', () => {
    const xml = buildExcelXml('My Data', [], []);
    expect(xml).toContain('ss:Name="My Data"');
  });

  it('generates empty table when no data', () => {
    const xml = buildExcelXml('Sheet1', [], []);
    expect(xml).toContain('<Table>');
    expect(xml).toContain('</Table>');
  });
});

// ─── Integration-style Tests ───

describe('CSV + Excel XML integration', () => {
  it('produces consistent row counts between CSV and Excel XML', () => {
    const headers = ['A', 'B', 'C'];
    const data = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
    ];

    const csv = buildCsvContent(headers, data);
    const csvLines = csv.split('\n');
    // 1 header + 3 data rows
    expect(csvLines).toHaveLength(4);

    const cellData: CellData[][] = data.map((row) =>
      row.map((v) => ({ value: v, type: 'String' as const })),
    );
    const xml = buildExcelXml('Sheet1', headers, cellData);
    // Count <Row> tags: 1 header + 3 data = 4
    const rowMatches = xml.match(/<Row>/g);
    expect(rowMatches).toHaveLength(4);
  });

  it('handles large dataset', () => {
    const headers = ['ID', 'Value'];
    const rows: string[][] = [];
    for (let i = 0; i < 1000; i++) {
      rows.push([String(i), `value-${i}`]);
    }

    const csv = buildCsvContent(headers, rows);
    expect(csv.split('\n')).toHaveLength(1001); // 1 header + 1000 rows

    const cellData: CellData[][] = rows.map((row) =>
      row.map((v) => ({ value: v, type: 'String' as const })),
    );
    const xml = buildExcelXml('Sheet1', headers, cellData);
    const rowMatches = xml.match(/<Row>/g);
    expect(rowMatches).toHaveLength(1001);
  });
});
