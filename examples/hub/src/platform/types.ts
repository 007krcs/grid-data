// Re-export platform-core types directly (avoids workspace dep in examples)
// When platform-core is published as an npm package, swap this import for:
//   export type { ... } from '@gridstorm/platform-core';

export type ProductStatus = 'ga' | 'beta' | 'preview' | 'coming-soon';
export type ProductTier = 'open-source' | 'enterprise' | 'platform';

export interface ProductStat {
  value: string;
  label: string;
}

export interface ProductQuickLink {
  label: string;
  path: string;
  external?: boolean;
  isNew?: boolean;
}

export interface ProductManifest {
  id: string;
  name: string;
  tagline: string;
  description: string;
  version: string;
  status: ProductStatus;
  tier: ProductTier;
  color: string;
  accentColor: string;
  iconName: string;
  homePath: string;
  docsRoot: string | null;
  primaryDemoPath: string | null;
  stats: ProductStat[];
  keyFeatures: string[];
  quickLinks: ProductQuickLink[];
  tags: string[];
}

export interface PlatformConfig {
  name: string;
  tagline: string;
  version: string;
  githubUrl: string;
}

export interface PlatformContextValue {
  config: PlatformConfig;
  products: readonly ProductManifest[];
  activeProductId: string | null;
  navigate: (path: string) => void;
  getProduct: (id: string) => ProductManifest | undefined;
}
