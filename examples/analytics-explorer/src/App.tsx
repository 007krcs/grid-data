import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  GridStorm,
  useGridSelection,
  useGridSort,
  useGridPagination,
  reactCellRenderer,
} from '@gridstorm/react';
import type {
  GridApi,
  ReactColumnDef,
  CellRendererProps,
  SortModelItem,
} from '@gridstorm/react';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { FilteringPlugin } from '@gridstorm/plugin-filtering';
import { SelectionPlugin } from '@gridstorm/plugin-selection';
import { ColumnResizePlugin } from '@gridstorm/plugin-column-resize';
import { PaginationPlugin } from '@gridstorm/plugin-pagination';
import { GroupingPlugin } from '@gridstorm/plugin-grouping';
import { AggregationPlugin } from '@gridstorm/plugin-aggregation';
import '@gridstorm/theme-default';

// ==============================================================================
// Types
// ==============================================================================

interface AnalyticsRow {
  id: number;
  userId: string;
  sessionId: string;
  page: string;
  event: string;
  category: string;
  timestamp: string;
  duration: number;
  browser: string;
  os: string;
  country: string;
  city: string;
  device: string;
  referrer: string;
  revenue: number;
  errorCode: string | null;
  loadTime: number;
  bounced: boolean;
}

// ==============================================================================
// Data Pools
// ==============================================================================

const EVENTS = ['pageview', 'click', 'scroll', 'form_submit', 'purchase', 'error'] as const;

const CATEGORIES: Record<string, string> = {
  pageview: 'navigation',
  click: 'engagement',
  scroll: 'engagement',
  form_submit: 'conversion',
  purchase: 'conversion',
  error: 'system',
};

const PAGES = [
  '/home',
  '/products',
  '/products/electronics',
  '/products/clothing',
  '/products/books',
  '/checkout',
  '/checkout/confirm',
  '/blog/getting-started',
  '/blog/performance-tips',
  '/blog/best-practices',
  '/pricing',
  '/pricing/enterprise',
  '/about',
  '/contact',
  '/docs',
  '/docs/api-reference',
  '/docs/tutorials',
  '/account/settings',
  '/account/profile',
  '/search',
];

const BROWSERS = ['Chrome', 'Firefox', 'Safari', 'Edge'] as const;
const DEVICES = ['desktop', 'mobile', 'tablet'] as const;
const REFERRERS = ['google', 'direct', 'social', 'email', 'paid'] as const;

