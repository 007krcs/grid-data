// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Excel Builder ───
// Generates CSV and SpreadsheetML (Excel XML) content from grid data.
// Zero external dependencies.

import type { CellData, CellType } from './types';

// ─── CSV ───

/** Characters that can trigger formula execution in spreadsheet applications. */
const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r'];

/**
 * Escapes a CSV cell value according to RFC 4180.
 * Wraps in double-quotes if the value contains commas, quotes, or newlines.
 * Sanitizes values starting with formula-triggering characters to prevent
 * CSV injection attacks by prepending a tab character inside the quotes.
 */
function escapeCsvCell(value: string): string {
  // Sanitize formula injection: prefix with tab inside quotes
  if (value.length > 0 && FORMULA_PREFIXES.includes(value[0]!)) {
    return `"\t${value.replace(/"/g, '""')}"`;
  }
  if (
    value.includes(',') ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Builds a CSV string from headers and row data.
 *
 * @param headers - Array of header strings.
 * @param rows - 2D array of cell string values.
 * @returns A complete CSV string.
 */
export function buildCsvContent(headers: string[], rows: string[][]): string {
  const lines: string[] = [];

  if (headers.length > 0) {
    lines.push(headers.map(escapeCsvCell).join(','));
  }

  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(','));
  }

  return lines.join('\n');
}

// ─── Excel XML (SpreadsheetML) ───

/**
 * Escapes XML special characters in a string.
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Detects the cell type from a raw value.
 */
export function detectCellType(value: any): CellType {
  if (value == null) return 'String';
  if (typeof value === 'number' && !isNaN(value)) return 'Number';
  if (value instanceof Date) return 'DateTime';
  // Check for ISO date strings
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(T|\s)/.test(value)) {
    const parsed = Date.parse(value);
    if (!isNaN(parsed)) return 'DateTime';
  }
  return 'String';
}

/**
 * Converts a value to a CellData object for Excel XML output.
 */
export function toCellData(value: any): CellData {
  const type = detectCellType(value);
  if (value == null) return { value: '', type: 'String' };

  switch (type) {
    case 'Number':
      return { value: String(value), type: 'Number' };
    case 'DateTime': {
      const date = value instanceof Date ? value : new Date(value);
      return { value: date.toISOString(), type: 'DateTime' };
    }
    default:
      return { value: String(value), type: 'String' };
  }
}

/**
 * Builds an Excel XML (SpreadsheetML 2003) document.
 *
 * This format is natively supported by Excel, LibreOffice, and Google Sheets.
 * No ZIP compression needed — it's a plain XML file saved with .xml extension.
 *
 * @param sheetName - The worksheet name.
 * @param headers - Array of header strings.
 * @param rows - 2D array of CellData objects.
 * @returns A complete SpreadsheetML XML string.
 */
export function buildExcelXml(
  sheetName: string,
  headers: string[],
  rows: CellData[][],
): string {
  const lines: string[] = [];

  // XML declaration and workbook start
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<?mso-application progid="Excel.Sheet"?>');
  lines.push(
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"',
  );
  lines.push(' xmlns:o="urn:schemas-microsoft-com:office:office"');
  lines.push(' xmlns:x="urn:schemas-microsoft-com:office:excel"');
  lines.push(' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">');

  // Styles
  lines.push(' <Styles>');
  lines.push('  <Style ss:ID="Default" ss:Name="Normal">');
  lines.push('   <Alignment ss:Vertical="Bottom"/>');
  lines.push('  </Style>');
  lines.push('  <Style ss:ID="Header">');
  lines.push('   <Font ss:Bold="1"/>');
  lines.push('  </Style>');
  lines.push('  <Style ss:ID="DateStyle">');
  lines.push('   <NumberFormat ss:Format="yyyy-mm-dd hh:mm:ss"/>');
  lines.push('  </Style>');
  lines.push(' </Styles>');

  // Worksheet
  lines.push(` <Worksheet ss:Name="${escapeXml(sheetName)}">`);
  lines.push('  <Table>');

  // Header row
  if (headers.length > 0) {
    lines.push('   <Row>');
    for (const header of headers) {
      lines.push(
        `    <Cell ss:StyleID="Header"><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`,
      );
    }
    lines.push('   </Row>');
  }

  // Data rows
  for (const row of rows) {
    lines.push('   <Row>');
    for (const cell of row) {
      const styleAttr = cell.type === 'DateTime' ? ' ss:StyleID="DateStyle"' : '';
      lines.push(
        `    <Cell${styleAttr}><Data ss:Type="${cell.type}">${escapeXml(cell.value)}</Data></Cell>`,
      );
    }
    lines.push('   </Row>');
  }

  lines.push('  </Table>');
  lines.push(' </Worksheet>');
  lines.push('</Workbook>');

  return lines.join('\n');
}
