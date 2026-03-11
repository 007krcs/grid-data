import { describe, it, expect } from 'vitest';
import { classifyDocument } from '../classifier';
import { extractFields } from '../extractor';
import { summarizeDocument } from '../summarizer';
import { detectTables } from '../table-detector';
import { createIntelligencePlugin } from '../intelligence-plugin';

describe('classifyDocument', () => {
  it('classifies invoice text correctly', () => {
    const text = 'Invoice #12345\nBill To: John Doe\nSubtotal: $500\nTax: $50\nTotal: $550\nDue Date: 01/15/2025\nPayment Terms: Net 30\nQty: 5\nUnit Price: $100';
    const results = classifyDocument(text);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.documentClass).toBe('invoice');
    expect(results[0]!.confidence).toBeGreaterThan(0);
  });

  it('classifies contract text correctly', () => {
    const text = 'This Agreement is entered into by the parties. Whereas the parties hereby agree to the terms and conditions. The obligations shall include termination clauses and governing law provisions. This contract is executed on the effective date with indemnification.';
    const results = classifyDocument(text);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.documentClass).toBe('contract');
  });

  it('classifies receipt text correctly', () => {
    const text = 'Receipt\nStore: Grocery Mart\nCashier: Jane\nSubtotal: $25.00\nTax: $2.50\nTotal: $27.50\nPaid: Cash\nChange: $2.50\nCard ending: 1234\nThank you for shopping!';
    const results = classifyDocument(text);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.documentClass).toBe('receipt');
  });

  it('classifies medical text correctly', () => {
    const text = 'Patient: John Doe. Diagnosis: Hypertension. Treatment plan includes prescription medication. Physician: Dr. Smith. Medical history reviewed. Blood pressure: 140/90. Dosage: 10mg daily. Allergies: None known. Symptoms include headache.';
    const results = classifyDocument(text);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.documentClass).toBe('medical');
  });

  it('returns unknown for generic text with no matching keywords', () => {
    const text = 'Lorem ipsum dolor sit amet consectetur adipiscing elit';
    const results = classifyDocument(text);
    expect(results).toHaveLength(1);
    expect(results[0]!.documentClass).toBe('unknown');
    expect(results[0]!.confidence).toBe(1.0);
  });

  it('returns multiple classifications sorted by confidence', () => {
    const text = 'Invoice total amount due. This agreement between the parties shall be executed.';
    const results = classifyDocument(text);
    expect(results.length).toBeGreaterThanOrEqual(2);
    // Should be sorted descending by confidence
    for (let i = 1; i < results.length; i++) {
      expect(results[i]!.confidence).toBeLessThanOrEqual(results[i - 1]!.confidence);
    }
  });
});

describe('extractFields', () => {
  it('extracts dates from text', () => {
    const text = 'Date: 01/15/2025\nSome other content here.';
    const fields = extractFields(text, 0);
    const dateField = fields.find((f) => f.name === 'date');
    expect(dateField).toBeDefined();
    expect(dateField!.value).toBe('01/15/2025');
    expect(dateField!.pageIndex).toBe(0);
  });

  it('extracts total amounts', () => {
    const text = 'Total: $1,234.56\nBalance Due: $500.00';
    const fields = extractFields(text, 0);
    const totalField = fields.find((f) => f.name === 'total_amount');
    expect(totalField).toBeDefined();
    expect(totalField!.value).toBe('1,234.56');
  });

  it('extracts email addresses', () => {
    const text = 'Contact us at support@example.com for more info.';
    const fields = extractFields(text, 0);
    const emailField = fields.find((f) => f.name === 'email');
    expect(emailField).toBeDefined();
    expect(emailField!.value).toBe('support@example.com');
  });

  it('extracts phone numbers', () => {
    const text = 'Phone: +1 (555) 123-4567';
    const fields = extractFields(text, 0);
    const phoneField = fields.find((f) => f.name === 'phone');
    expect(phoneField).toBeDefined();
    expect(phoneField!.value).toContain('555');
  });

  it('extracts invoice numbers', () => {
    const text = 'Invoice #INV-2025-001\nDate: 01/01/2025';
    const fields = extractFields(text, 0);
    const invoiceField = fields.find((f) => f.name === 'invoice_number');
    expect(invoiceField).toBeDefined();
    expect(invoiceField!.value).toContain('INV-2025-001');
  });

  it('returns empty array for text with no extractable fields', () => {
    const text = 'This is just plain text with nothing extractable.';
    const fields = extractFields(text, 0);
    expect(fields).toHaveLength(0);
  });
});

