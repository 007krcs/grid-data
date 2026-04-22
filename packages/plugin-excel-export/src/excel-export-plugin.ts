// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Excel Export Plugin ───
// Provides CSV and Excel XML export capabilities for GridStorm grids.

import type { GridPlugin, PluginContext, ColumnState, RowNode } from '@gridstorm/core';
import { getValueFromData } from '@gridstorm/core';
import { validateLicense, createWatermark } from '@gridstorm/license';
import type { ExcelExportOptions } from './types';
import { buildCsvContent, buildExcelXml, toCellData } from './excel-builder';

export function ExcelExportPlugin(
  defaultOptions: ExcelExportOptions = {},
): GridPlugin {
  return {
    id: 'excel-export',
    name: 'Excel Export',
    version: '0.1.0',

    install(ctx: PluginContext) {
      // ── License validation ──
      const licenseResult = validateLicense('excel-export');
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
      function triggerDownload(
        content: string,
        fileName: string,
        mimeType: string,
      ): void {
        const blob = new Blob([content], { type: mimeType });
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

      // ── Command: Export CSV ──
      const unregExportCsv = ctx.commandBus.registerHandler(
        'excel:exportCsv',
        (payload: ExcelExportOptions) => {
          const { headers, dataRows, options } = buildExportData(payload);
          const fileName = (options.fileName || 'gridstorm-export') + '.csv';

          const stringRows = dataRows.map((row) =>
            row.map((v) => (v != null ? String(v) : '')),
          );

          const csvContent = buildCsvContent(headers, stringRows);
          triggerDownload(csvContent, fileName, 'text/csv;charset=utf-8;');

          ctx.eventBus.emit('excel:exported' as any, {
            format: 'csv',
            fileName,
            rowCount: stringRows.length,
          });
        },
      );

      // ── Command: Export Excel XML ──
      const unregExportExcel = ctx.commandBus.registerHandler(
        'excel:exportExcel',
        (payload: ExcelExportOptions) => {
          const { headers, dataRows, options } = buildExportData(payload);
          const fileName = (options.fileName || 'gridstorm-export') + '.xml';
          const sheetName = options.sheetName || 'Sheet1';

          const cellDataRows = dataRows.map((row) =>
            row.map((v) => toCellData(v)),
          );

          const xmlContent = buildExcelXml(sheetName, headers, cellDataRows);
          triggerDownload(
            xmlContent,
            fileName,
            'application/vnd.ms-excel;charset=utf-8;',
          );

          ctx.eventBus.emit('excel:exported' as any, {
            format: 'excel',
            fileName,
            rowCount: cellDataRows.length,
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
