import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { GridSkeleton } from '../../shared/GridSkeleton';
import {
  GridStorm,
  useGridApi,
  useGridSelection,
  useGridSort,
  reactCellRenderer,
} from '@gridstorm/react';
import type {
  GridApi,
  ReactColumnDef,
  CellRendererProps,
  ContextMenuProps,
} from '@gridstorm/react';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { FilteringPlugin } from '@gridstorm/plugin-filtering';
import { SelectionPlugin } from '@gridstorm/plugin-selection';
import { ColumnResizePlugin } from '@gridstorm/plugin-column-resize';
import { ColumnPinningPlugin } from '@gridstorm/plugin-column-pinning';
import { GroupingPlugin } from '@gridstorm/plugin-grouping';
import { AggregationPlugin } from '@gridstorm/plugin-aggregation';
import { ContextMenuPlugin } from '@gridstorm/plugin-context-menu';
import '@gridstorm/theme-default';

// ══════════════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════════════

interface StockTick {
  id: number;
  symbol: string;
  company: string;
  sector: string;
  exchange: string;
  price: number;
  previousClose: number;
  change: number;
  changePct: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  avgVolume: number;
  marketCap: number;
  pe: number;
  dividend: number;
  week52High: number;
  week52Low: number;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  lastUpdate: number;
}

// ══════════════════════════════════════════════════════════════════════════════
// Stock Data Pool (~50 real symbols)
// ══════════════════════════════════════════════════════════════════════════════

interface StockSeed {
  symbol: string;
  company: string;
  sector: string;
  exchange: string;
  basePrice: number;
  basePE: number;
  baseDividend: number;
  baseMarketCap: number;
}

