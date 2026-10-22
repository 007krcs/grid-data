// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
import type { ToolDefinition, ToolHandler, ToolResult } from '../types';
import type { GridEngine, ColumnState, FilterModel, SortModelItem } from '@gridstorm/core';
import { createGrid } from '@gridstorm/core';
import { gridSchemas } from '../schemas';

/**
 * Shared grid engine state across tool calls.
 *
 * Two classes of grid live in `grids`:
 *
 *   - **created** — built by the agent via `grid_create`. Owned by this
 *     context: destroyed on overwrite and subject to LRU eviction.
 *   - **attached** — a live `GridEngine` the host application handed us
 *     (`createMCPServer({ grids })` or `registry.attachGrid()`). The agent
 *     operates the *real* grid the user is looking at. Attached grids are
 *     never destroyed, evicted, or replaced by `grid_create`.
 */
export interface GridToolsContext {
  grids: Map<string, GridEngine>;
  /** IDs of grids attached by the host (never destroyed by tool calls). */
  attached: Set<string>;
  nextId: number;
}

export interface GridToolsOptions {
  /** Live engines to attach at construction, keyed by gridId. */
  grids?: Record<string, GridEngine>;
}

/** Default grid ID used for backward compatibility when no gridId is specified. */
const DEFAULT_GRID_ID = 'default';

/** Maximum number of agent-created grids allowed at once. */
const MAX_GRID_COUNT = 50;

/** Valid aggregation function names. */
const VALID_AGG_FUNCTIONS = new Set(['sum', 'avg', 'min', 'max', 'count']);

/** Filter vocabulary advertised to agents in `grid_describe` and used to validate `grid_filter`. */
export const FILTER_TYPES = ['text', 'number', 'date', 'set', 'custom'] as const;
export const FILTER_OPERATORS = [
  'equals',
  'notEqual',
  'contains',
  'notContains',
  'startsWith',
  'endsWith',
  'lessThan',
  'lessThanOrEqual',
  'greaterThan',
  'greaterThanOrEqual',
  'inRange',
  'blank',
  'notBlank',
] as const;

/** Rows sampled per column when inferring a data type for `grid_describe`. */
const TYPE_SAMPLE_SIZE = 200;

export type InferredColumnType = 'number' | 'string' | 'boolean' | 'date' | 'object' | 'mixed' | 'empty';

function getGrid(context: GridToolsContext, gridId?: string): GridEngine | null {
  const id = gridId || DEFAULT_GRID_ID;
  return context.grids.get(id) || null;
}

function noGridError(context: GridToolsContext, gridId?: string): ToolResult {
  const known = [...context.grids.keys()];
  const asked = gridId || DEFAULT_GRID_ID;
  const hint = known.length
    ? `Known gridIds: ${known.join(', ')}. Call grid_list to inspect them.`
    : 'No grids exist yet. Call grid_create first, or have the host attach a live grid.';
  return { success: false, error: `Grid '${asked}' not found. ${hint}` };
}

/** Leading characters that spreadsheet apps treat as a formula (CSV injection). */
const FORMULA_PREFIXES = new Set(['=', '+', '-', '@', '\t', '\r']);

/**
 * RFC 4180 quoting plus CSV-injection neutralization: a cell beginning with
 * a formula trigger is prefixed with a tab inside quotes, the same defense
 * `@gridstorm/plugin-excel-export` applies. Cell data is untrusted; an agent
 * may hand this CSV straight to a user who opens it in Excel.
 */
