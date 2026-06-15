# SEO scripts

## `indexnow-submit.cjs` — push URLs to IndexNow

[IndexNow](https://www.indexnow.org/) is a push protocol that tells
participating search engines (Bing, Yandex, Naver, Seznam, Mojeek) about new
or changed URLs without waiting for them to crawl. Google is **not** a
participant — use Google Search Console for Google.

### Ownership verification

The key `2754dadf1ec3493213a47bbeb5937b3f` is hosted at
`examples/hub/public/2754dadf1ec3493213a47bbeb5937b3f.txt`, which ships with
every hub deploy and resolves at `https://gridstorm.tekivex.com/2754dadf1ec3493213a47bbeb5937b3f.txt`.
Search engines fetch that URL to confirm we own the host. **Do not delete
the file** — submissions will start returning 403 immediately.

If the key ever leaks (it's in this repo, so technically it's already
public — that's by design), regenerate via:

```sh
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

Then replace the constant in `indexnow-submit.cjs`, rename the `.txt` file
under `examples/hub/public/`, and push.

### Usage

```sh
# Submit the curated top-URL list (the 13 main routes). Run after every
# substantive deploy.
node scripts/seo/indexnow-submit.cjs

# Submit every URL in both sitemaps. Run when the sitemap itself changes
# (new docs pages, new demos).
node scripts/seo/indexnow-submit.cjs --all

# Submit a single URL — useful for a hotfix on one page.
node scripts/seo/indexnow-submit.cjs --url=https://gridstorm.tekivex.com/docs/getting-started/quick-start/

# Print what would be submitted without actually POSTing.
node scripts/seo/indexnow-submit.cjs --dry-run
```

### Exit codes

| Code | Meaning |
|---|---|
| `0` | every batch returned HTTP 200 or 202 |
| `1` | at least one batch returned a different status |
| `2` | script error before POST |

### When to run

| Trigger | Command |
|---|---|
| Manual deploy of substantive content change | `node scripts/seo/indexnow-submit.cjs` |
| Sitemap structure changed | `node scripts/seo/indexnow-submit.cjs --all` |
| Single page fixed and you want fast re-crawl | `node scripts/seo/indexnow-submit.cjs --url=…` |
| Adding to CI on push to main | `node scripts/seo/indexnow-submit.cjs` (after the deploy succeeds) |

**Don't run on every commit.** Submitting unchanged URLs wastes per-host
quota and counts against your reputation with the engines.

### Verifying it worked

Bing Webmaster Tools shows IndexNow submissions and processing status:
https://www.bing.com/webmasters/about → connect the site → look for the
**IndexNow** section in the dashboard. URLs typically appear within
~10 minutes and show as Submitted → Crawled → Indexed over the next hours.

### Google Search Console (separate from IndexNow)

Google does not participate in IndexNow. For Google indexing:

1. Verify ownership at https://search.google.com/search-console
2. Submit `https://gridstorm.tekivex.com/sitemap-index.xml`
3. Use **URL Inspection** to request indexing of specific URLs (rate-limited
   but more powerful than sitemap-only crawling).