const STOCK_POOL: StockSeed[] = [
  // Technology
  { symbol: 'AAPL', company: 'Apple Inc.', sector: 'Technology', exchange: 'NASDAQ', basePrice: 178.50, basePE: 29.5, baseDividend: 0.55, baseMarketCap: 2800e9 },
  { symbol: 'MSFT', company: 'Microsoft Corp.', sector: 'Technology', exchange: 'NASDAQ', basePrice: 415.20, basePE: 36.8, baseDividend: 0.75, baseMarketCap: 3100e9 },
  { symbol: 'GOOGL', company: 'Alphabet Inc.', sector: 'Technology', exchange: 'NASDAQ', basePrice: 152.30, basePE: 25.1, baseDividend: 0.0, baseMarketCap: 1900e9 },
  { symbol: 'AMZN', company: 'Amazon.com Inc.', sector: 'Technology', exchange: 'NASDAQ', basePrice: 186.40, basePE: 62.3, baseDividend: 0.0, baseMarketCap: 1920e9 },
  { symbol: 'NVDA', company: 'NVIDIA Corp.', sector: 'Technology', exchange: 'NASDAQ', basePrice: 875.30, basePE: 72.1, baseDividend: 0.04, baseMarketCap: 2160e9 },
  { symbol: 'META', company: 'Meta Platforms Inc.', sector: 'Technology', exchange: 'NASDAQ', basePrice: 505.60, basePE: 33.2, baseDividend: 0.50, baseMarketCap: 1290e9 },
  { symbol: 'TSM', company: 'Taiwan Semiconductor', sector: 'Technology', exchange: 'NYSE', basePrice: 148.90, basePE: 24.5, baseDividend: 1.42, baseMarketCap: 770e9 },
  { symbol: 'AVGO', company: 'Broadcom Inc.', sector: 'Technology', exchange: 'NASDAQ', basePrice: 1345.00, basePE: 38.4, baseDividend: 1.53, baseMarketCap: 625e9 },
  { symbol: 'ORCL', company: 'Oracle Corp.', sector: 'Technology', exchange: 'NYSE', basePrice: 125.40, basePE: 32.1, baseDividend: 1.28, baseMarketCap: 345e9 },
  { symbol: 'CRM', company: 'Salesforce Inc.', sector: 'Technology', exchange: 'NYSE', basePrice: 272.50, basePE: 48.6, baseDividend: 0.0, baseMarketCap: 264e9 },
  // Healthcare
  { symbol: 'JNJ', company: 'Johnson & Johnson', sector: 'Healthcare', exchange: 'NYSE', basePrice: 158.20, basePE: 11.5, baseDividend: 2.98, baseMarketCap: 382e9 },
  { symbol: 'UNH', company: 'UnitedHealth Group', sector: 'Healthcare', exchange: 'NYSE', basePrice: 524.80, basePE: 21.3, baseDividend: 1.32, baseMarketCap: 486e9 },
  { symbol: 'LLY', company: 'Eli Lilly & Co.', sector: 'Healthcare', exchange: 'NYSE', basePrice: 792.40, basePE: 80.2, baseDividend: 0.72, baseMarketCap: 752e9 },
  { symbol: 'PFE', company: 'Pfizer Inc.', sector: 'Healthcare', exchange: 'NYSE', basePrice: 27.30, basePE: 18.9, baseDividend: 5.89, baseMarketCap: 153e9 },
  { symbol: 'ABBV', company: 'AbbVie Inc.', sector: 'Healthcare', exchange: 'NYSE', basePrice: 170.90, basePE: 14.2, baseDividend: 3.62, baseMarketCap: 302e9 },
  { symbol: 'MRK', company: 'Merck & Co.', sector: 'Healthcare', exchange: 'NYSE', basePrice: 126.50, basePE: 16.8, baseDividend: 2.45, baseMarketCap: 320e9 },
  { symbol: 'TMO', company: 'Thermo Fisher Scientific', sector: 'Healthcare', exchange: 'NYSE', basePrice: 572.30, basePE: 34.1, baseDividend: 0.24, baseMarketCap: 220e9 },
  { symbol: 'ABT', company: 'Abbott Laboratories', sector: 'Healthcare', exchange: 'NYSE', basePrice: 112.80, basePE: 22.5, baseDividend: 1.88, baseMarketCap: 195e9 },
  // Finance
  { symbol: 'JPM', company: 'JPMorgan Chase & Co.', sector: 'Finance', exchange: 'NYSE', basePrice: 196.40, basePE: 11.8, baseDividend: 2.15, baseMarketCap: 567e9 },
  { symbol: 'V', company: 'Visa Inc.', sector: 'Finance', exchange: 'NYSE', basePrice: 280.50, basePE: 31.2, baseDividend: 0.75, baseMarketCap: 575e9 },
  { symbol: 'MA', company: 'Mastercard Inc.', sector: 'Finance', exchange: 'NYSE', basePrice: 460.20, basePE: 35.6, baseDividend: 0.56, baseMarketCap: 432e9 },
  { symbol: 'BAC', company: 'Bank of America Corp.', sector: 'Finance', exchange: 'NYSE', basePrice: 37.80, basePE: 12.4, baseDividend: 2.54, baseMarketCap: 298e9 },
  { symbol: 'GS', company: 'Goldman Sachs Group', sector: 'Finance', exchange: 'NYSE', basePrice: 412.60, basePE: 15.3, baseDividend: 2.45, baseMarketCap: 138e9 },
  { symbol: 'MS', company: 'Morgan Stanley', sector: 'Finance', exchange: 'NYSE', basePrice: 92.40, basePE: 16.1, baseDividend: 3.70, baseMarketCap: 152e9 },
  { symbol: 'BLK', company: 'BlackRock Inc.', sector: 'Finance', exchange: 'NYSE', basePrice: 815.30, basePE: 22.7, baseDividend: 2.45, baseMarketCap: 121e9 },
  { symbol: 'SCHW', company: 'Charles Schwab Corp.', sector: 'Finance', exchange: 'NYSE', basePrice: 72.80, basePE: 25.8, baseDividend: 1.38, baseMarketCap: 133e9 },
  // Energy
  { symbol: 'XOM', company: 'Exxon Mobil Corp.', sector: 'Energy', exchange: 'NYSE', basePrice: 104.20, basePE: 10.5, baseDividend: 3.55, baseMarketCap: 432e9 },
  { symbol: 'CVX', company: 'Chevron Corp.', sector: 'Energy', exchange: 'NYSE', basePrice: 155.80, basePE: 11.2, baseDividend: 3.82, baseMarketCap: 295e9 },
  { symbol: 'COP', company: 'ConocoPhillips', sector: 'Energy', exchange: 'NYSE', basePrice: 118.60, basePE: 12.8, baseDividend: 1.72, baseMarketCap: 142e9 },
  { symbol: 'SLB', company: 'Schlumberger Ltd.', sector: 'Energy', exchange: 'NYSE', basePrice: 48.90, basePE: 16.5, baseDividend: 1.63, baseMarketCap: 70e9 },
  { symbol: 'EOG', company: 'EOG Resources Inc.', sector: 'Energy', exchange: 'NYSE', basePrice: 122.40, basePE: 9.8, baseDividend: 2.62, baseMarketCap: 71e9 },
  { symbol: 'BP', company: 'BP p.l.c.', sector: 'Energy', exchange: 'LSE', basePrice: 36.20, basePE: 7.2, baseDividend: 4.10, baseMarketCap: 105e9 },
  { symbol: 'SHEL', company: 'Shell plc', sector: 'Energy', exchange: 'LSE', basePrice: 65.80, basePE: 8.4, baseDividend: 3.75, baseMarketCap: 215e9 },
  { symbol: 'TTE', company: 'TotalEnergies SE', sector: 'Energy', exchange: 'LSE', basePrice: 68.40, basePE: 7.8, baseDividend: 4.52, baseMarketCap: 162e9 },
  // Consumer
  { symbol: 'WMT', company: 'Walmart Inc.', sector: 'Consumer', exchange: 'NYSE', basePrice: 168.30, basePE: 28.4, baseDividend: 1.32, baseMarketCap: 452e9 },
  { symbol: 'PG', company: 'Procter & Gamble Co.', sector: 'Consumer', exchange: 'NYSE', basePrice: 162.50, basePE: 25.6, baseDividend: 2.38, baseMarketCap: 383e9 },
  { symbol: 'KO', company: 'Coca-Cola Co.', sector: 'Consumer', exchange: 'NYSE', basePrice: 60.20, basePE: 23.1, baseDividend: 3.08, baseMarketCap: 260e9 },
  { symbol: 'PEP', company: 'PepsiCo Inc.', sector: 'Consumer', exchange: 'NASDAQ', basePrice: 170.80, basePE: 24.5, baseDividend: 2.85, baseMarketCap: 234e9 },
  { symbol: 'COST', company: 'Costco Wholesale Corp.', sector: 'Consumer', exchange: 'NASDAQ', basePrice: 738.40, basePE: 50.2, baseDividend: 0.55, baseMarketCap: 328e9 },
  { symbol: 'NKE', company: 'Nike Inc.', sector: 'Consumer', exchange: 'NYSE', basePrice: 98.60, basePE: 29.8, baseDividend: 1.40, baseMarketCap: 150e9 },
  { symbol: 'MCD', company: "McDonald's Corp.", sector: 'Consumer', exchange: 'NYSE', basePrice: 294.20, basePE: 25.3, baseDividend: 2.18, baseMarketCap: 212e9 },
  { symbol: 'SBUX', company: 'Starbucks Corp.', sector: 'Consumer', exchange: 'NASDAQ', basePrice: 92.30, basePE: 24.8, baseDividend: 2.37, baseMarketCap: 105e9 },
  // Industrial
  { symbol: 'CAT', company: 'Caterpillar Inc.', sector: 'Industrial', exchange: 'NYSE', basePrice: 362.40, basePE: 17.2, baseDividend: 1.55, baseMarketCap: 176e9 },
  { symbol: 'HON', company: 'Honeywell International', sector: 'Industrial', exchange: 'NASDAQ', basePrice: 205.60, basePE: 22.4, baseDividend: 2.02, baseMarketCap: 136e9 },
  { symbol: 'UPS', company: 'United Parcel Service', sector: 'Industrial', exchange: 'NYSE', basePrice: 148.90, basePE: 16.8, baseDividend: 4.32, baseMarketCap: 128e9 },
  { symbol: 'BA', company: 'Boeing Co.', sector: 'Industrial', exchange: 'NYSE', basePrice: 208.50, basePE: 42.3, baseDividend: 0.0, baseMarketCap: 127e9 },
  { symbol: 'GE', company: 'GE Aerospace', sector: 'Industrial', exchange: 'NYSE', basePrice: 162.30, basePE: 38.5, baseDividend: 0.56, baseMarketCap: 177e9 },
  { symbol: 'RTX', company: 'RTX Corp.', sector: 'Industrial', exchange: 'NYSE', basePrice: 94.60, basePE: 18.9, baseDividend: 2.34, baseMarketCap: 139e9 },
  { symbol: 'DE', company: 'Deere & Co.', sector: 'Industrial', exchange: 'NYSE', basePrice: 395.80, basePE: 12.5, baseDividend: 1.36, baseMarketCap: 113e9 },
  { symbol: 'LMT', company: 'Lockheed Martin Corp.', sector: 'Industrial', exchange: 'NYSE', basePrice: 452.10, basePE: 16.4, baseDividend: 2.72, baseMarketCap: 109e9 },
];