function escapeCSVField(value: string): string {
  if (value.length > 0 && FORMULA_PREFIXES.has(value[0]!)) {
    return '"\t' + value.replace(/"/g, '""') + '"';
  }
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

/** Field key used to read a cell for a column. */
function fieldOf(col: ColumnState): string {
  return col.field || col.colId;
}

/** Resolve a user-supplied column reference (colId or field) to a ColumnState. */
function findColumn(columns: ColumnState[], ref: string): ColumnState | undefined {
  return columns.find((c) => c.colId === ref) ?? columns.find((c) => c.field === ref);
}

function unknownColumnError(columns: ColumnState[], ref: string): string {
  const ids = columns.map((c) => c.colId);
  return `Unknown column '${ref}'. Available columns: ${ids.join(', ')}. Call grid_describe for details.`;
}

function classify(value: unknown): InferredColumnType {
  if (value === null || value === undefined || value === '') return 'empty';
  if (typeof value === 'number') return Number.isFinite(value) ? 'number' : 'empty';
  if (typeof value === 'boolean') return 'boolean';
  if (value instanceof Date) return 'date';
  if (typeof value === 'string') {
    // ISO-8601 dates are the only strings we promote to `date`; anything looser
    // would misclassify free text like "May 2024 report".
    if (
      value.length <= 40 &&
      /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(value)
    ) {
      return Number.isNaN(Date.parse(value)) ? 'string' : 'date';
    }
    return 'string';
  }
  return 'object';
}

/**
 * Infer a column's data type from a sample of displayed rows. Returns `mixed`
 * when the sample disagrees, `empty` when every sampled value is blank.
 */
export function inferColumnType(engine: GridEngine, col: ColumnState): InferredColumnType {
  const state = engine.store.getState();
  const field = fieldOf(col);
  let seen: InferredColumnType | null = null;
  let sampled = 0;
  for (const id of state.displayedRowIds) {
    if (sampled >= TYPE_SAMPLE_SIZE) break;
    const node = state.rowNodes.get(id);
    if (!node?.data) continue;
    sampled++;
    const t = classify((node.data as any)[field]);
    if (t === 'empty') continue;
    if (seen === null) seen = t;
    else if (seen !== t) return 'mixed';
  }
  return seen ?? 'empty';
}

/** Public shape of a `grid_describe` result — the agent-facing contract of a grid. */
export interface GridDescription {
  gridId: string;
  attached: boolean;
  rows: { total: number; displayed: number; selected: number };
  columns: Array<{
    colId: string;
    field: string | undefined;
    headerName: string;
    type: InferredColumnType;
    sortable: boolean;
    filterable: boolean;
    editable: boolean | 'conditional';
    hidden: boolean;
    pinned: 'left' | 'right' | null;
    sort: 'asc' | 'desc' | null;
    sortIndex: number | null;
  }>;
  sortModel: SortModelItem[];
  filterModel: Record<string, FilterModel>;
  pagination: { currentPage: number; pageSize: number; totalRows: number; totalPages: number };
  plugins: string[];
  vocabulary: {
    filterTypes: readonly string[];
    filterOperators: readonly string[];
    aggregations: string[];
  };
}

export function describeGrid(gridId: string, engine: GridEngine, attached: boolean): GridDescription {
  const state = engine.store.getState();
  const pag = state.pagination;
  const plugins: string[] = [];
  const pm = engine.pluginManager as unknown as { plugins?: Map<string, unknown> };
  if (pm && pm.plugins instanceof Map) plugins.push(...pm.plugins.keys());

  return {
    gridId,
    attached,
    rows: {
      total: state.rowNodes.size,
      displayed: state.displayedRowIds.length,
      selected: state.selection.selectedRowIds.size,
    },
    columns: state.columns.map((c) => ({
      colId: c.colId,
      field: c.field,
      headerName: c.headerName,
      type: inferColumnType(engine, c),
      sortable: c.sortable,
      filterable: c.filterable,
      editable: typeof c.editable === 'function' ? 'conditional' : Boolean(c.editable),
      hidden: c.hide,
      pinned: c.pinned ?? null,
      sort: c.sort ?? null,
      sortIndex: c.sortIndex,
    })),
    sortModel: state.sortModel,
    filterModel: state.filterModel,
    pagination: {
      currentPage: pag.currentPage,
      pageSize: pag.pageSize,
      totalRows: pag.totalRows,
      totalPages: pag.pageSize > 0 ? Math.ceil(pag.totalRows / pag.pageSize) : 1,
    },
    plugins,
    vocabulary: {
      filterTypes: FILTER_TYPES,
      filterOperators: FILTER_OPERATORS,
      aggregations: [...VALID_AGG_FUNCTIONS],
    },
  };
}

function validateSortModel(columns: ColumnState[], raw: unknown): { ok: true; model: SortModelItem[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) return { ok: false, error: 'sortModel must be an array of { colId, sort }.' };
  const model: SortModelItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object' || typeof (item as any).colId !== 'string') {
      return { ok: false, error: 'Each sortModel entry needs a string colId.' };
    }
    const col = findColumn(columns, (item as any).colId);
    if (!col) return { ok: false, error: unknownColumnError(columns, (item as any).colId) };
    if (!col.sortable) return { ok: false, error: `Column '${col.colId}' is not sortable.` };
    const dir = (item as any).sort ?? 'asc';
    if (dir !== 'asc' && dir !== 'desc') {
      return { ok: false, error: `sort must be 'asc' or 'desc', got '${String(dir)}'.` };
    }
    model.push({ colId: col.colId, sort: dir });
  }
  return { ok: true, model };
}

