# @gridstorm/mcp-server

Expose a **live GridStorm data grid to AI agents** through the
[Model Context Protocol](https://modelcontextprotocol.io). An agent connected
to this server can discover what the grid contains, sort and filter it, write
cells, aggregate, and export, all against the grid the user is actually
looking at. It is the only data grid that ships a self-describing agent
surface in the box.

- **Self-describing.** `grid_describe` returns every column with an inferred
  data type, its capabilities (sortable / filterable / editable), the current
  sort and filter state, and the exact operator vocabulary the other tools
  accept. Agents plan from facts instead of guessing.
- **Live, not a copy.** Attach your running `GridEngine`; agent actions go
  through the same `GridApi` and emit the same events as a human user.
- **Fail closed.** Mutations are off by default, exports can be disabled,
  every input is validated with an actionable error, and every call hits an
  audit hook.
- **Real transport.** A dependency-free JSON-RPC 2.0 stdio transport plus a
  `gridstorm-mcp` binary, so Claude Desktop, Claude Code, Cursor, VS Code and
  the MCP Inspector can connect with one line of config.

## Install

```bash
npm install @gridstorm/mcp-server
```

## 1. Embed: let an agent operate your application's grid

```ts
import { createGrid } from '@gridstorm/core';
import { createMCPServer, serveStdio } from '@gridstorm/mcp-server';

const engine = createGrid({ columns, rowData, plugins });

const registry = createMCPServer({
  name: 'crm-pipeline',
  grids: { pipeline: engine },           // attach the live grid
  permissions: {
    allowMutations: true,                // let the agent sort / filter / edit
    onToolCall: (ev) => audit.write(ev), // every call, allowed or denied
  },
});

await serveStdio(registry);              // or drive handleToolCall() yourself
```

Grids can also be attached later, for example when a component mounts:

```ts
registry.attachGrid('pipeline', engine);
registry.detachGrid('pipeline');
```

Attached grids are never destroyed, evicted, or overwritten by `grid_create`.

## 2. Standalone: `npx @gridstorm/mcp-server`

The standalone server holds no application data; the agent builds grids with
`grid_create`. Add it to any MCP host:

```json
{
  "mcpServers": {
    "gridstorm": { "command": "npx", "args": ["-y", "@gridstorm/mcp-server"] }
  }
}
```

Flags: `--read-only` (disable mutations), `--no-export` (disable CSV egress),
`--quiet` (suppress the one-time experimental warning).

## Tools

| Tool | Kind | What it does |
|---|---|---|
| `grid_list` | read | Every grid the server can address, with row/column counts and whether it is attached. |
| `grid_describe` | read | Columns with inferred types and capabilities, sort/filter state, plugins, filter and aggregation vocabulary. **Call this first.** |
| `grid_get_data` | read | A page of displayed rows, each with its `rowId`. |
| `grid_aggregate` | read | `sum` / `avg` / `min` / `max` / `count` over a numeric column. |
| `grid_create` | mutation | Build an in-memory grid from columns and rows. |
| `grid_sort` | mutation | Replace the sort model. `[]` clears. |
| `grid_filter` | mutation | Replace the filter model. `{}` clears. `filterType` is inferred when omitted. |
| `grid_update_rows` | mutation | Write primitive values to editable columns by `rowId`. All-or-nothing. Emits `cell:valueChanged`. |
| `grid_export_csv` | export | RFC 4180 CSV of the displayed rows. |

Every tool accepts an optional `gridId` (default `'default'`). Column
references accept either the `colId` or the `field`. Bad input never throws:
the agent gets a message such as
`Unknown column 'revenu'. Available columns: name, revenue, closed. Call grid_describe for details.`
and can self-correct.

The server also publishes one MCP resource, `gridstorm://manifest`: tool
list with effect kinds and whether each is currently permitted, plus the
attached grids. `describeServer(registry)` returns the same object in code.

## Permissions

| Knob | Default | Effect |
|---|---|---|
| `allowMutations` | `false` | Gates every `mutation` tool. |
| `allowExport` | `true` | Gates `grid_export_csv` and `pdf_save`. |
| `maxStringInput` | `10000` | Any string in any input longer than this is rejected before the handler runs. |
| `onToolCall` | – | Audit callback with tool name, kind, allowed/denied, deny reason, and input keys (never values). |

Read [SECURITY.md](./SECURITY.md) before enabling mutations against real data.
Cell contents returned by `grid_get_data` and `grid_export_csv` are user data,
not instructions; the server says so in its `initialize` instructions and you
should say so in your system prompt too.

## Driving the registry without a transport

```ts
import { createMCPServer, handleToolCall, listTools } from '@gridstorm/mcp-server';

const registry = createMCPServer({ grids: { default: engine } });
listTools(registry);                                   // ToolDefinition[]
await handleToolCall(registry, 'grid_describe', {});   // { success, data | error }
```

`createJsonRpcHandler(registry)` gives you the MCP request/response mapping
over any transport you like (WebSocket, HTTP, in-memory tests).

## Documentation

[Guide](https://gridstorm.tekivex.com/#/docs/guides/mcp-server) | [GitHub](https://github.com/007krcs/grid-data)

## License

MIT
