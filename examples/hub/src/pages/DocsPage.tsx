import React, { useState, useEffect, useCallback } from 'react';
import { DocsSidebar } from '../docs/DocsSidebar';
import { DocsContent } from '../docs/DocsContent';

interface DocsPageProps {
  route: string;
}

// Vite lazy-loads markdown files from the docs content directory
const docModules = import.meta.glob(
  '../../../../docs/src/content/docs/**/*.md',
  { query: '?raw', import: 'default', eager: false },
) as Record<string, () => Promise<string>>;

/** Extract slug from route: /docs/plugins/sorting -> plugins/sorting */
function extractSlug(route: string): string {
  const match = route.match(/^\/docs\/?(.*)$/);
  const slug = match?.[1] || '';
  // Strip trailing slash
  return slug.replace(/\/$/, '') || 'getting-started/introduction';
}

/** Build the glob key for a given slug */
function resolveModuleKey(slug: string): string | undefined {
  // Try .md extension
  const mdKey = `../../../../docs/src/content/docs/${slug}.md`;
  if (docModules[mdKey]) return mdKey;
  // Try with /index.md
  const indexKey = `../../../../docs/src/content/docs/${slug}/index.md`;
  if (docModules[indexKey]) return indexKey;
  return undefined;
}

export const DocsPage: React.FC<DocsPageProps> = ({ route }) => {
  const slug = extractSlug(route);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const key = resolveModuleKey(slug);
    if (!key) {
      setContent(null);
      setError(`Document not found: ${slug}`);
      setLoading(false);
      return;
    }

    docModules[key]()
      .then((raw) => {
        if (!cancelled) {
          setContent(raw as string);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(String(err));
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleNavigate = useCallback((newSlug: string) => {
    window.location.hash = `/docs/${newSlug}`;
  }, []);

  return (
    <div className="docs-page">
      <DocsSidebar activeSlug={slug} onNavigate={handleNavigate} />
      <main className="docs-main">
        {loading && (
          <div className="docs-loading">
            <div className="docs-loading-spinner" />
            <span>Loading documentation...</span>
          </div>
        )}
        {error && !loading && (
          <div className="docs-error">
            <h2>Document Not Found</h2>
            <p>The document <code>{slug}</code> could not be found.</p>
            <p>Try navigating from the sidebar or check that the URL is correct.</p>
          </div>
        )}
        {content && !loading && <DocsContent content={content} />}
      </main>
    </div>
  );
};
