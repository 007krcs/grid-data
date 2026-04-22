// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── PDF Builder ───
// Builds a formatted PDF table from grid export data.
// Handles column layout, page breaks, headers, footers, and grid lines.

import { PdfWriter } from './pdf-writer';
import type { PdfExportOptions } from './types';
import { PAGE_SIZES } from './types';

export interface GridExportData {
  headers: string[];
  rows: string[][];
  columnWidths: number[];
}

const DEFAULT_MARGINS = { top: 40, right: 40, bottom: 40, left: 40 };
const HEADER_BG_COLOR = '#e0e0e0';
const ALT_ROW_BG_COLOR = '#f5f5f5';
const ROW_PADDING = 4;

/**
 * Builds a PDF Uint8Array from grid export data and options.
 *
 * Layout:
 * - Optional header text at top of each page
 * - Column headers with gray background (bold)
 * - Data rows with alternating subtle backgrounds
 * - Grid lines (horizontal and vertical)
 * - Page numbers and optional footer text at bottom
 */
export function buildPdfFromGrid(data: GridExportData, options: PdfExportOptions): Uint8Array {
  const pageSize = options.pageSize ?? 'a4';
  const orientation = options.orientation ?? 'portrait';
  const fontSize = options.fontSize ?? 10;
  const headerFontSize = options.headerFontSize ?? 12;
  const margins = options.margins ?? DEFAULT_MARGINS;

  // Resolve page dimensions
  const pageDims = PAGE_SIZES[pageSize];
  const pageWidth = orientation === 'landscape' ? pageDims.height : pageDims.width;
  const pageHeight = orientation === 'landscape' ? pageDims.width : pageDims.height;

  // Content area
  const contentLeft = margins.left;
  const contentRight = pageWidth - margins.right;
  const contentWidth = contentRight - contentLeft;
  const contentTop = pageHeight - margins.top;
  const contentBottom = margins.bottom;

  // Row heights
  const dataRowHeight = fontSize + ROW_PADDING * 2;
  const headerRowHeight = headerFontSize + ROW_PADDING * 2;

  // Calculate proportional column widths to fit content area
  const colWidths = calculateColumnWidths(data, contentWidth);

  const writer = new PdfWriter(pageWidth, pageHeight);

  let currentY = contentTop;
  let pageNumber = 1;
  const totalDataRows = data.rows.length;
  const hasHeaders = data.headers.length > 0;

  // Track page start positions for footer drawing
  const pageStarts: number[] = [];

  // ── Start first page ──
  writer.newPage();
  pageStarts.push(pageNumber);

  // Draw page header text if provided
  if (options.headerText) {
    writer.drawText(options.headerText, contentLeft, currentY - headerFontSize, headerFontSize + 2, true);
    currentY -= headerFontSize + 10;
  }

  // ── Draw column headers ──
  if (hasHeaders) {
    currentY = drawColumnHeaders(writer, data.headers, colWidths, currentY, contentLeft, headerRowHeight, headerFontSize);
  }

  // ── Draw data rows ──
  for (let rowIdx = 0; rowIdx < totalDataRows; rowIdx++) {
    // Check if we need a page break
    if (currentY - dataRowHeight < contentBottom + 20) {
      // Draw footer on current page
      drawPageFooter(writer, options.footerText, pageNumber, contentLeft, contentWidth, margins.bottom);

      // Start new page
      writer.newPage();
      pageNumber++;
      pageStarts.push(pageNumber);
      currentY = contentTop;

      // Re-draw page header text
      if (options.headerText) {
        writer.drawText(options.headerText, contentLeft, currentY - headerFontSize, headerFontSize + 2, true);
        currentY -= headerFontSize + 10;
      }

      // Re-draw column headers on new page
      if (hasHeaders) {
        currentY = drawColumnHeaders(writer, data.headers, colWidths, currentY, contentLeft, headerRowHeight, headerFontSize);
      }
    }

    const row = data.rows[rowIdx]!;

    // Alternating row background
    if (rowIdx % 2 === 1) {
      writer.drawRect(contentLeft, currentY - dataRowHeight, contentWidth, dataRowHeight, ALT_ROW_BG_COLOR);
    }

    // Draw cell text
    let cellX = contentLeft;
    for (let colIdx = 0; colIdx < row.length; colIdx++) {
      const cellValue = row[colIdx] ?? '';
      const colW = colWidths[colIdx] ?? 60;

      // Truncate text to fit column width (approximate: ~0.5 * fontSize per char)
      const maxChars = Math.floor(colW / (fontSize * 0.5));
      const displayText = cellValue.length > maxChars ? cellValue.substring(0, maxChars - 1) + '...' : cellValue;

      writer.drawText(displayText, cellX + ROW_PADDING, currentY - dataRowHeight + ROW_PADDING, fontSize);

      // Vertical grid line
      writer.drawLine(cellX, currentY, cellX, currentY - dataRowHeight, 0.25);

      cellX += colW;
    }

    // Right border vertical line
    writer.drawLine(cellX, currentY, cellX, currentY - dataRowHeight, 0.25);

    // Horizontal grid line below row
    writer.drawLine(contentLeft, currentY - dataRowHeight, contentLeft + contentWidth, currentY - dataRowHeight, 0.25);

    currentY -= dataRowHeight;
  }

  // Draw footer on last page
  drawPageFooter(writer, options.footerText, pageNumber, contentLeft, contentWidth, margins.bottom);

  return writer.generate();
}

