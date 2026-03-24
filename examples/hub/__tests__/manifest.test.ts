import { describe, it, expect } from 'vitest';
import { DOC_SECTIONS } from '../src/docs/manifest';

describe('Docs Manifest', () => {
  it('has all required top-level sections', () => {
    const labels = DOC_SECTIONS.map((s) => s.label);
    expect(labels).toContain('Getting Started');
    expect(labels).toContain('Core Concepts');
    // Plugins are split into tiers
    const hasPluginSection = labels.some((l) => l.startsWith('Plugins'));
    expect(hasPluginSection).toBe(true);
    expect(labels).toContain('Framework Guides');
    expect(labels).toContain('Guides');
    expect(labels).toContain('API Reference');
  });

  it('includes MCP Server in Guides section', () => {
    const guides = DOC_SECTIONS.find((s) => s.label === 'Guides');
    expect(guides).toBeDefined();
    const slugs = guides!.items.map((i) => i.slug);
    expect(slugs).toContain('guides/mcp-server');
  });

  it('includes PDF Toolkit in Guides section', () => {
    const guides = DOC_SECTIONS.find((s) => s.label === 'Guides');
    expect(guides).toBeDefined();
    const slugs = guides!.items.map((i) => i.slug);
    expect(slugs).toContain('guides/pdf-toolkit');
  });

  it('includes all 13+ plugins across tiered sections', () => {
    const pluginSections = DOC_SECTIONS.filter((s) => s.label.startsWith('Plugins'));
    const slugs = pluginSections.flatMap((s) => s.items.map((i) => i.slug));
    expect(slugs).toContain('plugins/sorting');
    expect(slugs).toContain('plugins/filtering');
    expect(slugs).toContain('plugins/selection');
    expect(slugs).toContain('plugins/editing');
    expect(slugs).toContain('plugins/pagination');
    expect(slugs).toContain('plugins/column-pinning');
    expect(slugs).toContain('plugins/column-resize');
    expect(slugs).toContain('plugins/column-reorder');
    expect(slugs).toContain('plugins/context-menu');
    expect(slugs).toContain('plugins/grouping');
    expect(slugs).toContain('plugins/aggregation');
    expect(slugs).toContain('plugins/clipboard');
    expect(slugs.length).toBeGreaterThanOrEqual(13);
  });

  it('includes framework guides for React, Vanilla, and Angular', () => {
    const frameworks = DOC_SECTIONS.find((s) => s.label === 'Framework Guides');
    expect(frameworks).toBeDefined();
    const slugs = frameworks!.items.map((i) => i.slug);
    expect(slugs).toContain('frameworks/react');
    expect(slugs).toContain('frameworks/vanilla');
    expect(slugs).toContain('frameworks/angular');
  });

  it('includes all guide entries', () => {
    const guides = DOC_SECTIONS.find((s) => s.label === 'Guides');
    expect(guides).toBeDefined();
    const slugs = guides!.items.map((i) => i.slug);
    expect(slugs).toContain('guides/performance');
    expect(slugs).toContain('guides/accessibility');
    expect(slugs).toContain('guides/custom-plugins');
    expect(slugs).toContain('guides/integration-guide');
  });

  it('includes core concept entries for store, dom-renderer, plugin-system', () => {
    const core = DOC_SECTIONS.find((s) => s.label === 'Core Concepts');
    expect(core).toBeDefined();
    const slugs = core!.items.map((i) => i.slug);
    expect(slugs).toContain('core-concepts/store');
    expect(slugs).toContain('core-concepts/dom-renderer');
    expect(slugs).toContain('core-concepts/plugin-system');
  });

  it('every item has a non-empty slug and title', () => {
    for (const section of DOC_SECTIONS) {
      for (const item of section.items) {
        expect(item.slug).toBeTruthy();
        expect(item.title).toBeTruthy();
        expect(item.slug).toMatch(/^[a-z0-9/-]+$/);
      }
    }
  });

  it('has no duplicate slugs', () => {
    const allSlugs = DOC_SECTIONS.flatMap((s) => s.items.map((i) => i.slug));
    const uniqueSlugs = new Set(allSlugs);
    expect(allSlugs.length).toBe(uniqueSlugs.size);
  });
});
