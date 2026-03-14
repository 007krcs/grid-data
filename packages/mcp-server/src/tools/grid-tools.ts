import type { ToolDefinition, ToolHandler } from '../types';
import type { GridEngine } from '@gridstorm/core';
import { createGrid } from '@gridstorm/core';
import { gridSchemas } from '../schemas';

/** Shared grid engine state across tool calls. */
export interface GridToolsContext {
  gridEngine: GridEngine | null;
}

export function createGridTools(): {
  definitions: ToolDefinition[];
  handlers: Record<string, ToolHandler>;
  context: GridToolsContext;
} {
  const context: GridToolsContext = { gridEngine: null };

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
      // Destroy previous engine if any
      if (context.gridEngine) {
        context.gridEngine.destroy();
      }

      const columns = (input.columns as any[] || []).map((c: any) => ({
        field: c.field,
        headerName: c.headerName || c.field,
        sortable: c.sortable ?? true,
        filter: c.filter ?? true,
      }));
      const rowData = input.rowData as any[] || [];

      context.gridEngine = createGrid({ columns, rowData });

      return {
        success: true,
        data: {
          message: 'Grid created',
          columns: columns.length,
          rows: rowData.length,
        },
      };
    },

    grid_sort: (input) => {
      if (!context.gridEngine) {
        return { success: false, error: 'No grid created. Call grid_create first.' };
      }

      const sortModel = (input.sortModel as any[] || []).map((s: any) => ({
        colId: s.colId,
        sort: s.sort || 'asc',
      }));

      context.gridEngine.api.setSortModel(sortModel);

      return {
        success: true,
        data: {
          message: 'Sort applied',
          sortModel,
          displayedRows: context.gridEngine.api.getDisplayedRowCount(),
        },
      };
    },

    grid_filter: (input) => {
      if (!context.gridEngine) {
        return { success: false, error: 'No grid created. Call grid_create first.' };
      }

      const filterModel = (input.filterModel as Record<string, any>) || {};
      context.gridEngine.api.setFilterModel(filterModel);

      return {
        success: true,
        data: {
          message: 'Filter applied',
          filterModel,
          displayedRows: context.gridEngine.api.getDisplayedRowCount(),
        },
      };
    },

    grid_export_csv: (input) => {
      if (!context.gridEngine) {
        return { success: false, error: 'No grid created. Call grid_create first.' };
      }

      const state = context.gridEngine.store.getState();
      const columnKeys = input.columnKeys as string[] | undefined;
      const cols = state.columns.filter((c: any) => {
        if (c.hide) return false;
        if (columnKeys && columnKeys.length > 0) {
          return columnKeys.includes(c.field || c.colId);
        }
        return true;
      });

      const headers = cols.map((c: any) => c.headerName || c.field || c.colId);
      const csvRows: string[] = [headers.join(',')];

      for (const id of state.displayedRowIds) {
        const node = state.rowNodes.get(id);
        if (node?.data) {
          const row = cols.map((c: any) => {
            const val = (node.data as any)[c.field || c.colId];
            if (val == null) return '';
            const str = String(val);
            // Escape CSV values containing commas, quotes, or newlines
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
              return '"' + str.replace(/"/g, '""') + '"';
            }
            return str;
          });
          csvRows.push(row.join(','));
        }
      }

      const csv = csvRows.join('\n');

      return {
        success: true,
        data: {
          csv,
          fileName: (input.fileName as string) || 'export.csv',
          rows: state.displayedRowIds.length,
          columns: cols.length,
        },
      };
    },

    grid_get_data: (input) => {
      if (!context.gridEngine) {
        return { success: false, error: 'No grid created. Call grid_create first.' };
      }

      const state = context.gridEngine.store.getState();
      const pageSize = (input.pageSize as number) || 100;
      const page = (input.page as number) || 0;
      const start = page * pageSize;
      const end = Math.min(start + pageSize, state.displayedRowIds.length);

      const rows: any[] = [];
      for (let i = start; i < end; i++) {
        const id = state.displayedRowIds[i];
        if (!id) continue;
        const node = state.rowNodes.get(id);
        if (node?.data) rows.push(node.data);
      }

      return {
        success: true,
        data: {
          rows,
          total: state.displayedRowIds.length,
          page,
          pageSize,
        },
      };
    },

    grid_aggregate: (input) => {
      if (!context.gridEngine) {
        return { success: false, error: 'No grid created. Call grid_create first.' };
      }

      const state = context.gridEngine.store.getState();
      const columnId = input.columnId as string;
      const func = (input.function as string) || 'sum';

      const values: number[] = [];
      for (const id of state.displayedRowIds) {
        const node = state.rowNodes.get(id);
        if (node?.data) {
          const val = (node.data as any)[columnId];
          if (typeof val === 'number' && !isNaN(val)) {
            values.push(val);
          }
        }
      }

      let result = 0;
      if (values.length > 0) {
        switch (func) {
          case 'sum':
            result = values.reduce((a, b) => a + b, 0);
            break;
          case 'avg':
            result = values.reduce((a, b) => a + b, 0) / values.length;
            break;
          case 'min':
            result = Math.min(...values);
            break;
          case 'max':
            result = Math.max(...values);
            break;
          case 'count':
            result = values.length;
            break;
        }
      }

      return {
        success: true,
        data: {
          columnId,
          function: func,
          result,
          count: values.length,
        },
      };
    },
  };

  return { definitions, handlers, context };
}
