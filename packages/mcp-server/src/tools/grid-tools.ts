import type { ToolDefinition, ToolHandler } from '../types';
import { gridSchemas } from '../schemas';

export function createGridTools(): { definitions: ToolDefinition[]; handlers: Record<string, ToolHandler> } {
  const definitions: ToolDefinition[] = [
    { name: 'grid_create', description: 'Create a new data grid with columns and row data', inputSchema: gridSchemas.grid_create },
    { name: 'grid_sort', description: 'Apply sorting to the grid by column', inputSchema: gridSchemas.grid_sort },
    { name: 'grid_filter', description: 'Apply filters to the grid data', inputSchema: gridSchemas.grid_filter },
    { name: 'grid_export_csv', description: 'Export grid data to CSV format', inputSchema: gridSchemas.grid_export_csv },
    { name: 'grid_get_data', description: 'Get filtered and sorted grid data', inputSchema: gridSchemas.grid_get_data },
    { name: 'grid_aggregate', description: 'Compute aggregation (sum, avg, min, max, count) on a column', inputSchema: gridSchemas.grid_aggregate },
  ];

  const handlers: Record<string, ToolHandler> = {
    grid_create: (input) => {
      return { success: true, data: { message: 'Grid created', columns: input.columns?.length || 0, rows: input.rowData?.length || 0 } };
    },
    grid_sort: (input) => {
      return { success: true, data: { message: 'Sort applied', sortModel: input.sortModel } };
    },
    grid_filter: (input) => {
      return { success: true, data: { message: 'Filter applied', filterModel: input.filterModel } };
    },
    grid_export_csv: (input) => {
      return { success: true, data: { message: 'CSV export initiated', fileName: input.fileName || 'export.csv' } };
    },
    grid_get_data: (input) => {
      return { success: true, data: { rows: [], total: 0, page: input.page || 0, pageSize: input.pageSize || 100 } };
    },
    grid_aggregate: (input) => {
      return { success: true, data: { columnId: input.columnId, function: input.function, result: 0 } };
    },
  };

  return { definitions, handlers };
}
