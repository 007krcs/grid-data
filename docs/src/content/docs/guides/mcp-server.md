---
title: MCP Server
description: Expose GridStorm grid and PDF operations to AI agents via the Model Context Protocol (MCP) server.
---

The `@gridstorm/mcp-server` package exposes GridStorm's grid, PDF, and AI capabilities as tools that AI agents can invoke through the Model Context Protocol. This lets Claude, GPT, and other AI assistants create grids, sort and filter data, export CSV files, and run aggregations without writing code.

## Installation

```bash title="Install the MCP server"
pnpm add @gridstorm/mcp-server
```

## Quick Start

```typescript title="Create and use the MCP server"
import { createMCPServer, handleToolCall, listTools } from '@gridstorm/mcp-server';

// Create the server registry
const server = createMCPServer();

// List all available tools
const tools = listTools(server);
console.log(tools.map(t => t.name));

// Handle a tool call from an AI agent
const result = await handleToolCall(server, 'grid_create', {
  columns: [
    { field: 'name', headerName: 'Name' },
    { field: 'revenue', headerName: 'Revenue' },
  ],
  rowData: [
    { name: 'Acme Corp', revenue: 50000 },
    { name: 'Globex', revenue: 75000 },
    { name: 'Initech', revenue: 30000 },
  ],
});
```

## Server Configuration

```typescript title="MCPServerConfig"
interface MCPServerConfig {
  name?: string;      // Server name identifier
  version?: string;   // Server version string
  gridApi?: any;      // External GridApi instance (reserved)
  pdfApi?: any;       // External PdfApi instance (reserved)
}
```

## Grid Tools

These tools are fully functional and operate on in-memory grid engine instances.

### grid_create

Create a new data grid with columns and row data.

