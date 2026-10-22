// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Excel Export Plugin ───
// Provides CSV and Excel XML export capabilities for GridStorm grids.

import type { GridPlugin, PluginContext, ColumnState, RowNode } from '@gridstorm/core';
import { getValueFromData } from '@gridstorm/core';
import { enforceLicense, createWatermark } from '@gridstorm/license';
import type { ExcelExportOptions } from './types';
import { ExportLimitExceededError } from './types';
import { csvLine, csvChunk, excelXmlHead, excelXmlRows, excelXmlTail, toCellData } from './excel-builder';

// Default ceilings — see ExcelExportOptions.maxRows / maxCells JSDoc for the
// rationale. Override per call via the corresponding option.
const DEFAULT_MAX_ROWS = 100_000;
const DEFAULT_MAX_CELLS = 5_000_000;
/** Rows serialized per chunk before yielding to the event loop. */
const DEFAULT_CHUNK_SIZE = 5_000;

/**
 * Check row + cell ceilings before serialization. Returns an
 * {@link ExportLimitExceededError} (rather than throwing) when a limit would
 * be exceeded, because the CommandBus swallows handler exceptions — callers
 * never see thrown errors from a `dispatch()`. The plugin emits a structured
 * `excel:exportFailed` event carrying the error so UIs can react.
 */
function checkExportLimits(
  format: 'csv' | 'excel',
  rowCount: number,
  colCount: number,
  options: ExcelExportOptions,
): ExportLimitExceededError | null {
  const maxRows = options.maxRows ?? DEFAULT_MAX_ROWS;
  const maxCells = options.maxCells ?? DEFAULT_MAX_CELLS;
  const cells = rowCount * Math.max(colCount, 1);
  if (rowCount > maxRows) {
    return new ExportLimitExceededError(format, 'rows', rowCount, cells, maxRows, maxCells);
  }
  if (cells > maxCells) {
    return new ExportLimitExceededError(format, 'cells', rowCount, cells, maxRows, maxCells);
  }
  return null;
}

