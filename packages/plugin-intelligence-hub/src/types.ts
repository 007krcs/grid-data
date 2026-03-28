// ─── @gridstorm/plugin-intelligence-hub — Types ───

export type InsightType =
  | 'column-ranking'
  | 'filter-pattern'
  | 'sort-pattern'
  | 'layout-preference'
  | 'query-pattern';

export interface BehaviorSample {
  type: InsightType;
  data: unknown;
  timestamp: number;
  gridId: string;
}

export interface HubInsight {
  id: string;
  type: InsightType;
  confidence: number;    // 0-1, based on sample count
  data: unknown;
  sourceCount: number;   // how many grids contributed
  computedAt: number;
}

export interface HubTransport {
  publish(sample: BehaviorSample): void;
  subscribe(handler: (insight: HubInsight) => void): () => void;
  getInsights(type?: InsightType): HubInsight[];
}

export interface PrivacyBudget {
  epsilon: number;       // differential privacy parameter, lower = more private, default 1.0
  noiseScale: number;    // Laplace noise scale = sensitivity/epsilon
}

export interface IntelligenceHubOptions {
  gridId?: string;          // unique ID for this grid instance (default: random uuid)
  transport?: HubTransport; // default: InMemoryHubTransport
  privacyBudget?: PrivacyBudget;
  shareColumnRankings?: boolean;   // default true
  shareFilterPatterns?: boolean;   // default true
  shareSortPatterns?: boolean;     // default true
  minSamplesForInsight?: number;   // default 3
  onInsight?: (insight: HubInsight) => void;
}
