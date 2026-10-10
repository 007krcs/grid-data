// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
//
// Tests for the agent-facing surface: live grid attachment, self-description,
// input validation that lets an agent self-correct, cell writes, and the
// JSON-RPC / stdio transport.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PassThrough } from 'node:stream';
import { createGrid } from '@gridstorm/core';
import type { GridEngine } from '@gridstorm/core';
import {
  createMCPServer,
  handleToolCall,
  describeServer,
  createJsonRpcHandler,
  serveStdio,
} from '../index';
import { __resetExperimentalWarningForTests as resetWarn } from '../server';

function liveGrid(): GridEngine {
  return createGrid({
    columns: [
      { field: 'name', headerName: 'Name', sortable: true, filterable: true },
      { field: 'revenue', headerName: 'Revenue', sortable: true, filterable: true, editable: true },
      { field: 'closed', headerName: 'Closed on', sortable: false, filterable: false },
      { field: 'active', headerName: 'Active' },
    ],
    rowData: [
      { name: 'Acme', revenue: 50_000, closed: '2026-01-15', active: true },
      { name: 'Globex', revenue: 75_000, closed: '2026-02-20', active: false },
      { name: 'Initech', revenue: 30_000, closed: '2026-03-05', active: true },
    ],
  });
}

beforeEach(() => resetWarn());
afterEach(() => resetWarn());

