import { describe, it, expect, beforeEach } from 'vitest';
import { ColumnVirtualizer } from '../column-virtualizer';

describe('ColumnVirtualizer', () => {
  let virtualizer: ColumnVirtualizer;

  beforeEach(() => {
    virtualizer = new ColumnVirtualizer();
  });

  // ── 1. No columns → empty result ──────────────────────────────

  describe('no columns', () => {
    it('should return empty result when no columns are configured', () => {
      virtualizer.configure({
        columns: [],
        viewportWidth: 1000,
      });

      const result = virtualizer.calculate(0);

      expect(result.pinnedLeftColumns).toEqual([]);
      expect(result.pinnedRightColumns).toEqual([]);
      expect(result.visibleColumns).toEqual([]);
      expect(result.totalWidth).toBe(0);
      expect(result.offsetLeft).toBe(0);
      expect(result.pinnedLeftWidth).toBe(0);
      expect(result.pinnedRightWidth).toBe(0);
    });

    it('should report totalWidth of 0', () => {
      virtualizer.configure({
        columns: [],
        viewportWidth: 1000,
      });

      expect(virtualizer.getTotalWidth()).toBe(0);
    });

    it('should not be virtualized', () => {
      virtualizer.configure({
        columns: [],
        viewportWidth: 1000,
      });

      expect(virtualizer.isVirtualized()).toBe(false);
    });
  });

  // ── 2. Few columns (< 20) → returns all, no virtualization ────

  describe('few columns (< 20 unpinned)', () => {
    const fewColumns = Array.from({ length: 10 }, (_, i) => ({
      colId: `col-${i}`,
      width: 100,
    }));

    beforeEach(() => {
      virtualizer.configure({
        columns: fewColumns,
        viewportWidth: 500,
        overscan: 2,
      });
    });

    it('should return all columns regardless of scroll position', () => {
      const result = virtualizer.calculate(0);

      expect(result.visibleColumns).toHaveLength(10);
      expect(result.visibleColumns).toEqual(fewColumns.map((c) => c.colId));
    });

    it('should return all columns even when scrolled', () => {
      const result = virtualizer.calculate(500);

      expect(result.visibleColumns).toHaveLength(10);
      expect(result.visibleColumns).toEqual(fewColumns.map((c) => c.colId));
    });

    it('should report offsetLeft as 0 (no virtualization)', () => {
      const result = virtualizer.calculate(300);

      expect(result.offsetLeft).toBe(0);
    });

    it('should not be virtualized', () => {
      expect(virtualizer.isVirtualized()).toBe(false);
    });

    it('should report correct totalWidth', () => {
      const result = virtualizer.calculate(0);

      expect(result.totalWidth).toBe(1000); // 10 * 100
    });
  });

  // ── 3. Many columns (50+) → only visible + overscan returned ──

  describe('many columns (50+)', () => {
    // 50 unpinned columns, each 100px wide = 5000px total
    const manyColumns = Array.from({ length: 50 }, (_, i) => ({
      colId: `col-${i}`,
      width: 100,
    }));

    beforeEach(() => {
      virtualizer.configure({
        columns: manyColumns,
        viewportWidth: 500,
        overscan: 2,
      });
    });

    it('should be virtualized', () => {
      expect(virtualizer.isVirtualized()).toBe(true);
    });

    it('should return only visible + overscan columns at scrollLeft=0', () => {
      const result = virtualizer.calculate(0);

      // Viewport is 500px, each col is 100px => 5 visible columns (col-0 through col-4)
      // With overscan=2: start = max(0, 0 - 2) = 0, end = min(49, 4 + 2) = 6
      // So columns col-0 through col-6 = 7 columns
      expect(result.visibleColumns.length).toBeLessThan(50);
      expect(result.visibleColumns.length).toBeGreaterThanOrEqual(5);
      expect(result.visibleColumns[0]).toBe('col-0');
    });

    it('should report correct totalWidth for unpinned columns', () => {
      const result = virtualizer.calculate(0);

      expect(result.totalWidth).toBe(5000); // 50 * 100
    });
  });

  // ── 4. Pinned left columns always included ─────────────────────

  describe('pinned left columns', () => {
    const columns = [
      { colId: 'pinL1', width: 80, pinned: 'left' as const },
      { colId: 'pinL2', width: 80, pinned: 'left' as const },
      ...Array.from({ length: 30 }, (_, i) => ({
        colId: `col-${i}`,
        width: 100,
      })),
    ];

    beforeEach(() => {
      virtualizer.configure({
        columns,
        viewportWidth: 600,
        overscan: 2,
      });
    });

    it('should always include pinned left columns', () => {
      const result = virtualizer.calculate(0);

      expect(result.pinnedLeftColumns).toEqual(['pinL1', 'pinL2']);
    });

    it('should include pinned left columns even when scrolled far right', () => {
      const result = virtualizer.calculate(2000);

      expect(result.pinnedLeftColumns).toEqual(['pinL1', 'pinL2']);
    });

    it('should report correct pinnedLeftWidth', () => {
      const result = virtualizer.calculate(0);

      expect(result.pinnedLeftWidth).toBe(160); // 80 + 80
    });

    it('should not include pinned left columns in visibleColumns', () => {
      const result = virtualizer.calculate(0);

      expect(result.visibleColumns).not.toContain('pinL1');
      expect(result.visibleColumns).not.toContain('pinL2');
    });
  });

  // ── 5. Pinned right columns always included ────────────────────

  describe('pinned right columns', () => {
    const columns = [
      ...Array.from({ length: 30 }, (_, i) => ({
        colId: `col-${i}`,
        width: 100,
      })),
      { colId: 'pinR1', width: 80, pinned: 'right' as const },
      { colId: 'pinR2', width: 80, pinned: 'right' as const },
    ];

    beforeEach(() => {
      virtualizer.configure({
        columns,
        viewportWidth: 600,
        overscan: 2,
      });
    });

    it('should always include pinned right columns', () => {
      const result = virtualizer.calculate(0);

      expect(result.pinnedRightColumns).toEqual(['pinR1', 'pinR2']);
    });

    it('should include pinned right columns even when scrolled far right', () => {
      const result = virtualizer.calculate(2000);

      expect(result.pinnedRightColumns).toEqual(['pinR1', 'pinR2']);
    });

    it('should report correct pinnedRightWidth', () => {
      const result = virtualizer.calculate(0);

      expect(result.pinnedRightWidth).toBe(160); // 80 + 80
    });

    it('should not include pinned right columns in visibleColumns', () => {
      const result = virtualizer.calculate(0);

      expect(result.visibleColumns).not.toContain('pinR1');
      expect(result.visibleColumns).not.toContain('pinR2');
    });
  });

  // ── 6. Scroll to middle → correct visible subset ───────────────

  describe('scroll to middle', () => {
    // 50 unpinned columns, each 100px wide = 5000px total
    const manyColumns = Array.from({ length: 50 }, (_, i) => ({
      colId: `col-${i}`,
      width: 100,
    }));

    beforeEach(() => {
      virtualizer.configure({
        columns: manyColumns,
        viewportWidth: 500,
        overscan: 2,
      });
    });

    it('should return columns around the scroll position', () => {
      // scrollLeft = 2000px => first visible column starts around index 20
      // col-19 ends at 2000px, col-20 starts at 2000px
      const result = virtualizer.calculate(2000);

      // First visible is col-20, last visible is col-24 (5 cols * 100px = 500px)
      // With overscan=2: start = 18, end = 26
      expect(result.visibleColumns).toContain('col-20');
      expect(result.visibleColumns).toContain('col-24');
      // Should include overscan columns
      expect(result.visibleColumns).toContain('col-18');
      expect(result.visibleColumns).toContain('col-26');
      // Should NOT include far-away columns
      expect(result.visibleColumns).not.toContain('col-0');
      expect(result.visibleColumns).not.toContain('col-49');
    });

    it('should report correct offsetLeft for the first rendered column', () => {
      const result = virtualizer.calculate(2000);

      // The first rendered column (after overscan) should be col-18
      // col-18 left = 18 * 100 = 1800
      expect(result.offsetLeft).toBe(1800);
    });
  });

  // ── 7. Scroll to end → correct visible subset ──────────────────

  describe('scroll to end', () => {
    // 50 unpinned columns, each 100px wide = 5000px total
    const manyColumns = Array.from({ length: 50 }, (_, i) => ({
      colId: `col-${i}`,
      width: 100,
    }));

    beforeEach(() => {
      virtualizer.configure({
        columns: manyColumns,
        viewportWidth: 500,
        overscan: 2,
      });
    });

    it('should return the last columns when scrolled to the end', () => {
      // Max scroll = totalWidth - viewportWidth = 5000 - 500 = 4500
      const result = virtualizer.calculate(4500);

      // First visible col at 4500px => col-45 (left=4500)
      // Last visible col: col-49 (left=4900, right=5000)
      expect(result.visibleColumns).toContain('col-49');
      expect(result.visibleColumns).toContain('col-45');
    });

    it('should clamp overscan to array bounds at the end', () => {
      const result = virtualizer.calculate(4500);

      // end = min(49, lastVisible + 2) = 49 (clamped)
      // All visible cols should be valid
      for (const colId of result.visibleColumns) {
        expect(colId).toMatch(/^col-\d+$/);
        const idx = parseInt(colId.split('-')[1]!, 10);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(50);
      }
    });
  });

  // ── 8. Configure with new columns recalculates ─────────────────

  describe('reconfiguration', () => {
    it('should recalculate when configured with new columns', () => {
      // Initial: 30 columns
      virtualizer.configure({
        columns: Array.from({ length: 30 }, (_, i) => ({
          colId: `col-${i}`,
          width: 100,
        })),
        viewportWidth: 500,
        overscan: 2,
      });

      expect(virtualizer.isVirtualized()).toBe(true);
      expect(virtualizer.getTotalWidth()).toBe(3000);

      const result1 = virtualizer.calculate(0);
      expect(result1.visibleColumns.length).toBeLessThan(30);

      // Reconfigure: 10 columns
      virtualizer.configure({
        columns: Array.from({ length: 10 }, (_, i) => ({
          colId: `new-col-${i}`,
          width: 150,
        })),
        viewportWidth: 500,
        overscan: 2,
      });

      expect(virtualizer.isVirtualized()).toBe(false);
      expect(virtualizer.getTotalWidth()).toBe(1500);

      const result2 = virtualizer.calculate(0);
      expect(result2.visibleColumns).toHaveLength(10);
      expect(result2.visibleColumns[0]).toBe('new-col-0');
    });

    it('should handle switching from few to many columns', () => {
      virtualizer.configure({
        columns: Array.from({ length: 5 }, (_, i) => ({
          colId: `col-${i}`,
          width: 100,
        })),
        viewportWidth: 500,
      });

      expect(virtualizer.isVirtualized()).toBe(false);

      virtualizer.configure({
        columns: Array.from({ length: 50 }, (_, i) => ({
          colId: `col-${i}`,
          width: 100,
        })),
        viewportWidth: 500,
        overscan: 2,
      });

      expect(virtualizer.isVirtualized()).toBe(true);

      const result = virtualizer.calculate(1000);
      expect(result.visibleColumns.length).toBeLessThan(50);
    });
  });

  // ── 9. getTotalWidth returns sum of all columns ────────────────

  describe('getTotalWidth', () => {
    it('should return sum of all column widths (unpinned only)', () => {
      virtualizer.configure({
        columns: Array.from({ length: 25 }, (_, i) => ({
          colId: `col-${i}`,
          width: 120,
        })),
        viewportWidth: 500,
      });

      // 25 * 120 = 3000
      expect(virtualizer.getTotalWidth()).toBe(3000);
    });

    it('should include pinned column widths in total', () => {
      virtualizer.configure({
        columns: [
          { colId: 'pinL', width: 80, pinned: 'left' },
          ...Array.from({ length: 25 }, (_, i) => ({
            colId: `col-${i}`,
            width: 100,
          })),
          { colId: 'pinR', width: 80, pinned: 'right' },
        ],
        viewportWidth: 600,
      });

      // pinnedLeft=80 + unpinned=2500 + pinnedRight=80 = 2660
      expect(virtualizer.getTotalWidth()).toBe(2660);
    });

    it('should return 0 for empty columns', () => {
      virtualizer.configure({
        columns: [],
        viewportWidth: 500,
      });

      expect(virtualizer.getTotalWidth()).toBe(0);
    });
  });

  // ── 10. isVirtualized returns true for 20+ unpinned columns ────

  describe('isVirtualized', () => {
    it('should return false for 20 or fewer unpinned columns', () => {
      virtualizer.configure({
        columns: Array.from({ length: 20 }, (_, i) => ({
          colId: `col-${i}`,
          width: 100,
        })),
        viewportWidth: 500,
      });

      expect(virtualizer.isVirtualized()).toBe(false);
    });

    it('should return true for 21+ unpinned columns', () => {
      virtualizer.configure({
        columns: Array.from({ length: 21 }, (_, i) => ({
          colId: `col-${i}`,
          width: 100,
        })),
        viewportWidth: 500,
      });

      expect(virtualizer.isVirtualized()).toBe(true);
    });

    it('should only count unpinned columns for the threshold', () => {
      // 18 unpinned + 4 pinned = 22 total, but only 18 unpinned
      virtualizer.configure({
        columns: [
          { colId: 'pinL1', width: 80, pinned: 'left' },
          { colId: 'pinL2', width: 80, pinned: 'left' },
          ...Array.from({ length: 18 }, (_, i) => ({
            colId: `col-${i}`,
            width: 100,
          })),
          { colId: 'pinR1', width: 80, pinned: 'right' },
          { colId: 'pinR2', width: 80, pinned: 'right' },
        ],
        viewportWidth: 600,
      });

      // 18 unpinned <= 20 threshold => not virtualized
      expect(virtualizer.isVirtualized()).toBe(false);
    });

    it('should return true when unpinned count exceeds 20 even with pinned columns', () => {
      virtualizer.configure({
        columns: [
          { colId: 'pinL', width: 80, pinned: 'left' },
          ...Array.from({ length: 25 }, (_, i) => ({
            colId: `col-${i}`,
            width: 100,
          })),
          { colId: 'pinR', width: 80, pinned: 'right' },
        ],
        viewportWidth: 600,
      });

      // 25 unpinned > 20 threshold => virtualized
      expect(virtualizer.isVirtualized()).toBe(true);
    });
  });

  // ── Mixed pinned + unpinned with virtualization ────────────────

  describe('mixed pinned and unpinned with virtualization', () => {
    const columns = [
      { colId: 'pinL1', width: 80, pinned: 'left' as const },
      ...Array.from({ length: 40 }, (_, i) => ({
        colId: `col-${i}`,
        width: 100,
      })),
      { colId: 'pinR1', width: 80, pinned: 'right' as const },
    ];

    beforeEach(() => {
      virtualizer.configure({
        columns,
        viewportWidth: 800,
        overscan: 2,
      });
    });

    it('should include pinned columns and virtualized unpinned columns', () => {
      const result = virtualizer.calculate(0);

      expect(result.pinnedLeftColumns).toEqual(['pinL1']);
      expect(result.pinnedRightColumns).toEqual(['pinR1']);
      expect(result.pinnedLeftWidth).toBe(80);
      expect(result.pinnedRightWidth).toBe(80);
      // Available width for unpinned = 800 - 80 - 80 = 640px
      // That fits ~6 columns (6 * 100 = 600) + overscan
      expect(result.visibleColumns.length).toBeLessThan(40);
      expect(result.visibleColumns.length).toBeGreaterThanOrEqual(6);
    });

    it('should adjust visible unpinned columns based on scroll position', () => {
      const result0 = virtualizer.calculate(0);
      const result2000 = virtualizer.calculate(2000);

      // Different scroll positions should yield different visible column sets
      expect(result0.visibleColumns).not.toEqual(result2000.visibleColumns);
      expect(result2000.visibleColumns).toContain('col-20');
      expect(result2000.visibleColumns).not.toContain('col-0');
    });
  });

  // ── Variable column widths ─────────────────────────────────────

  describe('variable column widths', () => {
    // Columns with varying widths
    const columns = Array.from({ length: 30 }, (_, i) => ({
      colId: `col-${i}`,
      width: 50 + (i % 5) * 50, // widths: 50, 100, 150, 200, 250, repeating
    }));

    beforeEach(() => {
      virtualizer.configure({
        columns,
        viewportWidth: 600,
        overscan: 2,
      });
    });

    it('should handle variable widths correctly', () => {
      const result = virtualizer.calculate(0);

      expect(result.visibleColumns.length).toBeGreaterThan(0);
      expect(result.visibleColumns.length).toBeLessThan(30);
    });

    it('should compute correct totalWidth with variable widths', () => {
      // Sum: 6 groups of (50+100+150+200+250) = 6 * 750 = 4500
      expect(virtualizer.getTotalWidth()).toBe(4500);
    });

    it('should compute correct offsetLeft for scrolled position', () => {
      const result = virtualizer.calculate(750);

      // After scrolling 750px, we should skip the first cycle of widths
      // First column past 750px left offset should be around col-5
      expect(result.offsetLeft).toBeGreaterThan(0);
      expect(result.offsetLeft).toBeLessThanOrEqual(750);
    });
  });

  // ── Overscan configuration ─────────────────────────────────────

  describe('overscan configuration', () => {
    const manyColumns = Array.from({ length: 50 }, (_, i) => ({
      colId: `col-${i}`,
      width: 100,
    }));

    it('should default overscan to 2', () => {
      virtualizer.configure({
        columns: manyColumns,
        viewportWidth: 500,
        // overscan intentionally omitted
      });

      const result = virtualizer.calculate(1000);

      // firstVisible = col-10, visible up to col-14 (5 cols)
      // With default overscan=2: col-8 through col-16
      expect(result.visibleColumns).toContain('col-8');
      expect(result.visibleColumns).toContain('col-16');
    });

    it('should respect custom overscan of 0', () => {
      virtualizer.configure({
        columns: manyColumns,
        viewportWidth: 500,
        overscan: 0,
      });

      const resultNoOverscan = virtualizer.calculate(1000);

      virtualizer.configure({
        columns: manyColumns,
        viewportWidth: 500,
        overscan: 5,
      });

      const resultWithOverscan = virtualizer.calculate(1000);

      // More overscan = more columns rendered
      expect(resultWithOverscan.visibleColumns.length).toBeGreaterThan(
        resultNoOverscan.visibleColumns.length,
      );
    });
  });
});
