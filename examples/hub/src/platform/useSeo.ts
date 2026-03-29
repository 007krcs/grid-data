// ─── useSeo — Dynamic <head> meta injection ───────────────────────────────
// Call this hook once in App with the route. It updates document.title and
// all meta/og/twitter/link tags on every hash-route change. JSON-LD
// SoftwareApplication schemas are injected per product page.

import { useEffect } from 'react';
import type { ProductSeoMeta } from './types';

export interface SeoConfig {
  title: string;
  description: string;
  keywords?: string[];
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  jsonLd?: object | null;
}

// ── Helper: set or create a <meta> tag ────────────────────────────────────
function setMeta(selector: string, value: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    // Parse selector to set the right attribute
    const nameMatch = selector.match(/name="([^"]+)"/);
    const propMatch = selector.match(/property="([^"]+)"/);
    if (nameMatch) el.setAttribute('name', nameMatch[1]);
    if (propMatch) el.setAttribute('property', propMatch[1]);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function setJsonLd(data: object | null) {
  const id = '__nexaforge-jsonld__';
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!data) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('script');
    el.id = id;
    el.type = 'application/ld+json';
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data, null, 2);
}

// ── Build SeoConfig from a ProductSeoMeta manifest entry ─────────────────
export function seoFromManifest(
  seo: ProductSeoMeta,
  baseUrl = 'https://nexaforge.dev',
  route = '/',
): SeoConfig {
  const canonical = `${baseUrl}/${route.replace(/^\//, '')}`;
  const ogImage = seo.ogImage
    ? seo.ogImage.startsWith('http')
      ? seo.ogImage
      : `${baseUrl}${seo.ogImage}`
    : `${baseUrl}/og-default.png`;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': seo.jsonLdType,
    name: seo.title.split(' —')[0].trim(),
    description: seo.description,
    url: canonical,
    image: ogImage,
    applicationCategory: seo.applicationCategory ?? 'BusinessApplication',
    operatingSystem: seo.operatingSystem ?? 'All',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
    publisher: {
      '@type': 'Organization',
      name: 'NexaForge',
      url: baseUrl,
    },
  };

  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
    canonical,
    ogTitle: seo.title,
    ogDescription: seo.description,
    ogImage,
    ogType: 'website',
    twitterTitle: seo.title,
    twitterDescription: seo.description,
    twitterImage: ogImage,
    jsonLd,
  };
}

// ── Main hook ─────────────────────────────────────────────────────────────
export function useSeo(config: SeoConfig) {
  useEffect(() => {
    // Title
    document.title = config.title;

    // Basic meta
    setMeta('meta[name="description"]', config.description);
    if (config.keywords?.length) {
      setMeta('meta[name="keywords"]', config.keywords.join(', '));
    }

    // Canonical
    if (config.canonical) setLink('canonical', config.canonical);

    // Open Graph
    setMeta('meta[property="og:type"]', config.ogType ?? 'website');
    setMeta('meta[property="og:title"]', config.ogTitle ?? config.title);
    setMeta('meta[property="og:description"]', config.ogDescription ?? config.description);
    setMeta('meta[property="og:site_name"]', 'NexaForge');
    if (config.ogImage) setMeta('meta[property="og:image"]', config.ogImage);
    if (config.canonical) setMeta('meta[property="og:url"]', config.canonical);

    // Twitter Card
    setMeta('meta[name="twitter:card"]', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', config.twitterTitle ?? config.title);
    setMeta('meta[name="twitter:description"]', config.twitterDescription ?? config.description);
    if (config.twitterImage) setMeta('meta[name="twitter:image"]', config.twitterImage);

    // JSON-LD
    setJsonLd(config.jsonLd ?? null);
  }, [
    config.title,
    config.description,
    config.canonical,
    config.ogImage,
    config.keywords,
    config.jsonLd,
  ]);
}
