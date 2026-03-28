// ─── Anomaly Detection Plugin ───
// Maintains a rolling statistical baseline (mean, std dev) per configured
// numeric column. Detects cells that deviate beyond configurable z-score
// thresholds and emits structured anomaly events.

import type { GridPlugin, PluginContext } from '@gridstorm/core';
import type {
  AnomalyPluginOptions,
  AnomalyEvent,
  AnomalySeverity,
  ColumnAnomalyConfig,
  ColumnStats,
} from './types';

let anomalyIdCounter = 0;
function nextAnomalyId(): string {
  return `anomaly-${++anomalyIdCounter}-${Date.now()}`;
}

// ─── Stats helpers ───

function createStats(columnId: string): ColumnStats {
  return {
    columnId,
    count: 0,
    mean: 0,
    variance: 0,
    stdDev: 0,
    min: Infinity,
    max: -Infinity,
    window: [],
  };
}

function updateStats(stats: ColumnStats, value: number, windowSize: number): void {
  stats.window.push(value);
  if (stats.window.length > windowSize) stats.window.shift();

  // Recalculate from window for accuracy
  const n = stats.window.length;
  const mean = stats.window.reduce((a, b) => a + b, 0) / n;
  const variance = stats.window.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(n - 1, 1);

  stats.count = n;
  stats.mean = mean;
  stats.variance = variance;
  stats.stdDev = Math.sqrt(variance);
  stats.min = Math.min(...stats.window);
  stats.max = Math.max(...stats.window);
}

function getZScore(stats: ColumnStats, value: number): number {
  if (stats.stdDev === 0) return 0;
  return Math.abs((value - stats.mean) / stats.stdDev);
}

function getSeverity(zscore: number, config: ColumnAnomalyConfig): AnomalySeverity | null {
  const crit = config.criticalThreshold ?? 3.0;
  const warn = config.warningThreshold ?? 2.5;
  const watch = config.watchThreshold ?? 2.0;
  if (zscore >= crit) return 'critical';
  if (zscore >= warn) return 'warning';
  if (zscore >= watch) return 'watch';
  return null;
}

// ─── Plugin factory ───

export function AnomalyPlugin(options: AnomalyPluginOptions = {}): GridPlugin {
  const { columns: initialColumns = [], onAnomaly } = options;

  return {
    id: 'anomaly',
    name: 'Anomaly Detection',
    version: '0.1.0',

    install(ctx: PluginContext) {
      const unsubscribers: Array<() => void> = [];

      // Per-column configuration and stats
      const columnConfigs = new Map<string, ColumnAnomalyConfig>();
      const columnStats = new Map<string, ColumnStats>();

      // Active anomaly registry keyed by anomaly id
      const activeAnomalies = new Map<string, AnomalyEvent>();

      // Helper to access the event bus emit function
      const bus = ctx.eventBus as unknown as {
        emit: (event: string, payload: unknown) => void;
      };

      // Register initial columns
      for (const colConfig of initialColumns) {
        columnConfigs.set(colConfig.columnId, colConfig);
        columnStats.set(colConfig.columnId, createStats(colConfig.columnId));
      }

      // ─── Core feed logic ───

      function feedValue(rowId: string, columnId: string, value: number): void {
        const config = columnConfigs.get(columnId);
        if (config === undefined) return;

        const windowSize = config.windowSize ?? 100;
        let stats = columnStats.get(columnId);
        if (stats === undefined) {
          stats = createStats(columnId);
          columnStats.set(columnId, stats);
        }

        // Need at least 2 data points to compute meaningful z-score
        if (stats.count >= 2) {
          const zscore = getZScore(stats, value);
          const severity = getSeverity(zscore, config);

          if (severity !== null) {
            const event: AnomalyEvent = {
              id: nextAnomalyId(),
              rowId,
              columnId,
              value,
              zscore,
              severity,
              baseline: { mean: stats.mean, stdDev: stats.stdDev },
              detectedAt: Date.now(),
              acknowledged: false,
            };

            activeAnomalies.set(event.id, event);

            bus.emit('anomaly:detected', event);

            if (onAnomaly !== undefined) {
              onAnomaly(event);
            }
          }
        }

        updateStats(stats, value, windowSize);
      }

      // ─── anomaly:configure ───
      unsubscribers.push(
        ctx.commandBus.registerHandler(
          'anomaly:configure',
          (payload: ColumnAnomalyConfig) => {
            columnConfigs.set(payload.columnId, payload);
            if (!columnStats.has(payload.columnId)) {
              columnStats.set(payload.columnId, createStats(payload.columnId));
            }
          },
        ),
      );

      // ─── anomaly:remove ───
      unsubscribers.push(
        ctx.commandBus.registerHandler(
          'anomaly:remove',
          (payload: { columnId: string }) => {
            columnConfigs.delete(payload.columnId);
            columnStats.delete(payload.columnId);
            // Clear active anomalies for this column
            for (const [id, anomaly] of activeAnomalies) {
              if (anomaly.columnId === payload.columnId) {
                activeAnomalies.delete(id);
                bus.emit('anomaly:cleared', {
                  id,
                  columnId: anomaly.columnId,
                  rowId: anomaly.rowId,
                });
              }
            }
          },
        ),
      );

      // ─── anomaly:acknowledge ───
      unsubscribers.push(
        ctx.commandBus.registerHandler(
          'anomaly:acknowledge',
          (payload: { id: string }) => {
            const anomaly = activeAnomalies.get(payload.id);
            if (anomaly !== undefined) {
              anomaly.acknowledged = true;
            }
          },
        ),
      );

      // ─── anomaly:feed ───
      unsubscribers.push(
        ctx.commandBus.registerHandler(
          'anomaly:feed',
          (payload: { rowId: string; columnId: string; value: number }) => {
            feedValue(payload.rowId, payload.columnId, payload.value);
          },
        ),
      );

      // ─── anomaly:get-stats ───
      unsubscribers.push(
        ctx.commandBus.registerHandler('anomaly:get-stats', () => {
          const stats = Array.from(columnStats.values());
          bus.emit('anomaly:stats-updated', { stats });
        }),
      );

      // ─── anomaly:get-active ───
      unsubscribers.push(
        ctx.commandBus.registerHandler('anomaly:get-active', () => {
          const anomalies = Array.from(activeAnomalies.values()).filter(
            (a) => !a.acknowledged,
          );
          bus.emit('anomaly:active-listed', { anomalies });
        }),
      );

      // ─── Listen for rows:updated and data:changed ───
      unsubscribers.push(
        ctx.eventBus.on('rows:updated', (payload: unknown) => {
          const p = payload as { rows?: Array<{ id: string; data: Record<string, unknown> }> };
          if (!Array.isArray(p?.rows)) return;
          for (const row of p.rows) {
            for (const [columnId] of columnConfigs) {
              const val = row.data[columnId];
              if (typeof val === 'number') {
                feedValue(row.id, columnId, val);
              }
            }
          }
        }),
      );

      unsubscribers.push(
        ctx.eventBus.on('data:changed', (payload: unknown) => {
          const p = payload as { rowId?: string; columnId?: string; value?: unknown };
          if (p?.rowId === undefined || p?.columnId === undefined) return;
          if (typeof p.value !== 'number') return;
          feedValue(p.rowId, p.columnId, p.value);
        }),
      );

      return () => {
        for (const u of unsubscribers) u();
      };
    },
  };
}
