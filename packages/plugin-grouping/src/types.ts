// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Grouping Types ───

import type { CellRendererFn } from '@gridstorm/core';

export interface GroupingPluginOptions {
  /** Default expand state. true=all expanded, number=expand to level N. Default: false. */
  defaultExpanded?: boolean | number;
  /** How to display groups. Default: 'singleColumn'. */
  groupDisplayType?: 'singleColumn' | 'multipleColumns' | 'groupRows';
  /** Custom renderer for group rows. */
  groupRowRenderer?: CellRendererFn;
}

export interface GroupingState {
  groupColumns: string[];
  expandedGroups: Set<string>;
}
