#!/usr/bin/env node
/**
 * IndexNow submitter for GridStorm.
 *
 * IndexNow (https://www.indexnow.org/) is a push protocol: instead of
 * waiting for crawlers to discover new content, you POST your URLs and
 * the participating search engines (Bing, Yandex, Naver, Seznam, Mojeek)
 * crawl them within minutes. Google does NOT participate (use Search
 * Console's URL Inspection for Google).
 *
 * Setup is already done in this repo:
 *   1. The key file lives at examples/hub/public/<KEY>.txt — that file
 *      ships with every hub deploy and proves we own the host.
 *   2. This script uses the universal endpoint api.indexnow.org, which
 *      fans out to all participating engines in one POST.
 *
 * Usage:
 *   node scripts/seo/indexnow-submit.cjs                    # submit the curated top-URL list
 *   node scripts/seo/indexnow-submit.cjs --all              # fetch live sitemaps and submit every URL
 *   node scripts/seo/indexnow-submit.cjs --url=https://...  # submit a single URL
 *   node scripts/seo/indexnow-submit.cjs --dry-run          # print what would be submitted, don't POST
 *
 * Exit codes:
 *   0 — every batch returned HTTP 200 or 202
 *   1 — at least one batch returned something else (invalid key, throttled, etc.)
 *
 * When to run:
 *   • Every time you push significant content changes to main (manual or via CI).
 *   • Not for every code commit — submitting unchanged URLs is wasted budget.
 *   • Daily caps vary by engine; ~10k URLs per POST and a few thousand POSTs/day
 *     are well within limits for this size of site.
 */
'use strict';

const KEY = '2754dadf1ec3493213a47bbeb5937b3f';
const HOST = 'gridstorm.tekivex.com';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

// api.indexnow.org is the shared endpoint that fans out to every
// participating engine — Bing, Yandex, Naver, Seznam, Mojeek as of 2026.
// If you want to submit to a single engine instead, swap the host:
//   bing:    https://www.bing.com/indexnow
//   yandex:  https://yandex.com/indexnow
//   naver:   https://searchadvisor.naver.com/indexnow
const ENDPOINT = 'https://api.indexnow.org/IndexNow';

// Curated list of the highest-value URLs. Submit this set on every deploy.
// Add a URL here when a new top-level route ships; remove when one goes away.
const TOP_URLS = [
  `https://${HOST}/`,
  `https://${HOST}/#/products`,
  `https://${HOST}/#/demos`,
  `https://${HOST}/#/docs`,
  `https://${HOST}/feature-showcase/`,
  `https://${HOST}/playground/`,
  `https://${HOST}/spreadsheet/`,
  `https://${HOST}/financial-trading/`,
  `https://${HOST}/analytics-explorer/`,
  `https://${HOST}/react-demo/`,
  `https://${HOST}/pdf-viewer/`,
  `https://${HOST}/cookbook/`,
  `https://${HOST}/docs/`,
];

const argv = process.argv.slice(2);
const flags = {
  dryRun: argv.includes('--dry-run'),
  all: argv.includes('--all'),
  single: argv.find((a) => a.startsWith('--url=')),
};

async function loadSitemapUrls() {
  // Parse the deployed sitemap-index.xml and follow each <loc> to gather
  // every <url><loc> entry. Done with regex rather than a real XML parser
  // because the format is tightly constrained and adding a dep for this
  // is wasteful.
  const indexUrl = `https://${HOST}/sitemap-index.xml`;
  console.log(`[indexnow] fetching ${indexUrl}`);
  const indexRes = await fetch(indexUrl);
  if (!indexRes.ok) {
    throw new Error(`sitemap-index.xml returned ${indexRes.status}`);
  }
  const indexXml = await indexRes.text();
  const childSitemaps = [...indexXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  const allUrls = new Set();
  for (const childSitemap of childSitemaps) {
    console.log(`[indexnow] fetching ${childSitemap}`);
    try {
      const childRes = await fetch(childSitemap);
      if (!childRes.ok) {
        console.warn(`[indexnow] skipped ${childSitemap}: HTTP ${childRes.status}`);
        continue;
      }
      const childXml = await childRes.text();
      for (const m of childXml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
        allUrls.add(m[1]);
      }
    } catch (err) {
      console.warn(`[indexnow] skipped ${childSitemap}: ${err.message}`);
    }
  }
  return [...allUrls];
}

async function submit(urls) {
  if (urls.length === 0) {
    console.log('[indexnow] no URLs to submit');
    return 0;
  }
  // IndexNow accepts up to 10,000 URLs per POST. We batch at 1,000 to be
  // courteous and to surface errors per-batch.
  const BATCH = 1000;
  let failedBatches = 0;
  for (let i = 0; i < urls.length; i += BATCH) {
    const batch = urls.slice(i, i + BATCH);
    const body = {
      host: HOST,
      key: KEY,
      keyLocation: KEY_LOCATION,
      urlList: batch,
    };
    if (flags.dryRun) {
      console.log(`[indexnow] DRY RUN — would POST ${batch.length} URL(s):`);
      for (const u of batch.slice(0, 5)) console.log(`  • ${u}`);
      if (batch.length > 5) console.log(`  … and ${batch.length - 5} more`);
      continue;
    }
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify(body),
    });
    const status = `${res.status} ${res.statusText}`;
    // 200 = accepted and processed; 202 = received, validation pending.
    // Anything else (400, 403, 422, 429) is a real failure worth surfacing.
    if (res.status === 200 || res.status === 202) {
      console.log(`[indexnow] batch ${Math.floor(i / BATCH) + 1}: ${status} (${batch.length} URLs)`);
    } else {
      const text = await res.text().catch(() => '');
      console.error(`[indexnow] batch ${Math.floor(i / BATCH) + 1} FAILED: ${status}`);
      if (text) console.error(`  body: ${text.slice(0, 500)}`);
      failedBatches++;
    }
  }
  return failedBatches;
}

async function main() {
  let urls;
  if (flags.single) {
    urls = [flags.single.slice('--url='.length)];
  } else if (flags.all) {
    urls = await loadSitemapUrls();
  } else {
    urls = TOP_URLS;
  }
  console.log(`[indexnow] target: ${ENDPOINT}`);
  console.log(`[indexnow] host:   ${HOST}`);
  console.log(`[indexnow] key:    ${KEY.slice(0, 6)}…${KEY.slice(-6)}`);
  console.log(`[indexnow] URLs:   ${urls.length}${flags.dryRun ? ' (dry-run)' : ''}`);
  const failed = await submit(urls);
  if (failed > 0) {
    console.error(`[indexnow] FAIL: ${failed} batch(es) returned non-2xx.`);
    process.exit(1);
  }
  console.log('[indexnow] OK');
}

main().catch((err) => {
  console.error('[indexnow] script error:', err && err.stack ? err.stack : err);
  process.exit(2);
});
