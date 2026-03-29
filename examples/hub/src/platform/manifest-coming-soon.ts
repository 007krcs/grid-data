import type { ProductManifest } from '../platform/types';

export const analyticsStudioManifest: ProductManifest = {
  id: 'analytics-studio',
  name: 'Analytics Studio',
  tagline: 'Visual Data Analytics & BI',
  description:
    'Drag-and-drop analytics builder on top of GridStorm. Create pivot tables, ' +
    'interactive charts, KPI dashboards, and scheduled reports — no SQL required.',
  version: '0.2.0',
  status: 'coming-soon',
  tier: 'enterprise',
  color: '#06b6d4',
  accentColor: 'rgba(6, 182, 212, 0.1)',
  iconName: 'bar-chart',
  homePath: '/product/analytics-studio',
  docsRoot: null,
  primaryDemoPath: null,
  stats: [
    { value: 'Q3 2026', label: 'Target GA' },
    { value: '20+',     label: 'Chart types' },
    { value: 'No SQL',  label: 'Required' },
    { value: 'GridStorm', label: 'Powered by' },
  ],
  keyFeatures: [
    'Drag-and-drop pivot builder',
    '20+ chart types (bar, line, scatter, heatmap)',
    'KPI dashboard with auto-refresh',
    'Scheduled report export (PDF / Excel)',
    'Built on GridStorm grid engine',
  ],
  quickLinks: [],
  tags: ['Coming Soon', 'Analytics', 'BI', 'Charts', 'Pivoting'],
  seo: {
    title: 'Analytics Studio — Visual BI & Data Analytics | NexaForge',
    description:
      'Drag-and-drop analytics builder with 20+ chart types, pivot tables, KPI dashboards, ' +
      'and scheduled reports. No SQL required. Powered by GridStorm.',
    keywords: [
      'business intelligence software',
      'visual analytics platform',
      'drag drop BI tool',
      'KPI dashboard software',
      'pivot table builder',
      'data visualization tool',
      'no-code analytics',
      'Analytics Studio NexaForge',
    ],
    ogImage: '/og-analytics-studio.png',
    jsonLdType: 'SoftwareApplication',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'All',
  },
};

export const dataFlowManifest: ProductManifest = {
  id: 'dataflow',
  name: 'DataFlow',
  tagline: 'Real-Time Streaming Data Platform',
  description:
    'Connect live data feeds (WebSocket, SSE, Kafka) directly to GridStorm grids. ' +
    'Batched processing, cell change tracking, anomaly alerting, and backpressure control.',
  version: '0.3.0',
  status: 'coming-soon',
  tier: 'platform',
  color: '#22c55e',
  accentColor: 'rgba(34, 197, 94, 0.1)',
  iconName: 'trending-up',
  homePath: '/product/dataflow',
  docsRoot: null,
  primaryDemoPath: null,
  stats: [
    { value: 'Q4 2026', label: 'Target GA' },
    { value: '5+',      label: 'Adapters' },
    { value: '<10ms',   label: 'Update latency' },
    { value: 'Kafka',   label: 'Ready' },
  ],
  keyFeatures: [
    'WebSocket / SSE / Kafka / HTTP polling adapters',
    'Batched cell updates at configurable fps',
    'Cell change direction tracking (↑↓)',
    'Anomaly alerting with threshold rules',
    'Backpressure control — no UI jank',
  ],
  quickLinks: [],
  tags: ['Coming Soon', 'Streaming', 'Real-time', 'WebSocket', 'Kafka'],
  seo: {
    title: 'DataFlow — Real-Time Streaming Data Platform | NexaForge',
    description:
      'Connect live data feeds via WebSocket, SSE, and Kafka directly to GridStorm grids. ' +
      'Sub-10ms update latency, anomaly alerting, and backpressure control.',
    keywords: [
      'real-time data streaming',
      'WebSocket data grid',
      'Kafka dashboard',
      'live data visualization',
      'SSE streaming platform',
      'real-time analytics grid',
      'streaming data software',
      'DataFlow NexaForge',
    ],
    ogImage: '/og-dataflow.png',
    jsonLdType: 'SoftwareApplication',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'All',
  },
};
