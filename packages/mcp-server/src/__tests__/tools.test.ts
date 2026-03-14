import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMCPServer,
  handleToolCall,
  listTools,
  createGridTools,
  createPdfTools,
  createAiTools,
} from '../index';
import type { MCPToolRegistry } from '../types';

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

    it('should return success for a valid grid_create call', () => {
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

  describe('grid tool handlers — real engine integration', () => {
    it('grid_create should create a real grid engine', () => {
      const { handlers } = createGridTools();
      const result = handlers.grid_create!({
        columns: [{ field: 'a' }, { field: 'b' }, { field: 'c' }],
        rowData: [{ a: 1, b: 2, c: 3 }, { a: 4, b: 5, c: 6 }],
      });
      expect(result).toEqual({
        success: true,
        data: { message: 'Grid created', columns: 3, rows: 2 },
      });
    });

    it('grid_sort should require grid_create first', () => {
      const { handlers } = createGridTools();
      const result = handlers.grid_sort!({ sortModel: [{ colId: 'name', sort: 'asc' }] });
      expect(result).toEqual({
        success: false,
        error: 'No grid created. Call grid_create first.',
      });
    });

    it('grid_sort should apply sorting to a real engine', () => {
      const { handlers } = createGridTools();
      handlers.grid_create!({
        columns: [{ field: 'name' }],
        rowData: [{ name: 'Charlie' }, { name: 'Alice' }, { name: 'Bob' }],
      });

      const result = handlers.grid_sort!({ sortModel: [{ colId: 'name', sort: 'asc' }] });
      expect(result.success).toBe(true);
      expect(result.data.message).toBe('Sort applied');
      expect(result.data.displayedRows).toBe(3);
    });

    it('grid_filter should require grid_create first', () => {
      const { handlers } = createGridTools();
      const result = handlers.grid_filter!({ filterModel: {} });
      expect(result).toEqual({
        success: false,
        error: 'No grid created. Call grid_create first.',
      });
    });

    it('grid_filter should apply filter model to real engine', () => {
      const { handlers } = createGridTools();
      handlers.grid_create!({
        columns: [{ field: 'name' }],
        rowData: [{ name: 'Alice' }, { name: 'Bob' }, { name: 'Charlie' }],
      });

      const filterModel = { name: { filterType: 'text', type: 'contains', filter: 'li' } };
      const result = handlers.grid_filter!({ filterModel });
      expect(result.success).toBe(true);
      expect(result.data.message).toBe('Filter applied');
      // After filtering for 'li', should match 'Alice' and 'Charlie'
      expect(result.data.displayedRows).toBe(2);
    });

    it('grid_get_data should require grid_create first', () => {
      const { handlers } = createGridTools();
      const result = handlers.grid_get_data!({});
      expect(result).toEqual({
        success: false,
        error: 'No grid created. Call grid_create first.',
      });
    });

    it('grid_get_data should return actual row data', () => {
      const { handlers } = createGridTools();
      handlers.grid_create!({
        columns: [{ field: 'name' }, { field: 'age' }],
        rowData: [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }],
      });

      const result = handlers.grid_get_data!({});
      expect(result.success).toBe(true);
      expect(result.data.total).toBe(2);
      expect(result.data.rows).toHaveLength(2);
      expect(result.data.rows[0]).toEqual({ name: 'Alice', age: 30 });
      expect(result.data.rows[1]).toEqual({ name: 'Bob', age: 25 });
    });

    it('grid_get_data should respect pagination', () => {
      const { handlers } = createGridTools();
      handlers.grid_create!({
        columns: [{ field: 'id' }],
        rowData: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
      });

      const result = handlers.grid_get_data!({ page: 1, pageSize: 2 });
      expect(result.success).toBe(true);
      expect(result.data.total).toBe(5);
      expect(result.data.rows).toHaveLength(2);
      expect(result.data.rows[0]).toEqual({ id: 3 });
      expect(result.data.rows[1]).toEqual({ id: 4 });
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(2);
    });

    it('grid_aggregate should require grid_create first', () => {
      const { handlers } = createGridTools();
      const result = handlers.grid_aggregate!({ columnId: 'price', function: 'sum' });
      expect(result).toEqual({
        success: false,
        error: 'No grid created. Call grid_create first.',
      });
    });

    it('grid_aggregate should compute sum on real data', () => {
      const { handlers } = createGridTools();
      handlers.grid_create!({
        columns: [{ field: 'price' }],
        rowData: [{ price: 10 }, { price: 20 }, { price: 30 }],
      });

      const result = handlers.grid_aggregate!({ columnId: 'price', function: 'sum' });
      expect(result.success).toBe(true);
      expect(result.data.result).toBe(60);
      expect(result.data.count).toBe(3);
    });

    it('grid_aggregate should compute avg on real data', () => {
      const { handlers } = createGridTools();
      handlers.grid_create!({
        columns: [{ field: 'score' }],
        rowData: [{ score: 80 }, { score: 90 }, { score: 100 }],
      });

      const result = handlers.grid_aggregate!({ columnId: 'score', function: 'avg' });
      expect(result.success).toBe(true);
      expect(result.data.result).toBe(90);
    });

    it('grid_aggregate should compute min and max', () => {
      const { handlers } = createGridTools();
      handlers.grid_create!({
        columns: [{ field: 'val' }],
        rowData: [{ val: 5 }, { val: 1 }, { val: 9 }, { val: 3 }],
      });

      const minResult = handlers.grid_aggregate!({ columnId: 'val', function: 'min' });
      expect(minResult.data.result).toBe(1);

      const maxResult = handlers.grid_aggregate!({ columnId: 'val', function: 'max' });
      expect(maxResult.data.result).toBe(9);
    });

    it('grid_aggregate should compute count', () => {
      const { handlers } = createGridTools();
      handlers.grid_create!({
        columns: [{ field: 'val' }],
        rowData: [{ val: 5 }, { val: 'text' }, { val: 9 }, { val: null }],
      });

      const result = handlers.grid_aggregate!({ columnId: 'val', function: 'count' });
      expect(result.data.result).toBe(2); // only numeric values
      expect(result.data.count).toBe(2);
    });

    it('grid_export_csv should require grid_create first', () => {
      const { handlers } = createGridTools();
      const result = handlers.grid_export_csv!({});
      expect(result).toEqual({
        success: false,
        error: 'No grid created. Call grid_create first.',
      });
    });

    it('grid_export_csv should produce real CSV output', () => {
      const { handlers } = createGridTools();
      handlers.grid_create!({
        columns: [{ field: 'name', headerName: 'Name' }, { field: 'age', headerName: 'Age' }],
        rowData: [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }],
      });

      const result = handlers.grid_export_csv!({});
      expect(result.success).toBe(true);
      expect(result.data.csv).toContain('Name,Age');
      expect(result.data.csv).toContain('Alice,30');
      expect(result.data.csv).toContain('Bob,25');
      expect(result.data.fileName).toBe('export.csv');
    });

    it('grid_export_csv should use provided fileName', () => {
      const { handlers } = createGridTools();
      handlers.grid_create!({
        columns: [{ field: 'x' }],
        rowData: [{ x: 1 }],
      });

      const result = handlers.grid_export_csv!({ fileName: 'my-data.csv' });
      expect(result.data.fileName).toBe('my-data.csv');
    });

    it('should allow creating a new grid after destroying old one', () => {
      const { handlers } = createGridTools();
      handlers.grid_create!({
        columns: [{ field: 'a' }],
        rowData: [{ a: 1 }],
      });

      // Create a second grid — should replace the first
      const result = handlers.grid_create!({
        columns: [{ field: 'b' }, { field: 'c' }],
        rowData: [{ b: 10, c: 20 }],
      });
      expect(result).toEqual({
        success: true,
        data: { message: 'Grid created', columns: 2, rows: 1 },
      });

      // Verify data comes from second grid
      const getData = handlers.grid_get_data!({});
      expect(getData.data.rows[0]).toEqual({ b: 10, c: 20 });
    });

    it('end-to-end: create, filter, sort, aggregate, export', () => {
      const { handlers } = createGridTools();

      // Create
      handlers.grid_create!({
        columns: [
          { field: 'name', headerName: 'Name' },
          { field: 'dept', headerName: 'Department' },
          { field: 'salary', headerName: 'Salary' },
        ],
        rowData: [
          { name: 'Alice', dept: 'Eng', salary: 100000 },
          { name: 'Bob', dept: 'Sales', salary: 80000 },
          { name: 'Charlie', dept: 'Eng', salary: 120000 },
          { name: 'Diana', dept: 'Sales', salary: 90000 },
        ],
      });

      // Get all data
      const allData = handlers.grid_get_data!({});
      expect(allData.data.total).toBe(4);

      // Aggregate salary
      const sumResult = handlers.grid_aggregate!({ columnId: 'salary', function: 'sum' });
      expect(sumResult.data.result).toBe(390000);

      const avgResult = handlers.grid_aggregate!({ columnId: 'salary', function: 'avg' });
      expect(avgResult.data.result).toBe(97500);

      // Export CSV
      const csvResult = handlers.grid_export_csv!({});
      expect(csvResult.data.csv).toContain('Name,Department,Salary');
      expect(csvResult.data.rows).toBe(4);
    });
  });

  describe('PDF tool handlers — informative stubs', () => {
    it('pdf_load should return error with informative message', () => {
      const { handlers } = createPdfTools();
      const result = handlers.pdf_load!({ source: '/path/to/file.pdf' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('No PDF parser configured');
      expect(result.data.source).toBe('/path/to/file.pdf');
      expect(result.data.hint).toBeDefined();
    });

    it('pdf_extract_text should return error with informative message', () => {
      const { handlers } = createPdfTools();
      const result = handlers.pdf_extract_text!({});
      expect(result.success).toBe(false);
      expect(result.error).toContain('No PDF parser configured');
      expect(result.data.hint).toBeDefined();
    });

    it('pdf_extract_text should pass through provided params', () => {
      const { handlers } = createPdfTools();
      const result = handlers.pdf_extract_text!({ pageIndex: 3, allPages: true });
      expect(result.data.pageIndex).toBe(3);
      expect(result.data.allPages).toBe(true);
    });

    it('pdf_search should return error with query echoed', () => {
      const { handlers } = createPdfTools();
      const result = handlers.pdf_search!({ query: 'hello' });
      expect(result.success).toBe(false);
      expect(result.data.query).toBe('hello');
    });

    it('pdf_annotate should return error with params echoed', () => {
      const { handlers } = createPdfTools();
      const result = handlers.pdf_annotate!({ pageIndex: 0, type: 'highlight', rect: [10, 20, 100, 40] });
      expect(result.success).toBe(false);
      expect(result.data.pageIndex).toBe(0);
      expect(result.data.type).toBe('highlight');
      expect(result.data.rect).toEqual([10, 20, 100, 40]);
    });

    it('pdf_redact should return error with params echoed', () => {
      const { handlers } = createPdfTools();
      const result = handlers.pdf_redact!({ pageIndex: 1, rect: [50, 60, 200, 80] });
      expect(result.success).toBe(false);
      expect(result.data.pageIndex).toBe(1);
      expect(result.data.rect).toEqual([50, 60, 200, 80]);
    });

    it('pdf_save should return error with fileName', () => {
      const { handlers } = createPdfTools();
      const result = handlers.pdf_save!({});
      expect(result.success).toBe(false);
      expect(result.data.fileName).toBe('output.pdf');
    });

    it('pdf_get_metadata should return error with hint', () => {
      const { handlers } = createPdfTools();
      const result = handlers.pdf_get_metadata!({});
      expect(result.success).toBe(false);
      expect(result.data.hint).toBeDefined();
    });
  });

  describe('AI tool handlers — informative stubs', () => {
    it('pdf_detect_pii should return error with defaults', () => {
      const { handlers } = createAiTools();
      const result = handlers.pdf_detect_pii!({});
      expect(result.success).toBe(false);
      expect(result.error).toContain('AI-powered PDF analysis');
      expect(result.data.pageIndex).toBe(null);
      expect(result.data.types).toEqual([]);
      expect(result.data.threshold).toBe(0.8);
      expect(result.data.hint).toBeDefined();
    });

    it('pdf_detect_pii should use provided settings', () => {
      const { handlers } = createAiTools();
      const result = handlers.pdf_detect_pii!({ pageIndex: 2, types: ['email', 'ssn'], threshold: 0.9 });
      expect(result.data.pageIndex).toBe(2);
      expect(result.data.types).toEqual(['email', 'ssn']);
      expect(result.data.threshold).toBe(0.9);
    });

    it('pdf_classify should return error with defaults', () => {
      const { handlers } = createAiTools();
      const result = handlers.pdf_classify!({});
      expect(result.success).toBe(false);
      expect(result.data.topN).toBe(3);
      expect(result.data.hint).toBeDefined();
    });

    it('pdf_classify should use provided topN', () => {
      const { handlers } = createAiTools();
      const result = handlers.pdf_classify!({ topN: 5 });
      expect(result.data.topN).toBe(5);
    });

    it('pdf_summarize should return error with defaults', () => {
      const { handlers } = createAiTools();
      const result = handlers.pdf_summarize!({});
      expect(result.success).toBe(false);
      expect(result.data.maxLength).toBe(500);
      expect(result.data.hint).toBeDefined();
    });

    it('pdf_summarize should use provided maxLength', () => {
      const { handlers } = createAiTools();
      const result = handlers.pdf_summarize!({ maxLength: 1000 });
      expect(result.data.maxLength).toBe(1000);
    });

    it('pdf_extract_fields should return error with defaults', () => {
      const { handlers } = createAiTools();
      const result = handlers.pdf_extract_fields!({});
      expect(result.success).toBe(false);
      expect(result.data.fields).toEqual([]);
      expect(result.data.hint).toBeDefined();
    });

    it('pdf_extract_fields should return provided fields', () => {
      const { handlers } = createAiTools();
      const result = handlers.pdf_extract_fields!({ fields: ['name', 'date', 'amount'] });
      expect(result.data.fields).toEqual(['name', 'date', 'amount']);
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
