// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Virtual Scroll Engine ───
// Calculates which rows are visible in the viewport and manages
// the scroll container geometry. Supports fixed and variable row heights.

export interface VirtualScrollConfig {
  /** Total number of rows. */
  rowCount: number;
  /** Fixed row height, or function for variable heights. */
  rowHeight: number | ((index: number) => number);
  /** Height of the visible viewport in pixels. */
  viewportHeight: number;
  /** Number of rows to render above/below the visible area. */
  overscan?: number;
}

export interface VirtualScrollResult {
  /** Index of the first row to render (including overscan). */
  startIndex: number;
  /** Index of the last row to render (including overscan, exclusive). */
  endIndex: number;
  /** Total scrollable height in pixels. */
  totalHeight: number;
  /** Offset (top position) for the first rendered row. */
  offsetTop: number;
  /** Number of visible rows (without overscan). */
  visibleCount: number;
}

export class VirtualScroller {
  private rowCount = 0;
  private rowHeight: number | ((index: number) => number) = 40;
  private viewportHeight = 0;
  private overscan = 5;

  // Cache for variable-height row positions
  private heightCache: number[] | null = null;
  private cumulativeHeights: number[] | null = null;
  private totalHeight = 0;
  private isFixedHeight = true;

  configure(config: VirtualScrollConfig): void {
    this.rowCount = Math.max(0, config.rowCount);
    this.rowHeight = config.rowHeight;
    this.viewportHeight = Math.max(0, config.viewportHeight);
    this.overscan = config.overscan ?? 5;
    this.isFixedHeight = typeof config.rowHeight === 'number';

    this.rebuildHeightCache();
  }

  updateRowCount(count: number): void {
    this.rowCount = Math.max(0, count);
    this.rebuildHeightCache();
  }

  updateViewportHeight(height: number): void {
    this.viewportHeight = height;
  }

  /**
   * Calculate which rows to render for a given scroll position.
   */
  calculate(scrollTop: number): VirtualScrollResult {
    if (this.rowCount === 0) {
      return {
        startIndex: 0,
        endIndex: 0,
        totalHeight: 0,
        offsetTop: 0,
        visibleCount: 0,
      };
    }

    if (this.isFixedHeight) {
      return this.calculateFixed(scrollTop);
    }
    return this.calculateVariable(scrollTop);
  }

  /**
   * Get the scroll position needed to bring a row into view.
   */
  getScrollForIndex(index: number, position: 'top' | 'middle' | 'bottom' = 'top'): number {
    const clamped = Math.max(0, Math.min(index, this.rowCount - 1));
    const rowTop = this.getRowTop(clamped);
    const rh = this.getRowHeight(clamped);

    switch (position) {
      case 'top':
        return Math.max(0, rowTop);
      case 'bottom':
        return Math.max(0, rowTop + rh - this.viewportHeight);
      case 'middle':
        return Math.max(0, rowTop + rh / 2 - this.viewportHeight / 2);
    }
  }

  getTotalHeight(): number {
    return this.totalHeight;
  }

  getRowTop(index: number): number {
    if (this.isFixedHeight) {
      return index * (this.rowHeight as number);
    }
    return index > 0 ? (this.cumulativeHeights?.[index - 1] ?? 0) : 0;
  }

  getRowHeight(index: number): number {
    if (this.isFixedHeight) return this.rowHeight as number;
    return this.heightCache?.[index] ?? 40;
  }

  // ── Private ──

  private calculateFixed(scrollTop: number): VirtualScrollResult {
    const rh = this.rowHeight as number;
    this.totalHeight = this.rowCount * rh;

    const firstVisible = Math.floor(scrollTop / rh);
    const visibleCount = Math.ceil(this.viewportHeight / rh);

    const startIndex = Math.max(0, firstVisible - this.overscan);
    const endIndex = Math.min(this.rowCount, firstVisible + visibleCount + this.overscan);
    const offsetTop = startIndex * rh;

    return {
      startIndex,
      endIndex,
      totalHeight: this.totalHeight,
      offsetTop,
      visibleCount,
    };
  }

  private calculateVariable(scrollTop: number): VirtualScrollResult {
    const cumulative = this.cumulativeHeights!;

    // Binary search for first visible row
    const firstVisible = this.binarySearch(cumulative, scrollTop);
    const visibleCount = this.countVisibleRows(firstVisible, scrollTop);

    const startIndex = Math.max(0, firstVisible - this.overscan);
    const endIndex = Math.min(this.rowCount, firstVisible + visibleCount + this.overscan);
    const offsetTop = this.getRowTop(startIndex);

    return {
      startIndex,
      endIndex,
      totalHeight: this.totalHeight,
      offsetTop,
      visibleCount,
    };
  }

  private rebuildHeightCache(): void {
    if (this.isFixedHeight) {
      this.totalHeight = this.rowCount * (this.rowHeight as number);
      this.heightCache = null;
      this.cumulativeHeights = null;
      return;
    }

    const heightFn = this.rowHeight as (index: number) => number;
    this.heightCache = new Array(this.rowCount);
    this.cumulativeHeights = new Array(this.rowCount);

    let cumulative = 0;
    for (let i = 0; i < this.rowCount; i++) {
      const h = Math.max(1, Number(heightFn(i)) || 40);
      this.heightCache[i] = h;
      cumulative += h;
      this.cumulativeHeights[i] = cumulative;
    }
    this.totalHeight = cumulative;
  }

  private binarySearch(cumulative: number[], scrollTop: number): number {
    let lo = 0;
    let hi = cumulative.length - 1;

    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (cumulative[mid]! <= scrollTop) {
        lo = mid + 1;
      } else {
        hi = mid;
      }
    }

    return lo;
  }

  private countVisibleRows(startIndex: number, scrollTop: number): number {
    let accumulated = 0;
    let count = 0;
    const startTop = this.getRowTop(startIndex);
    const offset = scrollTop - startTop;

    for (let i = startIndex; i < this.rowCount; i++) {
      accumulated += this.getRowHeight(i);
      count++;
      if (accumulated - offset >= this.viewportHeight) break;
    }

    return count;
  }
}
