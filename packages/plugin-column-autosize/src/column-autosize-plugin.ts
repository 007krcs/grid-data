// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Column Auto-Size Plugin ───
// Provides automatic column width fitting based on content width estimation.
// Since GridStorm uses a headless architecture, content width is estimated
// using average character widths rather than DOM measurement.

import type { GridPlugin, PluginContext, ColumnState } from '@gridstorm/core';

export interface ColumnAutoSizePluginOptions {
  /** Extra padding in pixels added to estimated content width. Default: 16. */
  padding?: number;
  /** Include header text width when calculating column size. Default: true. */
  includeHeaders?: boolean;
  /** Skip hidden columns when auto-sizing all columns. Default: true. */
  skipHidden?: boolean;
  /** Maximum column width in pixels. Default: 500. */
  maxWidth?: number;
  /** Minimum column width in pixels. Default: 50. */
  minWidth?: number;
  /** Maximum number of rows to sample for width estimation. 0 = all rows. Default: 100. */
  sampleSize?: number;
  /** Automatically auto-size columns when row data changes. Default: false. */
  autoSizeOnDataChange?: boolean;
}

/**
 * Estimates the pixel width of a text string based on average character widths.
 *
 * Uses a heuristic that accounts for proportional font characteristics:
 * - Uppercase letters and wide characters (M, W) are wider
 * - Lowercase letters like 'i', 'l', 'j' are narrower
 * - Numbers and most lowercase letters use average width
 *
 * @param text - The text string to measure.
 * @param fontSize - The font size in pixels. Default: 14.
 * @returns Estimated width in pixels.
 */
export function estimateTextWidth(text: string, fontSize: number = 14): number {
  if (!text || text.length === 0) return 0;

  const str = String(text);
  // Average character width ratios relative to fontSize
  // These approximate a proportional sans-serif font (e.g., system UI)
  const NARROW_CHARS = new Set(['i', 'l', 'j', 't', 'f', 'r', '!', '|', '.', ',', ':', ';', "'", '1']);
  const WIDE_CHARS = new Set(['M', 'W', 'm', 'w', '@', '%']);
  const UPPER_CHARS = /[A-Z]/;

  let totalWidth = 0;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i]!;
    if (NARROW_CHARS.has(ch)) {
      totalWidth += fontSize * 0.35;
    } else if (WIDE_CHARS.has(ch)) {
      totalWidth += fontSize * 0.85;
    } else if (ch === ' ') {
      totalWidth += fontSize * 0.3;
    } else if (UPPER_CHARS.test(ch)) {
      totalWidth += fontSize * 0.7;
    } else {
      // Average lowercase letter or digit
      totalWidth += fontSize * 0.55;
    }
  }

  return Math.ceil(totalWidth);
}

/**
 * Creates a Column Auto-Size plugin that fits column widths to their content.
 *
 * @param options - Configuration options for auto-sizing behavior.
 * @returns A GridPlugin instance.
 *
 * @example
 * ```ts
 * import { ColumnAutoSizePlugin } from '@gridstorm/plugin-column-autosize';
 *
 * const grid = createGrid({
 *   columns: [...],
 *   rowData: [...],
 *   plugins: [ColumnAutoSizePlugin({ padding: 20, maxWidth: 400 })],
 * });
 *
 * // Auto-size all columns
 * grid.api.dispatchCommand('autoSize:all', {});
 *
 * // Auto-size a single column
 * grid.api.dispatchCommand('autoSize:column', { colId: 'name' });
 * ```
 */
export function ColumnAutoSizePlugin(options: ColumnAutoSizePluginOptions = {}): GridPlugin {
  const {
    padding = 16,
    includeHeaders = true,
    skipHidden = true,
    maxWidth = 500,
    minWidth = 50,
    sampleSize = 100,
    autoSizeOnDataChange = false,
  } = options;

  return {
    id: 'column-autosize',
    name: 'Column Auto-Size',
    version: '0.1.0',

    install(ctx: PluginContext) {
      /**
       * Calculates the optimal width for a single column based on its content.
       */
      function calculateColumnWidth(col: ColumnState): number {
        const state = ctx.store.getState();

        // Start with header width if enabled
        let maxContentWidth = 0;
        if (includeHeaders) {
          const headerText = col.headerName || col.field || col.colId;
          maxContentWidth = estimateTextWidth(headerText);
        }

        // Sample row data values for this column's field
        const field = col.field;
        if (field) {
          const displayedIds = state.displayedRowIds;
          const rowCount = displayedIds.length;
          const samplesToTake = sampleSize === 0 ? rowCount : Math.min(sampleSize, rowCount);

          // If sampling, take evenly spaced samples across the dataset
          const step = samplesToTake > 0 && samplesToTake < rowCount
            ? rowCount / samplesToTake
            : 1;

          for (let i = 0; i < samplesToTake; i++) {
            const idx = Math.min(Math.floor(i * step), rowCount - 1);
            const rowId = displayedIds[idx];
            if (!rowId) continue;

            const node = state.rowNodes.get(rowId);
            if (!node || !node.data) continue;

            const value = (node.data as Record<string, unknown>)[field];
            if (value == null) continue;

            const cellText = String(value);
            const cellWidth = estimateTextWidth(cellText);
            if (cellWidth > maxContentWidth) {
              maxContentWidth = cellWidth;
            }
          }
        }

        // Apply padding and clamp to min/max bounds
        const targetWidth = maxContentWidth + padding;

        // Respect column-level min/max if they are more restrictive
        const effectiveMin = Math.max(minWidth, col.minWidth);
        const effectiveMax = Math.min(maxWidth, col.maxWidth);

        return Math.max(effectiveMin, Math.min(effectiveMax, targetWidth));
      }

      /**
       * Auto-sizes a list of columns by their IDs.
       */
      function autoSizeColumns(colIds: string[]): void {
        const state = ctx.store.getState();

        for (const colId of colIds) {
          const col = state.columns.find((c) => c.colId === colId);
          if (!col) continue;
          if (skipHidden && col.hide) continue;

          const width = calculateColumnWidth(col);
          ctx.api.setColumnWidth(colId, width);
        }
      }

      // ── Register commands ──

      const unregisterAll = ctx.commandBus.registerHandler(
        'autoSize:all',
        (_payload: Record<string, never>) => {
          const state = ctx.store.getState();
          const colIds = state.columns
            .filter((c) => !skipHidden || !c.hide)
            .map((c) => c.colId);
          autoSizeColumns(colIds);
        },
      );

      const unregisterColumn = ctx.commandBus.registerHandler(
        'autoSize:column',
        (payload: { colId: string }) => {
          autoSizeColumns([payload.colId]);
        },
      );

      const unregisterColumns = ctx.commandBus.registerHandler(
        'autoSize:columns',
        (payload: { colIds: string[] }) => {
          autoSizeColumns(payload.colIds);
        },
      );

      // ── Optional auto-size on data change ──

      let unsubDataChange: (() => void) | undefined;

      if (autoSizeOnDataChange) {
        unsubDataChange = ctx.eventBus.on('rowData:changed', () => {
          const state = ctx.store.getState();
          const colIds = state.columns
            .filter((c) => !skipHidden || !c.hide)
            .map((c) => c.colId);
          autoSizeColumns(colIds);
        });
      }

      // Return disposer
      return () => {
        unregisterAll();
        unregisterColumn();
        unregisterColumns();
        unsubDataChange?.();
      };
    },
  };
}
