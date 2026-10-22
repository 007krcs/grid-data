// Formula injection (CWE-1236): copied cells must not execute when pasted
// into Excel, Google Sheets or LibreOffice.
import { describe, it, expect } from 'vitest';
import { createRowNodes } from '@gridstorm/core';
import type { ColumnState } from '@gridstorm/core';
import { neutralizeFormula, serializeToTSV } from '../formatters';

const col = (field: string): ColumnState =>
  ({ colId: field, field, headerName: field, hide: false, originalDef: { field } } as unknown as ColumnState);

describe('neutralizeFormula', () => {
  it('prefixes formula triggers with an apostrophe', () => {
    expect(neutralizeFormula('=HYPERLINK("http://evil","x")')).toBe("'=HYPERLINK(\"http://evil\",\"x\")");
    expect(neutralizeFormula('+cmd|/C calc!A0')).toBe("'+cmd|/C calc!A0");
    expect(neutralizeFormula('@SUM(1)')).toBe("'@SUM(1)");
    expect(neutralizeFormula('\tx')).toBe("'\tx");
  });

  it('leaves ordinary text and plain numbers alone', () => {
    expect(neutralizeFormula('hello')).toBe('hello');
    expect(neutralizeFormula('-5')).toBe('-5');
    expect(neutralizeFormula('-12.5')).toBe('-12.5');
    expect(neutralizeFormula('')).toBe('');
  });
});

describe('serializeToTSV', () => {
  const nodes = createRowNodes([
    { name: '=1+1', amount: -3 },
    { name: 'safe', amount: 4 },
  ]);
  const columns = [col('name'), col('amount')];

  it('neutralizes by default', () => {
    const tsv = serializeToTSV(nodes, columns);
    expect(tsv.split('\n')[0]).toBe("'=1+1\t-3");
    expect(tsv.split('\n')[1]).toBe('safe\t4');
  });

  it('can be disabled explicitly', () => {
    const tsv = serializeToTSV(nodes, columns, { neutralizeFormulas: false });
    expect(tsv.split('\n')[0]).toBe('=1+1\t-3');
  });
});