// ══════════════════════════════════════════════════════════════════════════════
// Data Generator
// ══════════════════════════════════════════════════════════════════════════════

function generateStocks(count: number): StockTick[] {
  const stocks: StockTick[] = [];
  const poolLen = STOCK_POOL.length;

  for (let i = 0; i < count; i++) {
    const seed = STOCK_POOL[i % poolLen]!;
    // Add variation per cycle through the pool
    const cycle = Math.floor(i / poolLen);
    const variation = 1 + (cycle * 0.002 - 0.05) * Math.random();
    const priceVariation = seed.basePrice * variation * (0.95 + Math.random() * 0.10);
    const price = Math.round(priceVariation * 100) / 100;
    const prevClose = Math.round(price * (0.97 + Math.random() * 0.06) * 100) / 100;
    const change = Math.round((price - prevClose) * 100) / 100;
    const changePct = Math.round((change / prevClose) * 10000) / 100;
    const openPrice = Math.round(prevClose * (0.995 + Math.random() * 0.01) * 100) / 100;
    const highPrice = Math.round(Math.max(price, openPrice) * (1 + Math.random() * 0.015) * 100) / 100;
    const lowPrice = Math.round(Math.min(price, openPrice) * (1 - Math.random() * 0.015) * 100) / 100;
    const volume = Math.floor((5_000_000 + Math.random() * 45_000_000) * (seed.basePrice > 500 ? 0.3 : 1));
    const avgVolume = Math.floor(volume * (0.8 + Math.random() * 0.4));
    const mcVariation = seed.baseMarketCap * (0.9 + Math.random() * 0.2);
    const spread = price * 0.0005;

    stocks.push({
      id: i + 1,
      symbol: cycle === 0 ? seed.symbol : `${seed.symbol}.${cycle}`,
      company: cycle === 0 ? seed.company : `${seed.company} Series ${cycle}`,
      sector: seed.sector,
      exchange: seed.exchange,
      price,
      previousClose: prevClose,
      change,
      changePct,
      open: openPrice,
      high: highPrice,
      low: lowPrice,
      volume,
      avgVolume,
      marketCap: Math.round(mcVariation),
      pe: Math.round((seed.basePE + (Math.random() - 0.5) * 10) * 10) / 10,
      dividend: Math.round((seed.baseDividend + (Math.random() - 0.5) * 0.5) * 100) / 100,
      week52High: Math.round(price * (1.1 + Math.random() * 0.3) * 100) / 100,
      week52Low: Math.round(price * (0.55 + Math.random() * 0.3) * 100) / 100,
      bid: Math.round((price - spread) * 100) / 100,
      ask: Math.round((price + spread) * 100) / 100,
      bidSize: Math.floor(100 + Math.random() * 900) * 100,
      askSize: Math.floor(100 + Math.random() * 900) * 100,
      lastUpdate: Date.now(),
    });
  }

  return stocks;
}

