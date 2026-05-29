// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.

// Register custom-event typings on GridEventMap.
import './events';

export { ExcelExportPlugin } from './excel-export-plugin';
export type {
  ExcelExportOptions,
  ProcessCellParams,
  ProcessHeaderParams,
  CellData,
  CellType,
} from './types';
export { ExportLimitExceededError } from './types';
export { buildCsvContent, buildExcelXml, toCellData, detectCellType } from './excel-builder';
export { buildXlsxParts } from './xlsx-builder';
export type { XlsxParts } from './xlsx-builder';
