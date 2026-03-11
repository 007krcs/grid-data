import { describe, it, expect } from 'vitest';
import {
  createMCPServer,
  handleToolCall,
  listTools,
  createGridTools,
  createPdfTools,
  createAiTools,
} from '../index';
import type { MCPToolRegistry, ToolDefinition } from '../types';

describe('MCP Server', () => {
  describe('createMCPServer', () => {
    it('should return a registry with tools and handlers', () => {
      const registry = createMCPServer();
      expect(registry).toBeDefined();
      expect(registry.tools).toBeInstanceOf(Array);
      expect(registry.handlers).toBeDefined();
      expect(typeof registry.handlers).toBe('object');
    });

    it('should include grid, PDF, and AI tools', () => {
      const registry = createMCPServer();
      const toolNames = registry.tools.map((t) => t.name);

      // Grid tools
      expect(toolNames).toContain('grid_create');
      expect(toolNames).toContain('grid_sort');
      expect(toolNames).toContain('grid_filter');
      expect(toolNames).toContain('grid_export_csv');
      expect(toolNames).toContain('grid_get_data');
      expect(toolNames).toContain('grid_aggregate');

      // PDF tools
      expect(toolNames).toContain('pdf_load');
      expect(toolNames).toContain('pdf_extract_text');
      expect(toolNames).toContain('pdf_search');
      expect(toolNames).toContain('pdf_annotate');
      expect(toolNames).toContain('pdf_redact');
      expect(toolNames).toContain('pdf_save');
      expect(toolNames).toContain('pdf_get_metadata');

      // AI tools
      expect(toolNames).toContain('pdf_detect_pii');
      expect(toolNames).toContain('pdf_classify');
      expect(toolNames).toContain('pdf_summarize');
      expect(toolNames).toContain('pdf_extract_fields');
    });
  });

  describe('tool definitions', () => {
    it('should have name, description, and inputSchema for every tool', () => {
      const registry = createMCPServer();
      for (const tool of registry.tools) {
        expect(tool.name).toBeDefined();
        expect(typeof tool.name).toBe('string');
        expect(tool.name.length).toBeGreaterThan(0);

        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
        expect(tool.description.length).toBeGreaterThan(0);

        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.inputSchema).toBe('object');
      }
    });

    it('should have a corresponding handler for every tool definition', () => {
      const registry = createMCPServer();
      for (const tool of registry.tools) {
        expect(registry.handlers[tool.name]).toBeDefined();
        expect(typeof registry.handlers[tool.name]).toBe('function');
      }
    });

    it('should not have handlers without corresponding tool definitions', () => {
      const registry = createMCPServer();
      const toolNames = new Set(registry.tools.map((t) => t.name));
      for (const handlerName of Object.keys(registry.handlers)) {
        expect(toolNames.has(handlerName)).toBe(true);
      }
    });
  });

  describe('handleToolCall', () => {
    let registry: MCPToolRegistry;

    beforeEach(() => {
      registry = createMCPServer();
    });

    it('should return success for a valid tool call', () => {
      const result = handleToolCall(registry, 'grid_create', {
        columns: [{ field: 'name', headerName: 'Name' }],
        rowData: [{ name: 'Alice' }],
      });
      expect(result).toEqual({
        success: true,
        data: { message: 'Grid created', columns: 1, rows: 1 },
      });
    });

    it('should return error for an unknown tool', () => {
      const result = handleToolCall(registry, 'nonexistent_tool', {});
      expect(result).toEqual({
        success: false,
        error: 'Unknown tool: nonexistent_tool',
      });
    });

    it('should handle tool errors gracefully', () => {
      // Override a handler to throw
      registry.handlers['grid_create'] = () => {
        throw new Error('Simulated failure');
      };
      const result = handleToolCall(registry, 'grid_create', {});
      expect(result).toEqual({
        success: false,
        error: 'Simulated failure',
      });
    });

    it('should handle non-Error throws gracefully', () => {
      registry.handlers['grid_create'] = () => {
        throw 'string error';
      };
      const result = handleToolCall(registry, 'grid_create', {});
      expect(result).toEqual({
        success: false,
        error: 'string error',
      });
    });
  });

  describe('listTools', () => {
    it('should return all tool definitions', () => {
      const registry = createMCPServer();
      const tools = listTools(registry);
      expect(tools).toBe(registry.tools);
      expect(tools.length).toBe(registry.tools.length);
    });

    it('should return ToolDefinition objects', () => {
      const registry = createMCPServer();
      const tools = listTools(registry);
      for (const tool of tools) {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
      }
    });
  });

  describe('grid tool handlers', () => {
    it('grid_create should return column and row counts', () => {
      const { handlers } = createGridTools();
      const result = handlers.grid_create!({
        columns: [{ field: 'a' }, { field: 'b' }, { field: 'c' }],
        rowData: [{ a: 1 }, { a: 2 }],
      });
      expect(result).toEqual({
        success: true,
        data: { message: 'Grid created', columns: 3, rows: 2 },
      });
    });

    it('grid_sort should return the sort model', () => {
      const { handlers } = createGridTools();
      const sortModel = [{ colId: 'name', sort: 'asc' }];
      const result = handlers.grid_sort!({ sortModel });
      expect(result).toEqual({
        success: true,
        data: { message: 'Sort applied', sortModel },
      });
    });

    it('grid_filter should return the filter model', () => {
      const { handlers } = createGridTools();
      const filterModel = { name: { type: 'contains', filter: 'test' } };
      const result = handlers.grid_filter!({ filterModel });
      expect(result).toEqual({
        success: true,
        data: { message: 'Filter applied', filterModel },
      });
    });

    it('grid_export_csv should use default fileName if not provided', () => {
      const { handlers } = createGridTools();
      const result = handlers.grid_export_csv!({});
      expect(result).toEqual({
        success: true,
        data: { message: 'CSV export initiated', fileName: 'export.csv' },
      });
    });

    it('grid_export_csv should use provided fileName', () => {
      const { handlers } = createGridTools();
      const result = handlers.grid_export_csv!({ fileName: 'my-data.csv' });
      expect(result).toEqual({
        success: true,
        data: { message: 'CSV export initiated', fileName: 'my-data.csv' },
      });
    });

    it('grid_get_data should return pagination defaults', () => {
      const { handlers } = createGridTools();
      const result = handlers.grid_get_data!({});
      expect(result).toEqual({
        success: true,
        data: { rows: [], total: 0, page: 0, pageSize: 100 },
      });
    });

    it('grid_get_data should respect provided pagination', () => {
      const { handlers } = createGridTools();
      const result = handlers.grid_get_data!({ page: 2, pageSize: 25 });
      expect(result).toEqual({
        success: true,
        data: { rows: [], total: 0, page: 2, pageSize: 25 },
      });
    });

    it('grid_aggregate should return aggregation result', () => {
      const { handlers } = createGridTools();
      const result = handlers.grid_aggregate!({ columnId: 'price', function: 'sum' });
      expect(result).toEqual({
        success: true,
        data: { columnId: 'price', function: 'sum', result: 0 },
      });
    });
  });

  describe('PDF tool handlers', () => {
    it('pdf_load should return source', () => {
      const { handlers } = createPdfTools();
      const result = handlers.pdf_load!({ source: '/path/to/file.pdf' });
      expect(result).toEqual({
        success: true,
        data: { message: 'PDF loaded', source: '/path/to/file.pdf' },
      });
    });

    it('pdf_extract_text should return default values', () => {
      const { handlers } = createPdfTools();
      const result = handlers.pdf_extract_text!({});
      expect(result).toEqual({
        success: true,
        data: { text: '', pageIndex: null, allPages: false },
      });
    });

    it('pdf_extract_text should use provided pageIndex', () => {
      const { handlers } = createPdfTools();
      const result = handlers.pdf_extract_text!({ pageIndex: 3, allPages: true });
      expect(result).toEqual({
        success: true,
        data: { text: '', pageIndex: 3, allPages: true },
      });
    });

    it('pdf_search should return query and empty matches', () => {
      const { handlers } = createPdfTools();
      const result = handlers.pdf_search!({ query: 'hello' });
      expect(result).toEqual({
        success: true,
        data: { query: 'hello', matches: [], totalMatches: 0 },
      });
    });

    it('pdf_annotate should return annotation details', () => {
      const { handlers } = createPdfTools();
      const result = handlers.pdf_annotate!({ pageIndex: 0, type: 'highlight', rect: [10, 20, 100, 40] });
      expect(result).toEqual({
        success: true,
        data: { message: 'Annotation added', pageIndex: 0, type: 'highlight', rect: [10, 20, 100, 40] },
      });
    });

    it('pdf_redact should return redaction details', () => {
      const { handlers } = createPdfTools();
      const result = handlers.pdf_redact!({ pageIndex: 1, rect: [50, 60, 200, 80] });
      expect(result).toEqual({
        success: true,
        data: { message: 'Redaction applied', pageIndex: 1, rect: [50, 60, 200, 80] },
      });
    });

    it('pdf_save should use default fileName if not provided', () => {
      const { handlers } = createPdfTools();
      const result = handlers.pdf_save!({});
      expect(result).toEqual({
        success: true,
        data: { message: 'PDF saved', fileName: 'output.pdf' },
      });
    });

    it('pdf_get_metadata should return empty metadata', () => {
      const { handlers } = createPdfTools();
      const result = handlers.pdf_get_metadata!({});
      expect(result).toEqual({
        success: true,
        data: { title: '', author: '', pages: 0, createdAt: null, modifiedAt: null },
      });
    });
  });

  describe('AI tool handlers', () => {
    it('pdf_detect_pii should return default detection settings', () => {
      const { handlers } = createAiTools();
      const result = handlers.pdf_detect_pii!({});
      expect(result).toEqual({
        success: true,
        data: { detections: [], pageIndex: null, types: [], threshold: 0.8 },
      });
    });

    it('pdf_detect_pii should use provided settings', () => {
      const { handlers } = createAiTools();
      const result = handlers.pdf_detect_pii!({ pageIndex: 2, types: ['email', 'ssn'], threshold: 0.9 });
      expect(result).toEqual({
        success: true,
        data: { detections: [], pageIndex: 2, types: ['email', 'ssn'], threshold: 0.9 },
      });
    });

    it('pdf_classify should return default topN', () => {
      const { handlers } = createAiTools();
      const result = handlers.pdf_classify!({});
      expect(result).toEqual({
        success: true,
        data: { classifications: [], topN: 3 },
      });
    });

    it('pdf_classify should use provided topN', () => {
      const { handlers } = createAiTools();
      const result = handlers.pdf_classify!({ topN: 5 });
      expect(result).toEqual({
        success: true,
        data: { classifications: [], topN: 5 },
      });
    });

    it('pdf_summarize should return default maxLength', () => {
      const { handlers } = createAiTools();
      const result = handlers.pdf_summarize!({});
      expect(result).toEqual({
        success: true,
        data: { summary: '', maxLength: 500 },
      });
    });

    it('pdf_summarize should use provided maxLength', () => {
      const { handlers } = createAiTools();
      const result = handlers.pdf_summarize!({ maxLength: 1000 });
      expect(result).toEqual({
        success: true,
        data: { summary: '', maxLength: 1000 },
      });
    });

    it('pdf_extract_fields should return empty extracted object', () => {
      const { handlers } = createAiTools();
      const result = handlers.pdf_extract_fields!({});
      expect(result).toEqual({
        success: true,
        data: { fields: [], extracted: {} },
      });
    });

    it('pdf_extract_fields should return provided fields', () => {
      const { handlers } = createAiTools();
      const result = handlers.pdf_extract_fields!({ fields: ['name', 'date', 'amount'] });
      expect(result).toEqual({
        success: true,
        data: { fields: ['name', 'date', 'amount'], extracted: {} },
      });
    });
  });

  describe('tool count integrity', () => {
    it('should have exactly 6 grid tools', () => {
      const { definitions } = createGridTools();
      expect(definitions).toHaveLength(6);
    });

    it('should have exactly 7 PDF tools', () => {
      const { definitions } = createPdfTools();
      expect(definitions).toHaveLength(7);
    });

    it('should have exactly 4 AI tools', () => {
      const { definitions } = createAiTools();
      expect(definitions).toHaveLength(4);
    });

    it('should have 17 total tools in the registry', () => {
      const registry = createMCPServer();
      expect(registry.tools).toHaveLength(17);
      expect(Object.keys(registry.handlers)).toHaveLength(17);
    });
  });
});
