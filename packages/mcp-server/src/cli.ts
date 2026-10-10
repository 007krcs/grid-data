// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
//
// ─── `gridstorm-mcp` — standalone stdio MCP server ──────────────────────────
//
// Runs GridStorm as an MCP server any host can launch:
//
//   { "mcpServers": { "gridstorm": { "command": "npx", "args": ["-y", "@gridstorm/mcp-server"] } } }
//
// The standalone server holds no application data: the only grids that exist
// are the ones the agent creates with grid_create. Because of that, mutations
// are ENABLED by default here (otherwise the server could do nothing). Pass
// `--read-only` to keep the library's fail-closed default, and `--no-export`
// to disable CSV egress. To expose a live application grid instead, embed the
// library (`createMCPServer({ grids })` + `serveStdio`) in your own process.

import { createMCPServer } from './server';
import { serveStdio } from './stdio';

const args = new Set(process.argv.slice(2));

if (args.has('--help') || args.has('-h')) {
  process.stderr.write(
    [
      'gridstorm-mcp — GridStorm Model Context Protocol server (stdio)',
      '',
      'Options:',
      '  --read-only   Disable mutation tools (grid_create, grid_sort, grid_filter, grid_update_rows)',
      '  --no-export   Disable export tools (grid_export_csv)',
      '  --quiet       Suppress the one-time experimental warning',
      '  -h, --help    Show this help',
      '',
    ].join('\n'),
  );
  process.exit(0);
}

const registry = createMCPServer({
  name: 'gridstorm',
  version: '0.1.4',
  permissions: {
    allowMutations: !args.has('--read-only'),
    allowExport: !args.has('--no-export'),
    suppressExperimentalWarning: args.has('--quiet'),
    onToolCall: (ev) => {
      if (!ev.allowed) process.stderr.write(`[gridstorm-mcp] denied ${ev.tool}: ${ev.denyReason}\n`);
    },
  },
});

serveStdio(registry).then(
  () => process.exit(0),
  (err) => {
    process.stderr.write(`[gridstorm-mcp] fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
    process.exit(1);
  },
);
