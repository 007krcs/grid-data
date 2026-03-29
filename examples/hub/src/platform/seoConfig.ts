// ─── SEO Config — per-route metadata map ─────────────────────────────────
// Maps hash routes to SeoConfig objects. App.tsx calls getSeoForRoute(route)
// and passes the result to useSeo(). Product routes delegate to the manifest
// seo field via seoFromManifest().

import { type SeoConfig, seoFromManifest } from './useSeo';
import { getProduct } from './registry';

const BASE_URL = 'https://nexaforge.dev';

// ── Static route configs ───────────────────────────────────────────────────

const HOME_SEO: SeoConfig = {
  title: 'NexaForge — Enterprise Software, Engineered to Scale',
  description:
    'NexaForge builds enterprise-grade developer tools: GridStorm (open-source data grid), ' +
    'PDF Toolkit (WASM PDF processing), NexaRecruit (ATS), and NexaCare (healthcare platform).',
  keywords: [
    'enterprise software platform',
    'developer tools',
    'data grid',
    'PDF toolkit',
    'ATS software',
    'NexaForge',
    'open source enterprise',
  ],
  canonical: BASE_URL,
  ogTitle: 'NexaForge — Enterprise Software, Engineered to Scale',
  ogDescription:
    'Open-source and enterprise developer tools built to production quality. ' +
    'GridStorm, PDF Toolkit, NexaRecruit, NexaCare, and more.',
  ogImage: `${BASE_URL}/og-nexaforge.png`,
  ogType: 'website',
  twitterTitle: 'NexaForge — Enterprise Software, Engineered to Scale',
  twitterDescription:
    'GridStorm data grid, WASM PDF Toolkit, ATS, and healthcare platform — one engineering team.',
  twitterImage: `${BASE_URL}/og-nexaforge.png`,
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'NexaForge',
    url: BASE_URL,
    logo: `${BASE_URL}/logo.svg`,
    description:
      'NexaForge builds enterprise-grade developer tools including GridStorm, PDF Toolkit, NexaRecruit, and NexaCare.',
    sameAs: ['https://github.com/007krcs/grid-data'],
    foundingDate: '2024',
    knowsAbout: [
      'Data Grids',
      'PDF Processing',
      'Healthcare Software',
      'Applicant Tracking Systems',
      'Enterprise Software',
    ],
  },
};

const PRODUCTS_SEO: SeoConfig = {
  title: 'All Products — NexaForge Platform',
  description:
    'Explore all NexaForge products: GridStorm enterprise data grid, WASM PDF Toolkit, ' +
    'NexaRecruit ATS, NexaCare healthcare platform, Analytics Studio, and DataFlow.',
  keywords: [
    'NexaForge products',
    'enterprise software suite',
    'GridStorm',
    'PDF Toolkit',
    'NexaRecruit',
    'NexaCare',
    'product catalog',
  ],
  canonical: `${BASE_URL}/products`,
  ogTitle: 'All Products — NexaForge Platform',
  ogDescription:
    'Enterprise software suite: data grids, PDF processing, ATS, healthcare, analytics, and streaming.',
  ogImage: `${BASE_URL}/og-nexaforge.png`,
  ogType: 'website',
  twitterTitle: 'NexaForge Product Suite',
  twitterDescription:
    'GridStorm, PDF Toolkit, NexaRecruit, NexaCare — enterprise tools for every team.',
  twitterImage: `${BASE_URL}/og-nexaforge.png`,
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
    author: { '@type': 'Organization', name: 'NexaForge' },
    publisher: {
      '@type': 'Organization',
      name: 'NexaForge',
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
        title: `${product.name} — NexaForge`,
        description: product.description,
        keywords: product.tags,
        canonical: `${BASE_URL}${route}`,
        ogTitle: `${product.name} — NexaForge`,
        ogDescription: product.description,
        ogImage: `${BASE_URL}/og-nexaforge.png`,
        ogType: 'website',
        jsonLd: null,
      };
    }
  }

  // Default fallback
  return HOME_SEO;
}
