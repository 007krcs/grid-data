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
  /** Alt text for the OG image. Falls back to "<title> — preview image". */
  ogImageAlt?: string;
  ogType?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  twitterImageAlt?: string;
  /**
   * Per-route JSON-LD. Accepts a single object (the page's primary schema —
   * e.g. SoftwareApplication for a product page) or an array of objects
   * (e.g. [SoftwareApplication, BreadcrumbList]). Google's structured-data
   * tools recommend separate <script> tags rather than @graph wrapping, so
   * arrays are rendered as multiple sibling <script type="application/ld+json">
   * elements, all marked with the same data-managed attribute so they're
   * replaced atomically on route change.
   */
  jsonLd?: object | object[] | null;
}

/**
 * Build a BreadcrumbList JSON-LD for a nested route. Accepts an array of
 * trail segments — each with a label and a URL relative to the base. The
 * @type BreadcrumbList is what Google's Knowledge Graph and AI assistants
 * use to understand site hierarchy and infer the "section" a page lives in.
 *
 * @example
 *   buildBreadcrumb([
 *     { name: 'Products', url: '/products' },
 *     { name: 'GridStorm', url: '/product/gridstorm' },
 *   ], 'https://www.tekivex.com/gridstorm')
 */
export function buildBreadcrumb(
  trail: Array<{ name: string; url: string }>,
  baseUrl = 'https://www.tekivex.com/gridstorm',
): object {
  // Always anchor the breadcrumb in the site root so crawlers see the full
  // path. The first item is implicit; callers pass only the descendants.
  const items = [
    { '@type': 'ListItem', position: 1, name: 'Home', item: baseUrl },
    ...trail.map((seg, i) => ({
      '@type': 'ListItem',
      position: i + 2,
      name: seg.name,
      item: seg.url.startsWith('http') ? seg.url : `${baseUrl}${seg.url}`,
    })),
  ];
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items,
  };
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

function setJsonLd(data: object | object[] | null) {
  // Sweep every previously-managed block first so route transitions don't
  // leak stale schemas (e.g. the old BreadcrumbList persists after navigating
  // to a top-level route that doesn't need one).
  document
    .querySelectorAll<HTMLScriptElement>('script[data-managed="seo"]')
    .forEach((el) => el.remove());
  if (!data) return;
  const blocks = Array.isArray(data) ? data : [data];
  for (const block of blocks) {
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.setAttribute('data-managed', 'seo');
    el.textContent = JSON.stringify(block, null, 2);
    document.head.appendChild(el);
  }
}

// ── Build SeoConfig from a ProductSeoMeta manifest entry ─────────────────
export function seoFromManifest(
  seo: ProductSeoMeta,
  baseUrl = 'https://www.tekivex.com/gridstorm',
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
      name: 'GridStorm',
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

    // Open Graph — every property a major social platform reads.
    // og:image:alt, :secure_url, :width, :height, :type are what WhatsApp,
    // Facebook, LinkedIn, and Slack use to decide whether to show a preview
    // card or fall back to a plain link. Missing :alt or :secure_url often
    // explains "the link shows no image when I share it."
    setMeta('meta[property="og:type"]', config.ogType ?? 'website');
    setMeta('meta[property="og:title"]', config.ogTitle ?? config.title);
    setMeta('meta[property="og:description"]', config.ogDescription ?? config.description);
    setMeta('meta[property="og:site_name"]', 'GridStorm');
    if (config.ogImage) {
      setMeta('meta[property="og:image"]', config.ogImage);
      setMeta('meta[property="og:image:secure_url"]', config.ogImage);
      setMeta('meta[property="og:image:width"]', '1200');
      setMeta('meta[property="og:image:height"]', '630');
      setMeta('meta[property="og:image:type"]', 'image/png');
      setMeta(
        'meta[property="og:image:alt"]',
        config.ogImageAlt ??
          `${config.title} — preview image`,
      );
    }
    if (config.canonical) setMeta('meta[property="og:url"]', config.canonical);

    // Twitter Card — Twitter/X reads og:* via fallthrough but explicit
    // twitter:* tags take precedence. twitter:image:alt is required for
    // the summary_large_image card to render with accessibility metadata.
    setMeta('meta[name="twitter:card"]', 'summary_large_image');
    setMeta('meta[name="twitter:title"]', config.twitterTitle ?? config.title);
    setMeta('meta[name="twitter:description"]', config.twitterDescription ?? config.description);
    if (config.twitterImage) {
      setMeta('meta[name="twitter:image"]', config.twitterImage);
      setMeta(
        'meta[name="twitter:image:alt"]',
        config.twitterImageAlt ?? config.ogImageAlt ?? `${config.title} — preview image`,
      );
    }

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
