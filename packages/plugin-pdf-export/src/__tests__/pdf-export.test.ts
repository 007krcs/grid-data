import { describe, it, expect } from 'vitest';
import { PdfWriter } from '../pdf-writer';
import { buildPdfFromGrid } from '../pdf-builder';
import type { GridExportData } from '../pdf-builder';
import { PdfExportPlugin } from '../pdf-export-plugin';
import { PAGE_SIZES } from '../types';
import type { PdfExportOptions } from '../types';

// ─── PdfWriter Tests ───

describe('PdfWriter', () => {
  it('generates valid PDF header (%PDF-1.4)', () => {
    const writer = new PdfWriter(595, 842);
    writer.newPage();
    const bytes = writer.generate();
    const header = String.fromCharCode(...bytes.slice(0, 8));
    expect(header).toBe('%PDF-1.4');
  });

  it('generates valid PDF trailer (%%EOF)', () => {
    const writer = new PdfWriter(595, 842);
    writer.newPage();
    const bytes = writer.generate();
    const str = String.fromCharCode(...bytes);
    expect(str.trimEnd()).toMatch(/%%EOF$/);
  });

  it('generates a Uint8Array', () => {
    const writer = new PdfWriter(595, 842);
    writer.newPage();
    const bytes = writer.generate();
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
  });

  it('drawText adds content to the page stream', () => {
    const writer = new PdfWriter(595, 842);
    writer.newPage();
    writer.drawText('Hello World', 50, 800, 12);
    const bytes = writer.generate();
    const str = String.fromCharCode(...bytes);
    expect(str).toContain('(Hello World)');
    expect(str).toContain('BT');
    expect(str).toContain('ET');
  });

  it('drawText escapes special PDF characters', () => {
    const writer = new PdfWriter(595, 842);
    writer.newPage();
    writer.drawText('Test (value) and \\slash', 50, 800, 12);
    const bytes = writer.generate();
    const str = String.fromCharCode(...bytes);
    expect(str).toContain('\\(value\\)');
    expect(str).toContain('\\\\slash');
  });

  it('drawText uses bold font when specified', () => {
    const writer = new PdfWriter(595, 842);
    writer.newPage();
    writer.drawText('Bold Text', 50, 800, 12, true);
    const bytes = writer.generate();
    const str = String.fromCharCode(...bytes);
    expect(str).toContain('/F2 12 Tf');
  });

  it('drawText uses regular font by default', () => {
    const writer = new PdfWriter(595, 842);
    writer.newPage();
    writer.drawText('Normal Text', 50, 800, 12);
    const bytes = writer.generate();
    const str = String.fromCharCode(...bytes);
    expect(str).toContain('/F1 12 Tf');
  });

  it('drawLine adds content to the page stream', () => {
    const writer = new PdfWriter(595, 842);
    writer.newPage();
    writer.drawLine(0, 0, 100, 100);
    const bytes = writer.generate();
    const str = String.fromCharCode(...bytes);
    // Should contain moveto and lineto operators
    expect(str).toContain('0.00 0.00 m');
    expect(str).toContain('100.00 100.00 l');
    expect(str).toContain('S'); // stroke
  });

  it('drawRect with fill adds rectangle and fill operator', () => {
    const writer = new PdfWriter(595, 842);
    writer.newPage();
    writer.drawRect(10, 20, 100, 50, '#cccccc');
    const bytes = writer.generate();
    const str = String.fromCharCode(...bytes);
    expect(str).toContain('10.00 20.00 100.00 50.00 re');
    expect(str).toContain('f'); // fill operator
  });

  it('drawRect with stroke only adds stroke operator', () => {
    const writer = new PdfWriter(595, 842);
    writer.newPage();
    writer.drawRect(10, 20, 100, 50, undefined, true);
    const bytes = writer.generate();
    const str = String.fromCharCode(...bytes);
    expect(str).toContain('10.00 20.00 100.00 50.00 re');
    expect(str).toContain('S'); // stroke operator
  });

  it('supports multiple pages', () => {
    const writer = new PdfWriter(595, 842);
    writer.newPage();
    writer.drawText('Page 1', 50, 800, 12);
    writer.newPage();
    writer.drawText('Page 2', 50, 800, 12);
    const bytes = writer.generate();
    const str = String.fromCharCode(...bytes);
    expect(str).toContain('(Page 1)');
    expect(str).toContain('(Page 2)');
    expect(str).toContain('/Count 2');
  });

  it('contains required PDF structural elements', () => {
    const writer = new PdfWriter(595, 842);
    writer.newPage();
    writer.drawText('Test', 50, 800, 12);
    const bytes = writer.generate();
    const str = String.fromCharCode(...bytes);

    // Catalog
    expect(str).toContain('/Type /Catalog');
    // Pages
    expect(str).toContain('/Type /Pages');
    // Page
    expect(str).toContain('/Type /Page');
    // Font resources
    expect(str).toContain('/BaseFont /Helvetica');
    expect(str).toContain('/BaseFont /Helvetica-Bold');
    // Xref
    expect(str).toContain('xref');
    // Trailer
    expect(str).toContain('trailer');
    expect(str).toContain('startxref');
  });

  it('creates empty page when generate called without newPage', () => {
    const writer = new PdfWriter(595, 842);
    const bytes = writer.generate();
    const str = String.fromCharCode(...bytes);
    expect(str).toContain('%PDF-1.4');
    expect(str).toContain('/Count 1');
    expect(str.trimEnd()).toMatch(/%%EOF$/);
  });
});

// ─── buildPdfFromGrid Tests ───