function validateFilterModel(
  columns: ColumnState[],
  raw: unknown,
): { ok: true; model: Record<string, FilterModel> } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'filterModel must be an object keyed by column ID.' };
  }
  const model: Record<string, FilterModel> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const col = findColumn(columns, key);
    if (!col) return { ok: false, error: unknownColumnError(columns, key) };
    if (!col.filterable) return { ok: false, error: `Column '${col.colId}' is not filterable.` };
    if (!value || typeof value !== 'object') {
      return { ok: false, error: `Filter for '${key}' must be an object like { filterType, type, filter }.` };
    }
    const fm = { ...(value as Record<string, unknown>) } as FilterModel;
    if (fm.filterType === undefined) {
      // Agents frequently omit filterType. Infer it from the operand so the
      // call succeeds instead of failing on a formality.
      const operand = fm.filter ?? fm.filterTo;
      fm.filterType = Array.isArray(fm.values)
        ? 'set'
        : typeof operand === 'number'
          ? 'number'
          : fm.dateFrom || fm.dateTo
            ? 'date'
            : 'text';
    }
    if (!(FILTER_TYPES as readonly string[]).includes(fm.filterType)) {
      return {
        ok: false,
        error: `filterType for '${key}' must be one of ${FILTER_TYPES.join(', ')}; got '${String(fm.filterType)}'.`,
      };
    }
    if (fm.type !== undefined && !(FILTER_OPERATORS as readonly string[]).includes(fm.type as string)) {
      return {
        ok: false,
        error: `type (operator) for '${key}' must be one of ${FILTER_OPERATORS.join(', ')}; got '${String(fm.type)}'.`,
      };
    }
    model[col.colId] = fm;
  }
  return { ok: true, model };
}

