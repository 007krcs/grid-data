import {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import Editor from '@monaco-editor/react';
import { GridStorm } from '@gridstorm/react';
import type { GridPlugin, ColumnDef } from '@gridstorm/react';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { FilteringPlugin } from '@gridstorm/plugin-filtering';
import { SelectionPlugin } from '@gridstorm/plugin-selection';
import { EditingPlugin } from '@gridstorm/plugin-editing';
import { ColumnResizePlugin } from '@gridstorm/plugin-column-resize';
import { ColumnPinningPlugin } from '@gridstorm/plugin-column-pinning';
import { PaginationPlugin } from '@gridstorm/plugin-pagination';
import { GroupingPlugin } from '@gridstorm/plugin-grouping';
import { AggregationPlugin } from '@gridstorm/plugin-aggregation';
import { ContextMenuPlugin } from '@gridstorm/plugin-context-menu';
import { ClipboardPlugin } from '@gridstorm/plugin-clipboard';
import '@gridstorm/theme-default';

// ── Types ──

interface PlaygroundConfig {
  columns: ColumnDef[];
  rowData: Record<string, unknown>[];
  options?: {
    rowHeight?: number;
    headerHeight?: number;
    theme?: string;
    plugins?: string[];
    paginationPageSize?: number;
    rowSelection?: 'single' | 'multiple';
  };
}

interface ParseResult {
  valid: boolean;
  config: PlaygroundConfig | null;
  error: string | null;
}

// ── Plugin Factory Map ──

const pluginMap: Record<string, (config: PlaygroundConfig) => GridPlugin> = {
  sorting: () => SortingPlugin({ multiSort: true }),
  filtering: () => FilteringPlugin(),
  selection: (_config) =>
    SelectionPlugin({ mode: _config.options?.rowSelection ?? 'multiple' }),
  editing: () => EditingPlugin(),
  columnResize: () => ColumnResizePlugin(),
  columnPinning: () => ColumnPinningPlugin(),
  pagination: (_config) =>
    PaginationPlugin({ pageSize: _config.options?.paginationPageSize ?? 100 }),
  grouping: () => GroupingPlugin({ defaultExpanded: false }),
  aggregation: () => AggregationPlugin(),
  contextMenu: () => ContextMenuPlugin(),
  clipboard: () => ClipboardPlugin(),
};

// ── Data Constants ──

const DEPARTMENTS = ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance', 'Support'];
const ROLES = ['Manager', 'Senior', 'Mid-Level', 'Junior', 'Intern', 'Lead', 'Director'];
const FIRST_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Hank', 'Ivy', 'Jack'];
const LAST_NAMES = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Moore', 'Taylor'];
const CITIES = ['New York', 'San Francisco', 'Chicago', 'Seattle', 'Boston', 'Austin', 'Denver', 'Portland', 'Miami', 'Atlanta'];
const STATES = ['NY', 'CA', 'IL', 'WA', 'MA', 'TX', 'CO', 'OR', 'FL', 'GA'];

// ── Data Generators ──

function generateEmployeeData(count: number): Record<string, unknown>[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length]}`,
    email: `user${i + 1}@company.com`,
    department: DEPARTMENTS[i % DEPARTMENTS.length],
    salary: 45000 + Math.floor((i * 7919) % 105000),
    startDate: `${2018 + (i % 8)}-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`,
    active: i % 5 !== 0,
  }));
}

function generateGroupedData(count: number): Record<string, unknown>[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length]}`,
    department: DEPARTMENTS[i % DEPARTMENTS.length],
    role: ROLES[i % ROLES.length],
    salary: 50000 + Math.floor((i * 7919) % 100000),
    yearsExp: 1 + (i % 20),
  }));
}

function generatePinnedData(count: number): Record<string, unknown>[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `${FIRST_NAMES[i % FIRST_NAMES.length]} ${LAST_NAMES[Math.floor(i / FIRST_NAMES.length) % LAST_NAMES.length]}`,
    email: `user${i + 1}@company.com`,
    department: DEPARTMENTS[i % DEPARTMENTS.length],
    phone: `(${555 + (i % 10)}) ${100 + (i % 900)}-${1000 + (i % 9000)}`,
    address: `${100 + i} Main Street`,
    city: CITIES[i % CITIES.length],
    state: STATES[i % STATES.length],
    salary: 50000 + Math.floor((i * 7919) % 100000),
    actions: 'View',
  }));
}

