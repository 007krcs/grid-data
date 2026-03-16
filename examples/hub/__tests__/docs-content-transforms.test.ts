import { describe, it, expect } from 'vitest';

// ── Extracted transform functions (same logic as DocsContent.tsx) ──

function stripFrontmatter(md: string): string {
  const match = md.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  if (match) return md.slice(match[0].length);
  return md;
}

function transformCallouts(md: string): string {
  return md.replace(
    /^:::(note|tip|caution)\s*\n([\s\S]*?)^:::\s*$/gm,
    (_match, type: string, body: string) => {
      const trimmed = body.trim();
      return `<div class="callout callout-${type}">\n\n${trimmed}\n\n</div>`;
    },
  );
}

function transformExamples(md: string): string {
  return md.replace(
    /^:::example\\{([^}]*)\\}\s*\n([\s\S]*?)^:::\s*$/gm,
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

// Use the actual regex from DocsContent (without the extra escape)
function transformExamplesActual(md: string): string {
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

describe('DocsContent Transforms', () => {
  describe('stripFrontmatter', () => {
    it('removes YAML frontmatter', () => {
      const input = `---
title: Test
description: Hello
---
# Content here`;
      const result = stripFrontmatter(input);
      expect(result).toBe('# Content here');
    });

    it('returns content unchanged if no frontmatter', () => {
      const input = '# No frontmatter\nJust content';
      expect(stripFrontmatter(input)).toBe(input);
    });
  });

  describe('transformCallouts', () => {
    it('transforms :::note blocks', () => {
      const input = `:::note
This is a note.
:::`;
      const result = transformCallouts(input);
      expect(result).toContain('class="callout callout-note"');
      expect(result).toContain('This is a note.');
    });

    it('transforms :::tip blocks', () => {
      const input = `:::tip
This is a tip.
:::`;
      const result = transformCallouts(input);
      expect(result).toContain('class="callout callout-tip"');
    });

    it('transforms :::caution blocks', () => {
      const input = `:::caution
This is a warning.
:::`;
      const result = transformCallouts(input);
      expect(result).toContain('class="callout callout-caution"');
    });
  });

  describe('transformExamples', () => {
    it('transforms :::example blocks with title and href', () => {
      const input = `:::example{title="Sorting Demo" href="/cookbook/#sorting-basic"}
Try sorting with single column.
:::`;
      const result = transformExamplesActual(input);
      expect(result).toContain('class="example-embed"');
      expect(result).toContain('Sorting Demo');
      expect(result).toContain('href="/cookbook/#sorting-basic"');
      expect(result).toContain('Open in Cookbook');
      expect(result).toContain('Try sorting with single column.');
    });

    it('uses default title and href when attrs are missing', () => {
      const input = `:::example{}
Some content
:::`;
      const result = transformExamplesActual(input);
      expect(result).toContain('Live Example');
      expect(result).toContain('href="/cookbook/"');
    });

    it('preserves content outside example blocks', () => {
      const input = `# Title

Some paragraph.

:::example{title="Demo" href="/cookbook/#demo"}
Example content
:::

More content after.`;
      const result = transformExamplesActual(input);
      expect(result).toContain('# Title');
      expect(result).toContain('Some paragraph.');
      expect(result).toContain('More content after.');
      expect(result).toContain('class="example-embed"');
    });
  });
});
