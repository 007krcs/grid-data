// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── NexaForge Platform — Core Types ───
// This is the integration contract every product must implement.
// New products register a ProductManifest; the platform shell
// handles routing, navigation, and shared services automatically.

// ── Product Identity ──────────────────────────────────────────────

/** Lifecycle stage of a product on the platform */
export type ProductStatus = 'ga' | 'beta' | 'preview' | 'coming-soon';

/** Pricing/access tier */
export type ProductTier = 'open-source' | 'enterprise' | 'platform';

export interface ProductStat {
  value: string;
  label: string;
}

export interface ProductQuickLink {
  label: string;
  /** Hash route (e.g. '/docs/getting-started') or external URL */
  path: string;
  external?: boolean;
  isNew?: boolean;
}

// ── Product Manifest ──────────────────────────────────────────────
//
// Every product on the NexaForge platform declares one of these.
// The platform shell reads manifests from the ProductRegistry and:
//   1. Renders product cards on the platform launcher
//   2. Builds the product switcher in the top nav
//   3. Injects the active product into PlatformContext
//   4. Routes /product/:id → product's homePath
//
export interface ProductManifest {
  /** Unique stable identifier. Used in URLs: /product/:id */
  id: string;

  /** Human-readable product name shown in UI */
  name: string;

  /** One-line pitch: shown under name in cards and nav */
  tagline: string;

  /** Longer description: shown in the product card body */
  description: string;

  /** SemVer. Shown in product cards and platform home. */
  version: string;

  /** Lifecycle stage — controls badge color in the launcher */
  status: ProductStatus;

  /** Access tier — controls tier badge in launcher */
  tier: ProductTier;

  /** Primary brand color (CSS value: hex, rgb, hsl) */
  color: string;

  /** Lighter accent used for backgrounds/glows */
  accentColor: string;

  /** Icon key from the platform icon registry */
  iconName: string;

  /**
   * Hash route this product owns within the shell.
   * Platform launcher "Open" button navigates here.
   * e.g. '/product/gridstorm'
   */
  homePath: string;

  /**
   * Root path for this product's docs within the shell.
   * e.g. '/docs/' (GridStorm re-uses existing doc routing)
   */
  docsRoot: string | null;

  /**
   * Primary live demo URL (external Vite app).
   * e.g. '/feature-showcase/'
   */
  primaryDemoPath: string | null;

  /** 3–5 numbers shown on the product card */
  stats: ProductStat[];

  /** 4–6 key capabilities — bullet points on product card */
  keyFeatures: string[];

  /** Quick links shown in product card footer */
  quickLinks: ProductQuickLink[];

  /** Searchable tags shown as pills on the card */
  tags: string[];
}

// ── Platform Configuration ────────────────────────────────────────
//
// Top-level platform config — set once in the shell, read everywhere.
//
export interface PlatformConfig {
  /** Platform brand name, e.g. "NexaForge Platform" */
  name: string;

  /** Short tagline shown in the platform launcher hero */
  tagline: string;

  /** Platform version (usually the monorepo version) */
  version: string;

  /** Repo URL for the GitHub button in the nav */
  githubUrl: string;
}

// ── Platform Context ──────────────────────────────────────────────
//
// Injected by PlatformProvider; consumed by products via usePlatform().
//
export interface PlatformContextValue {
  config: PlatformConfig;
  products: readonly ProductManifest[];
  activeProductId: string | null;
  navigate: (path: string) => void;
  getProduct: (id: string) => ProductManifest | undefined;
}

// ── Platform Events ───────────────────────────────────────────────
//
// Products can emit/listen to platform-level events via the bus.
// Useful for cross-product notifications (e.g. user exported a file
// in GridStorm → PDF Toolkit shows "PDF ready" badge).
//
export type PlatformEventType =
  | 'product:activated'
  | 'product:deactivated'
  | 'user:themeChanged'
  | 'notification:push';

export interface PlatformEvent<T = unknown> {
  type: PlatformEventType;
  sourceProductId: string;
  payload: T;
  timestamp: number;
}

export type PlatformEventHandler<T = unknown> = (event: PlatformEvent<T>) => void;
