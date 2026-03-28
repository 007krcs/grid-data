// ─── Telemetry Integration Tests ───
// Verifies that the ErrorHandler can be used as a telemetry hook for
// enterprise monitoring systems (Sentry, DataDog, custom loggers).
// Also covers state serialization / snapshot-restore patterns.

import { describe, it, expect, vi } from 'vitest';
import { createGrid } from '../engine/grid-engine';
import type { GridConfig } from '../types/grid';
import { ErrorHandler } from '../errors/error-handler';

// ── Helpers ──

type EngineData = { id: number; name: string; score: number };

function createEngine(overrides: Omit<Partial<GridConfig<EngineData>>, 'columns' | 'rowData' | 'getRowId'> = {}) {
  return createGrid<EngineData>({
    columns: [{ field: 'id' }, { field: 'name' }, { field: 'score' }],
    rowData: [
      { id: 1, name: 'Alice', score: 90 },
      { id: 2, name: 'Bob', score: 75 },
      { id: 3, name: 'Charlie', score: 85 },
    ],
    getRowId: ({ data }) => String((data as EngineData).id),
    ...overrides,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Telemetry hook tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Telemetry hook integration', () => {
  it('registers an error handler and receives structured errors', () => {
    const engine = createEngine();
    const errorHandler = new ErrorHandler();
    errorHandler.setSuppressConsole(true);

    const telemetryEvents: any[] = [];
    errorHandler.onError((gridError) => {
      telemetryEvents.push({
        message: gridError.error.message,
        source: gridError.context.source,
        severity: gridError.context.severity,
        timestamp: gridError.context.timestamp,
      });
    });

    engine.commandBus.setErrorHandler(errorHandler);

    // Trigger a validation error via an invalid command
    engine.commandBus.dispatch('sort:set', {} as any);

    expect(telemetryEvents.length).toBeGreaterThan(0);
    expect(telemetryEvents[0].source).toBe('validation');
    expect(telemetryEvents[0].severity).toBe('error');
    expect(typeof telemetryEvents[0].timestamp).toBe('string');

    engine.destroy();
  });

  it('simulates Sentry-style error capture', () => {
    const engine = createEngine();
    const errorHandler = new ErrorHandler();
    errorHandler.setSuppressConsole(true);

    // Simulate Sentry.captureException
    const capturedErrors: Array<{ error: Error; tags: Record<string, string> }> = [];
    errorHandler.onError(({ error, context }) => {
      capturedErrors.push({
        error,
        tags: {
          source: context.source,
          ...(context.commandType ? { command: context.commandType } : {}),
          ...(context.pluginId ? { plugin: context.pluginId } : {}),
          severity: context.severity,
        },
      });
    });

    engine.commandBus.setErrorHandler(errorHandler);

    // Trigger validation error
    engine.commandBus.dispatch('sort:set', { sortModel: [{ colId: 'name', sort: 'invalid' as any }] });

    expect(capturedErrors.length).toBeGreaterThan(0);
    expect(capturedErrors[0]!.tags.command).toBe('sort:set');
    expect(capturedErrors[0]!.tags.source).toBe('validation');

    engine.destroy();
  });

  it('supports multiple telemetry handlers simultaneously', () => {
    const engine = createEngine();
    const errorHandler = new ErrorHandler();
    errorHandler.setSuppressConsole(true);

    const sentryEvents: any[] = [];
    const datadogEvents: any[] = [];
    const customLogger: any[] = [];

    // Simulate multiple integrations
    errorHandler.onError((e) => sentryEvents.push(e.error.message));
    errorHandler.onError((e) => datadogEvents.push({ msg: e.error.message, src: e.context.source }));
    errorHandler.onError((e) => customLogger.push(JSON.stringify(e.context)));

    engine.commandBus.setErrorHandler(errorHandler);
    engine.commandBus.dispatch('sort:set', {} as any);

    expect(sentryEvents.length).toBeGreaterThan(0);
    expect(datadogEvents.length).toBeGreaterThan(0);
    expect(customLogger.length).toBeGreaterThan(0);

    engine.destroy();
  });

  it('can unsubscribe from telemetry without affecting others', () => {
    const errorHandler = new ErrorHandler();
    errorHandler.setSuppressConsole(true);

    const handler1 = vi.fn();
    const handler2 = vi.fn();

    const unsub1 = errorHandler.onError(handler1);
    errorHandler.onError(handler2);

    errorHandler.report(new Error('error 1'), { source: 'command', severity: 'error' });
    expect(handler1).toHaveBeenCalledOnce();
    expect(handler2).toHaveBeenCalledOnce();

    unsub1();

    errorHandler.report(new Error('error 2'), { source: 'command', severity: 'error' });
    expect(handler1).toHaveBeenCalledOnce(); // not called again
    expect(handler2).toHaveBeenCalledTimes(2);
  });

  it('includes metadata for custom tagging', () => {
    const errorHandler = new ErrorHandler();
    errorHandler.setSuppressConsole(true);

    const captured: any[] = [];
    errorHandler.onError((e) => captured.push(e));

    errorHandler.report(new Error('typed error'), {
      source: 'plugin',
      pluginId: 'sorting',
      severity: 'warning',
      metadata: {
        userId: 'user-123',
        sessionId: 'sess-456',
        gridId: 'main-grid',
        build: '1.2.3',
      },
    });

    expect(captured[0].context.metadata.userId).toBe('user-123');
    expect(captured[0].context.metadata.gridId).toBe('main-grid');
    expect(captured[0].context.severity).toBe('warning');
  });

  it('suppresses console output when telemetry handler is set', () => {
    const errorHandler = new ErrorHandler();
    errorHandler.setSuppressConsole(true);

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const telemetrySpy = vi.fn();
    errorHandler.onError(telemetrySpy);

    errorHandler.report(new Error('silent'), { source: 'command', severity: 'error' });

    expect(consoleSpy).not.toHaveBeenCalled();
    expect(telemetrySpy).toHaveBeenCalledOnce();

    consoleSpy.mockRestore();
  });

  it('reports command bus errors with commandType context', () => {
    const engine = createEngine();
    const errorHandler = new ErrorHandler();
    errorHandler.setSuppressConsole(true);

    const captured: any[] = [];
    errorHandler.onError((e) => captured.push(e));
    engine.commandBus.setErrorHandler(errorHandler);

    // Invalid sort payload triggers validation error
    engine.commandBus.dispatch('filter:set', { filterModel: 'not-an-object' as any });

    expect(captured.length).toBeGreaterThan(0);
    expect(captured[0].context.commandType).toBe('filter:set');

    engine.destroy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// State serialization / snapshot-restore tests
// ─────────────────────────────────────────────────────────────────────────────

describe('State serialization and snapshot-restore', () => {
  it('can snapshot sort, filter, and pagination state', () => {
    const engine = createEngine({
      pagination: true,
      paginationPageSize: 2,
    });

    engine.api.setSortModel([{ colId: 'score', sort: 'desc' }]);
    engine.api.setQuickFilter('a');

    const state = engine.store.getState();
    const snapshot = {
      sortModel: state.sortModel,
      filterModel: state.filterModel,
      quickFilterText: state.quickFilterText,
      currentPage: state.pagination.currentPage,
    };

    expect(snapshot.sortModel).toEqual([{ colId: 'score', sort: 'desc' }]);
    expect(snapshot.quickFilterText).toBe('a');

    engine.destroy();
  });

  it('can restore a snapshot to a new engine', () => {
    const engine1 = createEngine();
    engine1.api.setSortModel([{ colId: 'name', sort: 'asc' }]);
    engine1.api.setQuickFilter('');

    const snapshot = {
      sortModel: engine1.store.getState().sortModel,
      quickFilterText: engine1.store.getState().quickFilterText,
      filterModel: engine1.store.getState().filterModel,
    };
    engine1.destroy();

    // Restore to fresh engine
    const engine2 = createEngine();
    engine2.api.setSortModel(snapshot.sortModel);
    engine2.api.setQuickFilter(snapshot.quickFilterText);
    engine2.api.setFilterModel(snapshot.filterModel);

    expect(engine2.store.getState().sortModel).toEqual(snapshot.sortModel);
    expect(engine2.store.getState().quickFilterText).toBe('');

    engine2.destroy();
  });

  it('state snapshot can be serialized to JSON and back', () => {
    const engine = createEngine();
    engine.api.setSortModel([{ colId: 'score', sort: 'desc' }]);

    const state = engine.store.getState();
    const snapshot = {
      sortModel: state.sortModel,
      filterModel: state.filterModel,
      quickFilterText: state.quickFilterText,
    };

    // Round-trip through JSON
    const serialized = JSON.stringify(snapshot);
    const deserialized = JSON.parse(serialized);

    expect(deserialized.sortModel).toEqual([{ colId: 'score', sort: 'desc' }]);
    expect(typeof deserialized.quickFilterText).toBe('string');

    engine.destroy();
  });

  it('store.subscribe fires on state changes for reactive updates', () => {
    const engine = createEngine();

    const stateSnapshots: any[] = [];
    const unsub = engine.store.subscribe(() => {
      stateSnapshots.push({
        sortModel: engine.store.getState().sortModel,
        rowCount: engine.store.getState().displayedRowIds.length,
      });
    });

    engine.api.setSortModel([{ colId: 'name', sort: 'asc' }]);
    engine.api.setQuickFilter('ali');

    expect(stateSnapshots.length).toBeGreaterThanOrEqual(2);
    expect(stateSnapshots.some(s => s.sortModel.length > 0)).toBe(true);

    unsub();
    engine.destroy();
  });

  it('serializes and restores column visibility state', () => {
    const engine = createEngine();

    // Hide a column via setColumnDefs
    engine.api.setColumnDefs([
      { field: 'id', hide: true },
      { field: 'name' },
      { field: 'score' },
    ]);

    const visibilitySnapshot = engine.store.getState().columns.map(c => ({
      colId: c.colId,
      hide: c.hide ?? false,
    }));

    expect(visibilitySnapshot.find(c => c.colId === 'id')?.hide).toBe(true);
    expect(visibilitySnapshot.find(c => c.colId === 'name')?.hide).toBe(false);

    // Can JSON-serialize and restore
    const json = JSON.stringify(visibilitySnapshot);
    const restored = JSON.parse(json);
    expect(restored).toEqual(visibilitySnapshot);

    engine.destroy();
  });

  it('row data changes are reflected in serializable state', () => {
    const engine = createEngine();

    engine.api.addRows([{ id: 4, name: 'Diana', score: 95 }]);
    expect(engine.api.getDisplayedRowCount()).toBe(4);

    const rowIds = engine.store.getState().displayedRowIds;
    expect(rowIds.length).toBe(4);

    // Row IDs are serializable strings
    for (const id of rowIds) {
      expect(typeof id).toBe('string');
    }

    engine.destroy();
  });
});
