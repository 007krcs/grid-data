// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── @gridstorm/plugin-ai — Public API ───

export { AIPlugin } from './ai-plugin';
export type {
  AIPluginOptions,
  AIState,
  NLParserConfig,
  AnomalyConfig,
  SuggestionConfig,
  LLMAdapter,
  GridContext,
  LLMResponse,
  GridAction,
  Anomaly,
  Suggestion,
  ColumnInfo,
  NLPattern,
} from './ai-plugin';

export { parseNaturalLanguage } from './nl-query-parser';

export { detectAnomalies, mean, standardDeviation, median, percentile } from './anomaly-detector';
export type { AnomalyIndex, AnomalyDetectorOptions } from './anomaly-detector';

export { generateSuggestions } from './smart-suggestions';
export type { CurrentState } from './smart-suggestions';
