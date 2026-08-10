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
 * Sub-path imports:
 * - `gridstorm`          — Core engine + every plugin + renderer + i18n + license
 * - `gridstorm/react`    — React adapter (component + hooks + ErrorBoundary)
 * - `gridstorm/vue`      — Vue 3 adapter (component + composables + ErrorBoundary)
 * - `gridstorm/svelte`   — Svelte adapter
 * - `gridstorm/angular`  — Angular adapter
 * - `gridstorm/plugins`  — Every plugin, no core engine
 * - `gridstorm/pdf`      — PDF toolkit (separate product)
 * - `gridstorm/theme`    — Theme CSS tokens (light/dark/high-contrast)
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

// ─── AI Adapter (vendor-neutral LLM bring-your-own-adapter) ──
export {
  EchoAdapter,
  synthesizeFromSchema,
  OpenAIAdapter,
  AnthropicAdapter,
  isAIError,
  supportsEmbedding,
  supportsStreaming,
} from '../../ai-adapter/src/index';

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
export { A11yPlugin } from '../../plugin-a11y/src/index';

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
export { ClipboardProPlugin } from '../../plugin-clipboard-pro/src/index';
export { CellRangePlugin } from '../../plugin-cell-range/src/index';
export { ColumnAutoSizePlugin } from '../../plugin-column-autosize/src/index';
export { RowPinningPlugin } from '../../plugin-row-pinning/src/index';

// ─── Tier 3: Next-Gen Plugins ───────────────────────────────
export { StatusBarPlugin } from '../../plugin-status-bar/src/index';
export { StatePersistencePlugin } from '../../plugin-state-persistence/src/index';
export { ConditionalFormattingPlugin } from '../../plugin-conditional-formatting/src/index';
export { StreamingPlugin } from '../../plugin-streaming/src/index';
export { AdaptiveRendererPlugin } from '../../plugin-adaptive-renderer/src/index';
export { TemporalPlugin } from '../../plugin-temporal/src/index';
export { TimeTravelPlugin } from '../../plugin-time-travel/src/index';
export { CollabPlugin } from '../../plugin-collab/src/index';

// ─── Tier 3 — Formula cluster ───────────────────────────────
export { FormulaPlugin } from '../../plugin-formula/src/index';
export { FormulaEnginePlugin } from '../../plugin-formula-engine/src/index';
export { CellFormulaPlugin } from '../../plugin-cell-formula/src/index';

// ─── Tier 3 — Intelligence cluster ──────────────────────────
export { AIPlugin } from '../../plugin-ai/src/index';
export { AnomalyPlugin } from '../../plugin-anomaly/src/index';
export { NlQueryPlugin } from '../../plugin-nl-query/src/index';
export { IntelligenceHubPlugin } from '../../plugin-intelligence-hub/src/index';
export { IntentEnginePlugin } from '../../plugin-intent-engine/src/index';
export { SemanticPlugin } from '../../plugin-semantic/src/index';

// ─── Tier 3 — Privacy ───────────────────────────────────────
export { PrivacyLensPlugin } from '../../plugin-privacy-lens/src/index';

// ─── Tier 3 — Validation ────────────────────────────────────
export { ValidationPlugin } from '../../plugin-validation/src/index';

// ─── Pillar 1 — Realtime collaboration ──────────────────────
export {
  PresencePlugin,
  InMemoryPresenceAdapter,
  BroadcastChannelPresenceAdapter,
  WebSocketPresenceAdapter,
} from '../../plugin-presence/src/index';
export {
  YjsCellsPlugin,
  InMemoryCrdtTransport,
  BroadcastChannelCrdtTransport,
  WebSocketCrdtTransport,
} from '../../plugin-yjs-cells/src/index';
export { CommentsPlugin } from '../../plugin-comments/src/index';

// ─── Pillar 2 — LLM-backed features ─────────────────────────
export { AiQueryPlugin } from '../../plugin-ai-query/src/index';
export { CellAutocompletePlugin } from '../../plugin-cell-autocomplete/src/index';
