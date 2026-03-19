// ─── AI Integration Plugin ───
// Natural language queries, anomaly detection, and smart suggestions for GridStorm.
// All AI features work locally without API calls. The optional LLM adapter enables
// advanced natural language parsing for complex queries.

import type { GridPlugin, PluginContext } from '@gridstorm/core';
import { parseNaturalLanguage } from './nl-query-parser';
import { detectAnomalies } from './anomaly-detector';
import { generateSuggestions } from './smart-suggestions';

// ─── Public Types ───

export interface ColumnInfo {
  id: string;
  field: string;
  headerName?: string;
}

export interface NLPattern {
  regex: RegExp;
  toAction: (match: RegExpMatchArray, columns: ColumnInfo[]) => GridAction | null;
}

export interface NLParserConfig {
  enabled?: boolean;
  customPatterns?: NLPattern[];
}

export interface AnomalyConfig {
  enabled?: boolean;
  /** Z-score threshold for flagging anomalies. Default: 2.5 */
  zScoreThreshold?: number;
  /** IQR multiplier for outlier fencing. Default: 1.5 */
  iqrMultiplier?: number;
  /** Automatically run anomaly detection when data loads. Default: false */
  autoDetect?: boolean;
  /** Columns to monitor for anomalies (empty = all numeric columns). */
  columns?: string[];
}

export interface SuggestionConfig {
  enabled?: boolean;
  /** Maximum number of suggestions to return. Default: 5 */
  maxSuggestions?: number;
}

export interface LLMAdapter {
  query(prompt: string, context: GridContext): Promise<LLMResponse>;
}

export interface GridContext {
  columns: { id: string; field: string; type?: string }[];
  rowCount: number;
  sampleData: Record<string, unknown>[];
}

export interface LLMResponse {
  action: GridAction;
  explanation: string;
}

export type GridAction =
  | { type: 'sort'; colId: string; direction: 'asc' | 'desc' }
  | { type: 'filter'; colId: string; filterType: string; value: unknown }
  | { type: 'group'; colIds: string[] }
  | { type: 'highlight'; rowIds: string[] }
  | { type: 'aggregate'; colId: string; func: string }
  | { type: 'none'; reason: string };

export interface Anomaly {
  rowId: string;
  colId: string;
  value: number;
  expected: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high';
  method: 'zscore' | 'iqr';
}

export interface Suggestion {
  id: string;
  type: 'sort' | 'filter' | 'group' | 'chart' | 'format';
  description: string;
  action: GridAction;
  confidence: number;
}

export interface AIState {
  anomalies: Anomaly[];
  suggestions: Suggestion[];
  lastQuery: string;
  lastQueryResult: GridAction | null;
  isProcessing: boolean;
}

export interface AIPluginOptions {
  /** Natural language parser configuration. */
  nlParser?: NLParserConfig;
  /** Anomaly detection configuration. */
  anomalyDetection?: AnomalyConfig;
  /** Smart suggestions configuration. */
  suggestions?: SuggestionConfig;
  /** Optional LLM integration for advanced NL parsing. */
  llmAdapter?: LLMAdapter;
}

// ─── Helpers ───

const DEFAULT_AI_STATE: AIState = {
  anomalies: [],
  suggestions: [],
  lastQuery: '',
  lastQueryResult: null,
  isProcessing: false,
};

/**
 * Extract column info from the grid state for the NL parser.
 */
function getColumnInfos(ctx: PluginContext): ColumnInfo[] {
  const state = ctx.store.getState();
  return state.columns.map((col) => ({
    id: col.colId,
    field: col.colId, // ColumnState uses colId as identifier
    headerName: col.headerName,
  }));
}

/**
 * Get sample data from the grid for analysis.
 */
function getSampleData(ctx: PluginContext, maxRows = 100): Record<string, unknown>[] {
  const state = ctx.store.getState();
  const rows: Record<string, unknown>[] = [];
  const rowNodes = state.rowNodes;

  let count = 0;
  rowNodes.forEach((node) => {
    if (count >= maxRows) return;
    if (node.data) {
      rows.push(node.data as Record<string, unknown>);
      count++;
    }
  });

  return rows;
}