// ── Preset Examples ──

const PRESETS: Record<string, { label: string; config: PlaygroundConfig }> = {
  basic: {
    label: 'Basic Table',
    config: {
      columns: [
        { field: 'name', headerName: 'Name', width: 180 },
        { field: 'age', headerName: 'Age', width: 90 },
        { field: 'city', headerName: 'City', width: 150 },
      ],
      rowData: [
        { name: 'Alice Johnson', age: 32, city: 'New York' },
        { name: 'Bob Smith', age: 45, city: 'San Francisco' },
        { name: 'Charlie Brown', age: 28, city: 'Chicago' },
        { name: 'Diana Prince', age: 36, city: 'Seattle' },
        { name: 'Eve Davis', age: 41, city: 'Boston' },
        { name: 'Frank Miller', age: 29, city: 'Austin' },
        { name: 'Grace Lee', age: 33, city: 'Denver' },
        { name: 'Hank Wilson', age: 50, city: 'Portland' },
        { name: 'Ivy Chen', age: 27, city: 'Miami' },
        { name: 'Jack Taylor', age: 38, city: 'Atlanta' },
      ],
      options: {
        rowHeight: 40,
        headerHeight: 48,
        theme: 'light',
        plugins: [],
      },
    },
  },

  sortableFilterable: {
    label: 'Sortable & Filterable',
    config: {
      columns: [
        { field: 'id', headerName: 'ID', width: 70, sortable: true },
        { field: 'name', headerName: 'Name', width: 180, sortable: true, filterable: true },
        { field: 'email', headerName: 'Email', width: 240, sortable: true },
        { field: 'department', headerName: 'Department', width: 150, sortable: true, filterable: true },
        { field: 'salary', headerName: 'Salary', width: 120, sortable: true },
        { field: 'startDate', headerName: 'Start Date', width: 130, sortable: true },
      ],
      rowData: generateEmployeeData(100),
      options: {
        rowHeight: 40,
        headerHeight: 48,
        theme: 'light',
        plugins: ['sorting', 'filtering', 'columnResize'],
      },
    },
  },

  editable: {
    label: 'Editable Grid',
    config: {
      columns: [
        { field: 'product', headerName: 'Product', width: 180, editable: true },
        { field: 'category', headerName: 'Category', width: 140, editable: true },
        { field: 'price', headerName: 'Price', width: 100, editable: true },
        { field: 'quantity', headerName: 'Qty', width: 80, editable: true },
        { field: 'inStock', headerName: 'In Stock', width: 100 },
      ],
      rowData: [
        { product: 'Laptop Pro', category: 'Electronics', price: 1299, quantity: 45, inStock: true },
        { product: 'Wireless Mouse', category: 'Accessories', price: 29, quantity: 230, inStock: true },
        { product: 'USB-C Hub', category: 'Accessories', price: 49, quantity: 112, inStock: true },
        { product: 'Monitor 27"', category: 'Electronics', price: 449, quantity: 67, inStock: true },
        { product: 'Keyboard Mech', category: 'Accessories', price: 149, quantity: 0, inStock: false },
        { product: 'Webcam HD', category: 'Electronics', price: 79, quantity: 89, inStock: true },
        { product: 'Desk Lamp', category: 'Furniture', price: 35, quantity: 0, inStock: false },
        { product: 'Standing Desk', category: 'Furniture', price: 599, quantity: 23, inStock: true },
        { product: 'Chair Ergo', category: 'Furniture', price: 899, quantity: 15, inStock: true },
        { product: 'Cable Mgmt Kit', category: 'Accessories', price: 19, quantity: 340, inStock: true },
      ],
      options: {
        rowHeight: 40,
        headerHeight: 48,
        theme: 'light',
        plugins: ['editing', 'clipboard', 'selection', 'columnResize'],
        rowSelection: 'multiple',
      },
    },
  },

  largeDataset: {
    label: 'Large Dataset (10K)',
    config: {
      columns: [
        { field: 'id', headerName: 'ID', width: 80, sortable: true },
        { field: 'name', headerName: 'Name', width: 180, sortable: true },
        { field: 'email', headerName: 'Email', width: 240 },
        { field: 'department', headerName: 'Department', width: 150, sortable: true },
        { field: 'salary', headerName: 'Salary', width: 120, sortable: true },
        { field: 'active', headerName: 'Active', width: 100 },
      ],
      rowData: generateEmployeeData(10000),
      options: {
        rowHeight: 40,
        headerHeight: 48,
        theme: 'light',
        plugins: ['sorting', 'pagination', 'columnResize'],
        paginationPageSize: 50,
      },
    },
  },

  grouped: {
    label: 'Grouped Data',
    config: {
      columns: [
        { field: 'name', headerName: 'Employee', width: 180, sortable: true },
        { field: 'department', headerName: 'Department', width: 150, sortable: true, rowGroup: true },
        { field: 'role', headerName: 'Role', width: 160 },
        { field: 'salary', headerName: 'Salary', width: 120, sortable: true, aggFunc: 'sum' },
        { field: 'yearsExp', headerName: 'Experience', width: 110, aggFunc: 'avg' },
      ],
      rowData: generateGroupedData(60),
      options: {
        rowHeight: 40,
        headerHeight: 48,
        theme: 'light',
        plugins: ['sorting', 'grouping', 'aggregation', 'columnResize'],
      },
    },
  },

  columnPinning: {
    label: 'Column Pinning',
    config: {
      columns: [
        { field: 'id', headerName: 'ID', width: 70, pinned: 'left' as const },
        { field: 'name', headerName: 'Name', width: 180, pinned: 'left' as const, sortable: true },
        { field: 'email', headerName: 'Email', width: 240 },
        { field: 'department', headerName: 'Department', width: 150 },
        { field: 'phone', headerName: 'Phone', width: 140 },
        { field: 'address', headerName: 'Address', width: 260 },
        { field: 'city', headerName: 'City', width: 130 },
        { field: 'state', headerName: 'State', width: 100 },
        { field: 'salary', headerName: 'Salary', width: 120 },
        { field: 'actions', headerName: 'Actions', width: 100, pinned: 'right' as const },
      ],
      rowData: generatePinnedData(50),
      options: {
        rowHeight: 40,
        headerHeight: 48,
        theme: 'light',
        plugins: ['sorting', 'columnPinning', 'columnResize', 'selection'],
        rowSelection: 'multiple',
      },
    },
  },

  fullFeatured: {
    label: 'Full Featured',
    config: {
      columns: [
        { field: 'id', headerName: 'ID', width: 70, sortable: true, pinned: 'left' as const },
        { field: 'name', headerName: 'Name', width: 180, sortable: true, editable: true, filterable: true },
        { field: 'email', headerName: 'Email', width: 240, sortable: true },
        { field: 'department', headerName: 'Department', width: 150, sortable: true, filterable: true },
        { field: 'salary', headerName: 'Salary', width: 120, sortable: true, editable: true },
        { field: 'startDate', headerName: 'Start Date', width: 130, sortable: true },
        { field: 'active', headerName: 'Active', width: 100, sortable: true },
      ],
      rowData: generateEmployeeData(1000),
      options: {
        rowHeight: 40,
        headerHeight: 48,
        theme: 'light',
        plugins: [
          'sorting',
          'filtering',
          'selection',
          'editing',
          'columnResize',
          'columnPinning',
          'pagination',
          'contextMenu',
          'clipboard',
        ],
        paginationPageSize: 50,
        rowSelection: 'multiple',
      },
    },
  },
};