export function ExcelExportPlugin(
  defaultOptions: ExcelExportOptions = {},
): GridPlugin {
  return {
    id: 'excel-export',
    name: 'Excel Export',
    version: '0.1.0',

    install(ctx: PluginContext) {
      // ── License validation ──
      const licenseResult = enforceLicense('excel-export');
      let unsubLicenseWatermark: (() => void) | undefined;
      if (!licenseResult.valid && !licenseResult.isDevelopment) {
        console.warn(licenseResult.message);
        unsubLicenseWatermark = ctx.eventBus.on('grid:ready', () => {
          const container = document.querySelector<HTMLElement>('.gs-root');
          if (container) createWatermark(container);
        });
      }
      if (!licenseResult.pluginLicensed && !licenseResult.isDevelopment) {
        console.warn(licenseResult.message);
      }

      // ── Resolve columns for export ──
      function resolveColumns(options: ExcelExportOptions): ColumnState[] {
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
      function resolveRows(options: ExcelExportOptions): RowNode[] {
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
        options: ExcelExportOptions,
      ): any {
        const field = col.field ?? col.colId;
        let value = getValueFromData(node.data, field);

        // Apply valueFormatter if available on the original def
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

        return value;
      }

      // ── Get header value ──
      function getHeaderValue(
        col: ColumnState,
        colIndex: number,
        options: ExcelExportOptions,
      ): string {
        if (options.processHeaderCallback) {
          return options.processHeaderCallback({ column: col, colIndex });
        }
        return col.headerName;
      }

      // ── Build export data ──
      function buildExportData(overrides: ExcelExportOptions = {}) {
        const options = { ...defaultOptions, ...overrides };
        const includeHeaders = options.includeHeaders !== false;
        const columns = resolveColumns(options);
        const rows = resolveRows(options);

        const headers: string[] = includeHeaders
          ? columns.map((col, i) => getHeaderValue(col, i, options))
          : [];

        const dataRows: any[][] = rows.map((node, rowIdx) =>
          columns.map((col, colIdx) =>
            getCellValue(node, col, rowIdx, colIdx, options),
          ),
        );

        return { headers, dataRows, columns, rows, options };
      }

      // ── Trigger browser download ──
      // Accepts the document as parts so no single concatenated string of
      // the whole file ever exists: Blob assembles from the parts directly.
      function triggerDownload(
        parts: BlobPart[],
        fileName: string,
        mimeType: string,
      ): void {
        const blob = new Blob(parts, { type: mimeType });
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

      // ── Chunked / streamed document assembly ──
      //
      // Rows are serialized `chunkSize` at a time. Between chunks the export
      // yields to the event loop so a 100k-row export no longer freezes the
      // tab, and `excel:exportProgress` lets the host show a progress bar.
      // With a `sink`, chunks are written out and dropped immediately, so
      // peak memory is one chunk rather than the whole file. Without a sink
      // the chunks are handed to Blob as separate parts (no mega-string).
      // Exports that fit in a single chunk run synchronously, so small
      // exports keep their old fire-and-forget semantics.
      interface ChunkedExportSpec {
        format: 'csv' | 'excel';
        fileName: string;
        mimeType: string;
        options: ExcelExportOptions;
        rowCount: number;
        head: string;
        chunk: (start: number, end: number) => string;
        tail: string;
      }

      const yieldToEventLoop = () => new Promise<void>((r) => setTimeout(r, 0));

      async function runChunkedExport(spec: ChunkedExportSpec): Promise<void> {
        const { format, fileName, mimeType, options, rowCount, head, chunk, tail } = spec;
        const chunkSize = Math.max(1, Math.floor(options.chunkSize ?? DEFAULT_CHUNK_SIZE));
        const sink = options.sink;
        const writer = sink
          ? 'getWriter' in sink
            ? sink.getWriter()
            : sink
          : null;
        const parts: string[] = [];

        // Fast path: a single-chunk download needs no yielding and keeps the
        // historical synchronous semantics (event fires before dispatch returns).
        if (!writer && rowCount <= chunkSize) {
          if (head) parts.push(head);
          if (rowCount > 0) parts.push(chunk(0, rowCount));
          if (tail) parts.push(tail);
          triggerDownload(parts, fileName, mimeType);
          ctx.eventBus.emit('excel:exported', { format, fileName, rowCount });
          return;
        }

        const emitWrite = async (text: string) => {
          if (!text) return;
          if (writer) await writer.write(text);
          else parts.push(text);
        };

        try {
          await emitWrite(head);
          const multiChunk = rowCount > chunkSize;
          for (let start = 0; start < rowCount; start += chunkSize) {
            const end = Math.min(start + chunkSize, rowCount);
            await emitWrite(chunk(start, end));
            if (multiChunk) {
              ctx.eventBus.emit('excel:exportProgress', { format, done: end, total: rowCount });
              if (end < rowCount) await yieldToEventLoop();
            }
          }
          await emitWrite(tail);

          if (writer) {
            await writer.close();
          } else {
            triggerDownload(parts, fileName, mimeType);
          }
          ctx.eventBus.emit('excel:exported', { format, fileName, rowCount });
        } catch (err) {
          console.error(`[GridStorm ExcelExport] ${format} export failed:`, err);
          if (writer && 'abort' in writer) {
            try { await (writer as WritableStreamDefaultWriter<string>).abort(err); } catch { /* ignore */ }
          }
        }
      }

      // ── Command: Export CSV ──
      const unregExportCsv = ctx.commandBus.registerHandler(
        'excel:exportCsv',
        (payload: ExcelExportOptions) => {
          const { headers, dataRows, columns, options } = buildExportData(payload);
          // Cap check BEFORE building the gigabyte-scale string.
          const limitErr = checkExportLimits('csv', dataRows.length, columns.length, options);
          if (limitErr) {
            ctx.eventBus.emit('excel:exportFailed', {
              format: 'csv',
              reason: limitErr.reason,
              rows: limitErr.rows,
              cells: limitErr.cells,
              maxRows: limitErr.maxRows,
              maxCells: limitErr.maxCells,
              error: limitErr,
            });
            return;
          }

          const fileName = (options.fileName || 'gridstorm-export') + '.csv';

          void runChunkedExport({
            format: 'csv',
            fileName,
            mimeType: 'text/csv;charset=utf-8;',
            options,
            rowCount: dataRows.length,
            head: headers.length > 0 ? csvLine(headers) + (dataRows.length > 0 ? '\n' : '') : '',
            chunk: (start, end) => {
              const slice = new Array<string[]>(end - start);
              for (let i = start; i < end; i++) {
                slice[i - start] = dataRows[i]!.map((v) => (v != null ? String(v) : ''));
              }
              return csvChunk(slice) + (end < dataRows.length ? '\n' : '');
            },
            tail: '',
          });
        },
      );

      // ── Command: Export Excel XML ──
      const unregExportExcel = ctx.commandBus.registerHandler(
        'excel:exportExcel',
        (payload: ExcelExportOptions) => {
          const { headers, dataRows, columns, options } = buildExportData(payload);
          const limitErr = checkExportLimits('excel', dataRows.length, columns.length, options);
          if (limitErr) {
            ctx.eventBus.emit('excel:exportFailed', {
              format: 'excel',
              reason: limitErr.reason,
              rows: limitErr.rows,
              cells: limitErr.cells,
              maxRows: limitErr.maxRows,
              maxCells: limitErr.maxCells,
              error: limitErr,
            });
            return;
          }

          const fileName = (options.fileName || 'gridstorm-export') + '.xml';
          const sheetName = options.sheetName || 'Sheet1';

          void runChunkedExport({
            format: 'excel',
            fileName,
            mimeType: 'application/vnd.ms-excel;charset=utf-8;',
            options,
            rowCount: dataRows.length,
            head: excelXmlHead(sheetName, headers),
            chunk: (start, end) => {
              const slice = new Array<ReturnType<typeof toCellData>[]>(end - start);
              for (let i = start; i < end; i++) slice[i - start] = dataRows[i]!.map((v) => toCellData(v));
              return excelXmlRows(slice);
            },
            tail: excelXmlTail(),
          });
        },
      );

      // ── Command: Export Data (returns raw data, no download) ──
      const unregExportData = ctx.commandBus.registerHandler(
        'excel:exportData',
        (payload: ExcelExportOptions) => {
          const { headers, dataRows } = buildExportData(payload);
          return { headers, rows: dataRows };
        },
      );

      return () => {
        unsubLicenseWatermark?.();
        unregExportCsv();
        unregExportExcel();
        unregExportData();
      };
    },
  };
}
