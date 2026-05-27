// © 2025 GridStorm / Tekivex — All Rights Reserved
// Tests for the row/cell ceilings that prevent OOM on large exports.
//
// The CommandBus swallows handler exceptions (by design — see
// packages/core/src/events/command-bus.ts), so the plugin signals a cap
// overrun via the `excel:exportFailed` event rather than a thrown error.
// These tests subscribe to the event and assert on its payload.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { ExcelExportPlugin, ExportLimitExceededError } from '../index';

interface Row { id: number; name: string; }

function makeRows(n: number): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < n; i++) rows.push({ id: i, name: 'r' + i });
  return rows;
}

function makeGrid(rowCount: number) {
  return createGrid<Row>({
    columns: [{ field: 'id' }, { field: 'name' }],
    rowData: makeRows(rowCount),
    plugins: [ExcelExportPlugin()],
  });
}

interface FailureEvent {
  format: 'csv' | 'excel';
  reason: 'rows' | 'cells';
  rows: number;
  cells: number;
  maxRows: number;
  maxCells: number;
  error: ExportLimitExceededError;
}

beforeEach(() => {
  // jsdom doesn't ship URL.createObjectURL or revokeObjectURL.
  // @ts-expect-error: assigning to readonly global on jsdom is fine for tests.
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:stub');
  // @ts-expect-error: ditto
  globalThis.URL.revokeObjectURL = vi.fn();
});

describe('Excel export — row/cell ceilings', () => {
  it('CSV emits excel:exportFailed when rows exceed maxRows', () => {
    const engine = makeGrid(200);
    const failures: FailureEvent[] = [];
    engine.eventBus.on('excel:exportFailed' as any, (e: FailureEvent) =>
      failures.push(e),
    );

    engine.commandBus.dispatch('excel:exportCsv' as any, { maxRows: 100 } as any);

    expect(failures).toHaveLength(1);
    expect(failures[0]!.format).toBe('csv');
    expect(failures[0]!.reason).toBe('rows');
    expect(failures[0]!.rows).toBe(200);
    expect(failures[0]!.maxRows).toBe(100);
    expect(failures[0]!.error).toBeInstanceOf(ExportLimitExceededError);
  });

  it('CSV emits failure when cells exceed maxCells (rows × cols)', () => {
    const engine = makeGrid(100);
    const failures: FailureEvent[] = [];
    engine.eventBus.on('excel:exportFailed' as any, (e: FailureEvent) =>
      failures.push(e),
    );

    // 100 rows × 2 cols = 200 cells; cap at 50.
    engine.commandBus.dispatch('excel:exportCsv' as any, { maxCells: 50 } as any);

    expect(failures).toHaveLength(1);
    expect(failures[0]!.reason).toBe('cells');
    expect(failures[0]!.cells).toBe(200);
    expect(failures[0]!.maxCells).toBe(50);
  });

  it('Excel XML export honors the same cap', () => {
    const engine = makeGrid(200);
    const failures: FailureEvent[] = [];
    engine.eventBus.on('excel:exportFailed' as any, (e: FailureEvent) =>
      failures.push(e),
    );

    engine.commandBus.dispatch('excel:exportExcel' as any, { maxRows: 100 } as any);

    expect(failures).toHaveLength(1);
    expect(failures[0]!.format).toBe('excel');
    expect(failures[0]!.reason).toBe('rows');
  });

  it('default caps allow normal-sized exports through (no failure event)', () => {
    const engine = makeGrid(100);
    const failures: FailureEvent[] = [];
    const successes: unknown[] = [];
    engine.eventBus.on('excel:exportFailed' as any, (e: FailureEvent) =>
      failures.push(e),
    );
    engine.eventBus.on('excel:exported' as any, (e) => successes.push(e));

    // No options override → default maxRows = 100_000, maxCells = 5_000_000.
    // 100 rows × 2 cols = 200 cells; well below both.
    engine.commandBus.dispatch('excel:exportCsv' as any, {} as any);

    expect(failures).toHaveLength(0);
    expect(successes).toHaveLength(1);
  });

  it('maxRows: Infinity effectively disables the row cap', () => {
    const engine = makeGrid(500);
    const failures: FailureEvent[] = [];
    engine.eventBus.on('excel:exportFailed' as any, (e: FailureEvent) =>
      failures.push(e),
    );

    engine.commandBus.dispatch('excel:exportCsv' as any, {
      maxRows: Infinity,
      maxCells: Infinity,
    } as any);

    expect(failures).toHaveLength(0);
  });

  it('does not emit excel:exported when the cap trips', () => {
    const engine = makeGrid(200);
    const successes: unknown[] = [];
    engine.eventBus.on('excel:exported' as any, (e) => successes.push(e));
    engine.eventBus.on('excel:exportFailed' as any, () => {});

    engine.commandBus.dispatch('excel:exportCsv' as any, { maxRows: 100 } as any);

    expect(successes).toHaveLength(0);
  });

  it('error payload carries enough info to render a useful message', () => {
    const engine = makeGrid(500);
    const failures: FailureEvent[] = [];
    engine.eventBus.on('excel:exportFailed' as any, (e: FailureEvent) =>
      failures.push(e),
    );

    engine.commandBus.dispatch('excel:exportCsv' as any, { maxRows: 250 } as any);

    expect(failures).toHaveLength(1);
    const f = failures[0]!;
    expect(f.rows).toBe(500);
    expect(f.cells).toBe(1000); // 500 rows × 2 cols
    expect(f.error.message).toMatch(/limit exceeded/);
    expect(f.error.message).toMatch(/Filter rows before export/);
  });
});