// ══════════════════════════════════════════════════════════════════════════════
// Formatting Helpers
// ══════════════════════════════════════════════════════════════════════════════

function formatPrice(v: number): string {
  return v.toFixed(2);
}

function formatPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}

function formatVolume(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return String(v);
}

function formatMarketCap(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return `$${v.toLocaleString()}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// Price History Store (for sparklines)
// ══════════════════════════════════════════════════════════════════════════════

const SPARKLINE_POINTS = 20;
const priceHistory = new Map<number, number[]>();

function recordPrice(id: number, price: number): void {
  let history = priceHistory.get(id);
  if (!history) {
    history = [];
    priceHistory.set(id, history);
  }
  history.push(price);
  if (history.length > SPARKLINE_POINTS) {
    history.shift();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Flash tracking (recently updated row IDs)
// ══════════════════════════════════════════════════════════════════════════════

let flashedIds = new Set<number>();

// ══════════════════════════════════════════════════════════════════════════════
// Custom Cell Renderers
// ══════════════════════════════════════════════════════════════════════════════

/** Price cell: monospace with 2 decimal places */
function PriceCell({ value, node }: CellRendererProps<StockTick, number>) {
  const isFlashed = node.data ? flashedIds.has(node.data.id) : false;
  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontWeight: 500,
        fontSize: 13,
        transition: 'background-color 0.4s ease-out',
        backgroundColor: isFlashed ? 'rgba(250, 204, 21, 0.3)' : 'transparent',
        padding: '1px 4px',
        borderRadius: 2,
      }}
    >
      {value != null ? formatPrice(value) : ''}
    </span>
  );
}

/** Change cell: green for positive, red for negative with arrow */
function ChangeCell({ value, node }: CellRendererProps<StockTick, number>) {
  const isPositive = value != null && value >= 0;
  const isFlashed = node.data ? flashedIds.has(node.data.id) : false;
  const color = value === 0 ? '#94a3b8' : isPositive ? '#22c55e' : '#ef4444';
  const arrow = value === 0 ? '' : isPositive ? '\u25B2 ' : '\u25BC ';

  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontWeight: 600,
        fontSize: 12,
        color,
        backgroundColor: isFlashed
          ? `${color}18`
          : 'transparent',
        padding: '2px 6px',
        borderRadius: 3,
        transition: 'background-color 0.4s ease-out',
        whiteSpace: 'nowrap',
      }}
    >
      {arrow}{value != null ? formatPrice(Math.abs(value)) : ''}
    </span>
  );
}

/** Change percent cell */
function ChangePctCell({ value, node }: CellRendererProps<StockTick, number>) {
  const isPositive = value != null && value >= 0;
  const isFlashed = node.data ? flashedIds.has(node.data.id) : false;
  const color = value === 0 ? '#94a3b8' : isPositive ? '#22c55e' : '#ef4444';
  const bgColor = value === 0
    ? 'transparent'
    : isPositive
      ? 'rgba(34, 197, 94, 0.12)'
      : 'rgba(239, 68, 68, 0.12)';

  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontWeight: 700,
        fontSize: 12,
        color,
        backgroundColor: isFlashed ? `${color}25` : bgColor,
        padding: '2px 8px',
        borderRadius: 10,
        transition: 'background-color 0.4s ease-out',
        whiteSpace: 'nowrap',
      }}
    >
      {value != null ? formatPct(value) : ''}
    </span>
  );
}

/** Volume cell with mini bar visualization */
function VolumeCell({ value, node }: CellRendererProps<StockTick, number>) {
  const avgVol = node.data?.avgVolume ?? 1;
  const ratio = value != null ? Math.min(value / avgVol, 2) : 0;
  const barColor = ratio > 1.2 ? '#22c55e' : ratio < 0.8 ? '#ef4444' : '#3b82f6';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12,
          minWidth: 48,
          textAlign: 'right',
        }}
      >
        {value != null ? formatVolume(value) : ''}
      </span>
      <div
        style={{
          flex: 1,
          height: 6,
          backgroundColor: 'rgba(100, 116, 139, 0.15)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${Math.min(ratio * 50, 100)}%`,
            height: '100%',
            backgroundColor: barColor,
            borderRadius: 3,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}

/** Market cap cell: abbreviated format */
function MarketCapCell({ value }: CellRendererProps<StockTick, number>) {
  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      {value != null ? formatMarketCap(value) : ''}
    </span>
  );
}

