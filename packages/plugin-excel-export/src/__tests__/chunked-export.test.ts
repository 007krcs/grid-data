// ─── Chunked / streamed export ───
// Large exports must not build the whole document as one string, must yield
// between chunks, must report progress, and must stream to a sink when given.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { ExcelExportPlugin } from '../index';
import { buildCsvContent, buildExcelXml, toCellData } from '../excel-builder';

interface Row { id: number; name: string; }

function makeRows(n: number): Row[] {
  return Array.from({ length: n }, (_, i) => ({ id: i, name: `r${i}` }));
}

function makeGrid(rowCount: number) {
  return createGrid<Row>({
    columns: [{ field: 'id' }, { field: 'name' }],
    rowData: makeRows(rowCount),
    plugins: [ExcelExportPlugin()],
  });
}

const flushTimers = () => new Promise<void>((r) => setTimeout(r, 5));

let blobParts: BlobPart[][];

beforeEach(() => {
  blobParts = [];
  // Capture what Blob receives so we can assert the document arrives as
  // multiple parts, never one concatenated string.
  const RealBlob = globalThis.Blob;
  vi.stubGlobal(
    'Blob',
    class CapturingBlob extends RealBlob {
      constructor(parts: BlobPart[] = [], opts?: BlobPropertyBag) {
        super(parts, opts);
        blobParts.push(parts);
      }
    },
  );
  // @ts-expect-error jsdom lacks these
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:stub');
  // @ts-expect-error ditto
  globalThis.URL.revokeObjectURL = vi.fn();
});

describe('chunked export', () => {
  it('small exports complete synchronously in a single chunk', () => {
    const engine = makeGrid(50);
    const exported: any[] = [];
    const progress: any[] = [];
    engine.eventBus.on('excel:exported', (e) => exported.push(e));
    engine.eventBus.on('excel:exportProgress' as any, (e: any) => progress.push(e));

    engine.commandBus.dispatch('excel:exportCsv' as any, {} as any);

    expect(exported).toHaveLength(1);
    expect(progress).toHaveLength(0);
    engine.destroy();
  });

  it('large CSV exports yield between chunks, report progress, and match the one-shot builder byte for byte', async () => {
    const engine = makeGrid(12_000);
    const exported: any[] = [];
    const progress: any[] = [];
    engine.eventBus.on('excel:exported', (e) => exported.push(e));
    engine.eventBus.on('excel:exportProgress' as any, (e: any) => progress.push(e));

    engine.commandBus.dispatch('excel:exportCsv' as any, { chunkSize: 5000 } as any);
    // Asynchronous: nothing has completed yet when dispatch returns.
    expect(exported).toHaveLength(0);

    await flushTimers();
    await flushTimers();
    await flushTimers();

    expect(progress.map((p) => p.done)).toEqual([5000, 10_000, 12_000]);
    expect(progress[0]).toMatchObject({ format: 'csv', total: 12_000 });
    expect(exported).toHaveLength(1);
    expect(exported[0]).toMatchObject({ format: 'csv', rowCount: 12_000 });

    const parts = blobParts[0]!;
    expect(parts.length).toBeGreaterThan(2); // head + 3 chunks, never one string
    const joined = parts.join('');
    const expected = buildCsvContent(['id', 'name'], makeRows(12_000).map((r) => [String(r.id), r.name]));
    expect(joined).toBe(expected);
    engine.destroy();
  });

  it('large Excel XML exports produce a document identical to the one-shot builder', async () => {
    const engine = makeGrid(7_000);
    const exported: any[] = [];
    engine.eventBus.on('excel:exported', (e) => exported.push(e));

    engine.commandBus.dispatch('excel:exportExcel' as any, { chunkSize: 2_500 } as any);
    await flushTimers();
    await flushTimers();
    await flushTimers();

    expect(exported).toHaveLength(1);
    const joined = blobParts[0]!.join('');
    const expected = buildExcelXml('Sheet1', ['id', 'name'], makeRows(7_000).map((r) => [toCellData(r.id), toCellData(r.name)]));
    expect(joined).toBe(expected);
    expect(joined.startsWith('<?xml')).toBe(true);
    expect(joined.endsWith('</Workbook>')).toBe(true);
    engine.destroy();
  });

  it('streams to a sink without creating a Blob and closes it at the end', async () => {
    const engine = makeGrid(9_000);
    const chunks: string[] = [];
    let closed = false;
    const sink = {
      write: (c: string) => { chunks.push(c); },
      close: () => { closed = true; },
    };
    const exported: any[] = [];
    engine.eventBus.on('excel:exported', (e) => exported.push(e));

    engine.commandBus.dispatch('excel:exportCsv' as any, { chunkSize: 4000, sink } as any);
    await flushTimers();
    await flushTimers();
    await flushTimers();

    expect(closed).toBe(true);
    expect(blobParts).toHaveLength(0); // no download path taken
    expect(chunks.length).toBe(4); // header + 3 row chunks
    expect(chunks.join('')).toBe(
      buildCsvContent(['id', 'name'], makeRows(9_000).map((r) => [String(r.id), r.name])),
    );
    expect(exported[0]).toMatchObject({ format: 'csv', rowCount: 9_000 });
    engine.destroy();
  });

  it('accepts a WritableStream as the sink', async () => {
    const engine = makeGrid(3_000);
    const received: string[] = [];
    const stream = new WritableStream<string>({
      write(chunk) { received.push(chunk); },
    });
    engine.commandBus.dispatch('excel:exportCsv' as any, { chunkSize: 1_000, sink: stream } as any);
    await flushTimers();
    await flushTimers();
    await flushTimers();
    await flushTimers();

    expect(received.join('')).toBe(
      buildCsvContent(['id', 'name'], makeRows(3_000).map((r) => [String(r.id), r.name])),
    );
    engine.destroy();
  });
});
