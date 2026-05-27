// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
import type {
  MCPPermissions,
  MCPServerConfig,
  MCPToolRegistry,
  ToolCallEvent,
  ToolDefinition,
  ToolKind,
  ToolResult,
} from './types';
import { createGridTools } from './tools/grid-tools';
import { createPdfTools } from './tools/pdf-tools';
import { createAiTools } from './tools/ai-tools';

// ─── Defaults: fail closed ───
//
// Mutations are off by default because the underlying GridStorm CommandBus has
// no permission model — it broadcasts every command to every handler. Exposing
// mutation tools to an LLM agent without an external authorization layer would
// turn the agent into an unauthenticated admin.
const DEFAULT_PERMISSIONS: MCPPermissions = {
  allowMutations: false,
  allowExport: true,
  maxStringInput: 10_000,
};

function resolvePermissions(partial?: Partial<MCPPermissions>): MCPPermissions {
  return { ...DEFAULT_PERMISSIONS, ...(partial ?? {}) };
}

/**
 * Walk an input payload and return the first string longer than `max`, if any.
 * Returns the JSON path of the offending field (e.g. "rowData[3].name") to
 * make denials debuggable. Safe against cycles via a Set guard.
 */
function findOversizedString(
  value: unknown,
  max: number,
  path = '',
  seen = new WeakSet<object>(),
): { path: string; length: number } | null {
  if (typeof value === 'string') {
    if (value.length > max) {
      return { path: path || '<root>', length: value.length };
    }
    return null;
  }
  if (value === null || typeof value !== 'object') return null;
  if (seen.has(value as object)) return null;
  seen.add(value as object);

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const hit = findOversizedString(value[i], max, `${path}[${i}]`, seen);
      if (hit) return hit;
    }
    return null;
  }
  for (const [k, v] of Object.entries(value)) {
    const subPath = path ? `${path}.${k}` : k;
    const hit = findOversizedString(v, max, subPath, seen);
    if (hit) return hit;
  }
  return null;
}

function emitAudit(perms: MCPPermissions, ev: ToolCallEvent): void {
  if (!perms.onToolCall) return;
  try {
    perms.onToolCall(ev);
  } catch (err) {
    // The audit hook MUST NOT break the tool pipeline. Surface the error to
    // stderr but otherwise swallow it.
    console.error('[GridStorm MCP] onToolCall callback threw:', err);
  }
}

let experimentalWarningShown = false;
function maybeShowExperimentalWarning(perms: MCPPermissions): void {
  if (perms.suppressExperimentalWarning) return;
  if (experimentalWarningShown) return;
  experimentalWarningShown = true;
  console.warn(
    '[GridStorm MCP] The MCP server is experimental and security-sensitive.\n' +
      '  • Mutations are DISABLED by default (allowMutations=false).\n' +
      '  • There is no per-client authorization layer; every connected MCP\n' +
      '    client gets the full enabled tool surface.\n' +
      '  • Cell data egressed via grid_export_csv / grid_get_data is NOT\n' +
      '    sanitized for prompt-injection — treat cell content as untrusted\n' +
      '    when piping it back into LLM context.\n' +
      '  Suppress this warning via permissions.suppressExperimentalWarning\n' +
      '  AFTER you have reviewed the threat model in SECURITY.md.',
  );
}

export function createMCPServer(config: MCPServerConfig = {}): MCPToolRegistry {
  const permissions = resolvePermissions(config.permissions);
  maybeShowExperimentalWarning(permissions);

  const gridTools = createGridTools();
  const pdfTools = createPdfTools();
  const aiTools = createAiTools();

  // If a gridApi was provided via config, it can be used for future extensions.
  // The grid tools maintain their own engine instance via context.
  if (config.gridApi) {
    // Reserved for external grid API injection
  }

  const tools: ToolDefinition[] = [
    ...gridTools.definitions,
    ...pdfTools.definitions,
    ...aiTools.definitions,
  ];

  const handlers = {
    ...gridTools.handlers,
    ...pdfTools.handlers,
    ...aiTools.handlers,
  };

  return { tools, handlers, permissions };
}

export async function handleToolCall(
  registry: MCPToolRegistry,
  toolName: string,
  input: Record<string, any>,
): Promise<ToolResult> {
  const def = registry.tools.find((t) => t.name === toolName);
  const handler = registry.handlers[toolName];
  const perms = registry.permissions;
  const now = Date.now();
  const inputKeys = input && typeof input === 'object' ? Object.keys(input) : [];

  const audit = (event: Omit<ToolCallEvent, 'tool' | 'timestamp' | 'inputKeys'>) =>
    emitAudit(perms, {
      tool: toolName,
      timestamp: now,
      inputKeys,
      ...event,
    });

  if (!handler || !def) {
    audit({ kind: 'unknown', allowed: false, denyReason: 'unknown tool' });
    return { success: false, error: `Unknown tool: ${toolName}` };
  }

  // Permission gate. Reads pass; mutations and exports check their flags.
  const kind: ToolKind = def.kind;
  if (kind === 'mutation' && !perms.allowMutations) {
    audit({
      kind,
      allowed: false,
      denyReason:
        'mutation tools are disabled (set permissions.allowMutations=true to enable)',
    });
    return {
      success: false,
      error:
        `Tool '${toolName}' is a mutation and mutations are disabled. ` +
        `Set permissions.allowMutations=true on createMCPServer to enable.`,
    };
  }
  if (kind === 'export' && !perms.allowExport) {
    audit({
      kind,
      allowed: false,
      denyReason:
        'export tools are disabled (set permissions.allowExport=true to enable)',
    });
    return {
      success: false,
      error:
        `Tool '${toolName}' is an export and exports are disabled. ` +
        `Set permissions.allowExport=true on createMCPServer to enable.`,
    };
  }

  // Input length cap. Defends against pathological payloads (multi-MB gridId,
  // etc.) before they reach handler code. Not a substitute for per-field
  // schema validation, which lives in schemas.ts.
  const oversized = findOversizedString(input, perms.maxStringInput);
  if (oversized) {
    audit({
      kind,
      allowed: false,
      denyReason: `input string at ${oversized.path} exceeds maxStringInput (${oversized.length} > ${perms.maxStringInput})`,
    });
    return {
      success: false,
      error: `Input field '${oversized.path}' is ${oversized.length} chars long, exceeding the configured maxStringInput of ${perms.maxStringInput}.`,
    };
  }

  audit({ kind, allowed: true });

  try {
    return await handler(input);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function listTools(registry: MCPToolRegistry): ToolDefinition[] {
  return registry.tools;
}

/**
 * Test-only. Reset the module-scoped flag that suppresses the experimental
 * warning after first display. Real applications do not need to call this.
 *
 * @internal
 */
export function __resetExperimentalWarningForTests(): void {
  experimentalWarningShown = false;
}