/** Sparkline cell: mini SVG chart of recent prices */
function SparklineCell({ node }: CellRendererProps<StockTick, number>) {
  const id = node.data?.id;
  const history = id != null ? priceHistory.get(id) : undefined;

  if (!history || history.length < 2) {
    return <span style={{ color: '#94a3b8', fontSize: 11 }}>--</span>;
  }

  const w = 130;
  const h = 24;
  const pad = 2;
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;

  const points = history.map((p, i) => {
    const x = pad + (i / (history.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (p - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });

  const isUp = history[history.length - 1]! >= history[0]!;
  const strokeColor = isUp ? '#22c55e' : '#ef4444';

  // Fill area under the line
  const fillPoints = [
    `${pad},${h - pad}`,
    ...points,
    `${w - pad},${h - pad}`,
  ].join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <polygon
        points={fillPoints}
        fill={isUp ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'}
      />
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={strokeColor}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Current price dot */}
      {points.length > 0 && (
        <circle
          cx={parseFloat(points[points.length - 1]!.split(',')[0]!)}
          cy={parseFloat(points[points.length - 1]!.split(',')[1]!)}
          r={2.5}
          fill={strokeColor}
        />
      )}
    </svg>
  );
}

/** Monospace numeric cell (generic) */
function MonoCell({ value }: CellRendererProps<StockTick, number>) {
  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12,
      }}
    >
      {value != null ? formatPrice(value) : ''}
    </span>
  );
}

/** P/E Ratio cell */
function PECell({ value }: CellRendererProps<StockTick, number>) {
  const color = value != null
    ? value < 15 ? '#22c55e' : value < 30 ? '#eab308' : '#ef4444'
    : '#94a3b8';
  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12,
        color,
        fontWeight: 500,
      }}
    >
      {value != null ? value.toFixed(1) : '--'}
    </span>
  );
}

/** Dividend yield cell */
function DividendCell({ value }: CellRendererProps<StockTick, number>) {
  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12,
        color: value != null && value > 3 ? '#22c55e' : value != null && value > 0 ? '#94a3b8' : '#64748b',
      }}
    >
      {value != null ? `${value.toFixed(2)}%` : '--'}
    </span>
  );
}

/** Symbol cell: bold, fixed width */
function SymbolCell({ value }: CellRendererProps<StockTick, string>) {
  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontWeight: 700,
        fontSize: 13,
        letterSpacing: 0.5,
        color: '#e2e8f0',
      }}
    >
      {value}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Context Menu
// ══════════════════════════════════════════════════════════════════════════════

function TradingContextMenu({ node, colId, value, closeMenu, api }: ContextMenuProps<StockTick>) {
  const menuStyle: React.CSSProperties = {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 8,
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    padding: '4px 0',
    minWidth: 200,
    fontSize: 13,
    color: '#e2e8f0',
  };
  const itemStyle: React.CSSProperties = {
    padding: '8px 16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    transition: 'background 0.15s',
  };
  const dividerStyle: React.CSSProperties = {
    borderTop: '1px solid #334155',
    margin: '4px 0',
  };

  return (
    <div style={menuStyle}>
      <div
        style={itemStyle}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#334155')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        onClick={() => {
          navigator.clipboard.writeText(String(value ?? ''));
          closeMenu();
        }}
      >
        Copy Value
      </div>
      <div
        style={itemStyle}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#334155')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        onClick={() => {
          api.setSortModel([{ colId, sort: 'asc' }]);
          closeMenu();
        }}
      >
        Sort Ascending
      </div>
      <div
        style={itemStyle}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#334155')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        onClick={() => {
          api.setSortModel([{ colId, sort: 'desc' }]);
          closeMenu();
        }}
      >
        Sort Descending
      </div>
      <div style={dividerStyle} />
      <div
        style={{ ...itemStyle, color: '#94a3b8', fontSize: 12, cursor: 'default' }}
      >
        {node.data?.symbol} &middot; {node.data?.company}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Toolbar (child using hooks)
// ══════════════════════════════════════════════════════════════════════════════

interface ToolbarProps {
  rowCount: number;
  liveUpdates: boolean;
  onToggleLive: () => void;
  updateCount: number;
  sectorFilter: string;
  onSectorFilter: (sector: string) => void;
  exchangeFilter: string;
  onExchangeFilter: (exchange: string) => void;
  theme: string;
  onThemeChange: (theme: string) => void;
}

const SECTORS = ['All', 'Technology', 'Healthcare', 'Finance', 'Energy', 'Consumer', 'Industrial'];
const EXCHANGES = ['All', 'NYSE', 'NASDAQ', 'LSE'];