/**
 * Extract numeric values for a specific column from row data.
 */
function getNumericColumnValues(
  ctx: PluginContext,
  colId: string,
): { values: number[]; rowIds: string[] } {
  const state = ctx.store.getState();
  const values: number[] = [];
  const rowIds: string[] = [];

  state.rowNodes.forEach((node) => {
    if (!node.data) return;
    const raw = (node.data as Record<string, unknown>)[colId];
    if (typeof raw === 'number' && !isNaN(raw)) {
      values.push(raw);
      rowIds.push(node.id);
    } else if (typeof raw === 'string') {
      const num = Number(raw);
      if (!isNaN(num)) {
        values.push(num);
        rowIds.push(node.id);
      }
    }
  });

  return { values, rowIds };
}

/**
 * Determine which columns to run anomaly detection on.
 * If specific columns are configured, use those; otherwise find all numeric columns.
 */
function resolveAnomalyColumns(ctx: PluginContext, configColumns?: string[]): string[] {
  if (configColumns && configColumns.length > 0) {
    return configColumns;
  }

  // Auto-detect numeric columns by sampling data
  const sample = getSampleData(ctx, 20);
  if (sample.length === 0) return [];

  const columns = getColumnInfos(ctx);
  const numericCols: string[] = [];

  for (const col of columns) {
    let numericCount = 0;
    for (const row of sample) {
      const val = row[col.field];
      if (typeof val === 'number' && !isNaN(val)) numericCount++;
    }
    if (numericCount > sample.length * 0.5) {
      numericCols.push(col.id);
    }
  }

  return numericCols;
}

/**
 * Build a GridContext for the LLM adapter.
 */
function buildGridContext(ctx: PluginContext): GridContext {
  const state = ctx.store.getState();
  const columns = state.columns.map((col) => ({
    id: col.colId,
    field: col.colId,
    type: undefined as string | undefined,
  }));

  const sampleData = getSampleData(ctx, 5);

  // Infer column types from sample data
  for (const col of columns) {
    for (const row of sampleData) {
      const val = row[col.field];
      if (val != null) {
        col.type = typeof val;
        break;
      }
    }
  }

  return {
    columns,
    rowCount: state.rowNodes.size,
    sampleData,
  };
}

// ─── Plugin Factory ───

/**
 * Create an AI Integration plugin for GridStorm.
 *
 * Provides natural language query parsing, statistical anomaly detection,
 * and smart data-driven suggestions. All features work locally without
 * API calls. An optional LLM adapter can be provided for advanced NL parsing.
 *
 * @param options - Plugin configuration options.
 * @returns A GridPlugin instance.
 *
 * @example
 * ```ts
 * import { AIPlugin } from '@gridstorm/plugin-ai';
 *
 * const grid = createGrid({
 *   columns: [...],
 *   rowData: [...],
 *   plugins: [
 *     AIPlugin({
 *       nlParser: { enabled: true },
 *       anomalyDetection: { enabled: true, zScoreThreshold: 3 },
 *       suggestions: { enabled: true, maxSuggestions: 5 },
 *     }),
 *   ],
 * });
 *
 * // Natural language query
 * grid.dispatchCommand('ai:query', { query: 'sort by salary descending' });
 *
 * // Run anomaly detection
 * grid.dispatchCommand('ai:detectAnomalies', {});
 *
 * // Get smart suggestions
 * grid.dispatchCommand('ai:getSuggestions', {});
 * ```
 */
