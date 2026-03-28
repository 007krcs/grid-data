// ─── Intelligence Hub Plugin ───
// Aggregates behavioral patterns across multiple GridStorm instances.
// Implements differential privacy via Laplace noise injection.

import type { GridPlugin, PluginContext, FilterModel } from '@gridstorm/core';
import type {
  InsightType,
  BehaviorSample,
  HubInsight,
  HubTransport,
  IntelligenceHubOptions,
} from './types';

// ─── Static in-memory hub store (shared across all instances in same JS context) ───

const HUB_STORE: {
  samples: BehaviorSample[];
  insights: Map<string, HubInsight>;
  subscribers: Array<(insight: HubInsight) => void>;
  minSamples: number;
} = {
  samples: [],
  insights: new Map(),
  subscribers: [],
  minSamples: 3,
};

// ─── Aggregation logic ───

function aggregateInsights(
  samples: BehaviorSample[],
  insights: Map<string, HubInsight>,
  subscribers: Array<(i: HubInsight) => void>,
  minSamples: number,
): void {
  // Group samples by type
  const byType = new Map<InsightType, BehaviorSample[]>();
  for (const sample of samples) {
    if (!byType.has(sample.type)) byType.set(sample.type, []);
    byType.get(sample.type)!.push(sample);
  }

  for (const [type, typeSamples] of byType.entries()) {
    if (typeSamples.length < minSamples) continue;

    const uniqueGrids = new Set(typeSamples.map((s) => s.gridId));
    const insightId = `insight:${type}`;
    const confidence = Math.min(typeSamples.length / (minSamples * 3), 1);

    // Aggregate data based on type
    let aggregatedData: unknown;

    if (type === 'sort-pattern' || type === 'filter-pattern' || type === 'query-pattern') {
      // Count frequency of each data pattern
      const freq = new Map<string, number>();
      for (const s of typeSamples) {
        const key = JSON.stringify(s.data);
        freq.set(key, (freq.get(key) ?? 0) + 1);
      }
      const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
      aggregatedData = sorted.slice(0, 5).map(([pattern, count]) => ({
        pattern: JSON.parse(pattern) as unknown,
        frequency: count,
      }));
    } else if (type === 'column-ranking') {
      // Average column scores with noise
      const columnScores = new Map<string, number[]>();
      for (const s of typeSamples) {
        const d = s.data as Record<string, number> | null;
        if (d && typeof d === 'object') {
          for (const [col, score] of Object.entries(d)) {
            if (!columnScores.has(col)) columnScores.set(col, []);
            columnScores.get(col)!.push(score);
          }
        }
      }
      aggregatedData = Object.fromEntries(
        [...columnScores.entries()].map(([col, scores]) => {
          const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
          return [col, avg];
        }),
      );
    } else {
      aggregatedData = typeSamples[typeSamples.length - 1]?.data;
    }

    const insight: HubInsight = {
      id: insightId,
      type,
      confidence,
      data: aggregatedData,
      sourceCount: uniqueGrids.size,
      computedAt: Date.now(),
    };

    const isNew = !insights.has(insightId);
    insights.set(insightId, insight);

    // Only notify subscribers on first creation or significant update
    if (isNew || typeSamples.length % minSamples === 0) {
      for (const sub of subscribers) sub(insight);
    }
  }
}

// ─── In-memory transport factory ───

export function createInMemoryHubTransport(minSamplesForInsight = 3): HubTransport {
  HUB_STORE.minSamples = minSamplesForInsight;
  return {
    publish(sample: BehaviorSample) {
      HUB_STORE.samples.push(sample);
      aggregateInsights(
        HUB_STORE.samples,
        HUB_STORE.insights,
        HUB_STORE.subscribers,
        HUB_STORE.minSamples,
      );
    },
    subscribe(handler) {
      HUB_STORE.subscribers.push(handler);
      return () => {
        const i = HUB_STORE.subscribers.indexOf(handler);
        if (i >= 0) HUB_STORE.subscribers.splice(i, 1);
      };
    },
    getInsights(type?) {
      const all = [...HUB_STORE.insights.values()];
      return type ? all.filter((i) => i.type === type) : all;
    },
  };
}

// ─── Differential privacy: Laplace mechanism ───

export function addLaplaceNoise(value: number, sensitivity: number, epsilon: number): number {
  if (epsilon <= 0) return value;
  const scale = sensitivity / epsilon;
  // Avoid Math.random() === 0.5 exactly which gives -Infinity
  const u = Math.random() - 0.5;
  if (Math.abs(u) < 1e-10) return value; // degenerate case guard
  return value + -Math.sign(u) * scale * Math.log(1 - 2 * Math.abs(u));
}

// ─── Simple UUID generator ───

function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Plugin factory ───

