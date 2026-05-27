// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.

/**
 * Classification of an MCP tool's effect on grid state and data egress.
 * The server uses this taxonomy to enforce per-deployment permissions:
 *   - `read`     — pure reads (e.g. paginated row retrieval, aggregation).
 *                  Always allowed.
 *   - `mutation` — alters in-memory grid state (create, sort, filter,
 *                  PDF annotate/redact/save). Disabled by default.
 *   - `export`   — reads data and returns it to the caller in a transferable
 *                  form (e.g. CSV string). Allowed by default but separately
 *                  gateable for data-exfil-sensitive deployments.
 */
export type ToolKind = 'read' | 'mutation' | 'export';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  /** Effect category. Used by the permission gate. */
  kind: ToolKind;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

export type ToolHandler = (input: Record<string, any>) => ToolResult | Promise<ToolResult>;

/**
 * Audit event fired for every tool invocation, whether allowed or denied.
 * Wire this to your application's logging / SIEM pipeline — without it the
 * MCP server has no traceability for what an LLM agent asked it to do.
 */
export interface ToolCallEvent {
  tool: string;
  kind: ToolKind | 'unknown';
  allowed: boolean;
  denyReason?: string;
  timestamp: number;
  /**
   * Top-level input keys only (not values). Surfaces the shape of the request
   * without leaking potentially sensitive cell content into the audit trail.
   */
  inputKeys: string[];
}

/**
 * Server-wide security knobs. All fields are optional; defaults are chosen
 * to fail closed (mutations off, length-capped, audit-on-stderr).
 */
export interface MCPPermissions {
  /**
   * Allow tools whose `kind` is `'mutation'` (e.g. grid_create, grid_sort,
   * grid_filter, pdf_annotate, pdf_redact). Default: `false`.
   *
   * The CommandBus inside the grid has no permission model of its own — it
   * broadcasts every command to every handler. Exposing mutation tools to an
   * LLM agent without an external authorization layer effectively makes the
   * agent an unauthenticated admin. Keep this off unless the agent is fully
   * trusted (e.g. local-only dev tooling).
   */
  allowMutations: boolean;

  /**
   * Allow tools whose `kind` is `'export'` (e.g. grid_export_csv, pdf_save).
   * Default: `true`. Exports return grid/document content to the caller and
   * are a data-egress vector — disable for deployments where the agent must
   * not be able to exfiltrate row data wholesale.
   */
  allowExport: boolean;

  /**
   * Hard cap on the length of any single string anywhere in a tool's input
   * payload. Strings longer than this cause the tool call to be rejected
   * before the handler runs. Default: `10_000`.
   *
   * This is a coarse defense against pathological inputs (e.g. a multi-MB
   * `gridId` that triggers expensive logging or storage allocation). It is
   * NOT a substitute for per-field schema validation, which still needs
   * tightening in the schemas module.
   */
  maxStringInput: number;

  /**
   * Audit callback fired for every tool invocation. Receives a
   * {@link ToolCallEvent} describing what was asked and whether it was
   * allowed. Throwing from this callback is caught and logged — the audit
   * hook must not break the tool pipeline.
   */
  onToolCall?: (event: ToolCallEvent) => void;

  /**
   * Suppress the one-time `console.warn` printed by `createMCPServer` that
   * flags the server as experimental and security-sensitive. Set this only
   * in production builds where you have already done the threat-model
   * review and configured permissions explicitly.
   */
  suppressExperimentalWarning?: boolean;
}

export interface MCPServerConfig {
  name?: string;
  version?: string;
  gridApi?: any;  // GridApi instance
  pdfApi?: any;   // PdfApi instance
  /**
   * Security knobs. Merged with safe defaults. See {@link MCPPermissions} for
   * the threat model and recommended deployment patterns.
   */
  permissions?: Partial<MCPPermissions>;
}

export interface MCPToolRegistry {
  tools: ToolDefinition[];
  handlers: Record<string, ToolHandler>;
  /** Resolved permissions in effect for this registry. */
  permissions: MCPPermissions;
}