const COUNTRIES_CITIES: [string, string[]][] = [
  ['United States', ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'San Francisco', 'Seattle', 'Austin', 'Denver', 'Boston']],
  ['United Kingdom', ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow']],
  ['Germany', ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne']],
  ['France', ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice']],
  ['Japan', ['Tokyo', 'Osaka', 'Yokohama', 'Nagoya', 'Sapporo']],
  ['Canada', ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa']],
  ['Australia', ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide']],
  ['Brazil', ['Sao Paulo', 'Rio de Janeiro', 'Brasilia', 'Salvador', 'Fortaleza']],
  ['India', ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad']],
  ['South Korea', ['Seoul', 'Busan', 'Incheon', 'Daegu', 'Daejeon']],
];

const ERROR_CODES = ['ERR_404', 'ERR_500', 'ERR_TIMEOUT', 'ERR_NETWORK', 'ERR_AUTH', 'ERR_RATE_LIMIT'];

// ==============================================================================
// Data Generator
// ==============================================================================

function generateAnalytics(count: number): AnalyticsRow[] {
  const rows: AnalyticsRow[] = [];
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < count; i++) {
    const event = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    const [country, cities] = COUNTRIES_CITIES[Math.floor(Math.random() * COUNTRIES_CITIES.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    const device = DEVICES[Math.floor(Math.random() * DEVICES.length)];
    const browser = BROWSERS[Math.floor(Math.random() * BROWSERS.length)];

    // OS correlates loosely with device
    let os: string;
    if (device === 'mobile') {
      os = Math.random() < 0.6 ? 'iOS' : 'Android';
    } else if (device === 'tablet') {
      os = Math.random() < 0.5 ? 'iOS' : 'Android';
    } else {
      const desktopOS = ['Windows', 'macOS', 'Linux'] as const;
      os = desktopOS[Math.floor(Math.random() * desktopOS.length)];
    }

    const isPurchase = event === 'purchase';
    const isError = event === 'error';

    rows.push({
      id: i + 1,
      userId: `usr_${String(Math.floor(Math.random() * 5000)).padStart(5, '0')}`,
      sessionId: `ses_${Math.random().toString(36).slice(2, 10)}`,
      page: PAGES[Math.floor(Math.random() * PAGES.length)],
      event,
      category: CATEGORIES[event],
      timestamp: new Date(now - Math.floor(Math.random() * thirtyDays)).toISOString(),
      duration: Math.floor(Math.random() * 30000) + 100,
      browser,
      os,
      country,
      city,
      device,
      referrer: REFERRERS[Math.floor(Math.random() * REFERRERS.length)],
      revenue: isPurchase ? Math.round((Math.random() * 500 + 5) * 100) / 100 : 0,
      errorCode: isError ? ERROR_CODES[Math.floor(Math.random() * ERROR_CODES.length)] : null,
      loadTime: Math.floor(Math.random() * 5000) + 200,
      bounced: Math.random() < 0.25,
    });
  }

  return rows;
}

// ==============================================================================
// Custom Cell Renderers
// ==============================================================================

const EVENT_COLORS: Record<string, { bg: string; text: string }> = {
  pageview: { bg: '#dbeafe', text: '#1d4ed8' },
  click: { bg: '#dcfce7', text: '#15803d' },
  scroll: { bg: '#f3f4f6', text: '#4b5563' },
  form_submit: { bg: '#f3e8ff', text: '#7c3aed' },
  purchase: { bg: '#fef3c7', text: '#b45309' },
  error: { bg: '#fee2e2', text: '#dc2626' },
};

function EventBadge({ value }: CellRendererProps<AnalyticsRow, string>) {
  const colors = EVENT_COLORS[value] || { bg: '#f3f4f6', text: '#374151' };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '11px',
        fontWeight: 600,
        backgroundColor: colors.bg,
        color: colors.text,
        lineHeight: '18px',
      }}
    >
      {value}
    </span>
  );
}

function DurationBar({ value }: CellRendererProps<AnalyticsRow, number>) {
  const maxDuration = 30000;
  const pct = Math.min((value / maxDuration) * 100, 100);
  const formatted = value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${value}ms`;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
      <span style={{ fontSize: '12px', minWidth: 44, textAlign: 'right' }}>{formatted}</span>
      <div
        style={{
          flex: 1,
          height: 6,
          borderRadius: 3,
          backgroundColor: 'var(--gs-border-color, #e5e7eb)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: 3,
            backgroundColor: pct > 70 ? '#ef4444' : pct > 40 ? '#f59e0b' : '#22c55e',
            transition: 'width 0.2s ease',
          }}
        />
      </div>
    </div>
  );
}

const BROWSER_ICONS: Record<string, string> = {
  Chrome: '\uD83C\uDF10',
  Firefox: '\uD83E\uDD8A',
  Safari: '\uD83E\uDDED',
  Edge: '\uD83D\uDD35',
};

function BrowserCell({ value }: CellRendererProps<AnalyticsRow, string>) {
  return (
    <span style={{ fontSize: '12px' }}>
      {BROWSER_ICONS[value] || '\uD83C\uDF10'} {value}
    </span>
  );
}

const DEVICE_ICONS: Record<string, string> = {
  desktop: '\uD83D\uDDA5\uFE0F',
  mobile: '\uD83D\uDCF1',
  tablet: '\uD83D\uDCCB',
};

function DeviceCell({ value }: CellRendererProps<AnalyticsRow, string>) {
  return (
    <span style={{ fontSize: '12px' }}>
      {DEVICE_ICONS[value] || ''} {value}
    </span>
  );
}

function RevenueCell({ value }: CellRendererProps<AnalyticsRow, number>) {
  const hasRevenue = value > 0;
  return (
    <span
      style={{
        fontWeight: hasRevenue ? 600 : 400,
        color: hasRevenue ? '#15803d' : '#9ca3af',
        fontVariantNumeric: 'tabular-nums',
        fontSize: '12px',
      }}
    >
      ${value.toFixed(2)}
    </span>
  );
}

const REFERRER_COLORS: Record<string, { bg: string; text: string }> = {
  google: { bg: '#dbeafe', text: '#1d4ed8' },
  direct: { bg: '#f3f4f6', text: '#4b5563' },
  social: { bg: '#fce7f3', text: '#be185d' },
  email: { bg: '#ffedd5', text: '#c2410c' },
  paid: { bg: '#dcfce7', text: '#15803d' },
};

function ReferrerTag({ value }: CellRendererProps<AnalyticsRow, string>) {
  const colors = REFERRER_COLORS[value] || { bg: '#f3f4f6', text: '#374151' };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: '11px',
        fontWeight: 500,
        backgroundColor: colors.bg,
        color: colors.text,
        lineHeight: '18px',
      }}
    >
      {value}
    </span>
  );
}

// ==============================================================================
// Performance Metrics Types
// ==============================================================================

interface PerfMetrics {
  rowCount: number;
  genTime: number;
  renderTime: number;
  sortTime: number | null;
  filterTime: number | null;
  fps: number;
  memory: number | null;
}

// ==============================================================================
// Metric Card Component
// ==============================================================================

function MetricCard({ label, value, unit, color }: { label: string; value: string | number; unit?: string; color?: string }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--gs-bg-color, #fff)',
        border: '1px solid var(--gs-border-color, #e5e7eb)',
        borderRadius: 8,
        padding: '10px 14px',
        minWidth: 120,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span style={{ fontSize: '18px', fontWeight: 700, color: color || 'var(--gs-text-color, #111827)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
        {unit && <span style={{ fontSize: '12px', fontWeight: 500, color: '#9ca3af', marginLeft: 2 }}>{unit}</span>}
      </span>
    </div>
  );
}

function getTimingColor(ms: number | null): string {
  if (ms === null) return '#9ca3af';
  if (ms < 50) return '#15803d';
  if (ms < 200) return '#b45309';
  return '#dc2626';
}

// ==============================================================================
// Performance Panel Component
// ==============================================================================

function PerfPanel({ metrics }: { metrics: PerfMetrics }) {
  const memoryStr = metrics.memory !== null
    ? `${(metrics.memory / (1024 * 1024)).toFixed(1)}`
    : 'N/A';

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8,
        padding: '12px 16px',
        backgroundColor: 'var(--gs-bg-color, #f9fafb)',
        borderBottom: '1px solid var(--gs-border-color, #e5e7eb)',
      }}
    >
      <MetricCard label="Row Count" value={metrics.rowCount.toLocaleString()} />
      <MetricCard
        label="Data Gen"
        value={metrics.genTime.toFixed(1)}
        unit="ms"
        color={getTimingColor(metrics.genTime)}
      />
      <MetricCard
        label="Render"
        value={metrics.renderTime.toFixed(1)}
        unit="ms"
        color={getTimingColor(metrics.renderTime)}
      />
      <MetricCard
        label="Sort"
        value={metrics.sortTime !== null ? metrics.sortTime.toFixed(1) : '--'}
        unit={metrics.sortTime !== null ? 'ms' : ''}
        color={getTimingColor(metrics.sortTime)}
      />
      <MetricCard
        label="Filter"
        value={metrics.filterTime !== null ? metrics.filterTime.toFixed(1) : '--'}
        unit={metrics.filterTime !== null ? 'ms' : ''}
        color={getTimingColor(metrics.filterTime)}
      />
      <MetricCard
        label="FPS"
        value={metrics.fps}
        color={metrics.fps >= 50 ? '#15803d' : metrics.fps >= 30 ? '#b45309' : '#dc2626'}
      />
      <MetricCard
        label="Memory"
        value={memoryStr}
        unit={metrics.memory !== null ? 'MB' : ''}
      />
      <div
        style={{
          backgroundColor: '#dbeafe',
          border: '1px solid #93c5fd',
          borderRadius: 8,
          padding: '10px 14px',
          minWidth: 120,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <span style={{ fontSize: '11px', color: '#1d4ed8', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Bundle (core)
        </span>
        <span style={{ fontSize: '18px', fontWeight: 700, color: '#1d4ed8' }}>
          ~35<span style={{ fontSize: '12px', fontWeight: 500, marginLeft: 2 }}>KB gz</span>
        </span>
      </div>
    </div>
  );
}

// ==============================================================================
// Toolbar (inside GridContext)
// ==============================================================================

function Toolbar({
  rowCountOptions,
  activeRowCount,
  onRowCountChange,
  onTimedSort,
  onTimedFilter,
  eventFilter,
  setEventFilter,
  deviceFilter,
  setDeviceFilter,
  theme,
  setTheme,
}: {
  rowCountOptions: number[];
  activeRowCount: number;
  onRowCountChange: (count: number) => void;
  onTimedSort: (model: SortModelItem[]) => void;
  onTimedFilter: (event: string, device: string) => void;
  eventFilter: string;
  setEventFilter: (v: string) => void;
  deviceFilter: string;
  setDeviceFilter: (v: string) => void;
  theme: string;
  setTheme: (v: string) => void;
}) {
  const { selectedCount } = useGridSelection<AnalyticsRow>();
  const { clearSort } = useGridSort();

  const handleEventFilter = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      setEventFilter(val);
      onTimedFilter(val, deviceFilter);
    },
    [setEventFilter, onTimedFilter, deviceFilter],
  );

  const handleDeviceFilter = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      setDeviceFilter(val);
      onTimedFilter(eventFilter, val);
    },
    [setDeviceFilter, onTimedFilter, eventFilter],
  );

  return (
    <div
      style={{
        padding: '12px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        borderBottom: '1px solid var(--gs-border-color, #e5e7eb)',
        backgroundColor: 'var(--gs-bg-color, #fff)',
      }}
    >
      {/* Row 1: Title + Row Count Selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gs-text-color, #111827)', margin: 0, whiteSpace: 'nowrap' }}>
          GridStorm Analytics Explorer
        </h1>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {rowCountOptions.map((count) => {
            const label = count >= 1000 ? `${count / 1000}K` : String(count);
            const isActive = count === activeRowCount;
            return (
              <button
                key={count}
                onClick={() => onRowCountChange(count)}
                style={{
                  padding: '4px 12px',
                  borderRadius: 6,
                  border: isActive ? '2px solid #3b82f6' : '1px solid var(--gs-border-color, #d1d5db)',
                  backgroundColor: isActive ? '#3b82f6' : 'var(--gs-bg-color, #fff)',
                  color: isActive ? '#fff' : 'var(--gs-text-color, #374151)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {label}
              </button>
            );
          })}
          <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: 4 }}>rows</span>
        </div>
      </div>

      {/* Row 2: Sort + Filter + Selection + Theme */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>Sort by:</span>
        <button onClick={() => onTimedSort([{ colId: 'event', sort: 'asc' }])} style={sortBtnStyle}>
          Event \u25BC
        </button>
        <button onClick={() => onTimedSort([{ colId: 'duration', sort: 'desc' }])} style={sortBtnStyle}>
          Duration \u25BC
        </button>
        <button onClick={() => onTimedSort([{ colId: 'revenue', sort: 'desc' }])} style={sortBtnStyle}>
          Revenue \u25BC
        </button>
        <button onClick={() => { clearSort(); }} style={{ ...sortBtnStyle, color: '#dc2626' }}>
          Clear Sort
        </button>

        <span style={{ width: 1, height: 20, backgroundColor: 'var(--gs-border-color, #d1d5db)' }} />

        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>Filter:</span>
        <select value={eventFilter} onChange={handleEventFilter} style={selectStyle}>
          <option value="">All Events</option>
          {EVENTS.map((ev) => (
            <option key={ev} value={ev}>
              {ev}
            </option>
          ))}
        </select>
        <select value={deviceFilter} onChange={handleDeviceFilter} style={selectStyle}>
          <option value="">All Devices</option>
          {DEVICES.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <span style={{ width: 1, height: 20, backgroundColor: 'var(--gs-border-color, #d1d5db)' }} />

        <span style={{ fontSize: '12px', color: '#6b7280' }}>
          Selected: <strong>{selectedCount}</strong>
        </span>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>Theme:</span>
          <select value={theme} onChange={(e) => setTheme(e.target.value)} style={selectStyle}>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>
    </div>
  );
}

const sortBtnStyle: React.CSSProperties = {
  padding: '3px 10px',
  borderRadius: 4,
  border: '1px solid var(--gs-border-color, #d1d5db)',
  backgroundColor: 'var(--gs-bg-color, #fff)',
  color: 'var(--gs-text-color, #374151)',
  fontSize: '12px',
  fontWeight: 500,
  cursor: 'pointer',
};

const selectStyle: React.CSSProperties = {
  padding: '3px 8px',
  borderRadius: 4,
  border: '1px solid var(--gs-border-color, #d1d5db)',
  backgroundColor: 'var(--gs-bg-color, #fff)',
  color: 'var(--gs-text-color, #374151)',
  fontSize: '12px',
  cursor: 'pointer',
};

// ==============================================================================
// Pagination Footer (inside GridContext)
// ==============================================================================

function PaginationFooter() {
  const { currentPage, totalPages, totalRows, pageSize, hasNextPage, hasPreviousPage, nextPage, previousPage, firstPage, lastPage } =
    useGridPagination();

  const startRow = currentPage * pageSize + 1;
  const endRow = Math.min(startRow + pageSize - 1, totalRows);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        borderTop: '1px solid var(--gs-border-color, #e5e7eb)',
        backgroundColor: 'var(--gs-bg-color, #fff)',
        fontSize: '12px',
        color: '#6b7280',
      }}
    >
      <span>
        Showing {startRow.toLocaleString()}\u2013{endRow.toLocaleString()} of {totalRows.toLocaleString()} rows
      </span>
      <div style={{ display: 'flex', gap: 4 }}>
        <button onClick={firstPage} disabled={!hasPreviousPage} style={pageBtnStyle}>
          \u00AB
        </button>
        <button onClick={previousPage} disabled={!hasPreviousPage} style={pageBtnStyle}>
          \u2039
        </button>
        <span style={{ padding: '3px 10px', fontSize: '12px', fontWeight: 600, color: 'var(--gs-text-color, #111827)' }}>
          {currentPage + 1} / {totalPages}
        </span>
        <button onClick={nextPage} disabled={!hasNextPage} style={pageBtnStyle}>
          \u203A
        </button>
        <button onClick={lastPage} disabled={!hasNextPage} style={pageBtnStyle}>
          \u00BB
        </button>
      </div>
    </div>
  );
}

const pageBtnStyle: React.CSSProperties = {
  padding: '3px 8px',
  borderRadius: 4,
  border: '1px solid var(--gs-border-color, #d1d5db)',
  backgroundColor: 'var(--gs-bg-color, #fff)',
  color: 'var(--gs-text-color, #374151)',
  fontSize: '13px',
  cursor: 'pointer',
  minWidth: 30,
  textAlign: 'center',
};

// ==============================================================================
// Column Definitions
// ==============================================================================

const columns: ReactColumnDef<AnalyticsRow>[] = [
  {
    field: 'id',
    headerName: 'ID',
    width: 80,
    sortable: true,
  },
  {
    field: 'userId',
    headerName: 'User ID',
    width: 120,
    sortable: true,
  },
  {
    field: 'page',
    headerName: 'Page',
    width: 180,
    sortable: true,
    filter: true,
  },
  {
    field: 'event',
    headerName: 'Event',
    width: 110,
    sortable: true,
    filter: true,
    cellRenderer: reactCellRenderer(EventBadge),
  },
  {
    field: 'category',
    headerName: 'Category',
    width: 120,
    sortable: true,
    filter: true,
    enableRowGroup: true,
  },
  {
    field: 'timestamp',
    headerName: 'Timestamp',
    width: 170,
    sortable: true,
    valueFormatter: ({ value }: { value: string }) => {
      if (!value) return '';
      const d = new Date(value);
      return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    },
  },
  {
    field: 'duration',
    headerName: 'Duration',
    width: 150,
    sortable: true,
    cellRenderer: reactCellRenderer(DurationBar),
  },
  {
    field: 'browser',
    headerName: 'Browser',
    width: 110,
    sortable: true,
    filter: true,
    cellRenderer: reactCellRenderer(BrowserCell),
  },
  {
    field: 'device',
    headerName: 'Device',
    width: 100,
    sortable: true,
    filter: true,
    cellRenderer: reactCellRenderer(DeviceCell),
  },
  {
    field: 'country',
    headerName: 'Country',
    width: 120,
    sortable: true,
    filter: true,
    enableRowGroup: true,
  },
  {
    field: 'referrer',
    headerName: 'Referrer',
    width: 100,
    sortable: true,
    filter: true,
    cellRenderer: reactCellRenderer(ReferrerTag),
  },
  {
    field: 'revenue',
    headerName: 'Revenue',
    width: 110,
    sortable: true,
    cellRenderer: reactCellRenderer(RevenueCell),
    aggFunc: 'sum',
  },
];

// ==============================================================================
// Plugin Configuration
// ==============================================================================

const plugins = [
  SortingPlugin({ multiSort: true }),
  FilteringPlugin(),
  SelectionPlugin({ mode: 'multiple' }),
  ColumnResizePlugin(),
  PaginationPlugin({ pageSize: 100 }),
  GroupingPlugin({ defaultExpanded: false }),
  AggregationPlugin(),
];

// ==============================================================================
// Main App Component
// ==============================================================================

export function App() {
  const [theme, setTheme] = useState('light');
  const [activeRowCount, setActiveRowCount] = useState(1000);
  const [eventFilter, setEventFilter] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('');
  const apiRef = useRef<GridApi<AnalyticsRow> | null>(null);

  // Performance metrics
  const [metrics, setMetrics] = useState<PerfMetrics>({
    rowCount: 0,
    genTime: 0,
    renderTime: 0,
    sortTime: null,
    filterTime: null,
    fps: 0,
    memory: null,
  });

  // FPS counter
  const fpsRef = useRef({ frames: 0, lastTime: performance.now() });
  useEffect(() => {
    let rafId: number;
    const tick = () => {
      fpsRef.current.frames++;
      const now = performance.now();
      const elapsed = now - fpsRef.current.lastTime;
      if (elapsed >= 1000) {
        const fps = Math.round((fpsRef.current.frames * 1000) / elapsed);
        fpsRef.current.frames = 0;
        fpsRef.current.lastTime = now;

        // Read memory if available (Chrome only)
        const perf = performance as any;
        const memory = perf.memory ? perf.memory.usedJSHeapSize : null;

        setMetrics((prev) => ({ ...prev, fps, memory }));
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Generate initial data
  const [rowData, setRowData] = useState<AnalyticsRow[]>(() => {
    const start = performance.now();
    const data = generateAnalytics(1000);
    const genTime = performance.now() - start;
    // Will update metrics after first render
    setTimeout(() => {
      setMetrics((prev) => ({ ...prev, rowCount: 1000, genTime }));
    }, 0);
    return data;
  });

  // Row count change handler
  const handleRowCountChange = useCallback((count: number) => {
    setActiveRowCount(count);
    setEventFilter('');
    setDeviceFilter('');

    const genStart = performance.now();
    const data = generateAnalytics(count);
    const genTime = performance.now() - genStart;

    const renderStart = performance.now();
    setRowData(data);

    // Measure render time after React commits
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const renderTime = performance.now() - renderStart;
        setMetrics((prev) => ({
          ...prev,
          rowCount: count,
          genTime,
          renderTime,
          sortTime: null,
          filterTime: null,
        }));
      });
    });
  }, []);

  // Timed sort
  const handleTimedSort = useCallback((model: SortModelItem[]) => {
    if (!apiRef.current) return;
    const start = performance.now();
    apiRef.current.setSortModel(model);
    const elapsed = performance.now() - start;
    setMetrics((prev) => ({ ...prev, sortTime: elapsed }));
  }, []);

  // Timed filter
  const handleTimedFilter = useCallback((eventVal: string, deviceVal: string) => {
    if (!apiRef.current) return;
    const start = performance.now();
    const filterModel: Record<string, any> = {};

    if (eventVal) {
      filterModel['event'] = {
        filterType: 'text' as const,
        type: 'equals' as const,
        filter: eventVal,
      };
    }
    if (deviceVal) {
      filterModel['device'] = {
        filterType: 'text' as const,
        type: 'equals' as const,
        filter: deviceVal,
      };
    }

    apiRef.current.setFilterModel(filterModel);
    const elapsed = performance.now() - start;
    setMetrics((prev) => ({ ...prev, filterTime: elapsed }));
  }, []);

  // onGridReady: capture API + measure initial render
  const renderStartRef = useRef(performance.now());
  const handleGridReady = useCallback((api: GridApi<AnalyticsRow>) => {
    apiRef.current = api;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const renderTime = performance.now() - renderStartRef.current;
        setMetrics((prev) => ({ ...prev, renderTime }));
      });
    });
  }, []);

  const ROW_COUNT_OPTIONS = useMemo(() => [1000, 10000, 50000, 100000], []);

  return (
    <div
      data-theme={theme}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: 'var(--gs-bg-color, #f9fafb)',
        color: 'var(--gs-text-color, #111827)',
      }}
    >
      {/* Performance Metrics Panel */}
      <PerfPanel metrics={metrics} />

      {/* Grid */}
      <GridStorm<AnalyticsRow>
        columns={columns}
        rowData={rowData}
        getRowId={(row) => String(row.id)}
        plugins={plugins}
        rowHeight={36}
        headerHeight={40}
        height="100%"
        width="100%"
        pagination
        paginationPageSize={100}
        rowSelection="multiple"
        onGridReady={handleGridReady}
        theme={theme as any}
        containerStyle={{ flex: 1, minHeight: 0 }}
      >
        <Toolbar
          rowCountOptions={ROW_COUNT_OPTIONS}
          activeRowCount={activeRowCount}
          onRowCountChange={handleRowCountChange}
          onTimedSort={handleTimedSort}
          onTimedFilter={handleTimedFilter}
          eventFilter={eventFilter}
          setEventFilter={setEventFilter}
          deviceFilter={deviceFilter}
          setDeviceFilter={setDeviceFilter}
          theme={theme}
          setTheme={setTheme}
        />
        <PaginationFooter />
      </GridStorm>
    </div>
  );
}
