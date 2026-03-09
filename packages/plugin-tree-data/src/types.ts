// ─── Tree Data Types ───

export interface TreeDataPluginOptions {
  /** Field name or function that returns the parent ID for a row. */
  getParentId?: string | ((data: any) => string | null | undefined);

  /** Field name that contains child rows as a nested array. */
  childrenField?: string;

  /** Whether tree nodes are expanded by default. Default: false. */
  defaultExpanded?: boolean;

  /** Maximum tree depth to display. Default: Infinity. */
  maxDepth?: number;

  /** Indentation per level in pixels. Default: 24. */
  indentPerLevel?: number;
}

export interface TreeNodeState {
  /** Whether this tree node is expanded */
  expanded: boolean;
  /** Depth level (0 = root) */
  level: number;
  /** Whether this node has children */
  hasChildren: boolean;
  /** Parent node ID */
  parentId: string | null;
  /** Child node IDs */
  childIds: string[];
  /** Leaf node (no children) */
  isLeaf: boolean;
}