export function createGridTools(options: GridToolsOptions = {}): {
  definitions: ToolDefinition[];
  handlers: Record<string, ToolHandler>;
  context: GridToolsContext;
  attachGrid: (gridId: string, engine: GridEngine) => void;
  detachGrid: (gridId: string) => boolean;
} {
  const context: GridToolsContext = { grids: new Map(), attached: new Set(), nextId: 1 };

  const attachGrid = (gridId: string, engine: GridEngine): void => {
    if (!gridId) throw new Error('attachGrid: gridId is required');
    const existing = context.grids.get(gridId);
    if (existing && !context.attached.has(gridId)) {
      // Replacing an agent-created grid with a host grid: dispose the orphan.
      existing.destroy();
    }
    context.grids.set(gridId, engine);
    context.attached.add(gridId);
  };

  const detachGrid = (gridId: string): boolean => {
    if (!context.attached.has(gridId)) return false;
    context.attached.delete(gridId);
    context.grids.delete(gridId);
    return true;
  };

  for (const [id, engine] of Object.entries(options.grids ?? {})) attachGrid(id, engine);

  const definitions: ToolDefinition[] = [
    { name: 'grid_list', description: 'List every grid this server can operate on, with row/column counts and whether it is a live application grid (attached) or one created by the agent', inputSchema: gridSchemas.grid_list, kind: 'read' },
    { name: 'grid_describe', description: 'Describe a grid: columns with inferred data types and capabilities (sortable/filterable/editable), current sort and filter state, row counts, installed plugins, and the exact filter/aggregation vocabulary accepted by the other tools. Call this before sorting, filtering, or editing', inputSchema: gridSchemas.grid_describe, kind: 'read' },
    { name: 'grid_create', description: 'Create a new in-memory data grid with columns and row data. Cannot overwrite a live attached grid', inputSchema: gridSchemas.grid_create, kind: 'mutation' },
    { name: 'grid_sort', description: 'Apply sorting to the grid by one or more columns (replaces the current sort; pass [] to clear)', inputSchema: gridSchemas.grid_sort, kind: 'mutation' },
    { name: 'grid_filter', description: 'Apply filters to the grid data (replaces the current filter model; pass {} to clear). See grid_describe for the filter vocabulary', inputSchema: gridSchemas.grid_filter, kind: 'mutation' },
    { name: 'grid_update_rows', description: 'Update cell values on existing rows by row ID. Only editable columns may be written. Emits the same cell:valueChanged events as a user edit', inputSchema: gridSchemas.grid_update_rows, kind: 'mutation' },
    { name: 'grid_export_csv', description: 'Export the displayed (sorted + filtered) grid rows to RFC 4180 CSV', inputSchema: gridSchemas.grid_export_csv, kind: 'export' },
    { name: 'grid_get_data', description: 'Get a page of displayed (filtered and sorted) rows, each with its rowId', inputSchema: gridSchemas.grid_get_data, kind: 'read' },
    { name: 'grid_aggregate', description: 'Compute an aggregation (sum, avg, min, max, count) over the displayed rows of a numeric column', inputSchema: gridSchemas.grid_aggregate, kind: 'read' },
  ];

  const handlers: Record<string, ToolHandler> = {
    grid_list: () => {
      const grids = [...context.grids.entries()].map(([gridId, engine]) => {
        const state = engine.store.getState();
        return {
          gridId,
          attached: context.attached.has(gridId),
          rows: state.rowNodes.size,
          displayedRows: state.displayedRowIds.length,
          columns: state.columns.length,
        };
      });
      return { success: true, data: { grids, defaultGridId: DEFAULT_GRID_ID } };
    },

    grid_describe: (input) => {
      const gridId = (input.gridId as string) || DEFAULT_GRID_ID;
      const engine = getGrid(context, gridId);
      if (!engine) return noGridError(context, gridId);
      return { success: true, data: describeGrid(gridId, engine, context.attached.has(gridId)) };
    },

    grid_create: (input) => {
      const rawColumns = input.columns;
      if (!Array.isArray(rawColumns) || rawColumns.length === 0) {
        return { success: false, error: 'columns must be a non-empty array of { field, headerName? }.' };
      }
      const columns = rawColumns.map((c: any) => ({
        field: c.field,
        headerName: c.headerName || c.field,
        sortable: c.sortable ?? true,
        filterable: c.filterable ?? (typeof c.filter === 'boolean' ? c.filter : true),
        editable: c.editable ?? false,
      }));
      if (columns.some((c) => typeof c.field !== 'string' || !c.field)) {
        return { success: false, error: 'Every column needs a non-empty string field.' };
      }
      const rowData = Array.isArray(input.rowData) ? (input.rowData as any[]) : [];

      const gridId = (input.gridId as string) || DEFAULT_GRID_ID;

      if (context.attached.has(gridId)) {
        return {
          success: false,
          error: `Grid '${gridId}' is a live application grid and cannot be replaced. Choose a different gridId.`,
        };
      }

      // Destroy previous agent-created engine with same ID if any
      const existing = context.grids.get(gridId);
      if (existing) {
        existing.destroy();
        context.grids.delete(gridId);
      }

      // LRU eviction over agent-created grids only: attached grids are untouchable.
      const createdCount = context.grids.size - context.attached.size;
      if (createdCount >= MAX_GRID_COUNT) {
        for (const key of context.grids.keys()) {
          if (context.attached.has(key)) continue;
          context.grids.get(key)!.destroy();
          context.grids.delete(key);
          break;
        }
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
      if (!gridEngine) return noGridError(context, input.gridId as string | undefined);

      const validated = validateSortModel(gridEngine.store.getState().columns, input.sortModel ?? []);
      if (!validated.ok) return { success: false, error: validated.error };

      gridEngine.api.setSortModel(validated.model);

      return {
        success: true,
        data: {
          message: validated.model.length ? 'Sort applied' : 'Sort cleared',
          sortModel: validated.model,
          displayedRows: gridEngine.api.getDisplayedRowCount(),
        },
      };
    },

    grid_filter: (input) => {
      const gridEngine = getGrid(context, input.gridId as string | undefined);
      if (!gridEngine) return noGridError(context, input.gridId as string | undefined);

      const validated = validateFilterModel(gridEngine.store.getState().columns, input.filterModel ?? {});
      if (!validated.ok) return { success: false, error: validated.error };

      gridEngine.api.setFilterModel(validated.model);

      return {
        success: true,
        data: {
          message: Object.keys(validated.model).length ? 'Filter applied' : 'Filter cleared',
          filterModel: validated.model,
          displayedRows: gridEngine.api.getDisplayedRowCount(),
        },
      };
    },

    grid_update_rows: (input) => {
      const gridEngine = getGrid(context, input.gridId as string | undefined);
      if (!gridEngine) return noGridError(context, input.gridId as string | undefined);

      const updates = input.updates;
      if (!Array.isArray(updates) || updates.length === 0) {
        return { success: false, error: 'updates must be a non-empty array of { rowId, values }.' };
      }
      const state = gridEngine.store.getState();
      const columns = state.columns;
      const resolved: Array<{ id: string; data: Record<string, unknown> }> = [];
      const changedCells: Array<{ rowId: string; colId: string; oldValue: unknown; newValue: unknown }> = [];

      for (const u of updates as any[]) {
        if (!u || typeof u.rowId !== 'string' || !u.values || typeof u.values !== 'object') {
          return { success: false, error: 'Each update needs a string rowId and a values object keyed by column.' };
        }
        const node = state.rowNodes.get(u.rowId);
        if (!node || !node.data) {
          return { success: false, error: `Row '${u.rowId}' not found. Row IDs are returned by grid_get_data.` };
        }
        const data: Record<string, unknown> = {};
        for (const [ref, value] of Object.entries(u.values as Record<string, unknown>)) {
          const col = findColumn(columns, ref);
          if (!col) return { success: false, error: unknownColumnError(columns, ref) };
          if (!col.editable) {
            return { success: false, error: `Column '${col.colId}' is not editable.` };
          }
          if (value !== null && typeof value === 'object') {
            return { success: false, error: `Value for '${col.colId}' must be a primitive (string, number, boolean, or null).` };
          }
          const field = fieldOf(col);
          data[field] = value;
          changedCells.push({ rowId: u.rowId, colId: col.colId, oldValue: (node.data as any)[field], newValue: value });
        }
        resolved.push({ id: u.rowId, data });
      }

      gridEngine.api.updateRows(resolved);

      return {
        success: true,
        data: {
          message: `Updated ${changedCells.length} cell(s) across ${resolved.length} row(s)`,
          changedCells,
          displayedRows: gridEngine.api.getDisplayedRowCount(),
        },
      };
    },

    grid_export_csv: (input) => {
      const gridEngine = getGrid(context, input.gridId as string | undefined);
      if (!gridEngine) return noGridError(context, input.gridId as string | undefined);

      const state = gridEngine.store.getState();
      const columnKeys = input.columnKeys as string[] | undefined;
      if (columnKeys && columnKeys.length > 0) {
        for (const key of columnKeys) {
          if (!findColumn(state.columns, key)) {
            return { success: false, error: unknownColumnError(state.columns, key) };
          }
        }
      }
      const cols = state.columns.filter((c) => {
        if (columnKeys && columnKeys.length > 0) {
          return columnKeys.includes(c.colId) || (c.field !== undefined && columnKeys.includes(c.field));
        }
        return !c.hide;
      });

      const headers = cols.map((c) => escapeCSVField(c.headerName || fieldOf(c)));
      const csvRows: string[] = [headers.join(',')];

      for (const id of state.displayedRowIds) {
        const node = state.rowNodes.get(id);
        if (node?.data) {
          const row = cols.map((c) => {
            const val = (node.data as any)[fieldOf(c)];
            if (val == null) return '';
            return escapeCSVField(String(val));
          });
          csvRows.push(row.join(','));
        }
      }

      const csv = csvRows.join('\r\n');

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
      if (!gridEngine) return noGridError(context, input.gridId as string | undefined);

      const state = gridEngine.store.getState();
      const pageSize = Math.max(1, Math.min(1000, Number(input.pageSize) || 100));
      const page = Math.max(0, Number(input.page) || 0);
      const start = page * pageSize;
      const end = Math.min(start + pageSize, state.displayedRowIds.length);

      const rows: any[] = [];
      for (let i = start; i < end; i++) {
        const id = state.displayedRowIds[i];
        if (!id) continue;
        const node = state.rowNodes.get(id);
        if (node?.data) rows.push({ rowId: id, ...(node.data as object) });
      }

      return {
        success: true,
        data: {
          rows,
          total: state.displayedRowIds.length,
          page,
          pageSize,
          hasMore: end < state.displayedRowIds.length,
        },
      };
    },

    grid_aggregate: (input) => {
      const gridEngine = getGrid(context, input.gridId as string | undefined);
      if (!gridEngine) return noGridError(context, input.gridId as string | undefined);

      const state = gridEngine.store.getState();
      const ref = input.columnId as string;
      const func = (input.function as string) || 'sum';

      if (!VALID_AGG_FUNCTIONS.has(func)) {
        return {
          success: false,
          error: `Invalid aggregation function '${func}'. Must be one of: sum, avg, min, max, count.`,
        };
      }
      const col = findColumn(state.columns, ref);
      if (!col) return { success: false, error: unknownColumnError(state.columns, ref) };
      const field = fieldOf(col);

      const values: number[] = [];
      for (const id of state.displayedRowIds) {
        const node = state.rowNodes.get(id);
        if (node?.data) {
          const val = (node.data as any)[field];
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
          columnId: col.colId,
          function: func,
          result,
          count: values.length,
          skippedNonNumeric: state.displayedRowIds.length - values.length,
        },
      };
    },
  };

  return { definitions, handlers, context, attachGrid, detachGrid };
}