// ── Storage Key ──

const STORAGE_KEY = 'gridstorm-playground-config';

// ── Config Parser ──

function parseConfig(json: string): ParseResult {
  try {
    const parsed = JSON.parse(json);

    if (!parsed.columns || !Array.isArray(parsed.columns)) {
      return { valid: false, config: null, error: 'Missing or invalid "columns" array' };
    }
    if (!parsed.rowData || !Array.isArray(parsed.rowData)) {
      return { valid: false, config: null, error: 'Missing or invalid "rowData" array' };
    }
    for (let i = 0; i < parsed.columns.length; i++) {
      const col = parsed.columns[i];
      if (!col.field) {
        return { valid: false, config: null, error: `Column at index ${i} is missing "field"` };
      }
    }

    return { valid: true, config: parsed as PlaygroundConfig, error: null };
  } catch (err) {
    return {
      valid: false,
      config: null,
      error: err instanceof Error ? err.message : 'Invalid JSON',
    };
  }
}

// ── Build Plugins from Config ──

function buildPlugins(config: PlaygroundConfig): GridPlugin[] {
  const pluginNames = config.options?.plugins ?? [];
  const result: GridPlugin[] = [];

  for (const name of pluginNames) {
    const factory = pluginMap[name];
    if (factory) {
      result.push(factory(config));
    }
  }

  return result;
}