export function AIPlugin(options: AIPluginOptions = {}): GridPlugin {
  const {
    nlParser: nlConfig = {},
    anomalyDetection: anomalyConfig = {},
    suggestions: suggestionsConfig = {},
    llmAdapter,
  } = options;

  const nlEnabled = nlConfig.enabled !== false;
  const anomalyEnabled = anomalyConfig.enabled !== false;
  const suggestionsEnabled = suggestionsConfig.enabled !== false;
  const zScoreThreshold = anomalyConfig.zScoreThreshold ?? 2.5;
  const iqrMultiplier = anomalyConfig.iqrMultiplier ?? 1.5;
  const maxSuggestions = suggestionsConfig.maxSuggestions ?? 5;
  const autoDetect = anomalyConfig.autoDetect ?? false;
  const customPatterns = nlConfig.customPatterns;

  return {
    id: 'ai',
    name: 'AI Integration',
    version: '0.1.0',

    install(ctx: PluginContext) {
      // Register plugin state
      ctx.registerState<AIState>('ai', { ...DEFAULT_AI_STATE });

      const disposers: (() => void)[] = [];

      // ─── Command: ai:query ───
      if (nlEnabled) {
        const unregQuery = ctx.commandBus.registerHandler(
          'ai:query',
          (payload: { query: string }) => {
            const columns = getColumnInfos(ctx);

            ctx.setState<AIState>('ai', (prev) => ({
              ...prev,
              lastQuery: payload.query,
              isProcessing: true,
            }));

            // Try built-in parser first
            const action = parseNaturalLanguage(payload.query, columns, customPatterns);

            if (action) {
              ctx.setState<AIState>('ai', (prev) => ({
                ...prev,
                lastQueryResult: action,
                isProcessing: false,
              }));

              // Dispatch the resulting action as a grid command
              dispatchGridAction(ctx, action);
              return;
            }

            // If no built-in match and LLM adapter is available, use it
            if (llmAdapter) {
              const gridContext = buildGridContext(ctx);
              llmAdapter
                .query(payload.query, gridContext)
                .then((response) => {
                  ctx.setState<AIState>('ai', (prev) => ({
                    ...prev,
                    lastQueryResult: response.action,
                    isProcessing: false,
                  }));
                  dispatchGridAction(ctx, response.action);
                })
                .catch((_error) => {
                  ctx.setState<AIState>('ai', (prev) => ({
                    ...prev,
                    lastQueryResult: { type: 'none', reason: 'LLM query failed' },
                    isProcessing: false,
                  }));
                });
              return;
            }

            // No match found
            ctx.setState<AIState>('ai', (prev) => ({
              ...prev,
              lastQueryResult: { type: 'none', reason: 'Could not parse query' },
              isProcessing: false,
            }));
          },
        );
        disposers.push(unregQuery);
      }

      // ─── Command: ai:detectAnomalies ───
      if (anomalyEnabled) {
        const unregDetect = ctx.commandBus.registerHandler(
          'ai:detectAnomalies',
          (payload: { columns?: string[] }) => {
            ctx.setState<AIState>('ai', (prev) => ({
              ...prev,
              isProcessing: true,
            }));

            const columnsToCheck = resolveAnomalyColumns(ctx, payload.columns ?? anomalyConfig.columns);
            const allAnomalies: Anomaly[] = [];

            for (const colId of columnsToCheck) {
              const { values, rowIds } = getNumericColumnValues(ctx, colId);
              if (values.length < 3) continue;

              const avg = values.reduce((s, v) => s + v, 0) / values.length;
              const detected = detectAnomalies(values, { zScoreThreshold, iqrMultiplier });

              for (const d of detected) {
                allAnomalies.push({
                  rowId: rowIds[d.index]!,
                  colId,
                  value: d.value,
                  expected: Math.round(avg * 100) / 100,
                  deviation: Math.round(d.zScore * 100) / 100,
                  severity: d.severity,
                  method: d.isIQROutlier ? 'iqr' : 'zscore',
                });
              }
            }

            ctx.setState<AIState>('ai', (prev) => ({
              ...prev,
              anomalies: allAnomalies,
              isProcessing: false,
            }));
          },
        );
        disposers.push(unregDetect);
      }

      // ─── Command: ai:getSuggestions ───
      if (suggestionsEnabled) {
        const unregSuggestions = ctx.commandBus.registerHandler(
          'ai:getSuggestions',
          (_payload: Record<string, never>) => {
            ctx.setState<AIState>('ai', (prev) => ({
              ...prev,
              isProcessing: true,
            }));

            const columns = getColumnInfos(ctx);
            const data = getSampleData(ctx, 200);
            const state = ctx.store.getState();

            const currentState = {
              sorted: state.sortModel.length > 0,
              filtered: Object.keys(state.filterModel).length > 0,
              grouped: false, // Check plugin state for grouping if available
            };

            // Check grouping plugin state
            const groupState = ctx.store.getState().pluginState?.['grouping'] as
              | { groupColumns?: string[] }
              | undefined;
            if (groupState?.groupColumns && groupState.groupColumns.length > 0) {
              currentState.grouped = true;
            }

            const rawSuggestions = generateSuggestions(columns, data, currentState);
            const limited = rawSuggestions.slice(0, maxSuggestions);

            ctx.setState<AIState>('ai', (prev) => ({
              ...prev,
              suggestions: limited,
              isProcessing: false,
            }));
          },
        );
        disposers.push(unregSuggestions);
      }

      // ─── Command: ai:clearAnomalies ───
      const unregClear = ctx.commandBus.registerHandler(
        'ai:clearAnomalies',
        (_payload: Record<string, never>) => {
          ctx.setState<AIState>('ai', (prev) => ({
            ...prev,
            anomalies: [],
          }));
        },
      );
      disposers.push(unregClear);

      // ─── Command: ai:applySuggestion ───
      const unregApply = ctx.commandBus.registerHandler(
        'ai:applySuggestion',
        (payload: { suggestionId: string }) => {
          const aiState = ctx.getState<AIState>('ai');
          const suggestion = aiState.suggestions.find((s) => s.id === payload.suggestionId);
          if (!suggestion) return;

          dispatchGridAction(ctx, suggestion.action);

          // Remove applied suggestion from list
          ctx.setState<AIState>('ai', (prev) => ({
            ...prev,
            suggestions: prev.suggestions.filter((s) => s.id !== payload.suggestionId),
          }));
        },
      );
      disposers.push(unregApply);

      // ─── Auto-detect anomalies on data load ───
      if (anomalyEnabled && autoDetect) {
        const unsubDataChange = ctx.store.select(
          (state) => state.rowNodes.size,
          (next, prev) => {
            if (next > 0 && next !== prev) {
              ctx.commandBus.dispatch('ai:detectAnomalies', {});
            }
          },
        );
        disposers.push(unsubDataChange);
      }

      // Return cleanup
      return () => {
        for (const dispose of disposers) {
          dispose();
        }
      };
    },
  };
}

// ─── Action Dispatcher ───

/**
 * Dispatch a GridAction as the appropriate grid command.
 */
function dispatchGridAction(ctx: PluginContext, action: GridAction): void {
  switch (action.type) {
    case 'sort':
      ctx.commandBus.dispatch('sort:set' as string, {
        sortModel: [{ colId: action.colId, sort: action.direction }],
      });
      break;

    case 'filter':
      if (action.colId === '*' && action.filterType === 'clear') {
        ctx.commandBus.dispatch('filter:clear' as string, {});
      } else {
        ctx.commandBus.dispatch('filter:set' as string, {
          colId: action.colId,
          filterType: action.filterType,
          value: action.value,
        });
      }
      break;

    case 'group':
      ctx.commandBus.dispatch('group:set' as string, {
        groupColumns: action.colIds,
      });
      break;

    case 'highlight':
      // Highlighting is handled through plugin state — consumers can read
      // the rowIds and apply CSS classes via cell renderers
      break;

    case 'aggregate':
      ctx.commandBus.dispatch('agg:addColumnFunc' as string, {
        colId: action.colId,
        func: action.func,
      });
      break;

    case 'none':
      // No grid action to dispatch
      break;
  }
}
