// ─── SEO Config — per-route metadata map ─────────────────────────────────
// Maps hash routes to SeoConfig objects. App.tsx calls getSeoForRoute(route)
// and passes the result to useSeo(). Product routes delegate to the manifest
// seo field via seoFromManifest().

import { type SeoConfig, seoFromManifest } from './useSeo';
import { getProduct } from './registry';

const BASE_URL = 'https://gridstorm.tekivex.com';

// ── Static route configs ───────────────────────────────────────────────────

const HOME_SEO: SeoConfig = {
  title: 'GridStorm — Open-Source Enterprise Data Grid Platform',
  description:
    'GridStorm is an open-source enterprise data grid: virtual scrolling (100K rows), ' +
    '35 composable plugins, PDF Toolkit, Analytics Studio, and framework adapters for React, Vue, Svelte, Angular.',
  keywords: [
    'enterprise data grid',
    'open source data grid',
    'react data grid',
    'virtual scrolling',
    'GridStorm',
    'PDF toolkit',
    'analytics',
    'open source enterprise',
  ],
  canonical: BASE_URL,
  ogTitle: 'GridStorm — Open-Source Enterprise Data Grid Platform',
  ogDescription:
    'Open-source enterprise data grid with virtual scrolling, 35 plugins, PDF Toolkit, and Analytics Studio.',
  ogImage: `${BASE_URL}/og-gridstorm.png`,
  ogType: 'website',
  twitterTitle: 'GridStorm — Open-Source Enterprise Data Grid Platform',
  twitterDescription:
    'High-performance data grid, WASM PDF Toolkit, Analytics Studio — open source, zero per-seat cost.',
  twitterImage: `${BASE_URL}/og-gridstorm.png`,
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'GridStorm',
    url: BASE_URL,
    logo: `${BASE_URL}/logo.svg`,
    description:
      'GridStorm builds open-source enterprise developer tools including a high-performance data grid, PDF Toolkit, and Analytics Studio.',
    sameAs: ['https://github.com/007krcs/grid-data'],
    foundingDate: '2024',
    knowsAbout: [
      'Data Grids',
      'PDF Processing',
      'Analytics',
      'Enterprise Software',
    ],
  },
};

const PRODUCTS_SEO: SeoConfig = {
  title: 'All Products — GridStorm Platform',
  description:
    'Explore all GridStorm products: enterprise data grid, WASM PDF Toolkit, and Analytics Studio.',
  keywords: [
    'GridStorm products',
    'enterprise data grid',
    'GridStorm',
    'PDF Toolkit',
    'Analytics Studio',
    'product catalog',
  ],
  canonical: `${BASE_URL}/products`,
  ogTitle: 'All Products — GridStorm Platform',
  ogDescription:
    'Open-source enterprise software suite: data grids, PDF processing, and analytics.',
  ogImage: `${BASE_URL}/og-gridstorm.png`,
  ogType: 'website',
  twitterTitle: 'GridStorm Product Suite',
  twitterDescription:
    'GridStorm, PDF Toolkit, Analytics Studio — enterprise tools, zero per-seat cost.',
  twitterImage: `${BASE_URL}/og-gridstorm.png`,
  jsonLd: null,
};

const DOCS_SEO: SeoConfig = {
  title: 'GridStorm Documentation — Enterprise Data Grid',
  description:
    'Complete documentation for GridStorm: getting started, plugin reference, API docs, ' +
    'framework guides (React, Vue, Angular, Svelte), and migration from AG Grid.',
  keywords: [
    'GridStorm docs',
    'data grid documentation',
    'react data grid guide',
    'AG Grid migration',
    'data grid API reference',
    'virtual scrolling tutorial',
  ],
  canonical: `${BASE_URL}/docs`,
  ogTitle: 'GridStorm Documentation',
  ogDescription:
    'Complete GridStorm docs: getting started, plugins, React/Vue/Angular/Svelte guides.',
  ogImage: `${BASE_URL}/og-gridstorm.png`,
  ogType: 'website',
  twitterTitle: 'GridStorm Documentation',
  twitterDescription: 'Full API reference, plugin guide, and framework docs for GridStorm.',
  twitterImage: `${BASE_URL}/og-gridstorm.png`,
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: 'GridStorm Documentation',
    description:
      'Complete documentation for GridStorm enterprise data grid with plugin reference and framework guides.',
    url: `${BASE_URL}/docs`,
    author: { '@type': 'Organization', name: 'GridStorm' },
    publisher: {
      '@type': 'Organization',
      name: 'GridStorm',
      url: BASE_URL,
    },
  },
};

const DEMOS_SEO: SeoConfig = {
  title: 'GridStorm Live Demos — See It In Action',
  description:
    'Interactive demos for GridStorm: virtual scrolling with 100K rows, WCAG 2.1 AA accessibility, ' +
    'Excel formula engine, clipboard copy/paste, pivot tables, and 30+ more features.',
  keywords: [
    'GridStorm demo',
    'data grid demo',
    'virtual scrolling demo',
    'excel formula grid',
    'accessible data grid demo',
    'react grid examples',
  ],
  canonical: `${BASE_URL}/demos`,
  ogTitle: 'GridStorm Live Demos',
  ogDescription:
    '30+ interactive demos: virtual scrolling, formulas, clipboard, accessibility, pivoting, and more.',
  ogImage: `${BASE_URL}/og-gridstorm.png`,
  ogType: 'website',
  twitterTitle: 'GridStorm Live Demos',
  twitterDescription: '30+ interactive GridStorm demos — try it in your browser right now.',
  twitterImage: `${BASE_URL}/og-gridstorm.png`,
  jsonLd: null,
};

// ── Route resolver ─────────────────────────────────────────────────────────

/**
 * Resolve SEO config for the current hash route.
 * For product routes, reads the manifest seo field.
 */
export function getSeoForRoute(route: string): SeoConfig {
  // Platform home and gridstorm default
  if (route === '/' || route === '') return HOME_SEO;
  if (route === '/products') return PRODUCTS_SEO;
  if (route.startsWith('/docs')) return DOCS_SEO;
  if (route === '/demos') return DEMOS_SEO;

  // Per-product pages — derive from manifest
  if (route.startsWith('/product/')) {
    const id = route.slice('/product/'.length).split('/')[0];
    const product = id ? getProduct(id) : undefined;
    if (product?.seo) {
      return seoFromManifest(product.seo, BASE_URL, route);
    }
    // Fallback for products without seo field
    if (product) {
      return {
        title: `${product.name} — GridStorm`,
        description: product.description,
        keywords: product.tags,
        canonical: `${BASE_URL}${route}`,
        ogTitle: `${product.name} — GridStorm`,
        ogDescription: product.description,
        ogImage: `${BASE_URL}/og-gridstorm.png`,
        ogType: 'website',
        jsonLd: null,
      };
    }
  }

  // Default fallback
  return HOME_SEO;
}