// ── Encode/Decode for Sharing ──

function encodeConfig(json: string): string {
  try {
    return btoa(encodeURIComponent(json));
  } catch {
    return '';
  }
}

function decodeConfig(hash: string): string | null {
  try {
    return decodeURIComponent(atob(hash));
  } catch {
    return null;
  }
}

// ── Grid Preview Component ──

function GridPreview({
  config,
  gridKey,
}: {
  config: PlaygroundConfig;
  gridKey: number;
}) {
  const plugins = useMemo(() => buildPlugins(config), [gridKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = useMemo<ColumnDef[]>(() => {
    return config.columns.map((col) => ({
      ...col,
      headerName: col.headerName || col.field,
    }));
  }, [config.columns]);

  const theme = config.options?.theme ?? 'light';

  return (
    <div
      data-theme={theme}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <GridStorm
        key={gridKey}
        columns={columns}
        rowData={config.rowData}
        plugins={plugins}
        rowHeight={config.options?.rowHeight ?? 40}
        headerHeight={config.options?.headerHeight ?? 48}
        height="100%"
        rowSelection={config.options?.rowSelection}
        ariaLabel="GridStorm Playground Preview"
      />
    </div>
  );
}

// ── Error Display ──

function ErrorDisplay({ error }: { error: string }) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fef2f2',
        color: '#991b1b',
        padding: 32,
        fontSize: 14,
        fontFamily: 'monospace',
      }}
    >
      <div style={{ maxWidth: 500, textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>!</div>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Invalid Configuration</div>
        <div style={{ color: '#b91c1c' }}>{error}</div>
      </div>
    </div>
  );
}

// ── Main App ──

