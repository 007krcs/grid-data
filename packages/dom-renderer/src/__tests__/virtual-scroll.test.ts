import { describe, it, expect, beforeEach } from 'vitest';
import { VirtualScroller } from '../virtual-scroll';

describe('VirtualScroller', () => {
  let scroller: VirtualScroller;

  beforeEach(() => {
    scroller = new VirtualScroller();
  });

  // ── Fixed Row Height ──────────────────────────────────────────

  describe('fixed row height', () => {
    beforeEach(() => {
      scroller.configure({
        rowCount: 100,
        rowHeight: 40,
        viewportHeight: 400,
        overscan: 5,
      });
    });

    it('should calculate correct range at scrollTop=0', () => {
      const result = scroller.calculate(0);

      expect(result.startIndex).toBe(0);
      // firstVisible=0, visibleCount=ceil(400/40)=10, endIndex=min(100, 0+10+5)=15
      expect(result.endIndex).toBe(15);
      expect(result.totalHeight).toBe(4000);
      expect(result.offsetTop).toBe(0);
      expect(result.visibleCount).toBe(10);
    });

    it('should calculate correct range at scrollTop=2000 (mid-scroll)', () => {
      const result = scroller.calculate(2000);

      // firstVisible = floor(2000/40) = 50
      // startIndex = max(0, 50 - 5) = 45
      // visibleCount = ceil(400/40) = 10
      // endIndex = min(100, 50 + 10 + 5) = 65
      expect(result.startIndex).toBe(45);
      expect(result.endIndex).toBe(65);
      expect(result.visibleCount).toBe(10);
      expect(result.totalHeight).toBe(4000);
      expect(result.offsetTop).toBe(45 * 40);
    });

    it('should calculate correct range at the very bottom', () => {
      // Max scroll = totalHeight - viewportHeight = 4000 - 400 = 3600
      const result = scroller.calculate(3600);

      // firstVisible = floor(3600/40) = 90
      // startIndex = max(0, 90 - 5) = 85
      // endIndex = min(100, 90 + 10 + 5) = 100
      expect(result.startIndex).toBe(85);
      expect(result.endIndex).toBe(100);
      expect(result.visibleCount).toBe(10);
    });

    it('should return correct totalHeight', () => {
      expect(scroller.getTotalHeight()).toBe(4000);
    });

    it('should return correct scrollTop for getScrollForIndex at top position', () => {
      // Row 50 at "top" = row 50 top position = 50 * 40 = 2000
      expect(scroller.getScrollForIndex(50, 'top')).toBe(2000);
    });

    it('should return correct scrollTop for getScrollForIndex at bottom position', () => {
      // Row 50 at "bottom" = rowTop + rowHeight - viewportHeight
      // = 2000 + 40 - 400 = 1640
      expect(scroller.getScrollForIndex(50, 'bottom')).toBe(1640);
    });

    it('should return correct scrollTop for getScrollForIndex at middle position', () => {
      // Row 50 at "middle" = rowTop + rowHeight/2 - viewportHeight/2
      // = 2000 + 20 - 200 = 1820
      expect(scroller.getScrollForIndex(50, 'middle')).toBe(1820);
    });

    it('should return correct row top position via getRowTop', () => {
      expect(scroller.getRowTop(0)).toBe(0);
      expect(scroller.getRowTop(1)).toBe(40);
      expect(scroller.getRowTop(50)).toBe(2000);
      expect(scroller.getRowTop(99)).toBe(3960);
    });

    it('should return fixed height for every row via getRowHeight', () => {
      expect(scroller.getRowHeight(0)).toBe(40);
      expect(scroller.getRowHeight(50)).toBe(40);
      expect(scroller.getRowHeight(99)).toBe(40);
    });
  });

  // ── Variable Row Heights ──────────────────────────────────────

  describe('variable row heights', () => {
    // Even rows: 40px, odd rows: 60px
    const heightFn = (i: number) => (i % 2 === 0 ? 40 : 60);

    beforeEach(() => {
      scroller.configure({
        rowCount: 100,
        rowHeight: heightFn,
        viewportHeight: 400,
        overscan: 5,
      });
    });

    it('should calculate correct totalHeight', () => {
      // 50 even rows * 40 + 50 odd rows * 60 = 2000 + 3000 = 5000
      expect(scroller.getTotalHeight()).toBe(5000);
    });

    it('should calculate correct range at scrollTop=0', () => {
      const result = scroller.calculate(0);

      expect(result.startIndex).toBe(0);
      expect(result.totalHeight).toBe(5000);
      expect(result.offsetTop).toBe(0);
      // Visible rows starting from 0: 40+60+40+60+40+60+40+60 = 400 after 8 rows
      expect(result.visibleCount).toBe(8);
      // endIndex = min(100, 0 + 8 + 5) = 13
      expect(result.endIndex).toBe(13);
    });

    it('should calculate correct range at a mid-scroll position', () => {
      // Scroll to 500px.  Cumulative heights:
      //   row0: 40, row1: 100, row2: 140, row3: 200, row4: 240,
      //   row5: 300, row6: 340, row7: 400, row8: 440, row9: 500, row10: 540
      // Binary search for 500: cumulative[9] = 500 (not > 500), so firstVisible = 10
      const result = scroller.calculate(500);

      expect(result.startIndex).toBe(5); // 10 - 5
      expect(result.visibleCount).toBe(8);
      expect(result.endIndex).toBe(Math.min(100, 10 + 8 + 5)); // 23
    });

    it('should return correct row top positions via getRowTop', () => {
      // row 0: top = 0
      expect(scroller.getRowTop(0)).toBe(0);
      // row 1: top = 40
      expect(scroller.getRowTop(1)).toBe(40);
      // row 2: top = 40 + 60 = 100
      expect(scroller.getRowTop(2)).toBe(100);
      // row 3: top = 100 + 40 = 140
      expect(scroller.getRowTop(3)).toBe(140);
      // row 4: top = 140 + 60 = 200
      expect(scroller.getRowTop(4)).toBe(200);
    });

    it('should return per-row height via getRowHeight', () => {
      expect(scroller.getRowHeight(0)).toBe(40);
      expect(scroller.getRowHeight(1)).toBe(60);
      expect(scroller.getRowHeight(2)).toBe(40);
      expect(scroller.getRowHeight(3)).toBe(60);
    });
  });

  // ── Zero Rows ─────────────────────────────────────────────────

  describe('zero rows', () => {
    it('should return all zeros when rowCount is 0', () => {
      scroller.configure({
        rowCount: 0,
        rowHeight: 40,
        viewportHeight: 400,
      });

      const result = scroller.calculate(0);

      expect(result.startIndex).toBe(0);
      expect(result.endIndex).toBe(0);
      expect(result.totalHeight).toBe(0);
      expect(result.offsetTop).toBe(0);
      expect(result.visibleCount).toBe(0);
    });

    it('should report totalHeight of 0', () => {
      scroller.configure({
        rowCount: 0,
        rowHeight: 40,
        viewportHeight: 400,
      });

      expect(scroller.getTotalHeight()).toBe(0);
    });
  });

  // ── Dynamic Updates ───────────────────────────────────────────

  describe('updateRowCount', () => {
    it('should update totalHeight when row count changes', () => {
      scroller.configure({
        rowCount: 100,
        rowHeight: 40,
        viewportHeight: 400,
      });

      expect(scroller.getTotalHeight()).toBe(4000);

      scroller.updateRowCount(200);
      expect(scroller.getTotalHeight()).toBe(8000);

      scroller.updateRowCount(50);
      expect(scroller.getTotalHeight()).toBe(2000);
    });

    it('should clamp negative row count to zero', () => {
      scroller.configure({
        rowCount: 100,
        rowHeight: 40,
        viewportHeight: 400,
      });

      scroller.updateRowCount(-5);
      expect(scroller.getTotalHeight()).toBe(0);

      const result = scroller.calculate(0);
      expect(result.startIndex).toBe(0);
      expect(result.endIndex).toBe(0);
      expect(result.visibleCount).toBe(0);
    });
  });

  describe('updateViewportHeight', () => {
    it('should change visibleCount after viewport height update', () => {
      scroller.configure({
        rowCount: 100,
        rowHeight: 40,
        viewportHeight: 400,
        overscan: 5,
      });

      let result = scroller.calculate(0);
      // ceil(400/40) = 10
      expect(result.visibleCount).toBe(10);

      scroller.updateViewportHeight(800);

      result = scroller.calculate(0);
      // ceil(800/40) = 20
      expect(result.visibleCount).toBe(20);
    });

    it('should adjust endIndex after viewport height update', () => {
      scroller.configure({
        rowCount: 100,
        rowHeight: 40,
        viewportHeight: 400,
        overscan: 5,
      });

      let result = scroller.calculate(0);
      // endIndex = min(100, 0+10+5) = 15
      expect(result.endIndex).toBe(15);

      scroller.updateViewportHeight(800);

      result = scroller.calculate(0);
      // endIndex = min(100, 0+20+5) = 25
      expect(result.endIndex).toBe(25);
    });
  });

  // ── Bounds Clamping ───────────────────────────────────────────

  describe('bounds clamping', () => {
    beforeEach(() => {
      scroller.configure({
        rowCount: 100,
        rowHeight: 40,
        viewportHeight: 400,
        overscan: 5,
      });
    });

    it('should clamp negative index in getScrollForIndex to row 0', () => {
      const scrollPos = scroller.getScrollForIndex(-1);
      // Should clamp to row 0 => top = 0
      expect(scrollPos).toBe(0);
    });

    it('should clamp excessive index in getScrollForIndex to last row', () => {
      const scrollPos = scroller.getScrollForIndex(200, 'top');
      // Clamped to row 99 => top = 99 * 40 = 3960
      expect(scrollPos).toBe(3960);
    });

    it('should not crash with negative scrollTop in calculate', () => {
      const result = scroller.calculate(-100);
      expect(result.startIndex).toBe(0);
      expect(result.endIndex).toBeGreaterThan(0);
    });

    it('should handle scrollTop beyond totalHeight gracefully', () => {
      const result = scroller.calculate(10000);
      // Should not produce startIndex/endIndex beyond rowCount
      expect(result.endIndex).toBeLessThanOrEqual(100);
      expect(result.startIndex).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Overscan Default ──────────────────────────────────────────

  describe('overscan default', () => {
    it('should default overscan to 5 when not specified', () => {
      scroller.configure({
        rowCount: 100,
        rowHeight: 40,
        viewportHeight: 400,
        // overscan intentionally omitted
      });

      const result = scroller.calculate(2000);

      // firstVisible = 50, overscan = 5 (default)
      // startIndex = 50 - 5 = 45
      // endIndex = 50 + 10 + 5 = 65
      expect(result.startIndex).toBe(45);
      expect(result.endIndex).toBe(65);
    });

    it('should respect custom overscan value of 0', () => {
      scroller.configure({
        rowCount: 100,
        rowHeight: 40,
        viewportHeight: 400,
        overscan: 0,
      });

      const result = scroller.calculate(2000);

      // firstVisible = 50, overscan = 0
      // startIndex = 50
      // endIndex = 50 + 10 = 60
      expect(result.startIndex).toBe(50);
      expect(result.endIndex).toBe(60);
    });

    it('should respect a large custom overscan value', () => {
      scroller.configure({
        rowCount: 100,
        rowHeight: 40,
        viewportHeight: 400,
        overscan: 20,
      });

      const result = scroller.calculate(2000);

      // firstVisible = 50, overscan = 20
      // startIndex = max(0, 50 - 20) = 30
      // endIndex = min(100, 50 + 10 + 20) = 80
      expect(result.startIndex).toBe(30);
      expect(result.endIndex).toBe(80);
    });
  });

  // ── getScrollForIndex default position ────────────────────────

  describe('getScrollForIndex default position', () => {
    it('should default to "top" position when position is omitted', () => {
      scroller.configure({
        rowCount: 100,
        rowHeight: 40,
        viewportHeight: 400,
      });

      // No position argument => defaults to 'top'
      const scrollPos = scroller.getScrollForIndex(25);
      expect(scrollPos).toBe(25 * 40);
    });
  });

  // ── Edge cases with variable height + updates ─────────────────

  describe('variable height with dynamic updates', () => {
    it('should rebuild height cache when updateRowCount is called with variable heights', () => {
      const heightFn = (i: number) => (i % 2 === 0 ? 40 : 60);

      scroller.configure({
        rowCount: 10,
        rowHeight: heightFn,
        viewportHeight: 400,
      });

      // 5 even * 40 + 5 odd * 60 = 200 + 300 = 500
      expect(scroller.getTotalHeight()).toBe(500);

      scroller.updateRowCount(20);
      // 10 even * 40 + 10 odd * 60 = 400 + 600 = 1000
      expect(scroller.getTotalHeight()).toBe(1000);
    });
  });
});
