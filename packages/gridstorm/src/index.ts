// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * GridStorm — The Complete Enterprise Data Grid
 *
 * One import, everything included:
 *
 * ```ts
 * import { createGrid, SortingPlugin, FilteringPlugin } from 'gridstorm';
 * ```
 *
 * Sub-path imports for tree-shaking:
 * - `gridstorm`         — Core engine + all plugins
 * - `gridstorm/react`   — React adapter + hooks
 * - `gridstorm/plugins`  — All plugins only
 * - `gridstorm/pdf`      — PDF toolkit
 *
 * @module gridstorm
 */

// ─── Core Engine ─────────────────────────────────────────────
export * from '../../core/src/index';

// ─── DOM Renderer ────────────────────────────────────────────
export * from '../../dom-renderer/src/index';

// ─── i18n ────────────────────────────────────────────────────
export * from '../../i18n/src/index';

// ─── License ─────────────────────────────────────────────────
export * from '../../license/src/index';

// ─── Tier 1: Core Plugins (Open Source) ──────────────────────
export { SortingPlugin } from '../../plugin-sorting/src/index';
export { FilteringPlugin } from '../../plugin-filtering/src/index';
export { SelectionPlugin } from '../../plugin-selection/src/index';
export { EditingPlugin } from '../../plugin-editing/src/index';
export { PaginationPlugin } from '../../plugin-pagination/src/index';
export { ColumnPinningPlugin } from '../../plugin-column-pinning/src/index';
export { ColumnResizePlugin } from '../../plugin-column-resize/src/index';
export { ColumnReorderPlugin } from '../../plugin-column-reorder/src/index';
export { ContextMenuPlugin } from '../../plugin-context-menu/src/index';
export { ClipboardPlugin } from '../../plugin-clipboard/src/index';

// ─── Tier 2: Enterprise Plugins ─────────────────────────────
export { GroupingPlugin } from '../../plugin-grouping/src/index';
export { AggregationPlugin } from '../../plugin-aggregation/src/index';
export { PivotPlugin } from '../../plugin-pivoting/src/index';
export { MasterDetailPlugin } from '../../plugin-master-detail/src/index';
export { TreeDataPlugin } from '../../plugin-tree-data/src/index';
export { RowReorderPlugin } from '../../plugin-row-reorder/src/index';
export { ExcelExportPlugin } from '../../plugin-excel-export/src/index';
export { PdfExportPlugin } from '../../plugin-pdf-export/src/index';
export { SparklinePlugin } from '../../plugin-sparklines/src/index';
export { ChartsPlugin } from '../../plugin-charts/src/index';
export { SSRMPlugin } from '../../plugin-ssrm/src/index';

// ─── Tier 3: Next-Gen Plugins ───────────────────────────────
export { StatusBarPlugin } from '../../plugin-status-bar/src/index';
export { StatePersistencePlugin } from '../../plugin-state-persistence/src/index';
export { ColumnAutoSizePlugin } from '../../plugin-column-autosize/src/index';
export { RowPinningPlugin } from '../../plugin-row-pinning/src/index';
export { ConditionalFormattingPlugin } from '../../plugin-conditional-formatting/src/index';
export { StreamingPlugin } from '../../plugin-streaming/src/index';
export { AIPlugin } from '../../plugin-ai/src/index';

// ─── Tier 4: Market Differentiators (NO competitor has these) ─
export { FormulaPlugin } from '../../plugin-formula/src/index';
export { TimeTravelPlugin } from '../../plugin-time-travel/src/index';
export { CellRangePlugin } from '../../plugin-cell-range/src/index';
export { ValidationPlugin } from '../../plugin-validation/src/index';