function Toolbar({
  rowCount,
  liveUpdates,
  onToggleLive,
  updateCount,
  sectorFilter,
  onSectorFilter,
  exchangeFilter,
  onExchangeFilter,
  theme,
  onThemeChange,
}: ToolbarProps) {
  const api = useGridApi<StockTick>();
  const { selectedCount, deselectAll } = useGridSelection<StockTick>();
  const { sortModel, clearSort } = useGridSort();

  return (
    <div
      style={{
        padding: '8px 16px',
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        borderBottom: '1px solid var(--toolbar-border, #334155)',
        background: 'var(--toolbar-bg, #0f172a)',
        flexWrap: 'wrap',
        fontSize: 12,
        color: 'var(--toolbar-fg, #e2e8f0)',
      }}
    >
      {/* Title Row */}
      <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, letterSpacing: 0.5 }}>
        GridStorm Financial Trading
      </h2>
      <span style={{ color: '#64748b' }}>|</span>
      <span style={{ color: '#94a3b8' }}>
        {rowCount.toLocaleString()} instruments
      </span>
      <span style={{ color: '#64748b' }}>|</span>

      {/* Live indicator */}
      <button
        onClick={onToggleLive}
        style={{
          ...btnStyle,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          color: liveUpdates ? '#22c55e' : '#94a3b8',
          borderColor: liveUpdates ? '#22c55e40' : '#334155',
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: liveUpdates ? '#22c55e' : '#64748b',
            boxShadow: liveUpdates ? '0 0 6px #22c55e' : 'none',
            animation: liveUpdates ? 'pulse 1.5s ease-in-out infinite' : 'none',
          }}
        />
        {liveUpdates ? 'LIVE' : 'PAUSED'}
      </button>

      <span style={{ color: '#64748b', fontSize: 11 }}>
        {updateCount.toLocaleString()} updates
      </span>

      <span style={{ color: '#334155' }}>|</span>

      {/* Sector Filter */}
      <select
        value={sectorFilter}
        onChange={(e) => onSectorFilter(e.target.value)}
        style={selectStyle}
      >
        {SECTORS.map((s) => (
          <option key={s} value={s}>{s === 'All' ? 'All Sectors' : s}</option>
        ))}
      </select>

      {/* Exchange Filter */}
      <select
        value={exchangeFilter}
        onChange={(e) => onExchangeFilter(e.target.value)}
        style={selectStyle}
      >
        {EXCHANGES.map((e) => (
          <option key={e} value={e}>{e === 'All' ? 'All Exchanges' : e}</option>
        ))}
      </select>

      <span style={{ color: '#334155' }}>|</span>

      {/* Grouping Buttons */}
      <button
        onClick={() => {
          const cols = api.getAllColumns();
          const sectorCol = cols.find((c) => c.field === 'sector');
          if (sectorCol) {
            api.applyColumnState([
              { colId: 'sector', rowGroup: true, rowGroupIndex: 0, hide: true } as any,
              { colId: 'exchange', rowGroup: false, rowGroupIndex: null as any, hide: false } as any,
            ]);
            api.redrawRows();
          }
        }}
        style={btnStyle}
      >
        Group: Sector
      </button>
      <button
        onClick={() => {
          api.applyColumnState([
            { colId: 'exchange', rowGroup: true, rowGroupIndex: 0, hide: true } as any,
            { colId: 'sector', rowGroup: false, rowGroupIndex: null as any, hide: false } as any,
          ]);
          api.redrawRows();
        }}
        style={btnStyle}
      >
        Group: Exchange
      </button>
      <button
        onClick={() => {
          api.applyColumnState([
            { colId: 'sector', rowGroup: false, rowGroupIndex: null as any, hide: false } as any,
            { colId: 'exchange', rowGroup: false, rowGroupIndex: null as any, hide: false } as any,
          ]);
          api.redrawRows();
        }}
        style={btnStyle}
      >
        Clear Groups
      </button>

      {/* Selection count */}
      {selectedCount > 0 && (
        <>
          <span style={{ color: '#334155' }}>|</span>
          <span style={{ color: '#3b82f6', fontWeight: 600 }}>
            {selectedCount} selected
          </span>
          <button onClick={deselectAll} style={btnStyle}>
            Clear
          </button>
        </>
      )}

      {/* Sort indicator */}
      {sortModel.length > 0 && (
        <button onClick={clearSort} style={btnStyle}>
          Clear Sort
        </button>
      )}

      <div style={{ flex: 1 }} />

      {/* Theme */}
      <span style={{ color: '#94a3b8', fontSize: 11 }}>Theme:</span>
      <select
        value={theme}
        onChange={(e) => onThemeChange(e.target.value)}
        style={selectStyle}
      >
        <option value="dark">Dark</option>
        <option value="light">Light</option>
        <option value="high-contrast">High Contrast</option>
      </select>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Performance Overlay
// ══════════════════════════════════════════════════════════════════════════════