describe('buildPdfFromGrid', () => {
  const sampleData: GridExportData = {
    headers: ['Name', 'Age', 'City'],
    rows: [
      ['Alice', '30', 'New York'],
      ['Bob', '25', 'London'],
      ['Charlie', '35', 'Tokyo'],
    ],
    columnWidths: [150, 80, 120],
  };

  it('generates valid PDF bytes from sample data', () => {
    const bytes = buildPdfFromGrid(sampleData, {});
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(100);

    const str = String.fromCharCode(...bytes);
    expect(str).toContain('%PDF-1.4');
    expect(str.trimEnd()).toMatch(/%%EOF$/);
  });

  it('includes header text in output', () => {
    const bytes = buildPdfFromGrid(sampleData, { headerText: 'My Report' });
    const str = String.fromCharCode(...bytes);
    expect(str).toContain('(My Report)');
  });

  it('includes column header names', () => {
    const bytes = buildPdfFromGrid(sampleData, {});
    const str = String.fromCharCode(...bytes);
    expect(str).toContain('(Name)');
    expect(str).toContain('(Age)');
    expect(str).toContain('(City)');
  });

  it('includes data cell values', () => {
    const bytes = buildPdfFromGrid(sampleData, {});
    const str = String.fromCharCode(...bytes);
    expect(str).toContain('(Alice)');
    expect(str).toContain('(Bob)');
    expect(str).toContain('(Charlie)');
  });

  it('respects landscape orientation', () => {
    const bytes = buildPdfFromGrid(sampleData, { orientation: 'landscape' });
    const str = String.fromCharCode(...bytes);
    // A4 landscape: width = 841.89, height = 595.28
    expect(str).toContain('841.89');
    expect(str).toContain('595.28');
  });

  it('respects letter page size', () => {
    const bytes = buildPdfFromGrid(sampleData, { pageSize: 'letter' });
    const str = String.fromCharCode(...bytes);
    expect(str).toContain('612.00');
    expect(str).toContain('792.00');
  });

  it('handles empty data', () => {
    const emptyData: GridExportData = { headers: [], rows: [], columnWidths: [] };
    const bytes = buildPdfFromGrid(emptyData, {});
    expect(bytes).toBeInstanceOf(Uint8Array);
    const str = String.fromCharCode(...bytes);
    expect(str).toContain('%PDF-1.4');
  });

  it('handles data with no headers', () => {
    const noHeaderData: GridExportData = {
      headers: [],
      rows: [['Alice', '30'], ['Bob', '25']],
      columnWidths: [100, 100],
    };
    const bytes = buildPdfFromGrid(noHeaderData, {});
    const str = String.fromCharCode(...bytes);
    expect(str).toContain('(Alice)');
    expect(str).toContain('(Bob)');
  });

  it('handles many rows triggering page breaks', () => {
    const manyRows: string[][] = [];
    for (let i = 0; i < 100; i++) {
      manyRows.push([`Row ${i}`, String(i)]);
    }
    const largeData: GridExportData = {
      headers: ['Name', 'Value'],
      rows: manyRows,
      columnWidths: [200, 100],
    };
    const bytes = buildPdfFromGrid(largeData, {});
    const str = String.fromCharCode(...bytes);
    // Should have multiple pages
    const countMatch = str.match(/\/Count (\d+)/);
    expect(countMatch).not.toBeNull();
    const pageCount = parseInt(countMatch![1]!, 10);
    expect(pageCount).toBeGreaterThan(1);
  });

  it('includes footer text when provided', () => {
    const bytes = buildPdfFromGrid(sampleData, { footerText: 'Confidential' });
    const str = String.fromCharCode(...bytes);
    expect(str).toContain('(Confidential)');
  });

  it('includes page numbers', () => {
    const bytes = buildPdfFromGrid(sampleData, {});
    const str = String.fromCharCode(...bytes);
    expect(str).toContain('(Page 1)');
  });
});

// ─── PdfExportPlugin factory Tests ───

describe('PdfExportPlugin', () => {
  it('creates a valid GridPlugin object', () => {
    const plugin = PdfExportPlugin();
    expect(plugin).toBeDefined();
    expect(plugin.id).toBe('pdf-export');
    expect(plugin.name).toBe('PDF Export');
    expect(plugin.version).toBe('0.1.0');
  });

  it('has an install function', () => {
    const plugin = PdfExportPlugin();
    expect(typeof plugin.install).toBe('function');
  });

  it('accepts default options', () => {
    const options: PdfExportOptions = {
      pageSize: 'letter',
      orientation: 'landscape',
      fontSize: 8,
    };
    const plugin = PdfExportPlugin(options);
    expect(plugin.id).toBe('pdf-export');
  });
});

// ─── PAGE_SIZES constants Tests ───

describe('PAGE_SIZES', () => {
  it('defines A4 dimensions', () => {
    expect(PAGE_SIZES.a4).toEqual({ width: 595.28, height: 841.89 });
  });

  it('defines letter dimensions', () => {
    expect(PAGE_SIZES.letter).toEqual({ width: 612, height: 792 });
  });

  it('defines legal dimensions', () => {
    expect(PAGE_SIZES.legal).toEqual({ width: 612, height: 1008 });
  });

  it('defines A3 dimensions', () => {
    expect(PAGE_SIZES.a3).toEqual({ width: 841.89, height: 1190.55 });
  });

  it('has all four page sizes', () => {
    const keys = Object.keys(PAGE_SIZES);
    expect(keys).toHaveLength(4);
    expect(keys).toContain('a4');
    expect(keys).toContain('letter');
    expect(keys).toContain('legal');
    expect(keys).toContain('a3');
  });
});