describe('live grid attachment', () => {
  it('exposes a grid passed via config.grids as attached', async () => {
    const engine = liveGrid();
    const registry = createMCPServer({
      grids: { sales: engine },
      permissions: { suppressExperimentalWarning: true },
    });

    const list = await handleToolCall(registry, 'grid_list', {});
    expect(list.success).toBe(true);
    expect(list.data.grids).toEqual([
      { gridId: 'sales', attached: true, rows: 3, displayedRows: 3, columns: 4 },
    ]);
    engine.destroy();
  });

  it('operates on the real engine, not a copy', async () => {
    const engine = liveGrid();
    const registry = createMCPServer({
      grids: { default: engine },
      permissions: { allowMutations: true, suppressExperimentalWarning: true },
    });

    const res = await handleToolCall(registry, 'grid_sort', { sortModel: [{ colId: 'revenue', sort: 'desc' }] });
    expect(res.success).toBe(true);
    // The host's own engine reflects the agent's action.
    expect(engine.api.getSortModel()).toEqual([{ colId: 'revenue', sort: 'desc' }]);
    expect(engine.api.getDisplayedRowAtIndex(0)?.data).toMatchObject({ name: 'Globex' });
    engine.destroy();
  });

  it('refuses to let grid_create replace an attached grid', async () => {
    const engine = liveGrid();
    const registry = createMCPServer({
      grids: { default: engine },
      permissions: { allowMutations: true, suppressExperimentalWarning: true },
    });

    const res = await handleToolCall(registry, 'grid_create', {
      columns: [{ field: 'x' }],
      rowData: [{ x: 1 }],
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/live application grid/);
    // Still the original engine with its 3 rows.
    expect(engine.api.getDisplayedRowCount()).toBe(3);
    engine.destroy();
  });

  it('supports attachGrid/detachGrid after construction', async () => {
    const registry = createMCPServer({ permissions: { suppressExperimentalWarning: true } });
    const engine = liveGrid();

    expect((await handleToolCall(registry, 'grid_list', {})).data.grids).toHaveLength(0);
    registry.attachGrid('late', engine);
    const described = await handleToolCall(registry, 'grid_describe', { gridId: 'late' });
    expect(described.success).toBe(true);
    expect(described.data.attached).toBe(true);

    expect(registry.detachGrid('late')).toBe(true);
    expect(registry.detachGrid('late')).toBe(false);
    expect((await handleToolCall(registry, 'grid_list', {})).data.grids).toHaveLength(0);
    // Detaching never destroys the host's engine.
    expect(engine.api.getDisplayedRowCount()).toBe(3);
    engine.destroy();
  });

  it('attaches a GridEngine passed via the deprecated gridApi option as default', async () => {
    const engine = liveGrid();
    const registry = createMCPServer({ gridApi: engine, permissions: { suppressExperimentalWarning: true } });
    const list = await handleToolCall(registry, 'grid_list', {});
    expect(list.data.grids[0]).toMatchObject({ gridId: 'default', attached: true });
    engine.destroy();
  });
});

describe('grid_describe', () => {
  it('returns the agent contract: typed columns, capabilities, state, vocabulary', async () => {
    const engine = liveGrid();
    const registry = createMCPServer({
      grids: { default: engine },
      permissions: { allowMutations: true, suppressExperimentalWarning: true },
    });
    await handleToolCall(registry, 'grid_filter', {
      filterModel: { revenue: { filterType: 'number', type: 'greaterThan', filter: 40_000 } },
    });

    const res = await handleToolCall(registry, 'grid_describe', {});
    expect(res.success).toBe(true);
    const d = res.data;
    expect(d.gridId).toBe('default');
    expect(d.rows).toEqual({ total: 3, displayed: 2, selected: 0 });

    const byId = Object.fromEntries(d.columns.map((c: any) => [c.colId, c]));
    expect(byId.name).toMatchObject({ type: 'string', sortable: true, filterable: true, editable: false });
    expect(byId.revenue).toMatchObject({ type: 'number', editable: true });
    expect(byId.closed).toMatchObject({ type: 'date', sortable: false, filterable: false });
    expect(byId.active).toMatchObject({ type: 'boolean' });

    expect(d.filterModel.revenue).toMatchObject({ type: 'greaterThan', filter: 40_000 });
    expect(d.vocabulary.filterOperators).toContain('inRange');
    expect(d.vocabulary.filterTypes).toContain('number');
    expect(d.vocabulary.aggregations).toEqual(expect.arrayContaining(['sum', 'avg', 'min', 'max', 'count']));
    expect(d.pagination).toMatchObject({ currentPage: 0 });
    engine.destroy();
  });

  it('reports mixed and empty column types honestly', async () => {
    const registry = createMCPServer({ permissions: { allowMutations: true, suppressExperimentalWarning: true } });
    await handleToolCall(registry, 'grid_create', {
      columns: [{ field: 'a' }, { field: 'b' }],
      rowData: [{ a: 1, b: null }, { a: 'two', b: undefined }, { a: 3, b: '' }],
    });
    const d = (await handleToolCall(registry, 'grid_describe', {})).data;
    const byId = Object.fromEntries(d.columns.map((c: any) => [c.colId, c]));
    expect(byId.a.type).toBe('mixed');
    expect(byId.b.type).toBe('empty');
  });
});

describe('input validation gives actionable errors', () => {
  let registry: ReturnType<typeof createMCPServer>;
  let engine: GridEngine;
  beforeEach(() => {
    engine = liveGrid();
    registry = createMCPServer({
      grids: { default: engine },
      permissions: { allowMutations: true, suppressExperimentalWarning: true },
    });
  });
  afterEach(() => engine.destroy());

  it('rejects sorting by an unknown column and lists the real ones', async () => {
    const res = await handleToolCall(registry, 'grid_sort', { sortModel: [{ colId: 'revenu', sort: 'asc' }] });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Unknown column 'revenu'/);
    expect(res.error).toMatch(/name, revenue, closed, active/);
    expect(engine.api.getSortModel()).toEqual([]);
  });

  it('rejects sorting a non-sortable column', async () => {
    const res = await handleToolCall(registry, 'grid_sort', { sortModel: [{ colId: 'closed' }] });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/not sortable/);
  });

  it('rejects a bad sort direction', async () => {
    const res = await handleToolCall(registry, 'grid_sort', { sortModel: [{ colId: 'name', sort: 'down' }] });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/'asc' or 'desc'/);
  });

  it('clears sorting with an empty array', async () => {
    await handleToolCall(registry, 'grid_sort', { sortModel: [{ colId: 'name', sort: 'desc' }] });
    const res = await handleToolCall(registry, 'grid_sort', { sortModel: [] });
    expect(res.data.message).toBe('Sort cleared');
    expect(engine.api.getSortModel()).toEqual([]);
  });

  it('rejects filters on unknown or non-filterable columns and bad operators', async () => {
    let res = await handleToolCall(registry, 'grid_filter', { filterModel: { nope: { filter: 'x' } } });
    expect(res.error).toMatch(/Unknown column 'nope'/);

    res = await handleToolCall(registry, 'grid_filter', { filterModel: { closed: { filter: 'x' } } });
    expect(res.error).toMatch(/not filterable/);

    res = await handleToolCall(registry, 'grid_filter', {
      filterModel: { name: { filterType: 'text', type: 'like', filter: 'A' } },
    });
    expect(res.error).toMatch(/type \(operator\) for 'name' must be one of/);

    res = await handleToolCall(registry, 'grid_filter', {
      filterModel: { name: { filterType: 'regex', filter: 'A' } },
    });
    expect(res.error).toMatch(/filterType for 'name' must be one of/);
  });

  it('infers filterType when the agent omits it', async () => {
    const res = await handleToolCall(registry, 'grid_filter', {
      filterModel: { revenue: { type: 'greaterThan', filter: 40_000 } },
    });
    expect(res.success).toBe(true);
    expect(res.data.filterModel.revenue.filterType).toBe('number');
    expect(res.data.displayedRows).toBe(2);
  });

  it('accepts a field name where a colId is expected', async () => {
    const res = await handleToolCall(registry, 'grid_aggregate', { columnId: 'revenue', function: 'sum' });
    expect(res.success).toBe(true);
    expect(res.data.result).toBe(155_000);
    expect(res.data.skippedNonNumeric).toBe(0);
  });

  it('rejects unknown columns in grid_export_csv columnKeys', async () => {
    const res = await handleToolCall(registry, 'grid_export_csv', { columnKeys: ['name', 'profit'] });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Unknown column 'profit'/);
  });

  it('exports RFC 4180 CSV with CRLF line endings and quoted specials', async () => {
    await handleToolCall(registry, 'grid_update_rows', {
      updates: [{ rowId: 'row-0', values: { revenue: 1 } }],
    });
    engine.api.updateRows([{ id: 'row-1', data: { name: 'Glo,bex "Inc"' } }]);
    const res = await handleToolCall(registry, 'grid_export_csv', { columnKeys: ['name', 'revenue'] });
    const lines = res.data.csv.split('\r\n');
    expect(lines[0]).toBe('Name,Revenue');
    expect(lines).toContain('"Glo,bex ""Inc""",75000');
  });
});