```json title="Input schema"
{
  "columns": [
    { "field": "name", "headerName": "Name", "width": 200 },
    { "field": "price", "headerName": "Price" }
  ],
  "rowData": [
    { "name": "Widget A", "price": 29.99 },
    { "name": "Widget B", "price": 49.99 }
  ],
  "gridId": "my-grid"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `columns` | `array` | yes | Column definitions with `field`, `headerName`, and optional `width` |
| `rowData` | `array` | yes | Array of row data objects |
| `gridId` | `string` | no | Grid identifier (default: `'default'`) |

### grid_sort

Apply sorting to a grid by one or more columns.

```json title="Input schema"
{
  "sortModel": [
    { "colId": "price", "sort": "desc" }
  ],
  "gridId": "my-grid"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sortModel` | `array` | yes | Sort entries with `colId` and `sort` (`'asc'` or `'desc'`) |
| `gridId` | `string` | no | Target grid ID |

### grid_filter

Apply filters to grid data.

```json title="Input schema"
{
  "filterModel": {
    "price": { "type": "greaterThan", "filter": 30 }
  },
  "gridId": "my-grid"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `filterModel` | `object` | yes | Filter model keyed by column ID |
| `gridId` | `string` | no | Target grid ID |

### grid_get_data

Get filtered and sorted grid data with pagination.

```json title="Input schema"
{
  "pageSize": 50,
  "page": 0,
  "gridId": "my-grid"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `pageSize` | `number` | no | Rows per page (default: 100) |
| `page` | `number` | no | Page number, 0-indexed (default: 0) |
| `gridId` | `string` | no | Target grid ID |

### grid_aggregate

Compute an aggregation function on a column.

```json title="Input schema"
{
  "columnId": "revenue",
  "function": "sum",
  "gridId": "my-grid"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `columnId` | `string` | yes | Column to aggregate |
| `function` | `string` | yes | One of: `sum`, `avg`, `min`, `max`, `count` |
| `gridId` | `string` | no | Target grid ID |

### grid_export_csv

Export grid data to CSV format.

```json title="Input schema"
{
  "fileName": "report.csv",
  "columnKeys": ["name", "revenue"],
  "gridId": "my-grid"
}
```

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `fileName` | `string` | no | Output file name (default: `'export.csv'`) |
| `columnKeys` | `string[]` | no | Columns to include (default: all visible) |
| `gridId` | `string` | no | Target grid ID |

## Multi-Grid Sessions

The MCP server supports multiple simultaneous grid instances identified by `gridId`. Each tool accepts an optional `gridId` parameter.

- If `gridId` is omitted, the `'default'` grid is used.
- Creating a grid with an existing `gridId` destroys the previous instance.
- Maximum **50 grids** can exist simultaneously.
- When the limit is reached, the oldest grid is evicted (LRU policy).

```typescript title="Working with multiple grids"
// Create two separate grids
await handleToolCall(server, 'grid_create', {
  gridId: 'sales',
  columns: [{ field: 'region' }, { field: 'amount' }],
  rowData: salesData,
});

await handleToolCall(server, 'grid_create', {
  gridId: 'inventory',
  columns: [{ field: 'sku' }, { field: 'stock' }],
  rowData: inventoryData,
});

// Sort each independently
await handleToolCall(server, 'grid_sort', {
  gridId: 'sales',
  sortModel: [{ colId: 'amount', sort: 'desc' }],
});

await handleToolCall(server, 'grid_aggregate', {
  gridId: 'inventory',
  columnId: 'stock',
  function: 'sum',
});
```

## PDF Tools (Planned)

The server defines PDF tool schemas but requires a configured `PdfParser` backend to function. The following tools return a configuration hint until a parser is provided:

| Tool | Description | Status |
|------|-------------|--------|
| `pdf_load` | Load a PDF from a file path or URL | Planned |
| `pdf_extract_text` | Extract text from PDF pages | Planned |
| `pdf_search` | Search for text within a loaded PDF | Planned |
| `pdf_annotate` | Add annotations to PDF pages | Planned |
| `pdf_redact` | Redact sensitive content regions | Planned |
| `pdf_save` | Save the modified PDF | Planned |
| `pdf_get_metadata` | Get document metadata | Planned |

## AI Tools (Planned)

AI-powered PDF analysis tools that combine the PDF engine with ML backends:

| Tool | Description | Status |
|------|-------------|--------|
| `pdf_detect_pii` | Detect PII in PDF pages | Planned |
| `pdf_classify` | Classify the document type | Planned |
| `pdf_summarize` | Generate a document summary | Planned |
| `pdf_extract_fields` | Extract structured field values | Planned |

## Tool Response Format

Every tool returns a `ToolResult` object:

```typescript title="ToolResult structure"
interface ToolResult {
  success: boolean;
  data?: any;     // Tool-specific response data
  error?: string; // Error message if success is false
}
```

Successful grid operations return contextual data:

```json title="Example: grid_create response"
{
  "success": true,
  "data": {
    "message": "Grid created",
    "gridId": "sales",
    "columns": 3,
    "rows": 150
  }
}
```

```json title="Example: grid_aggregate response"
{
  "success": true,
  "data": {
    "columnId": "revenue",
    "function": "sum",
    "result": 155000,
    "count": 3
  }
}
```

## Usage with Claude

To use the GridStorm MCP server with Claude or another AI assistant, register the tools in your MCP configuration:

```typescript title="Register with an MCP host"
import { createMCPServer, handleToolCall } from '@gridstorm/mcp-server';

const server = createMCPServer({ name: 'gridstorm', version: '1.0.0' });

// Register tool definitions with your MCP host
for (const tool of server.tools) {
  mcpHost.registerTool({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    handler: (input) => handleToolCall(server, tool.name, input),
  });
}
```

An AI agent can then perform data analysis tasks conversationally:

1. "Create a grid from this sales data"
2. "Sort by revenue descending"
3. "Filter to only show Q4 results"
4. "What is the average revenue?"
5. "Export the filtered data as CSV"

## Next Steps

- [PDF Toolkit](/guides/pdf-toolkit) -- Learn about the PDF engine that powers the planned PDF tools
- [Integration Guide](/guides/integration-guide) -- Add GridStorm to your existing project
- [Custom Plugins](/guides/custom-plugins) -- Extend grid and PDF functionality with plugins
