// ─── Column Virtual Scroll Engine ───
// Calculates which columns are visible in the viewport and manages
// horizontal virtualization. Pinned columns are always rendered.
// Skips virtualization for small column counts (< 20 unpinned columns).

export interface ColumnVirtualConfig {
  /** All visible column states with their widths */
  columns: Array<{ colId: string; width: number; pinned?: 'left' | 'right' | null }>;
  /** Viewport width in pixels */
  viewportWidth: number;
  /** Number of columns to render beyond visible area */
  overscan?: number;
}

export interface ColumnVirtualResult {
  /** Pinned left columns (always rendered) */
  pinnedLeftColumns: string[];
  /** Pinned right columns (always rendered) */
  pinnedRightColumns: string[];
  /** Visible unpinned columns (virtualized) */
  visibleColumns: string[];
  /** Total scrollable width of all unpinned columns */
  totalWidth: number;
  /** Left offset for the first visible unpinned column */
  offsetLeft: number;
  /** Width of pinned left section */
  pinnedLeftWidth: number;
  /** Width of pinned right section */
  pinnedRightWidth: number;
}

export class ColumnVirtualizer {
  private columns: Array<{ colId: string; width: number; pinned?: 'left' | 'right' | null }> = [];
  private viewportWidth = 0;
  private overscan = 2;

  // Precomputed
  private pinnedLeft: Array<{ colId: string; width: number }> = [];
  private pinnedRight: Array<{ colId: string; width: number }> = [];
  private unpinned: Array<{ colId: string; width: number; left: number }> = [];
  private totalUnpinnedWidth = 0;
  private pinnedLeftWidth = 0;
  private pinnedRightWidth = 0;

  configure(config: ColumnVirtualConfig): void {
    this.columns = config.columns;
    this.viewportWidth = config.viewportWidth;
    this.overscan = config.overscan ?? 2;

    // Separate pinned and unpinned columns
    this.pinnedLeft = [];
    this.pinnedRight = [];
    this.unpinned = [];

    let pinnedLeftW = 0;
    let pinnedRightW = 0;
    let unpinnedLeft = 0;

    for (const col of this.columns) {
      if (col.pinned === 'left') {
        this.pinnedLeft.push({ colId: col.colId, width: col.width });
        pinnedLeftW += col.width;
      } else if (col.pinned === 'right') {
        this.pinnedRight.push({ colId: col.colId, width: col.width });
        pinnedRightW += col.width;
      } else {
        this.unpinned.push({ colId: col.colId, width: col.width, left: unpinnedLeft });
        unpinnedLeft += col.width;
      }
    }

    this.pinnedLeftWidth = pinnedLeftW;
    this.pinnedRightWidth = pinnedRightW;
    this.totalUnpinnedWidth = unpinnedLeft;
  }

  /**
   * Calculate which columns to render for a given horizontal scroll position.
   */
  calculate(scrollLeft: number): ColumnVirtualResult {
    // If total unpinned columns are few (< 20), skip virtualization — return all
    if (this.unpinned.length <= 20) {
      return {
        pinnedLeftColumns: this.pinnedLeft.map(c => c.colId),
        pinnedRightColumns: this.pinnedRight.map(c => c.colId),
        visibleColumns: this.unpinned.map(c => c.colId),
        totalWidth: this.totalUnpinnedWidth,
        offsetLeft: 0,
        pinnedLeftWidth: this.pinnedLeftWidth,
        pinnedRightWidth: this.pinnedRightWidth,
      };
    }

    // Available width for unpinned columns
    const availableWidth = this.viewportWidth - this.pinnedLeftWidth - this.pinnedRightWidth;

    // Find first visible unpinned column (linear scan — columns are already sorted by left position)
    let firstVisible = 0;
    for (let i = 0; i < this.unpinned.length; i++) {
      const col = this.unpinned[i]!;
      if (col.left + col.width > scrollLeft) {
        firstVisible = i;
        break;
      }
    }

    // Find last visible column
    let lastVisible = firstVisible;
    let accumulated = 0;
    for (let i = firstVisible; i < this.unpinned.length; i++) {
      lastVisible = i;
      accumulated += this.unpinned[i]!.width;
      if (accumulated >= availableWidth) break;
    }

    // Apply overscan
    const start = Math.max(0, firstVisible - this.overscan);
    const end = Math.min(this.unpinned.length - 1, lastVisible + this.overscan);

    const visibleColumns: string[] = [];
    for (let i = start; i <= end; i++) {
      visibleColumns.push(this.unpinned[i]!.colId);
    }

    const offsetLeft = this.unpinned[start]?.left ?? 0;

    return {
      pinnedLeftColumns: this.pinnedLeft.map(c => c.colId),
      pinnedRightColumns: this.pinnedRight.map(c => c.colId),
      visibleColumns,
      totalWidth: this.totalUnpinnedWidth,
      offsetLeft,
      pinnedLeftWidth: this.pinnedLeftWidth,
      pinnedRightWidth: this.pinnedRightWidth,
    };
  }

  /** Get total content width (all columns) */
  getTotalWidth(): number {
    return this.pinnedLeftWidth + this.totalUnpinnedWidth + this.pinnedRightWidth;
  }

  /** Check if column virtualization is active */
  isVirtualized(): boolean {
    return this.unpinned.length > 20;
  }
}
