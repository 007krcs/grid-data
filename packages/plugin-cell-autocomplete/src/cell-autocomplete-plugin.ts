// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
//
// ─── CellAutocompletePlugin ────────────────────────────────────────────────
//
// Listens for cell editing events, builds a context prompt, calls the AI
// adapter, and emits the suggestion as autocomplete:suggested. Accept and
// dismiss commands either apply the suggestion via cell value mutation or
// drop it. Renderer integration is the consumer's job — typically a small
// ghost-text overlay on the editing cell.

import type { GridPlugin, PluginContext } from '@gridstorm/core';
import type { AIMessage } from '@gridstorm/ai-adapter';
import type {
  AutocompleteContext,
  AutocompleteSuggestion,
  CellAutocompletePluginOptions,
  CellAutocompleteState,
} from './types';

const STATE_KEY = 'cellAutocomplete';

function defaultSystemPrompt(columns: Record<string, string>): string {
  const colLines = Object.entries(columns)
    .map(([colId, description]) => `  - ${colId}: ${description}`)
    .join('\n');
  return [
    'You are an autocomplete assistant for a data grid.',
    'A user is editing a single cell. You are shown:',
    '  • The column being edited (id + description).',
    '  • The current value the user has typed so far (may be empty).',
    '  • The other column values for the same row.',
    'Reply with ONE plain-text suggestion that completes or replaces the',
    'current cell value. Do not explain. Do not use Markdown. Do not include',
    'quotation marks unless they belong in the value.',
    '',
    'Columns (colId: description):',
    colLines,
  ].join('\n');
}

function buildUserPrompt(context: AutocompleteContext, header?: string): string {
  const rowLines = Object.entries(context.row)
    .filter(([k]) => k !== context.colId)
    .map(([k, v]) => `  ${k}: ${JSON.stringify(v)}`)
    .join('\n');
  return [
    `Editing column: ${context.colId}${header ? ` (${header})` : ''}`,
    `Current value: ${JSON.stringify(context.currentValue ?? '')}`,
    `Other values in this row:`,
    rowLines || '  (none)',
    '',
    'Suggest:',
  ].join('\n');
}

