// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
//
// ─── AiQueryPlugin ─────────────────────────────────────────────────────────
//
// The dispatch layer. Accepts a natural-language query via the aiQuery:ask
// command, asks the configured AIAdapter to translate it into an
// AiQueryAction, and (by default) dispatches the action through the grid
// API. Consumers can turn off auto-apply and respond to aiQuery:resolved
// themselves if they need a confirm-before-apply UX.

import type { GridPlugin, PluginContext } from '@gridstorm/core';
import type { AIMessage } from '@gridstorm/ai-adapter';
import { AI_QUERY_SCHEMA, validateAiQueryAction } from './schema';
import type {
  AiQueryAction,
  AiQueryPluginOptions,
  AiQueryResolved,
  AiQueryState,
} from './types';

const STATE_KEY = 'aiQuery';
const HISTORY_LIMIT = 50;

function buildSystemPrompt(columns: Record<string, string>): string {
  const colLines = Object.entries(columns)
    .map(([colId, description]) => `  - ${colId}: ${description}`)
    .join('\n');
  return [
    'You translate user requests into a single grid operation.',
    'Reply ONLY by calling the structured output tool with one of these `type` values:',
    '  • "sort" — set the sort order. Provide `sortModel` array.',
    '  • "filter" — apply column filters. Provide `filterModel` object.',
    '  • "quickFilter" — substring match across all columns. Provide `text`.',
    '  • "clear" — reset state. Provide `target` ∈ {sort, filter, all}.',
    '',
    'Columns available (colId: description):',
    colLines,
    '',
    'Always use colIds (the left side), never the descriptions.',
    'If the user request is ambiguous, prefer the simplest interpretation.',
    'Do not add operations the user did not ask for.',
  ].join('\n');
}

export function AiQueryPlugin(options: AiQueryPluginOptions): GridPlugin {
  return {
    id: 'ai-query',
    name: 'AI Query',
    version: '0.1.0',

    install(ctx: PluginContext): () => void {
      const systemPrompt = buildSystemPrompt(options.columns);
      const autoApply = options.autoApply ?? true;

      ctx.registerState<AiQueryState>(STATE_KEY, {
        busy: false,
        lastQuery: null,
        lastAction: null,
        lastError: null,
        history: [],
      });

      function applyAction(action: AiQueryAction): void {
        switch (action.type) {
          case 'sort':
            ctx.api.setSortModel?.(
              action.sortModel.map((s) => ({ colId: s.colId, sort: s.direction })),
            );
            break;
          case 'filter':
            ctx.api.setFilterModel?.(action.filterModel as never);
            break;
          case 'quickFilter':
            ctx.api.setQuickFilter?.(action.text);
            break;
          case 'clear': {
            if (action.target === 'sort' || action.target === 'all') {
              ctx.api.setSortModel?.([]);
            }
            if (action.target === 'filter' || action.target === 'all') {
              ctx.api.setFilterModel?.({} as never);
              ctx.api.setQuickFilter?.('');
            }
            break;
          }
        }
      }

      const unregisterAsk = ctx.commandBus.registerAsyncHandler(
        'aiQuery:ask' as never,
        async (payload: unknown) => {
          const text = (payload as { text?: string })?.text ?? '';
          if (!text.trim()) return;

          ctx.setState<AiQueryState>(STATE_KEY, (prev) => ({
            ...prev,
            busy: true,
            lastQuery: text,
            lastError: null,
          }));

          const messages: AIMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: text },
          ];

          let resolvedAction: AiQueryAction;
          try {
            const result = await options.adapter.completeStructured<AiQueryAction>(
              messages,
              {
                schema: AI_QUERY_SCHEMA,
                validate: validateAiQueryAction,
                model: options.model,
                temperature: options.temperature ?? 0,
                signal: options.signal,
              },
            );
            resolvedAction = result.data;
          } catch (e) {
            const error = e instanceof Error ? e : new Error(String(e));
            ctx.setState<AiQueryState>(STATE_KEY, (prev) => ({
              ...prev,
              busy: false,
              lastError: error,
            }));
            ctx.eventBus.emit('aiQuery:error' as never, { query: text, error } as never);
            return;
          }

          // Persist + emit.
          ctx.setState<AiQueryState>(STATE_KEY, (prev) => {
            const history = [
              ...prev.history,
              { query: text, action: resolvedAction, timestamp: Date.now() },
            ];
            return {
              ...prev,
              busy: false,
              lastAction: resolvedAction,
              history: history.length > HISTORY_LIMIT ? history.slice(-HISTORY_LIMIT) : history,
            };
          });

          const eventPayload: AiQueryResolved = {
            query: text,
            action: resolvedAction,
            appliedAutomatically: autoApply,
          };
          ctx.eventBus.emit('aiQuery:resolved' as never, eventPayload as never);

          if (autoApply) {
            try {
              applyAction(resolvedAction);
            } catch (e) {
              const error = e instanceof Error ? e : new Error(String(e));
              ctx.eventBus.emit(
                'aiQuery:applyError' as never,
                { query: text, action: resolvedAction, error } as never,
              );
            }
          }
        },
      );

      const unregisterApply = ctx.commandBus.registerHandler(
        'aiQuery:apply' as never,
        (payload: unknown) => {
          const action = (payload as { action?: AiQueryAction })?.action;
          if (!action) return;
          applyAction(action);
        },
      );

      const unregisterClear = ctx.commandBus.registerHandler(
        'aiQuery:clearHistory' as never,
        () => {
          ctx.setState<AiQueryState>(STATE_KEY, (prev) => ({ ...prev, history: [] }));
        },
      );

      return () => {
        unregisterAsk();
        unregisterApply();
        unregisterClear();
      };
    },
  };
}