/**
 * Draws column headers with background fill and bold text.
 * Returns the new Y position after the header row.
 */
function drawColumnHeaders(
  writer: PdfWriter,
  headers: string[],
  colWidths: number[],
  y: number,
  left: number,
  rowHeight: number,
  _fontSize: number,
): number {
  const contentWidth = colWidths.reduce((sum, w) => sum + w, 0);

  // Header background
  writer.drawRect(left, y - rowHeight, contentWidth, rowHeight, HEADER_BG_COLOR);

  // Header text
  let cellX = left;
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i] ?? '';
    const colW = colWidths[i] ?? 60;

    // Truncate header text if needed
    const maxChars = Math.floor(colW / (_fontSize * 0.5));
    const displayText = header.length > maxChars ? header.substring(0, maxChars - 1) + '...' : header;

    writer.drawText(displayText, cellX + ROW_PADDING, y - rowHeight + ROW_PADDING, _fontSize, true);

    // Vertical grid line
    writer.drawLine(cellX, y, cellX, y - rowHeight, 0.25);

    cellX += colW;
  }

  // Right border
  writer.drawLine(cellX, y, cellX, y - rowHeight, 0.25);

  // Top border
  writer.drawLine(left, y, left + contentWidth, y, 0.5);

  // Bottom border of header
  writer.drawLine(left, y - rowHeight, left + contentWidth, y - rowHeight, 0.5);

  return y - rowHeight;
}

/**
 * Draws page footer with page number and optional footer text.
 */
function drawPageFooter(
  writer: PdfWriter,
  footerText: string | undefined,
  pageNumber: number,
  left: number,
  contentWidth: number,
  bottomMargin: number,
): void {
  const footerY = bottomMargin - 15;

  // Page number (right-aligned)
  const pageStr = `Page ${pageNumber}`;
  // Approximate width: ~5.5 pts per character at size 8
  const pageStrWidth = pageStr.length * 5.5;
  writer.drawText(pageStr, left + contentWidth - pageStrWidth, footerY, 8);

  // Custom footer text (left-aligned)
  if (footerText) {
    writer.drawText(footerText, left, footerY, 8);
  }
}

/**
 * Calculates column widths to fit the available content width.
 * If source columnWidths are provided, scales them proportionally.
 * Otherwise distributes width evenly.
 */
function calculateColumnWidths(data: GridExportData, contentWidth: number): number[] {
  const colCount = data.headers.length || (data.rows[0]?.length ?? 0);
  if (colCount === 0) return [];

  if (data.columnWidths.length > 0) {
    const totalSource = data.columnWidths.reduce((sum, w) => sum + w, 0);
    if (totalSource > 0) {
      return data.columnWidths.map((w) => (w / totalSource) * contentWidth);
    }
  }

  // Even distribution
  const evenWidth = contentWidth / colCount;
  return Array.from({ length: colCount }, () => evenWidth);
}