export function App() {
  // Load initial config: hash > localStorage > default preset
  const getInitialJson = (): string => {
    // Check URL hash for shared config
    const hash = window.location.hash.slice(1);
    if (hash) {
      const decoded = decodeConfig(hash);
      if (decoded) {
        const result = parseConfig(decoded);
        if (result.valid) return decoded;
      }
    }

    // Check localStorage
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const result = parseConfig(stored);
      if (result.valid) return stored;
    }

    // Default
    return JSON.stringify(PRESETS.basic!.config, null, 2);
  };

  const [editorValue, setEditorValue] = useState<string>(getInitialJson);
  const [parseResult, setParseResult] = useState<ParseResult>(() =>
    parseConfig(getInitialJson()),
  );
  const [lastValidConfig, setLastValidConfig] = useState<PlaygroundConfig | null>(
    () => parseConfig(getInitialJson()).config,
  );
  const [gridKey, setGridKey] = useState(0);
  const [theme, setTheme] = useState<string>(() => {
    const initial = parseConfig(getInitialJson());
    return initial.config?.options?.theme ?? 'light';
  });
  const [selectedPreset, setSelectedPreset] = useState<string>('basic');
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [shareFeedback, setShareFeedback] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced config update
  const handleEditorChange = useCallback((value: string | undefined) => {
    const json = value ?? '';
    setEditorValue(json);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const result = parseConfig(json);
      setParseResult(result);

      if (result.valid && result.config) {
        setLastValidConfig(result.config);
        setGridKey((k) => k + 1);
        setTheme(result.config.options?.theme ?? 'light');
        localStorage.setItem(STORAGE_KEY, json);
      }
    }, 300);
  }, []);

  // Load preset
  const handlePresetChange = useCallback(
    (presetKey: string) => {
      const preset = PRESETS[presetKey];
      if (!preset) return;
      setSelectedPreset(presetKey);
      const json = JSON.stringify(preset.config, null, 2);
      setEditorValue(json);

      const result = parseConfig(json);
      setParseResult(result);
      if (result.valid && result.config) {
        setLastValidConfig(result.config);
        setGridKey((k) => k + 1);
        setTheme(result.config.options?.theme ?? 'light');
        localStorage.setItem(STORAGE_KEY, json);
      }
    },
    [],
  );

  // Format JSON
  const handleFormat = useCallback(() => {
    try {
      const parsed = JSON.parse(editorValue);
      const formatted = JSON.stringify(parsed, null, 2);
      setEditorValue(formatted);
    } catch {
      // If invalid JSON, do nothing
    }
  }, [editorValue]);

  // Reset to default
  const handleReset = useCallback(() => {
    const json = JSON.stringify(PRESETS.basic!.config, null, 2);
    setEditorValue(json);
    const result = parseConfig(json);
    setParseResult(result);
    if (result.valid && result.config) {
      setLastValidConfig(result.config);
      setGridKey((k) => k + 1);
      setTheme(result.config.options?.theme ?? 'light');
    }
    localStorage.removeItem(STORAGE_KEY);
    window.location.hash = '';
  }, []);

  // Copy config
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(editorValue).then(() => {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    });
  }, [editorValue]);

  // Share via URL hash
  const handleShare = useCallback(() => {
    const encoded = encodeConfig(editorValue);
    if (encoded) {
      window.location.hash = encoded;
      navigator.clipboard.writeText(window.location.href).then(() => {
        setShareFeedback(true);
        setTimeout(() => setShareFeedback(false), 2000);
      });
    }
  }, [editorValue]);

  // Theme toggle via dropdown
  const handleThemeChange = useCallback(
    (newTheme: string) => {
      setTheme(newTheme);
      // Update the config JSON as well
      try {
        const parsed = JSON.parse(editorValue);
        if (!parsed.options) parsed.options = {};
        parsed.options.theme = newTheme;
        const json = JSON.stringify(parsed, null, 2);
        setEditorValue(json);
        const result = parseConfig(json);
        setParseResult(result);
        if (result.valid && result.config) {
          setLastValidConfig(result.config);
          setGridKey((k) => k + 1);
          localStorage.setItem(STORAGE_KEY, json);
        }
      } catch {
        // If JSON is invalid, just change the preview theme
      }
    },
    [editorValue],
  );

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Status bar info
  const rowCount = lastValidConfig?.rowData?.length ?? 0;
  const colCount = lastValidConfig?.columns?.length ?? 0;
  const activePlugins = lastValidConfig?.options?.plugins ?? [];

  const editorTheme = theme === 'dark' ? 'vs-dark' : 'light';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* ── Header ── */}
      <header style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
            <span style={{ color: '#2563eb' }}>GridStorm</span>{' '}
            <span style={{ fontWeight: 400, color: '#888' }}>Playground</span>
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Preset selector */}
          <select
            onChange={(e) => handlePresetChange(e.target.value)}
            value={selectedPreset}
            style={selectStyle}
          >
            <option value="" disabled>
              Examples
            </option>
            {Object.entries(PRESETS).map(([key, preset]) => (
              <option key={key} value={key}>
                {preset.label}
              </option>
            ))}
          </select>

          {/* Theme selector */}
          <select
            value={theme}
            onChange={(e) => handleThemeChange(e.target.value)}
            style={selectStyle}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="high-contrast">High Contrast</option>
          </select>

          <div style={{ width: 1, height: 20, background: '#ddd' }} />

          {/* Action buttons */}
          <button onClick={handleFormat} style={btnStyle} title="Format JSON">
            Format
          </button>
          <button onClick={handleCopy} style={btnStyle} title="Copy config to clipboard">
            {copyFeedback ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={handleShare} style={btnStyle} title="Copy shareable URL">
            {shareFeedback ? 'Link Copied!' : 'Share'}
          </button>
          <button
            onClick={handleReset}
            style={{ ...btnStyle, color: '#dc2626' }}
            title="Reset to default"
          >
            Reset
          </button>
        </div>
      </header>

      {/* ── Main Content: Editor + Preview ── */}
      <div style={mainContentStyle}>
        {/* Left panel: Monaco Editor */}
        <div style={editorPanelStyle}>
          <div style={panelHeaderStyle}>
            <span style={{ fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#666' }}>
              Configuration (JSON)
            </span>
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 10,
                fontWeight: 600,
                background: parseResult.valid ? '#dcfce7' : '#fef2f2',
                color: parseResult.valid ? '#166534' : '#991b1b',
              }}
            >
              {parseResult.valid ? 'Valid' : 'Error'}
            </span>
          </div>

          <div
            style={{
              flex: 1,
              border: parseResult.valid ? '2px solid transparent' : '2px solid #ef4444',
              overflow: 'hidden',
            }}
          >
            <Editor
              defaultLanguage="json"
              value={editorValue}
              onChange={handleEditorChange}
              theme={editorTheme}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                tabSize: 2,
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 12 },
                bracketPairColorization: { enabled: true },
                suggest: { showWords: false },
              }}
            />
          </div>

          {/* Error message below editor */}
          {!parseResult.valid && parseResult.error && (
            <div style={errorBarStyle}>
              {parseResult.error}
            </div>
          )}
        </div>

        {/* Resize handle visual */}
        <div style={resizeHandleStyle} />

        {/* Right panel: Grid Preview */}
        <div style={previewPanelStyle}>
          <div style={panelHeaderStyle}>
            <span style={{ fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: '#666' }}>
              Live Preview
            </span>
          </div>

          {lastValidConfig ? (
            <GridPreview config={lastValidConfig} gridKey={gridKey} />
          ) : (
            <ErrorDisplay error="Enter a valid JSON configuration to see the grid" />
          )}
        </div>
      </div>

      {/* ── Status Bar ── */}
      <footer style={statusBarStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span>
            <span style={{ fontWeight: 600 }}>
              {parseResult.valid ? '\u2713' : '\u2717'}
            </span>{' '}
            {parseResult.valid ? 'Valid config' : 'Invalid JSON'}
          </span>

          <span style={statusSeparator}>|</span>
          <span>
            Rows: <strong>{rowCount.toLocaleString()}</strong>
          </span>

          <span style={statusSeparator}>|</span>
          <span>
            Cols: <strong>{colCount}</strong>
          </span>

          {activePlugins.length > 0 && (
            <>
              <span style={statusSeparator}>|</span>
              <span>
                Plugins:{' '}
                <strong>{activePlugins.join(', ')}</strong>
              </span>
            </>
          )}
        </div>

        <span style={{ color: '#999', fontSize: 11 }}>
          GridStorm Playground
        </span>
      </footer>
    </div>
  );
}

