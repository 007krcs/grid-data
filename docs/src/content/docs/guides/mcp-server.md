---
title: MCP Server
description: Let AI agents operate a live GridStorm grid through the Model Context Protocol — self-describing columns, validated sort/filter/edit tools, fail-closed permissions, and a stdio transport.
---

`@gridstorm/mcp-server` exposes a **live GridStorm grid to AI agents** through the [Model Context Protocol](https://modelcontextprotocol.io). Claude, GPT, Gemini, or any MCP-capable agent can discover what a grid contains, sort and filter it, edit cells, aggregate, and export, against the grid your user is actually looking at.

What makes it different from bolting a chat box onto a grid:

- **Self-describing.** `grid_describe` tells the agent every column's inferred data type, whether it is sortable / filterable / editable, the current sort and filter state, and the exact operator vocabulary the other tools accept. Agents plan from facts, not guesses.
- **Live.** Attach your running `GridEngine`. Agent actions go through the same `GridApi` and emit the same events as a human user, so every plugin (status bar, time travel, collaboration, validation) sees them.
- **Fail closed.** Mutations are off by default, exports can be disabled, every input is validated with an actionable error message, and every call hits an audit hook.
- **Real transport.** A dependency-free JSON-RPC 2.0 stdio transport and a `gridstorm-mcp` binary, so Claude Desktop, Claude Code, Cursor, VS Code and the MCP Inspector connect with one line of config.

## Installation

```bash title="Install the MCP server"
pnpm add @gridstorm/mcp-server
```

## Quick start: attach a live grid

```typescript title="Expose your application's grid to an agent"
import { createGrid } from '@gridstorm/core';
import { createMCPServer, serveStdio } from '@gridstorm/mcp-server';

const engine = createGrid({ columns, rowData, plugins });

const registry = createMCPServer({
  name: 'crm-pipeline',
  grids: { pipeline: engine },            // the agent operates THIS grid
  permissions: {
    allowMutations: true,                 // allow sort / filter / edit
    onToolCall: (ev) => audit.write(ev),  // every call, allowed or denied
  },
});

await serveStdio(registry);
```

Grids can be attached and detached at any time, for example when a component mounts or unmounts:

```typescript title="Attach later"
registry.attachGrid('pipeline', engine);
registry.detachGrid('pipeline');
```

Attached grids are never destroyed, evicted, or replaced by `grid_create`. If the agent tries, it gets a clear refusal.

## Quick start: standalone server

The standalone server holds no application data; the agent builds grids itself with `grid_create`. Register it with any MCP host:

```json title="claude_desktop_config.json / .mcp.json"
{
  "mcpServers": {
    "gridstorm": { "command": "npx", "args": ["-y", "@gridstorm/mcp-server"] }
  }
}
```

| Flag | Effect |
|------|--------|
| `--read-only` | Disable mutation tools (the library default). |
| `--no-export` | Disable `grid_export_csv`. |
| `--quiet` | Suppress the one-time experimental warning. |

## The agent workflow

A well-behaved agent session looks like this:

1. **`grid_list`** — which grids exist, and which are live application grids.
2. **`grid_describe`** — columns, types, capabilities, current state, vocabulary.
3. **`grid_filter` / `grid_sort`** — using only columns and operators the description allows.
4. **`grid_get_data`** — read rows, each with its `rowId`.
5. **`grid_update_rows`** — write back to editable columns by `rowId`.
6. **`grid_aggregate` / `grid_export_csv`** — summarize or hand the result over.

The server's `initialize` response carries these instructions, so hosts that forward server instructions get the workflow for free.

## Tools

Every tool accepts an optional `gridId` (default `'default'`). Column references accept either the `colId` or the `field`.

### grid_describe

The agent contract for one grid.

```json title="Example response (abridged)"
{
  "gridId": "pipeline",
  "attached": true,
  "rows": { "total": 1200, "displayed": 87, "selected": 0 },
  "columns": [
    { "colId": "account", "type": "string",  "sortable": true, "filterable": true, "editable": false, "hidden": false, "pinned": "left", "sort": null },
    { "colId": "amount",  "type": "number",  "sortable": true, "filterable": true, "editable": true,  "hidden": false, "pinned": null,   "sort": "desc", "sortIndex": 0 },
    { "colId": "closeOn", "type": "date",    "sortable": true, "filterable": true, "editable": true,  "hidden": false, "pinned": null,   "sort": null }
  ],
  "sortModel": [{ "colId": "amount", "sort": "desc" }],
  "filterModel": { "stage": { "filterType": "set", "values": ["Negotiation"] } },
  "pagination": { "currentPage": 0, "pageSize": 100, "totalRows": 87, "totalPages": 1 },
  "plugins": ["sorting", "filtering", "editing", "status-bar"],
  "vocabulary": {
    "filterTypes": ["text", "number", "date", "set", "custom"],
    "filterOperators": ["equals", "notEqual", "contains", "notContains", "startsWith", "endsWith", "lessThan", "lessThanOrEqual", "greaterThan", "greaterThanOrEqual", "inRange", "blank", "notBlank"],
    "aggregations": ["sum", "avg", "min", "max", "count"]
  }
}
```

Column `type` is inferred from a sample of displayed rows: `number`, `string`, `boolean`, `date` (ISO-8601 strings or `Date`), `object`, `mixed` when the sample disagrees, `empty` when every sampled value is blank. `editable` is `true`, `false`, or `"conditional"` when the column uses a function.

### grid_list

```json title="Response"
{ "grids": [{ "gridId": "pipeline", "attached": true, "rows": 1200, "displayedRows": 87, "columns": 9 }], "defaultGridId": "default" }
```

### grid_sort

```json title="Input"
{ "sortModel": [{ "colId": "amount", "sort": "desc" }, { "colId": "account" }] }
```

Replaces the whole sort model. `[]` clears sorting. Unknown or non-sortable columns and bad directions are rejected with the list of real columns.

### grid_filter

```json title="Input"
{
  "filterModel": {
    "amount":  { "type": "greaterThan", "filter": 50000 },
    "stage":   { "filterType": "set", "values": ["Negotiation", "Proposal"] },
    "closeOn": { "filterType": "date", "type": "inRange", "dateFrom": "2026-01-01", "dateTo": "2026-03-31" }
  }
}
```

Replaces the whole filter model. `{}` clears all filters. `filterType` is inferred from the operand when omitted (`number` for numeric operands, `set` when `values` is present, `date` when `dateFrom`/`dateTo` are present, otherwise `text`).

### grid_get_data

```json title="Input"
{ "page": 0, "pageSize": 50 }
```

Returns `rows` (each with `rowId` plus the row's fields), `total`, `page`, `pageSize`, `hasMore`. `pageSize` is clamped to 1–1000.

### grid_update_rows

```json title="Input"
{
  "updates": [
    { "rowId": "row-17", "values": { "amount": 62000 } },
    { "rowId": "row-42", "values": { "amount": 15000, "closeOn": "2026-04-30" } }
  ]
}
```

All-or-nothing: the batch is validated first (row exists, column exists and is editable, value is a primitive), then applied through `GridApi.updateRows`, which emits one `cell:valueChanged` per changed cell exactly as a user edit does. The response lists every changed cell with `oldValue` and `newValue`.

### grid_aggregate

```json title="Input"
{ "columnId": "amount", "function": "sum" }
```

Runs over the **displayed** rows (after sort and filter). Response includes `result`, `count`, and `skippedNonNumeric`.

### grid_export_csv

```json title="Input"
{ "fileName": "pipeline.csv", "columnKeys": ["account", "amount"] }
```

RFC 4180 output (CRLF line endings, quotes doubled, fields containing commas, quotes or newlines quoted). Defaults to all visible columns.

### grid_create

```json title="Input"
{
  "gridId": "scratch",
  "columns": [
    { "field": "sku", "headerName": "SKU" },
    { "field": "qty", "editable": true }
  ],
  "rowData": [{ "sku": "A-1", "qty": 4 }]
}
```

Columns default to `sortable: true`, `filterable: true`, `editable: false`. Creating a grid with an existing agent-created `gridId` replaces it; attempting to replace an attached grid is refused. Agent-created grids are capped at 50 with oldest-first eviction. Attached grids are never evicted.

## Permissions

```typescript title="MCPPermissions"
interface MCPPermissions {
  allowMutations: boolean;   // default false — gates every 'mutation' tool
  allowExport: boolean;      // default true  — gates grid_export_csv, pdf_save
  maxStringInput: number;    // default 10_000 — any longer string in any input is rejected
  onToolCall?: (event: ToolCallEvent) => void; // audit: tool, kind, allowed, denyReason, inputKeys
  suppressExperimentalWarning?: boolean;
}
```

Denied calls return `{ success: false, error }` (or an MCP result with `isError: true`) that names the knob to flip. The audit event carries input **keys**, never values, so cell content does not leak into logs.

## Server manifest

Agents and hosts can read a machine-readable description of the whole server before calling anything:

- **MCP resource** `gridstorm://manifest`
- **In code** `await describeServer(registry)`

```json title="Manifest (abridged)"
{
  "name": "crm-pipeline",
  "version": "0.1.4",
  "protocolVersion": "2025-06-18",
  "permissions": { "allowMutations": true, "allowExport": true, "maxStringInput": 10000 },
  "tools": [
    { "name": "grid_describe", "kind": "read", "enabled": true, "description": "..." },
    { "name": "grid_update_rows", "kind": "mutation", "enabled": true, "description": "..." }
  ],
  "grids": [{ "gridId": "pipeline", "attached": true, "rows": 1200, "columns": 9 }]
}
```

`tools/list` also carries MCP annotations (`readOnlyHint`, `destructiveHint`, `idempotentHint`) derived from each tool's effect kind, so hosts can ask for confirmation on destructive calls.

## Using the handler without stdio

```typescript title="Any transport"
import { createMCPServer, createJsonRpcHandler, handleToolCall } from '@gridstorm/mcp-server';

const registry = createMCPServer({ grids: { default: engine } });

// Full MCP request/response mapping — plug into WebSocket, HTTP, or tests
const handle = createJsonRpcHandler(registry);
const res = await handle({ jsonrpc: '2.0', id: 1, method: 'tools/list' });

// Or call tools directly
const described = await handleToolCall(registry, 'grid_describe', {});
```

## Security

Read the package's [SECURITY.md](https://github.com/007krcs/grid-data/blob/main/packages/mcp-server/SECURITY.md) before enabling mutations against real data. The short version:

- Keep `allowMutations` off unless the agent is trusted for that grid.
- Cell contents returned by `grid_get_data` and `grid_export_csv` are **user data, not instructions**. Say so in your system prompt; the server says so in its `initialize` instructions.
- Run one registry per principal. There is no per-client isolation inside a registry.
- Wire `onToolCall` to your audit log.

## PDF and AI tools

The registry also defines PDF tools (`pdf_load`, `pdf_extract_text`, `pdf_search`, `pdf_annotate`, `pdf_redact`, `pdf_save`, `pdf_get_metadata`) and AI PDF tools (`pdf_detect_pii`, `pdf_classify`, `pdf_summarize`, `pdf_extract_fields`). They require a configured PDF parser backend and return a configuration hint until one is provided. See the [PDF Toolkit](/guides/pdf-toolkit).

## Next Steps

- [AI Query plugin](/plugins/ai) -- In-grid natural-language commands routed through `@gridstorm/ai-adapter`
- [Events & Commands](/core-concepts/events-commands) -- The bus every agent action flows through
- [Custom Plugins](/guides/custom-plugins) -- React to `cell:valueChanged` and friends from your own plugin
