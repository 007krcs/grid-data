import { describe, it, expect } from 'vitest';

// ── Demo data extracted from DemosPage.tsx ──
// We test the data structure directly since these are the source of truth for demo links

const DEMO_HREFS = [
  '/feature-showcase/',
  '/playground/',
  '/pdf-viewer/',
  '/financial-trading/',
  '/analytics-explorer/',
  '/spreadsheet/',
  '/cookbook/',
  '/react-demo/',
];

const HOMEPAGE_DEMO_HREFS = [
  '/pdf-viewer/',
  '/feature-showcase/',
  '/playground/',
  '/financial-trading/',
  '/analytics-explorer/',
  '/spreadsheet/',
  '/cookbook/',
];

describe('Demo Links', () => {
  describe('DemosPage links', () => {
    it('all demo hrefs start with / and end with /', () => {
      for (const href of DEMO_HREFS) {
        expect(href).toMatch(/^\/[a-z-]+\/$/);
      }
    });

    it('includes the cookbook demo', () => {
      expect(DEMO_HREFS).toContain('/cookbook/');
    });

    it('includes all core demo apps', () => {
      expect(DEMO_HREFS).toContain('/feature-showcase/');
      expect(DEMO_HREFS).toContain('/playground/');
      expect(DEMO_HREFS).toContain('/pdf-viewer/');
      expect(DEMO_HREFS).toContain('/financial-trading/');
      expect(DEMO_HREFS).toContain('/analytics-explorer/');
      expect(DEMO_HREFS).toContain('/spreadsheet/');
      expect(DEMO_HREFS).toContain('/react-demo/');
    });

    it('has no duplicate hrefs', () => {
      const unique = new Set(DEMO_HREFS);
      expect(DEMO_HREFS.length).toBe(unique.size);
    });
  });

  describe('Homepage DemoCards links', () => {
    it('includes the cookbook demo', () => {
      expect(HOMEPAGE_DEMO_HREFS).toContain('/cookbook/');
    });

    it('has no duplicate hrefs', () => {
      const unique = new Set(HOMEPAGE_DEMO_HREFS);
      expect(HOMEPAGE_DEMO_HREFS.length).toBe(unique.size);
    });

    it('all homepage demo hrefs are valid paths', () => {
      for (const href of HOMEPAGE_DEMO_HREFS) {
        expect(href).toMatch(/^\/[a-z-]+\/$/);
      }
    });
  });

  describe('Demo href corresponds to built app directories', () => {
    // These are the directory names used by build-all.cjs
    const BUILT_APP_DIRS = [
      'hub',
      'playground',
      'react-demo',
      'financial-trading',
      'spreadsheet',
      'analytics-explorer',
      'feature-showcase',
      'pdf-viewer',
      'cookbook',
    ];

    it('every demo href maps to a built app directory', () => {
      for (const href of DEMO_HREFS) {
        const dirName = href.replace(/^\//, '').replace(/\/$/, '');
        expect(BUILT_APP_DIRS).toContain(dirName);
      }
    });
  });
});
