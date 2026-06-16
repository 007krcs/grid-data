// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
//
// ─── @gridstorm/plugin-cell-autocomplete — Type model ──────────────────────
//
// "Copilot for cells." When the user edits a cell, this plugin builds a
// context prompt from the surrounding row and the column header, sends it
// to the AI adapter, and emits a suggestion event the renderer can render
// as ghost text. The user accepts with Tab or dismisses with Esc — both
// surfaces are commands the consumer wires to keyboard handlers.
//
// The plugin is intentionally renderer-agnostic. It owns:
//   • When to fetch a suggestion (debounced on cell:editingStarted /
//     cell:valueChanged).
//   • What context to include in the prompt.
//   • How to talk to the adapter.
//   • Accept / dismiss command dispatch.
//
// It does NOT own:
//   • How the suggestion is rendered (ghost text, dropdown, side panel).
//     The consumer's renderer subscribes to autocomplete:suggested and
//     paints whatever UI it wants.

import type { AIAdapter } from '@gridstorm/ai-adapter';

export interface AutocompleteContext {
  /** Identifier of the row being edited. */
  rowId: string;
  /** Identifier of the column being edited. */
  colId: string;
  /** Row data — every other column the user is NOT typing in. The plugin
   *  passes this to the LLM so it can guess what makes sense for this row. */
  row: Record<string, unknown>;
  /** Optional displayed text of the column header. */
  columnHeader?: string;
  /** Current value of the cell at the time of the request. */
  currentValue: unknown;
}

export interface AutocompleteSuggestion {
  /** Anchor — the cell this suggestion is for. */
  rowId: string;
  colId: string;
  /** Suggested replacement text. */
  text: string;
  /** Original value at request time — for diffing. */
  originalValue: unknown;
  /** Wall-clock ms when the suggestion was produced. */
  generatedAt: number;
  /** Adapter-reported usage if available. */
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number };
}

export interface CellAutocompletePluginOptions {
  /** AI adapter. Required. */
  adapter: AIAdapter;
  /**
   * Map of column ID → human description used in the system prompt. Same
   * semantics as plugin-ai-query.
   */
  columns: Record<string, string>;
  /**
   * Custom system prompt. Overrides the default. Receives the columns map
   * and must return the full system message string.
   */
  buildSystemPrompt?: (columns: Record<string, string>) => string;
  /** Debounce ms between trigger and request. Default 400. */
  debounceMs?: number;
  /** Maximum suggestion length in chars. Default 200. */
  maxLength?: number;
  /** Model identifier. */
  model?: string;
  /** Temperature for sampling. Default 0.2 — slight diversity. */
  temperature?: number;
  /**
   * Whether to auto-trigger on editing-started events. Default true. Off
   * gives the consumer manual control via the autocomplete:request command.
   */
  autoTrigger?: boolean;
  /**
   * Columns to skip. Useful for ID columns, formula-computed columns, etc.
   */
  excludeColumns?: string[];
}

export interface CellAutocompleteState {
  /** Currently-pending request, if any. */
  pending: AutocompleteContext | null;
  /** Last suggestion the plugin received from the adapter. */
  current: AutocompleteSuggestion | null;
  /** Number of requests issued (for telemetry / debug). */
  requestCount: number;
  /** Number of acceptances. */
  acceptCount: number;
  /** Last error from the adapter. */
  lastError: Error | null;
}
