// © 2025 GridStorm / Tekivex — All Rights Reserved
// Tests for RFC 4180-style quoting in clipboard formatters.

import { describe, it, expect } from 'vitest';
import { serializeToTSV, parseTSV } from '../formatters';
import type { ColumnState, RowNode } from '@gridstorm/core';

/** Build a minimal RowNode-like object good enough for serializeToTSV. */
function row(data: Record<string, unknown>): RowNode {
  return { id: String(data.id ?? Math.random()), data } as unknown as RowNode;
}

/** Build a minimal ColumnState-like object. */
function col(field: string, headerName = field): ColumnState {
  return { colId: field, field, headerName } as unknown as ColumnState;
}

describe('serializeToTSV', () => {
  it('does not quote simple values', () => {
    const out = serializeToTSV(
      [row({ name: 'Alice', age: 30 })],
      [col('name'), col('age')],
    );
    expect(out).toBe('Alice\t30');
  });

  it('quotes a cell that contains the delimiter', () => {
    const out = serializeToTSV(
      [row({ name: 'Doe, Jane', city: 'NYC' })],
      [col('name'), col('city')],
      { delimiter: ',' },
    );
    expect(out).toBe('"Doe, Jane",NYC');
  });

  it('escapes embedded double quotes by doubling them', () => {
    const out = serializeToTSV(
      [row({ quote: 'He said "yes"' })],
      [col('quote')],
      { delimiter: ',' },
    );
    expect(out).toBe('"He said ""yes"""');
  });

  it('quotes cells containing newlines', () => {
    const out = serializeToTSV(
      [row({ note: 'line one\nline two' })],
      [col('note')],
      { delimiter: ',' },
    );
    expect(out).toBe('"line one\nline two"');
  });

  it('quotes cells containing CR (Windows line endings inside cells)', () => {
    const out = serializeToTSV(
      [row({ note: 'a\r\nb' })],
      [col('note')],
      { delimiter: ',' },
    );
    expect(out).toBe('"a\r\nb"');
  });

  it('renders null and undefined as empty fields', () => {
    const out = serializeToTSV(
      [row({ a: null, b: undefined, c: 'x' })],
      [col('a'), col('b'), col('c')],
      { delimiter: ',' },
    );
    expect(out).toBe(',,x');
  });

  it('quotes header names that contain the delimiter', () => {
    const out = serializeToTSV(
      [row({ x: 1 })],
      [col('x', 'Header, with comma')],
      { delimiter: ',', copyHeaders: true },
    );
    expect(out).toBe('"Header, with comma"\n1');
  });
});

describe('parseTSV', () => {
  it('parses a simple row', () => {
    expect(parseTSV('a\tb\tc')).toEqual([['a', 'b', 'c']]);
  });

  it('parses quoted fields with embedded delimiters', () => {
    expect(parseTSV('"Doe, Jane",NYC', ',')).toEqual([['Doe, Jane', 'NYC']]);
  });

  it('parses doubled quotes as a literal quote', () => {
    expect(parseTSV('"He said ""yes"""', ',')).toEqual([['He said "yes"']]);
  });

  it('parses quoted multi-line fields', () => {
    expect(parseTSV('"line one\nline two",x', ',')).toEqual([
      ['line one\nline two', 'x'],
    ]);
  });

  it('handles CRLF line endings', () => {
    expect(parseTSV('a,b\r\nc,d\r\n', ',')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('handles bare CR line endings', () => {
    expect(parseTSV('a,b\rc,d', ',')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('handles empty cells between delimiters', () => {
    expect(parseTSV('a,,c', ',')).toEqual([['a', '', 'c']]);
  });

  it('ignores trailing newline (no spurious empty row)', () => {
    expect(parseTSV('a,b\n', ',')).toEqual([['a', 'b']]);
  });

  it('parses multiple rows with mixed quoted and unquoted fields', () => {
    const input = 'name,city\n"Doe, Jane",NYC\nBob,"San Francisco, CA"';
    expect(parseTSV(input, ',')).toEqual([
      ['name', 'city'],
      ['Doe, Jane', 'NYC'],
      ['Bob', 'San Francisco, CA'],
    ]);
  });
});

describe('round-trip (serialize → parse)', () => {
  const cases: Array<{ name: string; data: Record<string, string> }> = [
    { name: 'simple', data: { a: 'foo', b: 'bar' } },
    { name: 'commas in value', data: { a: 'Doe, Jane', b: 'NYC' } },
    { name: 'quotes in value', data: { a: 'He said "yes"', b: 'plain' } },
    { name: 'newline in value', data: { a: 'line1\nline2', b: 'plain' } },
    { name: 'CRLF in value', data: { a: 'line1\r\nline2', b: 'plain' } },
    {
      name: 'all hazards combined',
      data: { a: 'He said "hi, there"\nnew line', b: '' },
    },
    { name: 'tab in value (CSV mode)', data: { a: 'with\ttab', b: 'x' } },
  ];

  for (const { name, data } of cases) {
    it(`round-trips: ${name}`, () => {
      const cols = Object.keys(data).map((k) => col(k));
      const serialized = serializeToTSV([row(data)], cols, { delimiter: ',' });
      const parsed = parseTSV(serialized, ',');
      expect(parsed).toEqual([Object.values(data)]);
    });
  }
});
