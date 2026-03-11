// ─── Typed Command Map ───
// Registry of all known commands and their payload types.
// Plugins can extend this via declaration merging.

import type { SortModelItem } from './column';
import type { FilterModel } from './filter';

/**
 * Registry of all known commands and their payload types.
 *
 * Plugins and application code can extend this interface using TypeScript's
 * declaration merging to add type-safe commands:
 *
 * @example
 * ```ts
 * declare module '@gridstorm/core' {
 *   interface CommandMap {
 *     'myPlugin:doSomething': { value: string };
 *   }
 * }
 * ```
 *
 * @see {@link PluginCommandBus.dispatch} for dispatching typed commands.
 * @see {@link PluginCommandBus.registerHandler} for handling typed commands.
 */
export interface CommandMap {
  // ── Core commands ──

  /** Reprocess all rows (sorting, filtering, grouping). */
  'rows:reprocess': Record<string, never>;

  /** Set the sort model. */
  'sort:set': { sortModel: SortModelItem[] };

  /** Set the filter model. */
  'filter:set': { filterModel?: Record<string, FilterModel> };

  // ── Grouping ──

  /** Add a column to the row grouping. */
  'group:addColumn': { colId: string };

  /** Remove a column from the row grouping. */
  'group:removeColumn': { colId: string };

  /** Set the full list of row grouping columns. */
  'group:setColumns': { colIds: string[] };

  /** Expand a specific group row. */
  'group:expand': { groupId: string };

  /** Collapse a specific group row. */
  'group:collapse': { groupId: string };

  /** Expand all group rows. */
  'group:expandAll': Record<string, never>;

  /** Collapse all group rows. */
  'group:collapseAll': Record<string, never>;

  /** Expand groups down to a specific level. */
  'group:expandToLevel': { level: number };

  // ── Tree ──

  /** Toggle a tree node's expanded/collapsed state. */
  'tree:toggle': { nodeId: string };

  /** Expand a tree node. */
  'tree:expand': { nodeId: string };

  /** Collapse a tree node. */
  'tree:collapse': { nodeId: string };

  /** Expand all tree nodes. */
  'tree:expandAll': Record<string, never>;

  /** Collapse all tree nodes. */
  'tree:collapseAll': Record<string, never>;

  /** Get the state of a tree node. */
  'tree:getNodeState': { nodeId: string };

  // ── Server-Side Row Model (SSRM) ──

  /** Ensure rows in the given range are loaded. */
  'ssrm:ensureRows': { startRow: number; endRow: number };

  /** Refresh server-side data. */
  'ssrm:refresh': Record<string, never>;

  /** Get cache information for the server-side row model. */
  'ssrm:getCacheInfo': Record<string, never>;

  // ── Excel / CSV Export ──

  /** Export data as CSV. */
  'excel:exportCsv': Record<string, never>;

  /** Export data as Excel. */
  'excel:exportExcel': Record<string, never>;

  /** Export raw data. */
  'excel:exportData': Record<string, never>;

  // ── Master-Detail ──

  /** Expand a detail row. */
  'detail:expand': { nodeId: string };

  /** Collapse a detail row. */
  'detail:collapse': { nodeId: string };

  /** Toggle a detail row's expanded/collapsed state. */
  'detail:toggle': { nodeId: string };

  /** Expand all detail rows. */
  'detail:expandAll': Record<string, never>;

  /** Collapse all detail rows. */
  'detail:collapseAll': Record<string, never>;

  /** Refresh a specific detail row. */
  'detail:refreshDetail': { nodeId: string };

  // ── Row Reorder ──

  /** Move a row to a new display index. */
  'row:move': { rowId: string; toIndex: number };

  /** Swap two rows by their IDs. */
  'row:swap': { rowIdA: string; rowIdB: string };

  // ── Extensibility ──
  // Allow string fallback for custom commands not yet registered
  // in the CommandMap. This ensures backward compatibility with
  // existing untyped dispatch calls.
  [key: string]: any;
}