describe('grid_update_rows', () => {
  it('writes editable cells on the live engine and reports old/new values', async () => {
    const engine = liveGrid();
    const registry = createMCPServer({
      grids: { default: engine },
      permissions: { allowMutations: true, suppressExperimentalWarning: true },
    });
    const events: any[] = [];
    engine.eventBus.on('cell:valueChanged', (e: any) => events.push(e));

    const page = await handleToolCall(registry, 'grid_get_data', { pageSize: 1 });
    expect(page.data.hasMore).toBe(true);
    const rowId = page.data.rows[0].rowId;
    expect(typeof rowId).toBe('string');

    const res = await handleToolCall(registry, 'grid_update_rows', {
      updates: [{ rowId, values: { revenue: 99_000 } }],
    });
    expect(res.success).toBe(true);
    expect(res.data.changedCells).toEqual([{ rowId, colId: 'revenue', oldValue: 50_000, newValue: 99_000 }]);
    expect(engine.api.getRowNode(rowId)?.data).toMatchObject({ revenue: 99_000 });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ colId: 'revenue', newValue: 99_000 });
    engine.destroy();
  });

  it('refuses non-editable columns, unknown rows, and object values without partial writes', async () => {
    const engine = liveGrid();
    const registry = createMCPServer({
      grids: { default: engine },
      permissions: { allowMutations: true, suppressExperimentalWarning: true },
    });

    let res = await handleToolCall(registry, 'grid_update_rows', { updates: [{ rowId: 'row-0', values: { name: 'X' } }] });
    expect(res.error).toMatch(/not editable/);

    res = await handleToolCall(registry, 'grid_update_rows', { updates: [{ rowId: 'row-9', values: { revenue: 1 } }] });
    expect(res.error).toMatch(/Row 'row-9' not found/);

    res = await handleToolCall(registry, 'grid_update_rows', {
      updates: [
        { rowId: 'row-0', values: { revenue: 1 } },
        { rowId: 'row-1', values: { revenue: { nested: true } } },
      ],
    });
    expect(res.error).toMatch(/must be a primitive/);
    // All-or-nothing: the first (valid) update must not have been applied.
    expect(engine.api.getRowNode('row-0')?.data).toMatchObject({ revenue: 50_000 });
    engine.destroy();
  });

  it('is gated by allowMutations like every other mutation', async () => {
    const engine = liveGrid();
    const registry = createMCPServer({ grids: { default: engine }, permissions: { suppressExperimentalWarning: true } });
    const res = await handleToolCall(registry, 'grid_update_rows', { updates: [{ rowId: 'row-0', values: { revenue: 1 } }] });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/mutations are disabled/);
    engine.destroy();
  });
});

describe('server manifest', () => {
  it('reports every tool with its kind and whether it is currently enabled', async () => {
    const engine = liveGrid();
    const registry = createMCPServer({
      name: 'acme-grid',
      version: '2.0.0',
      grids: { sales: engine },
      permissions: { allowExport: false, suppressExperimentalWarning: true },
    });
    const m = await describeServer(registry);
    expect(m.name).toBe('acme-grid');
    expect(m.version).toBe('2.0.0');
    expect(m.protocolVersion).toBe('2025-06-18');
    const tool = Object.fromEntries(m.tools.map((t) => [t.name, t]));
    expect(tool.grid_describe).toMatchObject({ kind: 'read', enabled: true });
    expect(tool.grid_sort).toMatchObject({ kind: 'mutation', enabled: false });
    expect(tool.grid_export_csv).toMatchObject({ kind: 'export', enabled: false });
    expect(m.grids).toEqual([{ gridId: 'sales', attached: true, rows: 3, columns: 4 }]);
    engine.destroy();
  });
});