export function IntelligenceHubPlugin(options: IntelligenceHubOptions = {}): GridPlugin {
  return {
    id: 'intelligence-hub',
    name: 'Intelligence Hub',
    version: '0.1.0',

    install(ctx: PluginContext) {
      const unsubscribers: Array<() => void> = [];

      const bus = ctx.eventBus as unknown as {
        emit: (event: string, payload: unknown) => void;
        on: (event: string, listener: (p: unknown) => void) => () => void;
      };

      const gridId = options.gridId ?? generateId();
      const minSamplesForInsight = options.minSamplesForInsight ?? 3;
      const transport = options.transport ?? createInMemoryHubTransport(minSamplesForInsight);

      let connected = false;
      let transportUnsubscribe: (() => void) | null = null;

      const currentOptions = {
        shareColumnRankings: options.shareColumnRankings ?? true,
        shareFilterPatterns: options.shareFilterPatterns ?? true,
        shareSortPatterns: options.shareSortPatterns ?? true,
        privacyBudget: options.privacyBudget ?? { epsilon: 1.0, noiseScale: 1.0 },
        onInsight: options.onInsight,
      };

      // ─── hub:connect ───
      unsubscribers.push(
        ctx.commandBus.registerHandler('hub:connect', () => {
          if (connected) return;
          connected = true;
          transportUnsubscribe = transport.subscribe((insight) => {
            currentOptions.onInsight?.(insight);
            bus.emit('hub:insight-received', insight);
          });
          bus.emit('hub:connected', { gridId });
        }),
      );

      // ─── hub:disconnect ───
      unsubscribers.push(
        ctx.commandBus.registerHandler('hub:disconnect', () => {
          if (!connected) return;
          connected = false;
          transportUnsubscribe?.();
          transportUnsubscribe = null;
          bus.emit('hub:disconnected', { gridId });
        }),
      );

      // ─── hub:publish-sample ───
      unsubscribers.push(
        ctx.commandBus.registerHandler('hub:publish-sample', (payload: unknown) => {
          const sample = payload as BehaviorSample;
          // Apply differential privacy noise to numeric data
          let processedData = sample.data;
          if (
            processedData !== null &&
            typeof processedData === 'object' &&
            !Array.isArray(processedData)
          ) {
            const { epsilon } = currentOptions.privacyBudget;
            processedData = Object.fromEntries(
              Object.entries(processedData as Record<string, unknown>).map(([k, v]) => [
                k,
                typeof v === 'number' ? addLaplaceNoise(v, 1, epsilon) : v,
              ]),
            );
          }
          const processedSample: BehaviorSample = {
            ...sample,
            data: processedData,
            gridId: sample.gridId || gridId,
          };
          transport.publish(processedSample);
          bus.emit('hub:sample-published', processedSample);
        }),
      );

      // ─── hub:get-insights ───
      unsubscribers.push(
        ctx.commandBus.registerHandler('hub:get-insights', (payload: unknown) => {
          const p = payload as { type?: InsightType } | undefined;
          const insights = transport.getInsights(p?.type);
          bus.emit('hub:insights-listed', { insights });
        }),
      );

      // ─── hub:apply-insight ───
      unsubscribers.push(
        ctx.commandBus.registerHandler('hub:apply-insight', (payload: unknown) => {
          const { insightId } = payload as { insightId: string };
          const insights = transport.getInsights();
          const insight = insights.find((i) => i.id === insightId);
          if (!insight) return;

          // Apply insight to current grid
          if (insight.type === 'sort-pattern') {
            const patterns = insight.data as Array<{ pattern: unknown; frequency: number }> | null;
            if (patterns && patterns.length > 0) {
              const topPattern = patterns[0]?.pattern;
              if (Array.isArray(topPattern)) {
                ctx.api.setSortModel(topPattern);
              }
            }
          } else if (insight.type === 'filter-pattern') {
            const patterns = insight.data as Array<{ pattern: unknown; frequency: number }> | null;
            if (patterns && patterns.length > 0) {
              const topPattern = patterns[0]?.pattern;
              if (topPattern && typeof topPattern === 'object') {
                ctx.api.setFilterModel(topPattern as Record<string, FilterModel>);
              }
            }
          }
        }),
      );

      // ─── hub:reset ───
      unsubscribers.push(
        ctx.commandBus.registerHandler('hub:reset', () => {
          HUB_STORE.samples.length = 0;
          HUB_STORE.insights.clear();
        }),
      );

      // ─── Auto-publish on sort:changed ───
      unsubscribers.push(
        bus.on('sort:changed', (payload: unknown) => {
          if (!currentOptions.shareSortPatterns) return;
          transport.publish({
            type: 'sort-pattern',
            data: payload,
            timestamp: Date.now(),
            gridId,
          });
          bus.emit('hub:sample-published', {
            type: 'sort-pattern',
            data: payload,
            timestamp: Date.now(),
            gridId,
          });
        }),
      );

      // ─── Auto-publish on filter:changed ───
      unsubscribers.push(
        bus.on('filter:changed', (payload: unknown) => {
          if (!currentOptions.shareFilterPatterns) return;
          transport.publish({
            type: 'filter-pattern',
            data: payload,
            timestamp: Date.now(),
            gridId,
          });
          bus.emit('hub:sample-published', {
            type: 'filter-pattern',
            data: payload,
            timestamp: Date.now(),
            gridId,
          });
        }),
      );

      return () => {
        if (transportUnsubscribe) {
          transportUnsubscribe();
          transportUnsubscribe = null;
        }
        for (const u of unsubscribers) u();
      };
    },
  };
}
