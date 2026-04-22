// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
import type { ToolDefinition, ToolHandler } from '../types';
import type { GridEngine } from '@gridstorm/core';
import { createGrid } from '@gridstorm/core';
import { gridSchemas } from '../schemas';

/** Shared grid engine state across tool calls. */
export interface GridToolsContext {
  grids: Map<string, GridEngine>;
  nextId: number;
}

/** Default grid ID used for backward compatibility when no gridId is specified. */
const DEFAULT_GRID_ID = 'default';

/** Maximum number of grids allowed at once. */
const MAX_GRID_COUNT = 50;

/** Valid aggregation function names. */
const VALID_AGG_FUNCTIONS = new Set(['sum', 'avg', 'min', 'max', 'count']);

function getGrid(context: GridToolsContext, gridId?: string): GridEngine | null {
  const id = gridId || DEFAULT_GRID_ID;
  return context.grids.get(id) || null;
}

function escapeCSVField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export function createGridTools(): {
  definitions: ToolDefinition[];
  handlers: Record<string, ToolHandler>;
  context: GridToolsContext;
} {
  const context: GridToolsContext = { grids: new Map(), nextId: 1 };

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
      const columns = (input.columns as any[] || []).map((c: any) => ({
        field: c.field,
        headerName: c.headerName || c.field,
        sortable: c.sortable ?? true,
        filter: c.filter ?? true,
      }));
      const rowData = input.rowData as any[] || [];

      const gridId = (input.gridId as string) || DEFAULT_GRID_ID;

      // Destroy previous engine with same ID if any
      const existing = context.grids.get(gridId);
      if (existing) {
        existing.destroy();
        context.grids.delete(gridId);
      }

      // LRU eviction: if at capacity, destroy the oldest grid
      if (context.grids.size >= MAX_GRID_COUNT) {
        const oldestKey = context.grids.keys().next().value!;
        const oldestGrid = context.grids.get(oldestKey)!;
        oldestGrid.destroy();
        context.grids.delete(oldestKey);
      }

      context.grids.set(gridId, createGrid({ columns, rowData }));

      return {
        success: true,
        data: {
          message: 'Grid created',
          gridId,
          columns: columns.length,
          rows: rowData.length,
        },
      };
    },

    grid_sort: (input) => {
      const gridEngine = getGrid(context, input.gridId as string | undefined);
      if (!gridEngine) {
        return { success: false, error: 'No grid created. Call grid_create first.' };
      }

      const sortModel = (input.sortModel as any[] || []).map((s: any) => ({
        colId: s.colId,
        sort: s.sort || 'asc',
      }));

      gridEngine.api.setSortModel(sortModel);

      return {
        success: true,
        data: {
          message: 'Sort applied',
          sortModel,
          displayedRows: gridEngine.api.getDisplayedRowCount(),
        },
      };
    },

    grid_filter: (input) => {
      const gridEngine = getGrid(context, input.gridId as string | undefined);
      if (!gridEngine) {
        return { success: false, error: 'No grid created. Call grid_create first.' };
      }

      const filterModel = (input.filterModel as Record<string, any>) || {};
      gridEngine.api.setFilterModel(filterModel);

      return {
        success: true,
        data: {
          message: 'Filter applied',
          filterModel,
          displayedRows: gridEngine.api.getDisplayedRowCount(),
        },
      };
    },

    grid_export_csv: (input) => {
      const gridEngine = getGrid(context, input.gridId as string | undefined);
      if (!gridEngine) {
        return { success: false, error: 'No grid created. Call grid_create first.' };
      }

      const state = gridEngine.store.getState();
      const columnKeys = input.columnKeys as string[] | undefined;
      const cols = state.columns.filter((c: any) => {
        if (c.hide) return false;
        if (columnKeys && columnKeys.length > 0) {
          return columnKeys.includes(c.field || c.colId);
        }
        return true;
      });

      const headers = cols.map((c: any) => escapeCSVField(c.headerName || c.field || c.colId));
      const csvRows: string[] = [headers.join(',')];

      for (const id of state.displayedRowIds) {
        const node = state.rowNodes.get(id);
        if (node?.data) {
          const row = cols.map((c: any) => {
            const val = (node.data as any)[c.field || c.colId];
            if (val == null) return '';
            return escapeCSVField(String(val));
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
      const gridEngine = getGrid(context, input.gridId as string | undefined);
      if (!gridEngine) {
        return { success: false, error: 'No grid created. Call grid_create first.' };
      }

      const state = gridEngine.store.getState();
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
      const gridEngine = getGrid(context, input.gridId as string | undefined);
      if (!gridEngine) {
        return { success: false, error: 'No grid created. Call grid_create first.' };
      }

      const state = gridEngine.store.getState();
      const columnId = input.columnId as string;
      const func = (input.function as string) || 'sum';

      if (!VALID_AGG_FUNCTIONS.has(func)) {
        return {
          success: false,
          error: `Invalid aggregation function '${func}'. Must be one of: sum, avg, min, max, count.`,
        };
      }

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
            result = values.reduce((a, b) => a < b ? a : b);
            break;
          case 'max':
            result = values.reduce((a, b) => a > b ? a : b);
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