describe('summarizeDocument', () => {
  const longText = `The quarterly financial report shows strong performance across all divisions.
Revenue increased by 15% compared to the previous quarter. Operating expenses remained stable.
The marketing division launched three new campaigns targeting international markets.
Customer satisfaction scores improved by 8 points. Employee retention rates are at an all-time high.
The technology team completed the migration to cloud infrastructure. Security audits passed with no critical findings.
New partnerships were established with five major distributors. Supply chain optimization reduced delivery times by 20%.`;

  it('produces a summary with title', () => {
    const summary = summarizeDocument(longText, 1);
    expect(summary.title).toBeTruthy();
    expect(summary.title.length).toBeGreaterThan(0);
    expect(summary.title.length).toBeLessThanOrEqual(100);
  });

  it('produces a description', () => {
    const summary = summarizeDocument(longText, 1);
    expect(summary.description).toBeTruthy();
    expect(summary.description.length).toBeGreaterThan(0);
  });

  it('produces key points', () => {
    const summary = summarizeDocument(longText, 1);
    expect(summary.keyPoints).toBeDefined();
    expect(summary.keyPoints.length).toBeGreaterThan(0);
    expect(summary.keyPoints.length).toBeLessThanOrEqual(3);
  });

  it('includes word count', () => {
    const summary = summarizeDocument(longText, 1);
    expect(summary.wordCount).toBeGreaterThan(0);
  });

  it('includes page count', () => {
    const summary = summarizeDocument(longText, 3);
    expect(summary.pageCount).toBe(3);
  });

  it('respects maxLength for description', () => {
    const summary = summarizeDocument(longText, 1, 100);
    expect(summary.description.length).toBeLessThanOrEqual(200); // Allow some tolerance for sentence boundaries
  });

  it('handles empty text gracefully', () => {
    const summary = summarizeDocument('', 0);
    expect(summary.wordCount).toBe(0);
    expect(summary.title).toBe('Untitled Document');
  });
});

describe('detectTables', () => {
  it('detects a table from tab-separated lines', () => {
    const lines = [
      { text: 'Name\tAge\tCity', rect: [10, 10, 300, 25] as [number, number, number, number] },
      { text: 'Alice\t30\tNew York', rect: [10, 30, 300, 45] as [number, number, number, number] },
      { text: 'Bob\t25\tChicago', rect: [10, 50, 300, 65] as [number, number, number, number] },
    ];
    const tables = detectTables(lines, 0);
    expect(tables).toHaveLength(1);
    expect(tables[0]!.headerRow).toEqual(['Name', 'Age', 'City']);
    expect(tables[0]!.rows).toHaveLength(2);
    expect(tables[0]!.pageIndex).toBe(0);
  });

  it('detects a table from space-separated lines', () => {
    const lines = [
      { text: 'Item   Quantity   Price', rect: [10, 10, 300, 25] as [number, number, number, number] },
      { text: 'Widget   5   $10.00', rect: [10, 30, 300, 45] as [number, number, number, number] },
      { text: 'Gadget   3   $25.00', rect: [10, 50, 300, 65] as [number, number, number, number] },
    ];
    const tables = detectTables(lines, 0);
    expect(tables).toHaveLength(1);
    expect(tables[0]!.headerRow).toContain('Item');
    expect(tables[0]!.rows).toHaveLength(2);
  });

  it('returns empty array when no tables detected', () => {
    const lines = [
      { text: 'Single column line', rect: [10, 10, 200, 25] as [number, number, number, number] },
      { text: 'Another single column', rect: [10, 30, 200, 45] as [number, number, number, number] },
    ];
    const tables = detectTables(lines, 0);
    expect(tables).toHaveLength(0);
  });

  it('returns empty for fewer than 2 lines', () => {
    const lines = [
      { text: 'Col1\tCol2', rect: [10, 10, 200, 25] as [number, number, number, number] },
    ];
    const tables = detectTables(lines, 0);
    expect(tables).toHaveLength(0);
  });

  it('computes bounds correctly', () => {
    const lines = [
      { text: 'A\tB', rect: [10, 20, 300, 35] as [number, number, number, number] },
      { text: 'C\tD', rect: [15, 40, 280, 55] as [number, number, number, number] },
    ];
    const tables = detectTables(lines, 0);
    expect(tables).toHaveLength(1);
    expect(tables[0]!.bounds[0]).toBe(10);  // min x1
    expect(tables[0]!.bounds[1]).toBe(20);  // min y1
    expect(tables[0]!.bounds[2]).toBe(300); // max x2
    expect(tables[0]!.bounds[3]).toBe(55);  // max y2
  });

  it('assigns confidence based on row count', () => {
    const lines = [
      { text: 'H1\tH2', rect: [0, 0, 100, 10] as [number, number, number, number] },
      { text: 'A\tB', rect: [0, 15, 100, 25] as [number, number, number, number] },
      { text: 'C\tD', rect: [0, 30, 100, 40] as [number, number, number, number] },
      { text: 'E\tF', rect: [0, 45, 100, 55] as [number, number, number, number] },
    ];
    const tables = detectTables(lines, 0);
    expect(tables).toHaveLength(1);
    // 4 rows => confidence = min(0.5 + 4 * 0.05, 0.9) = 0.7
    expect(tables[0]!.confidence).toBe(0.7);
  });
});

describe('createIntelligencePlugin', () => {
  it('creates a valid plugin object', () => {
    const plugin = createIntelligencePlugin();
    expect(plugin.id).toBe('intelligence');
    expect(plugin.name).toBe('Document Intelligence');
    expect(plugin.version).toBe('0.1.0');
    expect(plugin.dependencies).toContain('text');
    expect(typeof plugin.install).toBe('function');
  });
});
