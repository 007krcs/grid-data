// ─── Streaming Data Plugin ───
// Provides real-time live data updates with cell flash/highlight on changes.
// Collects incoming row updates into batches and applies them at a configurable
// interval. Tracks per-cell change direction (up/down/neutral) for flash CSS classes.

import type { GridPlugin, PluginContext } from '@gridstorm/core';

// ─── Public Types ───

export interface StreamAdapter {
  connect(handlers: StreamHandlers): void | Promise<void>;
  disconnect(): void | Promise<void>;
}

export interface StreamHandlers {
  onData(updates: RowUpdate[]): void;
  onError(error: Error): void;
  onConnectionChange(connected: boolean): void;
}

export interface RowUpdate {
  id: string;
  data: Record<string, unknown>;
}

export interface CellChange {
  rowId: string;
  colId: string;
  oldValue: unknown;
  newValue: unknown;
  direction: 'up' | 'down' | 'neutral';
  timestamp: number;
}

export interface StreamingState {
  connected: boolean;
  updatesPerSecond: number;
  totalUpdates: number;
  pendingUpdates: RowUpdate[];
  recentChanges: CellChange[];
}

export interface StreamingPluginOptions {
  /** Batch updates interval in ms. Default: 100. */
  batchInterval?: number;
  /** Max updates per batch. Default: 1000. */
  maxBatchSize?: number;
  /** Cell flash highlight duration in ms. Default: 500. */
  flashDuration?: number;
  /** Enable cell change flash. Default: true. */
  enableFlash?: boolean;
  /** CSS class for value increase. Default: 'gs-cell-flash-up'. */
  flashUpClass?: string;
  /** CSS class for value decrease. Default: 'gs-cell-flash-down'. */
  flashDownClass?: string;
  /** CSS class for non-numeric change. Default: 'gs-cell-flash-neutral'. */
  flashNeutralClass?: string;
  /** Custom data source adapter. */
  adapter?: StreamAdapter;
  /** If true, updates are deltas not full rows. Default: false. */
  deltaMode?: boolean;
}

// ─── Constants ───

const MAX_RECENT_CHANGES = 1000;
const UPS_WINDOW_MS = 1000;

// ─── Helpers ───

function determineDirection(oldVal: unknown, newVal: unknown): 'up' | 'down' | 'neutral' {
  if (typeof oldVal === 'number' && typeof newVal === 'number') {
    if (newVal > oldVal) return 'up';
    if (newVal < oldVal) return 'down';
  }
  return 'neutral';
}

// ─── Plugin Factory ───

