import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import type { Components } from 'react-markdown';

interface DocsContentProps {
  content: string;
}

/** Strip YAML frontmatter (---\n...\n---) from the top of markdown content. */
function stripFrontmatter(md: string): string {
  const match = md.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  if (match) return md.slice(match[0].length);
  return md;
}

/** Convert heading text to a URL-friendly slug. */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/**
 * Transform :::note, :::tip, :::caution callout blocks into HTML div equivalents
 * before passing to react-markdown.
 */
function transformCallouts(md: string): string {
  return md.replace(
    /^:::(note|tip|caution)\s*\n([\s\S]*?)^:::\s*$/gm,
    (_match, type: string, body: string) => {
      const trimmed = body.trim();
      return `<div class="callout callout-${type}">\n\n${trimmed}\n\n</div>`;
    },
  );
}

/**
 * Transform :::example blocks into interactive example cards with links
 * to the cookbook/playground. Format:
 * :::example{title="Sorting" href="/cookbook/#sorting-basic"}
 * Code or description here
 * :::
 */
function transformExamples(md: string): string {
  return md.replace(
    /^:::example\{([^}]*)\}\s*\n([\s\S]*?)^:::\s*$/gm,
    (_match, attrs: string, body: string) => {
      const titleMatch = attrs.match(/title="([^"]*)"/);
      const hrefMatch = attrs.match(/href="([^"]*)"/);
      const title = titleMatch?.[1] || 'Live Example';
      const href = hrefMatch?.[1] || '/cookbook/';
      const trimmed = body.trim();
      return `<div class="example-embed">
<div class="example-embed-header">
<span class="example-embed-icon">\u25B6</span>
<strong>${title}</strong>
<a href="${href}" target="_blank" rel="noopener noreferrer" class="example-embed-link">Open in Cookbook \u2192</a>
</div>

${trimmed}

</div>`;
    },
  );
}

export const DocsContent: React.FC<DocsContentProps> = ({ content }) => {
  const processedContent = useMemo(() => {
    let md = stripFrontmatter(content);
    md = transformCallouts(md);
    md = transformExamples(md);
    return md;
  }, [content]);

  const components: Components = {
    a({ href, children, ...props }) {
      // Rewrite internal links to hash-based doc routes
      if (href && href.startsWith('/') && !href.startsWith('/feature-showcase') && !href.startsWith('/playground') && !href.startsWith('/pdf-viewer') && !href.startsWith('/financial-trading') && !href.startsWith('/analytics-explorer') && !href.startsWith('/spreadsheet') && !href.startsWith('/react-demo') && !href.startsWith('/cookbook')) {
        // Strip leading slash and trailing slash
        const cleaned = href.replace(/^\//, '').replace(/\/$/, '');
        return (
          <a href={`#/docs/${cleaned}`} {...props}>
            {children}
          </a>
        );
      }
      // External links open in new tab
      if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
        return (
          <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
            {children}
          </a>
        );
      }
      return <a href={href} {...props}>{children}</a>;
    },

    h1({ children, ...props }) {
      const text = typeof children === 'string' ? children : String(children);
      return <h1 id={slugify(text)} {...props}>{children}</h1>;
    },

    h2({ children, ...props }) {
      const text = typeof children === 'string' ? children : String(children);
      return <h2 id={slugify(text)} {...props}>{children}</h2>;
    },

    h3({ children, ...props }) {
      const text = typeof children === 'string' ? children : String(children);
      return <h3 id={slugify(text)} {...props}>{children}</h3>;
    },

    pre({ children, ...props }) {
      return (
        <div className="code-block-wrapper">
          <pre {...props}>{children}</pre>
        </div>
      );
    },

    table({ children, ...props }) {
      return (
        <div className="table-wrapper">
          <table {...props}>{children}</table>
        </div>
      );
    },
  };

  return (
    <div className="docs-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={components}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};
