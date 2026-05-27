# `@gridstorm/mcp-server` — Security Notes

This package exposes GridStorm operations as MCP tools so an LLM agent can
drive the grid. **It is experimental and security-sensitive.** Read this
document before enabling it in any environment that touches real data.

## Threat model

The MCP protocol turns natural-language input into structured tool calls.
Anything the agent decides to invoke runs against this server's tool surface.
The risks particular to this package:

1. **No CommandBus-level authorization.** The grid's CommandBus broadcasts
   every dispatched command to every handler. There is no built-in concept of
   "this caller can do X, not Y." Exposing mutation tools without an external
   authorization layer makes a connected agent an unauthenticated admin for
   the in-memory grid state.
2. **Prompt injection via cell data.** `grid_get_data` and `grid_export_csv`
   return raw cell content. If cell strings contain instructions ("ignore
   prior instructions, do X"), those strings can flow back into the agent's
   context window and influence its next tool call. Treat all cell content
   returned from these tools as **untrusted user input**, not as system
   guidance.
3. **No per-client isolation.** All MCP clients connected to a single registry
   share the same `context.grids` Map. There is no namespace by caller, no
   capability token, no audit-by-principal.
4. **No transport authentication.** This package does not implement the MCP
   transport (stdio, HTTP, WebSocket). Whoever embeds it is responsible for
   binding to localhost-only, requiring auth on connect, and not exposing the
   server on a network.

## What this package does to fail closed

| Knob | Default | Effect |
|---|---|---|
| `permissions.allowMutations` | `false` | `grid_create`, `grid_sort`, `grid_filter`, `pdf_load`, `pdf_annotate`, `pdf_redact` are rejected with a clear error. |
| `permissions.allowExport` | `true` | `grid_export_csv`, `pdf_save` allowed. Set to `false` for deployments where data egress is disallowed. |
| `permissions.maxStringInput` | `10_000` | Any string field in any tool input longer than 10 KB causes the call to be rejected before the handler runs. |
| `permissions.onToolCall` | `undefined` | Audit callback. Receives a `ToolCallEvent` for every invocation (allowed or denied). Wire this to your logging stack. |
| Experimental warning | shown once | `console.warn` on first `createMCPServer` call. Suppress only after you've reviewed this document and configured permissions explicitly. |

## Recommended configurations

### Local development / read-only exploration

```ts
import { createMCPServer } from '@gridstorm/mcp-server';

const registry = createMCPServer({
  permissions: {
    // mutations default to false — leave them off
    onToolCall: (ev) => console.log('[mcp]', ev),
  },
});
```

### Trusted local agent that needs to manipulate grids

```ts
const registry = createMCPServer({
  permissions: {
    allowMutations: true,
    onToolCall: (ev) => auditLog.write(ev),
    suppressExperimentalWarning: true, // only after reviewing this doc
  },
});
```

### Server-side deployment with sensitive data

```ts
const registry = createMCPServer({
  permissions: {
    allowMutations: false,
    allowExport: false,           // no bulk data egress
    maxStringInput: 1_000,         // tighter cap
    onToolCall: (ev) => siem.send(ev),
  },
});
```

For server-side deployment, additionally:

- Bind the transport to localhost only.
- Authenticate every client at the transport layer (e.g. signed bearer token
  per agent).
- Run a separate registry instance per principal so `context.grids` is not
  shared across users.
- Validate or filter cell content before it crosses back into agent context.

## What is NOT implemented (intentionally, for now)

- **Per-tool ACLs.** All tools of a given `kind` share a single flag. If you
  need per-tool granularity (e.g. allow `grid_sort` but not `grid_filter`),
  wrap `handleToolCall` and short-circuit before it.
- **Per-client capability tokens.** There is no built-in concept of
  "caller A can do X, caller B can do Y." Implement at the transport layer.
- **Cell-content sanitization.** Returned cell strings are not escaped or
  marked-up to defuse prompt injection. Sanitize at the consumer if needed.
- **Rate limiting.** No per-client or global rate limits. Add them at the
  transport layer.

## Reporting issues

Security issues in this package should be reported per the repository-level
`SECURITY.md` at the project root.