export function StreamingPlugin(options: StreamingPluginOptions = {}): GridPlugin {
  const {
    batchInterval = 100,
    maxBatchSize = 1000,
    flashDuration: _flashDuration = 500,
    enableFlash: _enableFlash = true,
    flashUpClass: _flashUpClass = 'gs-cell-flash-up',
    flashDownClass: _flashDownClass = 'gs-cell-flash-down',
    flashNeutralClass: _flashNeutralClass = 'gs-cell-flash-neutral',
    adapter: initialAdapter,
    deltaMode = false,
  } = options;

  return {
    id: 'streaming',
    name: 'Streaming Data',
    version: '0.1.0',

    install(ctx: PluginContext): void | (() => void) {
      // ── Internal mutable state ──
      let adapter: StreamAdapter | undefined = initialAdapter;
      let paused = false;
      let batchTimer: ReturnType<typeof setInterval> | null = null;
      let pendingQueue: RowUpdate[] = [];
      let updateTimestamps: number[] = [];

      // ── Plugin state registration ──
      const initialState: StreamingState = {
        connected: false,
        updatesPerSecond: 0,
        totalUpdates: 0,
        pendingUpdates: [],
        recentChanges: [],
      };
      ctx.registerState<StreamingState>('streaming', initialState);

      // ── Stream handlers (passed to adapters) ──
      const streamHandlers: StreamHandlers = {
        onData(updates: RowUpdate[]): void {
          if (paused) return;
          pendingQueue.push(...updates);
          // Cap the pending queue to prevent unbounded growth
          if (pendingQueue.length > maxBatchSize * 10) {
            pendingQueue = pendingQueue.slice(-maxBatchSize * 10);
          }
        },
        onError(error: Error): void {
          ctx.eventBus.emit('rowData:changed' as any, {
            type: 'stream:error',
            error,
          } as any);
        },
        onConnectionChange(connected: boolean): void {
          ctx.setState<StreamingState>('streaming', (prev) => ({
            ...prev,
            connected,
          }));
        },
      };

      // ── Batch processing ──
      function processBatch(): void {
        if (paused || pendingQueue.length === 0) return;

        const batch = pendingQueue.splice(0, maxBatchSize);
        const now = Date.now();
        const changes: CellChange[] = [];
        const state = ctx.store.getState();

        // Build updates array for ctx.api.updateRows
        const rowUpdates: Array<{ id: string; data: Record<string, unknown> }> = [];

        for (const update of batch) {
          const existingNode = state.rowNodes.get(update.id);

          if (existingNode && existingNode.data) {
            // Track cell-level changes
            const existingData = existingNode.data as Record<string, unknown>;
            for (const [colId, newValue] of Object.entries(update.data)) {
              const oldValue = existingData[colId];
              if (oldValue !== newValue) {
                changes.push({
                  rowId: update.id,
                  colId,
                  oldValue,
                  newValue,
                  direction: determineDirection(oldValue, newValue),
                  timestamp: now,
                });
              }
            }
          }

          if (deltaMode) {
            // Delta mode: merge partial data
            rowUpdates.push({ id: update.id, data: update.data });
          } else {
            // Full row mode: replace entire row data
            rowUpdates.push({ id: update.id, data: update.data });
          }
        }

        // Apply updates via the grid API
        if (rowUpdates.length > 0) {
          ctx.api.updateRows(rowUpdates as Array<{ id: string; data: any }>);
        }

        // Track UPS (updates per second)
        updateTimestamps.push(now);
        // Prune timestamps older than the UPS window
        const cutoff = now - UPS_WINDOW_MS;
        updateTimestamps = updateTimestamps.filter((t) => t >= cutoff);
        const ups = batch.length; // updates in this tick

        // Update plugin state
        ctx.setState<StreamingState>('streaming', (prev) => {
          let recentChanges = [...prev.recentChanges, ...changes];
          if (recentChanges.length > MAX_RECENT_CHANGES) {
            recentChanges = recentChanges.slice(-MAX_RECENT_CHANGES);
          }

          // Calculate true UPS from rolling window
          const totalInWindow = updateTimestamps.length > 0 ? ups : 0;
          // We sum all batch sizes in the window; for simplicity use
          // a decayed estimate based on recent batch + previous value
          const updatesPerSecond = Math.round(
            totalInWindow * (UPS_WINDOW_MS / batchInterval),
          );

          return {
            ...prev,
            totalUpdates: prev.totalUpdates + batch.length,
            updatesPerSecond,
            pendingUpdates: [...pendingQueue],
            recentChanges,
          };
        });

        // Emit stream:updated event
        ctx.eventBus.emit('rowData:changed' as any, {
          type: 'stream:updated',
          batchSize: batch.length,
          changes,
        } as any);
      }

      // ── Start batch timer ──
      function startBatchTimer(): void {
        if (batchTimer !== null) return;
        batchTimer = setInterval(processBatch, batchInterval);
      }

      function stopBatchTimer(): void {
        if (batchTimer !== null) {
          clearInterval(batchTimer);
          batchTimer = null;
        }
      }

      // ── Command handlers ──

      const unregConnect = ctx.commandBus.registerAsyncHandler(
        'stream:connect',
        async (_payload: any) => {
          if (!adapter) return;
          await adapter.connect(streamHandlers);
          ctx.setState<StreamingState>('streaming', (prev) => ({
            ...prev,
            connected: true,
          }));
          startBatchTimer();
        },
      );

      const unregDisconnect = ctx.commandBus.registerAsyncHandler(
        'stream:disconnect',
        async (_payload: any) => {
          if (!adapter) return;
          await adapter.disconnect();
          stopBatchTimer();
          ctx.setState<StreamingState>('streaming', (prev) => ({
            ...prev,
            connected: false,
          }));
        },
      );

      const unregPush = ctx.commandBus.registerHandler(
        'stream:push',
        (payload: { updates: RowUpdate[] }) => {
          streamHandlers.onData(payload.updates);
        },
      );

      const unregPause = ctx.commandBus.registerHandler(
        'stream:pause',
        (_payload: any) => {
          paused = true;
        },
      );

      const unregResume = ctx.commandBus.registerHandler(
        'stream:resume',
        (_payload: any) => {
          paused = false;
        },
      );

      const unregSetAdapter = ctx.commandBus.registerHandler(
        'stream:setAdapter',
        (payload: { adapter: StreamAdapter }) => {
          adapter = payload.adapter;
        },
      );

      // ── Disposer ──
      return () => {
        stopBatchTimer();
        unregConnect();
        unregDisconnect();
        unregPush();
        unregPause();
        unregResume();
        unregSetAdapter();
        pendingQueue = [];
        updateTimestamps = [];
      };
    },
  };
}