function PerformanceOverlay({
  rowCount,
  updateCount,
  lastUpdateTime,
}: {
  rowCount: number;
  updateCount: number;
  lastUpdateTime: number;
}) {
  const [fps, setFps] = useState(0);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(performance.now());

  useEffect(() => {
    let rafId: number;
    const tick = () => {
      frameCountRef.current++;
      const now = performance.now();
      const elapsed = now - lastFpsTimeRef.current;
      if (elapsed >= 1000) {
        setFps(Math.round((frameCountRef.current / elapsed) * 1000));
        frameCountRef.current = 0;
        lastFpsTimeRef.current = now;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const timeSinceUpdate = lastUpdateTime
    ? `${((Date.now() - lastUpdateTime) / 1000).toFixed(1)}s ago`
    : '--';

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 12,
        right: 12,
        background: 'rgba(15, 23, 42, 0.9)',
        border: '1px solid #334155',
        borderRadius: 8,
        padding: '8px 12px',
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
        color: '#94a3b8',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        backdropFilter: 'blur(8px)',
        minWidth: 140,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>FPS</span>
        <span style={{ color: fps > 50 ? '#22c55e' : fps > 30 ? '#eab308' : '#ef4444', fontWeight: 600 }}>
          {fps}
        </span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Rows</span>
        <span style={{ color: '#e2e8f0' }}>{rowCount.toLocaleString()}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Updates</span>
        <span style={{ color: '#e2e8f0' }}>{updateCount.toLocaleString()}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Last</span>
        <span style={{ color: '#e2e8f0' }}>{timeSinceUpdate}</span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Plugins
// ══════════════════════════════════════════════════════════════════════════════

const plugins = [
  SortingPlugin({ multiSort: true }),
  FilteringPlugin(),
  SelectionPlugin({ mode: 'multiple' }),
  ColumnResizePlugin(),
  ColumnPinningPlugin(),
  GroupingPlugin({ defaultExpanded: false }),
  AggregationPlugin(),
  ContextMenuPlugin(),
];

// ══════════════════════════════════════════════════════════════════════════════
// Column Definitions
// ══════════════════════════════════════════════════════════════════════════════

const columns: ReactColumnDef<StockTick>[] = [
  {
    field: 'symbol' as any,
    headerName: 'Symbol',
    width: 90,
    pinned: 'left',
    sortable: true,
    resizable: true,
    cellRenderer: reactCellRenderer(SymbolCell),
  },
  {
    field: 'company' as any,
    headerName: 'Company',
    width: 180,
    sortable: true,
    resizable: true,
  },
  {
    field: 'sector' as any,
    headerName: 'Sector',
    width: 120,
    sortable: true,
    resizable: true,
    rowGroup: true,
    rowGroupIndex: 0,
    hide: false,
  },
  {
    field: 'exchange' as any,
    headerName: 'Exchange',
    width: 100,
    sortable: true,
    resizable: true,
  },
  {
    field: 'price' as any,
    headerName: 'Price',
    width: 100,
    sortable: true,
    resizable: true,
    cellRenderer: reactCellRenderer(PriceCell),
    aggFunc: 'avg',
  },
  {
    field: 'change' as any,
    headerName: 'Change',
    width: 100,
    sortable: true,
    resizable: true,
    cellRenderer: reactCellRenderer(ChangeCell),
  },
  {
    field: 'changePct' as any,
    headerName: 'Chg %',
    width: 95,
    sortable: true,
    resizable: true,
    cellRenderer: reactCellRenderer(ChangePctCell),
    aggFunc: 'avg',
  },
  {
    field: 'open' as any,
    headerName: 'Open',
    width: 90,
    sortable: true,
    resizable: true,
    cellRenderer: reactCellRenderer(MonoCell),
  },
  {
    field: 'high' as any,
    headerName: 'High',
    width: 90,
    sortable: true,
    resizable: true,
    cellRenderer: reactCellRenderer(MonoCell),
  },
  {
    field: 'low' as any,
    headerName: 'Low',
    width: 90,
    sortable: true,
    resizable: true,
    cellRenderer: reactCellRenderer(MonoCell),
  },
  {
    field: 'volume' as any,
    headerName: 'Volume',
    width: 130,
    sortable: true,
    resizable: true,
    cellRenderer: reactCellRenderer(VolumeCell),
    aggFunc: 'sum',
  },
  {
    field: 'avgVolume' as any,
    headerName: 'Avg Vol',
    width: 120,
    sortable: true,
    resizable: true,
    cellRenderer: reactCellRenderer(VolumeCell),
  },
  {
    field: 'marketCap' as any,
    headerName: 'Mkt Cap',
    width: 130,
    sortable: true,
    resizable: true,
    cellRenderer: reactCellRenderer(MarketCapCell),
    aggFunc: 'sum',
  },
  {
    field: 'pe' as any,
    headerName: 'P/E',
    width: 80,
    sortable: true,
    resizable: true,
    cellRenderer: reactCellRenderer(PECell),
    aggFunc: 'avg',
  },
  {
    field: 'dividend' as any,
    headerName: 'Div %',
    width: 90,
    sortable: true,
    resizable: true,
    cellRenderer: reactCellRenderer(DividendCell),
    aggFunc: 'avg',
  },
  {
    field: 'week52High' as any,
    headerName: '52W Hi',
    width: 90,
    sortable: true,
    resizable: true,
    cellRenderer: reactCellRenderer(MonoCell),
  },
  {
    field: 'week52Low' as any,
    headerName: '52W Lo',
    width: 90,
    sortable: true,
    resizable: true,
    cellRenderer: reactCellRenderer(MonoCell),
  },
  {
    colId: 'sparkline',
    headerName: 'Trend',
    width: 150,
    sortable: false,
    resizable: true,
    cellRenderer: reactCellRenderer(SparklineCell),
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// App Component
// ══════════════════════════════════════════════════════════════════════════════

const ROW_COUNT = 50_000;

export function App() {
  const [loading, setLoading] = useState(true);
  const [rowData, setRowData] = useState(() => {
    const data = generateStocks(ROW_COUNT);
    // Seed initial price history
    for (const stock of data) {
      for (let i = 0; i < 5; i++) {
        recordPrice(stock.id, stock.price * (0.98 + Math.random() * 0.04));
      }
      recordPrice(stock.id, stock.price);
    }
    return data;
  });
  const [theme, setTheme] = useState('dark');
  const [liveUpdates, setLiveUpdates] = useState(true);
  const [updateCount, setUpdateCount] = useState(0);
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  const [sectorFilter, setSectorFilter] = useState('All');
  const [exchangeFilter, setExchangeFilter] = useState('All');

  const apiRef = useRef<GridApi<StockTick> | null>(null);

  const handleGridReady = useCallback((api: GridApi<StockTick>) => {
    apiRef.current = api;
  }, []);

  // ── Initial load skeleton ──
  useEffect(() => {
    const id = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(id);
  }, []);

  // ── Real-time update simulation ──
  useEffect(() => {
    if (!liveUpdates) return;

    const interval = setInterval(() => {
      setRowData((prev) => {
        const next = [...prev];
        const updatesThisTick = 20 + Math.floor(Math.random() * 30);
        const newFlashed = new Set<number>();

        for (let u = 0; u < updatesThisTick; u++) {
          const idx = Math.floor(Math.random() * next.length);
          const stock = { ...next[idx]! };

          // Small random price movement (+-0.5%)
          const pctMove = (Math.random() - 0.5) * 0.01;
          stock.price = Math.round(stock.price * (1 + pctMove) * 100) / 100;
          stock.change = Math.round((stock.price - stock.previousClose) * 100) / 100;
          stock.changePct = Math.round((stock.change / stock.previousClose) * 10000) / 100;

          // Update high/low
          if (stock.price > stock.high) stock.high = stock.price;
          if (stock.price < stock.low) stock.low = stock.price;

          // Update bid/ask
          const spread = stock.price * 0.0005;
          stock.bid = Math.round((stock.price - spread) * 100) / 100;
          stock.ask = Math.round((stock.price + spread) * 100) / 100;

          // Small volume bump
          stock.volume += Math.floor(Math.random() * 10000);

          stock.lastUpdate = Date.now();

          // Record price history for sparkline
          recordPrice(stock.id, stock.price);

          next[idx] = stock;
          newFlashed.add(stock.id);
        }

        // Update flash tracking
        flashedIds = newFlashed;

        // Clear flash after 400ms
        setTimeout(() => {
          flashedIds = new Set();
        }, 400);

        return next;
      });

      setUpdateCount((c) => c + 1);
      setLastUpdateTime(Date.now());
    }, 500);

    return () => clearInterval(interval);
  }, [liveUpdates]);

  // ── Filtered data ──
  const filteredData = useMemo(() => {
    let data = rowData;
    if (sectorFilter !== 'All') {
      data = data.filter((s) => s.sector === sectorFilter);
    }
    if (exchangeFilter !== 'All') {
      data = data.filter((s) => s.exchange === exchangeFilter);
    }
    return data;
  }, [rowData, sectorFilter, exchangeFilter]);

  // ── Dynamic CSS variables for theming ──
  const containerVars: React.CSSProperties = theme === 'dark'
    ? {
        '--toolbar-bg': '#0f172a',
        '--toolbar-fg': '#e2e8f0',
        '--toolbar-border': '#334155',
        '--demo-bg': '#020617',
      } as React.CSSProperties
    : theme === 'light'
      ? {
          '--toolbar-bg': '#f8fafc',
          '--toolbar-fg': '#1e293b',
          '--toolbar-border': '#e2e8f0',
          '--demo-bg': '#ffffff',
        } as React.CSSProperties
      : {
          '--toolbar-bg': '#000000',
          '--toolbar-fg': '#ffffff',
          '--toolbar-border': '#666666',
          '--demo-bg': '#000000',
        } as React.CSSProperties;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--demo-bg, #020617)',
        ...containerVars,
      }}
    >
      {/* Inject pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {/* Grid with overlay */}
      <div style={{ flex: 1, position: 'relative' }} data-theme={theme}>
        {loading ? (
          <GridSkeleton columns={8} rows={14} height="100%" />
        ) : (
        <GridStorm<StockTick>
          columns={columns}
          rowData={filteredData}
          plugins={plugins}
          getRowId={({ data }) => String(data.id)}
          rowHeight={34}
          headerHeight={40}
          height="100%"
          rowSelection="multiple"
          ariaLabel={`Financial Trading Grid - ${filteredData.length.toLocaleString()} instruments`}
          onGridReady={handleGridReady}
          contextMenu={TradingContextMenu}
          onSelectionChanged={(e) =>
            console.log('Selection:', e.selectedNodes.length, 'rows')
          }
          onSortChanged={(e) => console.log('Sort:', e.sortModel)}
        >
          <Toolbar
            rowCount={filteredData.length}
            liveUpdates={liveUpdates}
            onToggleLive={() => setLiveUpdates((v) => !v)}
            updateCount={updateCount}
            sectorFilter={sectorFilter}
            onSectorFilter={setSectorFilter}
            exchangeFilter={exchangeFilter}
            onExchangeFilter={setExchangeFilter}
            theme={theme}
            onThemeChange={setTheme}
          />
        </GridStorm>
        )}

        <PerformanceOverlay
          rowCount={filteredData.length}
          updateCount={updateCount}
          lastUpdateTime={lastUpdateTime}
        />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Shared Styles
// ══════════════════════════════════════════════════════════════════════════════

const btnStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: 11,
  border: '1px solid #334155',
  borderRadius: 4,
  background: 'rgba(30, 41, 59, 0.8)',
  color: '#cbd5e1',
  cursor: 'pointer',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
  transition: 'all 0.15s',
};

const selectStyle: React.CSSProperties = {
  padding: '4px 8px',
  fontSize: 11,
  border: '1px solid #334155',
  borderRadius: 4,
  background: '#1e293b',
  color: '#cbd5e1',
  cursor: 'pointer',
  fontFamily: 'inherit',
  outline: 'none',
};