export function CellAutocompletePlugin(
  options: CellAutocompletePluginOptions,
): GridPlugin {
  return {
    id: 'cell-autocomplete',
    name: 'Cell Autocomplete',
    version: '0.1.0',

    install(ctx: PluginContext): () => void {
      const systemPrompt = (options.buildSystemPrompt ?? defaultSystemPrompt)(options.columns);
      const debounceMs = options.debounceMs ?? 400;
      const maxLength = options.maxLength ?? 200;
      const autoTrigger = options.autoTrigger ?? true;
      const excludeColumns = new Set(options.excludeColumns ?? []);

      ctx.registerState<CellAutocompleteState>(STATE_KEY, {
        pending: null,
        current: null,
        requestCount: 0,
        acceptCount: 0,
        lastError: null,
      });

      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      let abortCtrl: AbortController | null = null;

      function cancelInFlight(): void {
        if (debounceTimer !== null) {
          clearTimeout(debounceTimer);
          debounceTimer = null;
        }
        if (abortCtrl) {
          abortCtrl.abort();
          abortCtrl = null;
        }
      }

      async function fetchSuggestion(context: AutocompleteContext): Promise<void> {
        cancelInFlight();
        abortCtrl = new AbortController();
        const localAbort = abortCtrl;
        ctx.setState<CellAutocompleteState>(STATE_KEY, (prev) => ({
          ...prev,
          pending: context,
          requestCount: prev.requestCount + 1,
          lastError: null,
        }));

        const userPrompt = buildUserPrompt(context, options.columns[context.colId]);
        const messages: AIMessage[] = [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ];

        try {
          const result = await options.adapter.complete(messages, {
            model: options.model,
            temperature: options.temperature ?? 0.2,
            maxTokens: Math.ceil(maxLength / 4) + 32,
            signal: localAbort.signal,
            stop: ['\n\n'],
          });
          if (localAbort.signal.aborted) return;
          const text = (result.text ?? '').trim().slice(0, maxLength);
          const suggestion: AutocompleteSuggestion = {
            rowId: context.rowId,
            colId: context.colId,
            text,
            originalValue: context.currentValue,
            generatedAt: Date.now(),
            usage: result.usage,
          };
          ctx.setState<CellAutocompleteState>(STATE_KEY, (prev) => ({
            ...prev,
            pending: null,
            current: suggestion,
          }));
          ctx.eventBus.emit('autocomplete:suggested' as never, { suggestion } as never);
        } catch (e) {
          if (localAbort.signal.aborted) return;
          const error = e instanceof Error ? e : new Error(String(e));
          ctx.setState<CellAutocompleteState>(STATE_KEY, (prev) => ({
            ...prev,
            pending: null,
            lastError: error,
          }));
          ctx.eventBus.emit('autocomplete:error' as never, { error } as never);
        }
      }

      function scheduleFetch(context: AutocompleteContext): void {
        cancelInFlight();
        debounceTimer = setTimeout(() => {
          debounceTimer = null;
          void fetchSuggestion(context);
        }, debounceMs);
      }

      // ── Commands ────────────────────────────────────────────────────────

      const unregisterRequest = ctx.commandBus.registerHandler(
        'autocomplete:request' as never,
        (payload: unknown) => {
          const p = payload as { rowId?: string; colId?: string };
          if (!p?.rowId || !p?.colId) return;
          if (excludeColumns.has(p.colId)) return;
          const node = ctx.api.getRowNode?.(p.rowId);
          if (!node) return;
          const row = (node.data ?? {}) as Record<string, unknown>;
          scheduleFetch({
            rowId: p.rowId,
            colId: p.colId,
            row,
            columnHeader: options.columns[p.colId],
            currentValue: row[p.colId],
          });
        },
      );

      const unregisterAccept = ctx.commandBus.registerHandler(
        'autocomplete:accept' as never,
        () => {
          const state = ctx.getState<CellAutocompleteState>(STATE_KEY);
          const sug = state.current;
          if (!sug) return;
          ctx.api.updateRows?.([
            { id: sug.rowId, data: { [sug.colId]: sug.text } as Record<string, unknown> },
          ] as never);
          ctx.setState<CellAutocompleteState>(STATE_KEY, (prev) => ({
            ...prev,
            current: null,
            acceptCount: prev.acceptCount + 1,
          }));
          ctx.eventBus.emit('autocomplete:accepted' as never, { suggestion: sug } as never);
        },
      );

      const unregisterDismiss = ctx.commandBus.registerHandler(
        'autocomplete:dismiss' as never,
        () => {
          const state = ctx.getState<CellAutocompleteState>(STATE_KEY);
          if (!state.current && !state.pending) return;
          cancelInFlight();
          ctx.setState<CellAutocompleteState>(STATE_KEY, (prev) => ({
            ...prev,
            current: null,
            pending: null,
          }));
          ctx.eventBus.emit('autocomplete:dismissed' as never, {} as never);
        },
      );

      // ── Auto-trigger wiring ─────────────────────────────────────────────
      let unsubEditStarted: (() => void) | undefined;
      if (autoTrigger) {
        unsubEditStarted = ctx.eventBus.on('cell:editingStarted' as never, ((payload: {
          node?: { id?: string };
          colId?: string;
        }) => {
          const rowId = payload?.node?.id;
          const colId = payload?.colId;
          if (!rowId || !colId) return;
          if (excludeColumns.has(colId)) return;
          ctx.commandBus.dispatch('autocomplete:request' as never, { rowId, colId } as never);
        }) as never);
      }

      // ── Disposer ────────────────────────────────────────────────────────
      return () => {
        cancelInFlight();
        unsubEditStarted?.();
        unregisterRequest();
        unregisterAccept();
        unregisterDismiss();
      };
    },
  };
}
