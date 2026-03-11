import { describe, it, expect } from 'vitest';
import {
  computePageViewport,
  computePageLayouts,
  computeTotalHeight,
  getVisiblePages,
  clampZoom,
  PAGE_GAP,
  CSS_UNITS,
} from '../viewport';
import type { PdfPageState } from '@gridstorm/pdf-core';

function makePage(
  index: number,
  width = 612,
  height = 792,
  rotation: 0 | 90 | 180 | 270 = 0,
): PdfPageState {
  return {
    index,
    width,
    height,
    rotation,
    annotationIds: [],
    rendered: false,
    textContent: null,
  };
}

describe('Viewport Utilities', () => {
  describe('computePageViewport', () => {
    it('computes dimensions at zoom 1.0', () => {
      const page = makePage(0);
      const vp = computePageViewport(page, 1.0, 1);
      expect(vp.width).toBe(Math.floor(612 * CSS_UNITS));
      expect(vp.height).toBe(Math.floor(792 * CSS_UNITS));
      expect(vp.scale).toBeCloseTo(CSS_UNITS, 4);
    });

    it('scales with zoom', () => {
      const page = makePage(0);
      const vp1 = computePageViewport(page, 1.0, 1);
      const vp2 = computePageViewport(page, 2.0, 1);
      expect(vp2.width).toBe(Math.floor(612 * 2 * CSS_UNITS));
      expect(vp2.height).toBeGreaterThan(vp1.height);
    });

    it('swaps dimensions for 90-degree rotation', () => {
      const page = makePage(0, 612, 792, 90);
      const vp = computePageViewport(page, 1.0, 1);
      expect(vp.width).toBe(Math.floor(792 * CSS_UNITS));
      expect(vp.height).toBe(Math.floor(612 * CSS_UNITS));
    });

    it('swaps dimensions for 270-degree rotation', () => {
      const page = makePage(0, 612, 792, 270);
      const vp = computePageViewport(page, 1.0, 1);
      expect(vp.width).toBe(Math.floor(792 * CSS_UNITS));
    });

    it('does not swap for 180-degree rotation', () => {
      const page = makePage(0, 612, 792, 180);
      const vp = computePageViewport(page, 1.0, 1);
      expect(vp.width).toBe(Math.floor(612 * CSS_UNITS));
    });
  });

  describe('computePageLayouts', () => {
    it('lays out pages vertically with gaps', () => {
      const pages = [makePage(0), makePage(1), makePage(2)];
      const layouts = computePageLayouts(pages, 1.0, 1000);

      expect(layouts).toHaveLength(3);
      expect(layouts[0]!.offsetY).toBe(PAGE_GAP);
      expect(layouts[1]!.offsetY).toBeGreaterThan(layouts[0]!.offsetY);
      expect(layouts[2]!.offsetY).toBeGreaterThan(layouts[1]!.offsetY);
    });

    it('centers pages horizontally', () => {
      const pages = [makePage(0)];
      const containerWidth = 2000;
      const layouts = computePageLayouts(pages, 1.0, containerWidth);
      const pageWidth = Math.floor(612 * CSS_UNITS);
      const expectedOffsetX = Math.max(0, (containerWidth - pageWidth) / 2);
      expect(layouts[0]!.offsetX).toBeCloseTo(expectedOffsetX, 0);
    });

    it('handles empty pages array', () => {
      const layouts = computePageLayouts([], 1.0, 1000);
      expect(layouts).toHaveLength(0);
    });
  });

  describe('computeTotalHeight', () => {
    it('returns 0 for empty layouts', () => {
      expect(computeTotalHeight([])).toBe(0);
    });

    it('computes total height including gaps', () => {
      const pages = [makePage(0), makePage(1)];
      const layouts = computePageLayouts(pages, 1.0, 1000);
      const total = computeTotalHeight(layouts);
      expect(total).toBeGreaterThan(0);
      const lastLayout = layouts[layouts.length - 1]!;
      expect(total).toBe(lastLayout.offsetY + lastLayout.height + PAGE_GAP);
    });
  });

  describe('getVisiblePages', () => {
    it('returns pages within viewport', () => {
      const pages = [makePage(0), makePage(1), makePage(2)];
      const layouts = computePageLayouts(pages, 1.0, 1000);
      const pageHeight = layouts[0]!.height;

      // Only first page should be visible with small viewport
      const visible = getVisiblePages(layouts, 0, pageHeight + PAGE_GAP + 10);
      expect(visible.length).toBeGreaterThanOrEqual(1);
      expect(visible[0]!.pageIndex).toBe(0);
    });

    it('returns all pages if viewport is large enough', () => {
      const pages = [makePage(0), makePage(1)];
      const layouts = computePageLayouts(pages, 1.0, 1000);
      const totalHeight = computeTotalHeight(layouts);

      const visible = getVisiblePages(layouts, 0, totalHeight);
      expect(visible).toHaveLength(2);
    });

    it('returns empty for scrolled past all pages', () => {
      const pages = [makePage(0)];
      const layouts = computePageLayouts(pages, 1.0, 1000);
      const totalHeight = computeTotalHeight(layouts);

      const visible = getVisiblePages(layouts, totalHeight + 100, 500);
      expect(visible).toHaveLength(0);
    });
  });

  describe('clampZoom', () => {
    it('clamps below minimum', () => {
      expect(clampZoom(0.01)).toBe(0.1);
    });

    it('clamps above maximum', () => {
      expect(clampZoom(15)).toBe(10);
    });

    it('passes through valid zoom', () => {
      expect(clampZoom(1.5)).toBe(1.5);
    });
  });
});
