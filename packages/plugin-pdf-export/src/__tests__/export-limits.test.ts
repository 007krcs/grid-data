// © 2025 GridStorm / Tekivex — All Rights Reserved
// Tests for the row/cell ceilings on PDF export.
// CommandBus swallows thrown exceptions, so cap overruns are signaled via
// the `pdf:exportFailed` event.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { PdfExportPlugin, PdfExportLimitExceededError } from '../index';

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
    plugins: [PdfExportPlugin()],
  });
}

interface FailureEvent {
  reason: 'rows' | 'cells';
  rows: number;
  cells: number;
  maxRows: number;
  maxCells: number;
  error: PdfExportLimitExceededError;
}

beforeEach(() => {
  // jsdom previously typed URL.createObjectURL as readonly so this
  // assignment required @ts-expect-error. Modern lib.dom no longer
  // does, so the cast is unnecessary.
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:stub');
  globalThis.URL.revokeObjectURL = vi.fn();
});

describe('PDF export — row/cell ceilings', () => {
  it('emits pdf:exportFailed when rows exceed maxRows', () => {
    const engine = makeGrid(100);
    const failures: FailureEvent[] = [];
    engine.eventBus.on('pdf:exportFailed',(e: FailureEvent) =>
      failures.push(e),
    );

    engine.commandBus.dispatch('pdf:export' as any, { maxRows: 50 } as any);

    expect(failures).toHaveLength(1);
    expect(failures[0]!.reason).toBe('rows');
    expect(failures[0]!.rows).toBe(100);
    expect(failures[0]!.error).toBeInstanceOf(PdfExportLimitExceededError);
  });

  it('emits failure when cells exceed maxCells', () => {
    const engine = makeGrid(100);
    const failures: FailureEvent[] = [];
    engine.eventBus.on('pdf:exportFailed',(e: FailureEvent) =>
      failures.push(e),
    );

    engine.commandBus.dispatch('pdf:export' as any, { maxCells: 50 } as any);

    expect(failures).toHaveLength(1);
    expect(failures[0]!.reason).toBe('cells');
  });

  it('default caps allow normal-sized PDF exports through', () => {
    const engine = makeGrid(50);
    const failures: FailureEvent[] = [];
    const successes: unknown[] = [];
    engine.eventBus.on('pdf:exportFailed',(e: FailureEvent) =>
      failures.push(e),
    );
    engine.eventBus.on('pdf:exportCompleted',(e) => successes.push(e));

    engine.commandBus.dispatch('pdf:export' as any, {} as any);

    expect(failures).toHaveLength(0);
    expect(successes).toHaveLength(1);
  });

  it('does not emit pdf:exportCompleted when the cap trips', () => {
    const engine = makeGrid(100);
    const successes: unknown[] = [];
    engine.eventBus.on('pdf:exportCompleted',(e) => successes.push(e));
    engine.eventBus.on('pdf:exportFailed',() => {});

    engine.commandBus.dispatch('pdf:export' as any, { maxRows: 50 } as any);

    expect(successes).toHaveLength(0);
  });

  it('error payload includes PDF-specific user-facing guidance', () => {
    const engine = makeGrid(100);
    const failures: FailureEvent[] = [];
    engine.eventBus.on('pdf:exportFailed',(e: FailureEvent) =>
      failures.push(e),
    );

    engine.commandBus.dispatch('pdf:export' as any, { maxRows: 50 } as any);

    const msg = failures[0]!.error.message;
    expect(msg).toMatch(/limit exceeded/);
    expect(msg).toMatch(/Filter rows before export/);
    expect(msg).toMatch(/unusable for end-users/);
  });
});
