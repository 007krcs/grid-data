// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── PDF Export Plugin ───
// Provides PDF export capabilities for GridStorm grids.
// Generates a formatted PDF table with headers, grid lines, and page breaks.

import type { GridPlugin, PluginContext, ColumnState, RowNode } from '@gridstorm/core';
import { getValueFromData } from '@gridstorm/core';
import type { PdfExportOptions } from './types';
import { PdfExportLimitExceededError } from './types';
import { buildPdfFromGrid } from './pdf-builder';
import type { GridExportData } from './pdf-builder';

// Default ceilings — see PdfExportOptions.maxRows / maxCells JSDoc.
const DEFAULT_MAX_ROWS = 25_000;
const DEFAULT_MAX_CELLS = 1_000_000;

/**
 * See excel-export-plugin's checkExportLimits comment for rationale: CommandBus
 * swallows thrown errors, so we return the error and emit a structured event.
 */
function checkExportLimits(
  rowCount: number,
  colCount: number,
  options: PdfExportOptions,
): PdfExportLimitExceededError | null {
  const maxRows = options.maxRows ?? DEFAULT_MAX_ROWS;
  const maxCells = options.maxCells ?? DEFAULT_MAX_CELLS;
  const cells = rowCount * Math.max(colCount, 1);
  if (rowCount > maxRows) {
    return new PdfExportLimitExceededError('rows', rowCount, cells, maxRows, maxCells);
  }
  if (cells > maxCells) {
    return new PdfExportLimitExceededError('cells', rowCount, cells, maxRows, maxCells);
  }
  return null;
}

export function PdfExportPlugin(
  defaultOptions: PdfExportOptions = {},
): GridPlugin {
  return {
    id: 'pdf-export',
    name: 'PDF Export',
    version: '0.1.0',

    install(ctx: PluginContext) {
      // ── Resolve columns for export ──
      function resolveColumns(options: PdfExportOptions): ColumnState[] {
        const state = ctx.store.getState();
        let columns = state.columns;

        // Filter hidden columns unless explicitly included
        if (!options.includeHiddenColumns) {
          columns = columns.filter((c: ColumnState) => !c.hide);
        }

        // Filter to specific column keys if provided
        if (options.columnKeys && options.columnKeys.length > 0) {
          const keySet = new Set(options.columnKeys);
          columns = columns.filter((c: ColumnState) => keySet.has(c.colId));
        }

        return columns;
      }

      // ── Resolve rows for export ──
      function resolveRows(options: PdfExportOptions): RowNode[] {
        const state = ctx.store.getState();

        if (options.onlySelected) {
          return ctx.api.getSelectedNodes();
        }

        const rows: RowNode[] = [];
        for (const id of state.displayedRowIds) {
          const node = state.rowNodes.get(id);
          if (node && node.data != null) {
            rows.push(node);
          }
        }
        return rows;
      }

      // ── Get cell value, respecting valueFormatter ──
      function getCellValue(
        node: RowNode,
        col: ColumnState,
        rowIndex: number,
        colIndex: number,
        options: PdfExportOptions,
      ): string {
        const field = col.field ?? col.colId;
        let value: any = getValueFromData(node.data, field);

        // Apply valueGetter if available on the original def
        const originalDef = col.originalDef;
        if (originalDef?.valueGetter) {
          value = originalDef.valueGetter({
            data: node.data,
            node,
            colDef: originalDef,
            colId: col.colId,
          });
        }
        if (originalDef?.valueFormatter) {
          value = originalDef.valueFormatter({
            value,
            data: node.data,
            node,
            colDef: originalDef,
          });
        }

        // Apply processCellCallback if provided
        if (options.processCellCallback) {
          value = options.processCellCallback({
            value,
            node,
            column: col,
            rowIndex,
            colIndex,
          });
        }

        return value != null ? String(value) : '';
      }

      // ── Get header value ──
      function getHeaderValue(
        col: ColumnState,
        colIndex: number,
        options: PdfExportOptions,
      ): string {
        if (options.processHeaderCallback) {
          return options.processHeaderCallback({ column: col, colIndex });
        }
        return col.headerName;
      }

      // ── Build export data ──
      function buildExportData(overrides: PdfExportOptions = {}): {
        gridData: GridExportData;
        options: PdfExportOptions;
      } {
        const options = { ...defaultOptions, ...overrides };
        const includeHeaders = options.includeHeaders !== false;
        const columns = resolveColumns(options);
        const rows = resolveRows(options);

        const headers: string[] = includeHeaders
          ? columns.map((col, i) => getHeaderValue(col, i, options))
          : [];

        const dataRows: string[][] = rows.map((node, rowIdx) =>
          columns.map((col, colIdx) =>
            getCellValue(node, col, rowIdx, colIdx, options),
          ),
        );

        // Use column widths from state (pixel widths)
        const columnWidths = columns.map((c) => c.width ?? 100);

        return {
          gridData: { headers, rows: dataRows, columnWidths },
          options,
        };
      }

      // ── Trigger browser download ──
      function triggerDownload(bytes: Uint8Array, fileName: string): void {
        const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        // Clean up after download starts
        setTimeout(() => {
          URL.revokeObjectURL(url);
          document.body.removeChild(link);
        }, 100);
      }

      // ── Command: Export PDF ──
      const unregExport = ctx.commandBus.registerHandler(
        'pdf:export',
        (payload: PdfExportOptions) => {
          const { gridData, options } = buildExportData(payload);
          // Cap check BEFORE the PDF byte-array allocation, which dwarfs
          // the row data itself.
          const limitErr = checkExportLimits(
            gridData.rows.length,
            gridData.headers.length || gridData.columnWidths.length,
            options,
          );
          if (limitErr) {
            ctx.eventBus.emit('pdf:exportFailed' as any, {
              reason: limitErr.reason,
              rows: limitErr.rows,
              cells: limitErr.cells,
              maxRows: limitErr.maxRows,
              maxCells: limitErr.maxCells,
              error: limitErr,
            });
            return;
          }

          const fileName = (options.fileName || 'gridstorm-export') + '.pdf';

          // Generate PDF bytes
          const pdfBytes = buildPdfFromGrid(gridData, options);

          // Trigger download
          triggerDownload(pdfBytes, fileName);

          // Emit completion event
          ctx.eventBus.emit('pdf:exportCompleted' as any, {
            fileName,
            rowCount: gridData.rows.length,
            pageSize: options.pageSize ?? 'a4',
            orientation: options.orientation ?? 'portrait',
          });
        },
      );

      return () => {
        unregExport();
      };
    },
  };
}