// ── Styles ──

const headerStyle: React.CSSProperties = {
  padding: '10px 16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: '1px solid #e0e0e0',
  background: '#fafafa',
  gap: 12,
  flexWrap: 'wrap',
  minHeight: 52,
};

const mainContentStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  overflow: 'hidden',
};

const editorPanelStyle: React.CSSProperties = {
  flex: '1 1 50%',
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  borderRight: '1px solid #e0e0e0',
};

const previewPanelStyle: React.CSSProperties = {
  flex: '1 1 50%',
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  overflow: 'hidden',
};

const panelHeaderStyle: React.CSSProperties = {
  padding: '8px 12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderBottom: '1px solid #e0e0e0',
  background: '#f8f9fa',
  minHeight: 36,
};

const resizeHandleStyle: React.CSSProperties = {
  width: 4,
  background: '#e0e0e0',
  cursor: 'col-resize',
  flexShrink: 0,
};

const statusBarStyle: React.CSSProperties = {
  padding: '6px 16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  borderTop: '1px solid #e0e0e0',
  background: '#f8f9fa',
  fontSize: 12,
  color: '#555',
  flexWrap: 'wrap',
  gap: 8,
  minHeight: 32,
};

const statusSeparator: React.CSSProperties = {
  color: '#ccc',
};

const btnStyle: React.CSSProperties = {
  padding: '5px 12px',
  fontSize: 12,
  border: '1px solid #d0d0d0',
  borderRadius: 4,
  background: '#fff',
  cursor: 'pointer',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
};

const selectStyle: React.CSSProperties = {
  padding: '5px 10px',
  fontSize: 12,
  border: '1px solid #d0d0d0',
  borderRadius: 4,
  background: '#fff',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const errorBarStyle: React.CSSProperties = {
  padding: '8px 12px',
  background: '#fef2f2',
  color: '#991b1b',
  fontSize: 12,
  fontFamily: 'monospace',
  borderTop: '1px solid #fecaca',
};
