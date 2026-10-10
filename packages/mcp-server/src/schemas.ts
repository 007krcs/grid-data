// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
const gridIdProp = {
  gridId: { type: 'string' as const, description: "Target grid ID. Omit for 'default'. Use grid_list to discover attached application grids." },
};

export const gridSchemas = {
  grid_list: {
    type: 'object' as const,
    properties: {},
  },
  grid_describe: {
    type: 'object' as const,
    properties: { ...gridIdProp },
  },
  grid_create: {
    type: 'object' as const,
    properties: {
      ...gridIdProp,
      columns: {
        type: 'array' as const,
        description: 'Column definitions',
        items: {
          type: 'object' as const,
          properties: {
            field: { type: 'string' as const, description: 'Row data key this column reads' },
            headerName: { type: 'string' as const },
            width: { type: 'number' as const },
            sortable: { type: 'boolean' as const, description: 'Default true' },
            filter: { type: 'boolean' as const, description: 'Default true' },
            editable: { type: 'boolean' as const, description: 'Default false. Required for grid_update_rows to write this column' },
          },
          required: ['field'] as const,
        },
      },
      rowData: { type: 'array' as const, description: 'Row data array', items: { type: 'object' as const } },
    },
    required: ['columns', 'rowData'] as const,
  },
  grid_sort: {
    type: 'object' as const,
    properties: {
      ...gridIdProp,
      sortModel: {
        type: 'array' as const,
        description: 'Ordered sort entries. Empty array clears sorting.',
        items: {
          type: 'object' as const,
          properties: {
            colId: { type: 'string' as const, description: 'Column ID or field (see grid_describe)' },
            sort: { type: 'string' as const, enum: ['asc', 'desc'] },
          },
          required: ['colId'] as const,
        },
      },
    },
    required: ['sortModel'] as const,
  },
  grid_filter: {
    type: 'object' as const,
    properties: {
      ...gridIdProp,
      filterModel: {
        type: 'object' as const,
        description:
          "Filter model keyed by column ID. Each value: { filterType: 'text'|'number'|'date'|'set', type: <operator>, filter, filterTo?, values? }. " +
          'Operators: equals, notEqual, contains, notContains, startsWith, endsWith, lessThan, lessThanOrEqual, greaterThan, greaterThanOrEqual, inRange, blank, notBlank. ' +
          'filterType is inferred from the operand when omitted. Empty object clears all filters.',
        additionalProperties: {
          type: 'object' as const,
          properties: {
            filterType: { type: 'string' as const, enum: ['text', 'number', 'date', 'set', 'custom'] },
            type: { type: 'string' as const },
            filter: {},
            filterTo: {},
            dateFrom: { type: 'string' as const },
            dateTo: { type: 'string' as const },
            values: { type: 'array' as const },
          },
        },
      },
    },
    required: ['filterModel'] as const,
  },
  grid_update_rows: {
    type: 'object' as const,
    properties: {
      ...gridIdProp,
      updates: {
        type: 'array' as const,
        description: 'Cell writes. rowId comes from grid_get_data; values is keyed by column ID and holds primitives only.',
        items: {
          type: 'object' as const,
          properties: {
            rowId: { type: 'string' as const },
            values: { type: 'object' as const, additionalProperties: true },
          },
          required: ['rowId', 'values'] as const,
        },
      },
    },
    required: ['updates'] as const,
  },
  grid_export_csv: {
    type: 'object' as const,
    properties: {
      ...gridIdProp,
      fileName: { type: 'string' as const, description: 'Output file name' },
      columnKeys: { type: 'array' as const, items: { type: 'string' as const }, description: 'Columns to include (default: all visible)' },
    },
  },
  grid_get_data: {
    type: 'object' as const,
    properties: {
      ...gridIdProp,
      pageSize: { type: 'number' as const, description: 'Rows per page, 1-1000 (default 100)' },
      page: { type: 'number' as const, description: 'Page number (0-indexed)' },
    },
  },
  grid_aggregate: {
    type: 'object' as const,
    properties: {
      ...gridIdProp,
      columnId: { type: 'string' as const, description: 'Column to aggregate (ID or field)' },
      function: { type: 'string' as const, enum: ['sum', 'avg', 'min', 'max', 'count'], description: 'Aggregation function' },
    },
    required: ['columnId', 'function'] as const,
  },
};

export const pdfSchemas = {
  pdf_load: {
    type: 'object' as const,
    properties: {
      source: { type: 'string' as const, description: 'PDF file path or URL' },
    },
    required: ['source'] as const,
  },
  pdf_extract_text: {
    type: 'object' as const,
    properties: {
      pageIndex: { type: 'number' as const, description: 'Page index (0-based)' },
      allPages: { type: 'boolean' as const, description: 'Extract from all pages' },
    },
  },
  pdf_search: {
    type: 'object' as const,
    properties: {
      query: { type: 'string' as const, description: 'Search query' },
      caseSensitive: { type: 'boolean' as const },
      wholeWord: { type: 'boolean' as const },
    },
    required: ['query'] as const,
  },
  pdf_annotate: {
    type: 'object' as const,
    properties: {
      pageIndex: { type: 'number' as const },
      type: { type: 'string' as const, enum: ['highlight', 'underline', 'strikethrough', 'text', 'rectangle'] },
      rect: { type: 'array' as const, items: { type: 'number' as const }, description: '[x1, y1, x2, y2]' },
      contents: { type: 'string' as const },
    },
    required: ['pageIndex', 'type', 'rect'] as const,
  },
  pdf_redact: {
    type: 'object' as const,
    properties: {
      pageIndex: { type: 'number' as const },
      rect: { type: 'array' as const, items: { type: 'number' as const }, description: '[x1, y1, x2, y2]' },
      overlayText: { type: 'string' as const, description: 'Text to show after redaction' },
    },
    required: ['pageIndex', 'rect'] as const,
  },
  pdf_save: {
    type: 'object' as const,
    properties: {
      fileName: { type: 'string' as const, description: 'Output file name' },
    },
  },
  pdf_get_metadata: {
    type: 'object' as const,
    properties: {},
  },
};

export const aiSchemas = {
  pdf_detect_pii: {
    type: 'object' as const,
    properties: {
      pageIndex: { type: 'number' as const, description: 'Page to scan (omit for all)' },
      types: { type: 'array' as const, items: { type: 'string' as const }, description: 'PII types to detect' },
      threshold: { type: 'number' as const, description: 'Confidence threshold (0-1)' },
    },
  },
  pdf_classify: {
    type: 'object' as const,
    properties: {
      topN: { type: 'number' as const, description: 'Number of top classifications to return' },
    },
  },
  pdf_summarize: {
    type: 'object' as const,
    properties: {
      maxLength: { type: 'number' as const, description: 'Maximum summary length in characters' },
    },
  },
  pdf_extract_fields: {
    type: 'object' as const,
    properties: {
      fields: { type: 'array' as const, items: { type: 'string' as const }, description: 'Field names to extract' },
    },
  },
};
