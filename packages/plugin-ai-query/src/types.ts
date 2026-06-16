// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
//
// ─── @gridstorm/plugin-ai-query — Type model ───────────────────────────────
//
// Translates natural language into grid operations. Built on the
// vendor-neutral @gridstorm/ai-adapter so the user picks the LLM provider;
// this plugin never imports OpenAI or Anthropic directly.
//
// The query schema is intentionally narrow — sort, filter, quickFilter.
// Adding more operations later (grouping, pivoting, page navigation) is a
// matter of expanding the schema and the command-dispatch switch, not a
// redesign. Keep this set tight so the LLM's job is straightforward and the
// success rate stays high.

import type { AIAdapter } from '@gridstorm/ai-adapter';

/**
 * Plain-English query → structured grid operation. The LLM is constrained
 * to return one of these shapes via completeStructured against the schema
 * exported below.
 */
export type AiQueryAction =
  | {
      type: 'sort';
      sortModel: Array<{ colId: string; direction: 'asc' | 'desc' }>;
    }
  | {
      type: 'filter';
      /** Column-keyed filter model — same shape as plugin-filtering accepts. */
      filterModel: Record<
        string,
        {
          filterType: 'text' | 'number' | 'set';
          operator?: 'equals' | 'notEquals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'inRange' | 'in';
          value?: string | number | Array<string | number>;
          valueTo?: number;
        }
      >;
    }
  | {
      type: 'quickFilter';
      text: string;
    }
  | {
      type: 'clear';
      target: 'sort' | 'filter' | 'all';
    };

export interface AiQueryPluginOptions {
  /** The AI adapter. Required. */
  adapter: AIAdapter;
  /**
   * Map of (colId → human description) the LLM uses to resolve column
   * references. e.g. { salary: 'employee annual salary in USD', name: 'full name' }.
   * The plugin builds this into the system prompt so the LLM doesn't have to
   * guess column IDs from headers.
   */
  columns: Record<string, string>;
  /**
   * Model identifier passed through to the adapter. Optional —
   * adapter-specific default kicks in if omitted.
   */
  model?: string;
  /** Temperature — keep low (default 0) for deterministic structured output. */
  temperature?: number;
  /** Per-call timeout AbortSignal applies. Adapter also has its own timeout. */
  signal?: AbortSignal;
  /**
   * Whether to auto-apply the returned action via the grid API. Default:
   * true. Turn off if your app needs human-in-the-loop confirmation; the
   * plugin still emits aiQuery:resolved with the action so you can render
   * a confirm UI.
   */
  autoApply?: boolean;
}

export interface AiQueryState {
  busy: boolean;
  lastQuery: string | null;
  lastAction: AiQueryAction | null;
  lastError: Error | null;
  history: Array<{ query: string; action: AiQueryAction; timestamp: number }>;
}

/** Event payload — emitted after the LLM resolves a query into an action. */
export interface AiQueryResolved {
  query: string;
  action: AiQueryAction;
  appliedAutomatically: boolean;
}

export interface AiQueryError {
  query: string;
  error: Error;
}
