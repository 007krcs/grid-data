// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

export type ToolHandler = (input: Record<string, any>) => ToolResult | Promise<ToolResult>;

export interface MCPServerConfig {
  name?: string;
  version?: string;
  gridApi?: any;  // GridApi instance
  pdfApi?: any;   // PdfApi instance
}

export interface MCPToolRegistry {
  tools: ToolDefinition[];
  handlers: Record<string, ToolHandler>;
}
