import type { MCPServerConfig, MCPToolRegistry, ToolDefinition, ToolResult } from './types';
import { createGridTools } from './tools/grid-tools';
import { createPdfTools } from './tools/pdf-tools';
import { createAiTools } from './tools/ai-tools';

export function createMCPServer(config: MCPServerConfig = {}): MCPToolRegistry {
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

  return { tools, handlers };
}

export function handleToolCall(
  registry: MCPToolRegistry,
  toolName: string,
  input: Record<string, any>,
): ToolResult | Promise<ToolResult> {
  const handler = registry.handlers[toolName];
  if (!handler) {
    return { success: false, error: `Unknown tool: ${toolName}` };
  }
  try {
    return handler(input);
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function listTools(registry: MCPToolRegistry): ToolDefinition[] {
  return registry.tools;
}
