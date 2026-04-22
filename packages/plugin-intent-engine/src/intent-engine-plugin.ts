// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
import type { GridPlugin, PluginContext } from '@gridstorm/core';
import type { IntentRecord, IntentState, IntentEngineOptions, ColumnScore, IntentAction } from './types';

const PLUGIN_STATE_KEY = 'intentEngine';
const DEFAULT_MAX_RECORDS = 500;
const DEFAULT_HALF_LIFE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const ACTION_WEIGHTS: Record<IntentAction, number> = {
  sort: 3,
  filter: 3,
  hide: 2,
  show: 1,
  reorder: 2,
  resize: 1,
  quickFilter: 1,
};

function calculateScore(
  records: IntentRecord[],
  columnId: string,
  now: number,
  halfLifeMs: number,
): ColumnScore {
  const colRecords = records.filter(r => r.columnId === columnId);
  if (colRecords.length === 0) {
    return { columnId, score: 0, frequency: 0, recency: 0, lastInteracted: 0 };
  }

  const frequency = colRecords.length;
  const lastInteracted = Math.max(...colRecords.map(r => r.timestamp));

  // Exponential decay: recency = sum(weight * e^(-λ*age)) where λ = ln(2)/halfLife
  const lambda = Math.LN2 / halfLifeMs;
  let recency = 0;
  for (const r of colRecords) {
    const age = now - r.timestamp;
    const w = r.weight ?? ACTION_WEIGHTS[r.action] ?? 1;
    recency += w * Math.exp(-lambda * age);
  }

  return {
    columnId,
    score: frequency * 0.3 + recency * 0.7,
    frequency,
    recency,
    lastInteracted,
  };
}

function rebuildRanking(
  records: IntentRecord[],
  now: number,
  halfLifeMs: number,
): ColumnScore[] {
  const columnIds = [...new Set(records.map(r => r.columnId))];
  return columnIds
    .map(id => calculateScore(records, id, now, halfLifeMs))
    .sort((a, b) => b.score - a.score);
}

export function IntentEnginePlugin(options: IntentEngineOptions = {}): GridPlugin {
  const {
    maxRecords = DEFAULT_MAX_RECORDS,
    halfLifeMs = DEFAULT_HALF_LIFE_MS,
    autoTrack = true,
    autoApplyRanking = false,
    onRankingUpdated,
  } = options;

  return {
    id: 'intent-engine',
    name: 'Intent Engine',
    version: '0.1.0',
    install(ctx: PluginContext) {
      const unsubscribers: Array<() => void> = [];

      ctx.registerState<IntentState>(PLUGIN_STATE_KEY, {
        records: [],
        ranking: [],
        lastApplied: null,
      });

      function track(columnId: string, action: IntentAction): void {
        const weight = ACTION_WEIGHTS[action] ?? 1;
        const record: IntentRecord = { columnId, action, timestamp: Date.now(), weight };

        ctx.setState<IntentState>(PLUGIN_STATE_KEY, (prev) => {
          const records = [...prev.records, record].slice(-maxRecords);
          const now = Date.now();
          const ranking = rebuildRanking(records, now, halfLifeMs);
          return { ...prev, records, ranking };
        });

        const state = ctx.getState<IntentState>(PLUGIN_STATE_KEY);
        ctx.eventBus.emit('intent:ranking-updated' as never, { ranking: state.ranking } as never);

        // Fire callback for UI visualisation (avoids internal API access from demos)
        onRankingUpdated?.(state.ranking);

        if (autoApplyRanking) {
          applyRanking(ctx);
        }
      }

      function applyRanking(pluginCtx: PluginContext): void {
        const state = pluginCtx.getState<IntentState>(PLUGIN_STATE_KEY);
        if (state.ranking.length === 0) return;

        const allColumns = pluginCtx.api.getAllColumns?.() ?? [];
        const rankedIds = state.ranking.map(s => s.columnId);
        const unrankedIds = allColumns
          .map((c: { colId?: string; getColId?: () => string }) =>
            typeof c.getColId === 'function' ? c.getColId() : (c.colId ?? ''),
          )
          .filter((id: string) => id && !rankedIds.includes(id));

        const orderedIds = [...rankedIds, ...unrankedIds];
        orderedIds.forEach((id: string, index: number) => {
          pluginCtx.api.moveColumn?.(id, index);
        });

        pluginCtx.setState<IntentState>(PLUGIN_STATE_KEY, (prev) => ({
          ...prev,
          lastApplied: Date.now(),
        }));
      }

      // intent:record — manually record an action
      unsubscribers.push(
        ctx.commandBus.registerHandler('intent:record' as never, (payload: unknown) => {
          const { columnId, action } = payload as { columnId: string; action: IntentAction };
          track(columnId, action);
        }),
      );

      // intent:apply-ranking — reorder columns by ranking
      unsubscribers.push(
        ctx.commandBus.registerHandler('intent:apply-ranking' as never, () => {
          applyRanking(ctx);
        }),
      );

      // intent:reset — clear all records and ranking
      unsubscribers.push(
        ctx.commandBus.registerHandler('intent:reset' as never, () => {
          ctx.setState<IntentState>(PLUGIN_STATE_KEY, () => ({
            records: [],
            ranking: [],
            lastApplied: null,
          }));
          onRankingUpdated?.([]);
        }),
      );

      if (autoTrack) {
        // Listen to column:sort:changed (correct event name — NOT 'sort:changed')
        unsubscribers.push(
          ctx.eventBus.on('column:sort:changed' as never, (payload: unknown) => {
            const ev = payload as { sortModel?: Array<{ colId: string }> };
            for (const item of ev.sortModel ?? []) {
              track(item.colId, 'sort');
            }
          }),
        );

        // Listen to filter:changed — track filtered columns
        unsubscribers.push(
          ctx.eventBus.on('filter:changed' as never, (payload: unknown) => {
            const ev = payload as { filterModel?: Record<string, unknown> };
            for (const columnId of Object.keys(ev.filterModel ?? {})) {
              track(columnId, 'filter');
            }
          }),
        );

        // Listen to column:visible — detect hide/show (correct event name)
        unsubscribers.push(
          ctx.eventBus.on('column:visible' as never, (payload: unknown) => {
            const ev = payload as { column: { colId: string }; visible: boolean };
            const colId = ev.column?.colId;
            if (colId) track(colId, ev.visible ? 'show' : 'hide');
          }),
        );

        // Listen to column:moved — track reorder interactions
        unsubscribers.push(
          ctx.eventBus.on('column:moved' as never, (payload: unknown) => {
            const ev = payload as { column: { colId: string } };
            const colId = ev.column?.colId;
            if (colId) track(colId, 'reorder');
          }),
        );

        // Listen to quickFilter:changed
        unsubscribers.push(
          ctx.eventBus.on('quickFilter:changed' as never, () => {
            track('__quickFilter__', 'quickFilter');
          }),
        );
      }

      return () => {
        for (const u of unsubscribers) u();
      };
    },
  };
}