describe('JSON-RPC handler (MCP protocol)', () => {
  function server() {
    const engine = liveGrid();
    const registry = createMCPServer({
      grids: { default: engine },
      permissions: { allowMutations: true, suppressExperimentalWarning: true },
    });
    return { engine, handle: createJsonRpcHandler(registry) };
  }

  it('answers initialize with protocol version, capabilities, and server info', async () => {
    const { engine, handle } = server();
    const res = await handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } });
    expect(res).toMatchObject({
      jsonrpc: '2.0',
      id: 1,
      result: {
        protocolVersion: '2025-06-18',
        serverInfo: { name: 'gridstorm' },
        capabilities: { tools: {}, resources: {} },
      },
    });
    expect(typeof res!.result.instructions).toBe('string');
    engine.destroy();
  });

  it('does not answer notifications', async () => {
    const { engine, handle } = server();
    expect(await handle({ jsonrpc: '2.0', method: 'notifications/initialized' })).toBeNull();
    engine.destroy();
  });

  it('lists tools with MCP annotations derived from the effect kind', async () => {
    const { engine, handle } = server();
    const res = await handle({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    const tools = res!.result.tools as any[];
    const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
    expect(byName.grid_describe.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false });
    expect(byName.grid_update_rows.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: true });
    expect(byName.grid_filter.inputSchema.required).toEqual(['filterModel']);
    engine.destroy();
  });

  it('executes tools/call and returns structured content', async () => {
    const { engine, handle } = server();
    const res = await handle({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'grid_aggregate', arguments: { columnId: 'revenue', function: 'max' } },
    });
    expect(res!.result.isError).toBe(false);
    expect(res!.result.structuredContent).toMatchObject({ result: 75_000 });
    expect(JSON.parse(res!.result.content[0].text)).toMatchObject({ result: 75_000 });
    engine.destroy();
  });

  it('reports tool failures as isError results, not JSON-RPC errors', async () => {
    const { engine, handle } = server();
    const res = await handle({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: { name: 'grid_sort', arguments: { sortModel: [{ colId: 'nope' }] } },
    });
    expect(res!.error).toBeUndefined();
    expect(res!.result.isError).toBe(true);
    expect(res!.result.content[0].text).toMatch(/Unknown column 'nope'/);
    engine.destroy();
  });

  it('serves the manifest as an MCP resource', async () => {
    const { engine, handle } = server();
    const list = await handle({ jsonrpc: '2.0', id: 5, method: 'resources/list' });
    expect(list!.result.resources[0].uri).toBe('gridstorm://manifest');
    const read = await handle({ jsonrpc: '2.0', id: 6, method: 'resources/read', params: { uri: 'gridstorm://manifest' } });
    const manifest = JSON.parse(read!.result.contents[0].text);
    expect(manifest.grids[0]).toMatchObject({ gridId: 'default', attached: true });
    engine.destroy();
  });

  it('returns JSON-RPC errors for malformed requests and unknown methods', async () => {
    const { engine, handle } = server();
    expect((await handle({ foo: 'bar' }))!.error!.code).toBe(-32600);
    expect((await handle({ jsonrpc: '2.0', id: 7, method: 'nope' }))!.error!.code).toBe(-32601);
    expect((await handle({ jsonrpc: '2.0', id: 8, method: 'tools/call', params: {} }))!.error!.code).toBe(-32602);
    engine.destroy();
  });
});

describe('serveStdio', () => {
  it('speaks newline-delimited JSON-RPC over streams, keeping request order', async () => {
    const engine = liveGrid();
    const registry = createMCPServer({
      grids: { default: engine },
      permissions: { allowMutations: true, suppressExperimentalWarning: true },
    });
    const input = new PassThrough();
    const output = new PassThrough();
    let out = '';
    output.on('data', (c) => (out += c.toString()));

    const done = serveStdio(registry, { input, output, log: () => {} });

    input.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }) + '\n');
    input.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    input.write('not json\n');
    // Two requests in one chunk, plus a partial line completed by the next chunk.
    input.write(
      JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'grid_list' } }) +
        '\n' +
        JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'grid_descr' } }).slice(0, 20),
    );
    input.write(JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'grid_descr' } }).slice(20) + '\n');
    input.end();
    await done;

    const lines = out.trim().split('\n').map((l) => JSON.parse(l));
    expect(lines.map((l) => l.id)).toEqual([1, null, 2, 3]);
    expect(lines[1].error.code).toBe(-32700);
    expect(lines[2].result.structuredContent.grids[0].gridId).toBe('default');
    expect(lines[3].result.isError).toBe(true);
    expect(lines[3].result.content[0].text).toMatch(/Unknown tool: grid_descr/);
    engine.destroy();
  });
});
