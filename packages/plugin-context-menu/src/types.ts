// ─── Context Menu Types ───

import type { GridApi, ColumnState, RowNode } from '@gridstorm/core';

export interface ContextMenuPluginOptions {
  /** Menu items to display. Can be static or dynamic based on context. */
  menuItems?: ContextMenuItem[] | ((params: MenuItemParams) => ContextMenuItem[]);
  /** Hide built-in default items. Default: false. */
  hideDefaultItems?: boolean;
  /** Completely suppress the context menu. Default: false. */
  suppressContextMenu?: boolean;
}

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;
  shortcut?: string;
  disabled?: boolean | ((params: MenuItemParams) => boolean);
  visible?: boolean | ((params: MenuItemParams) => boolean);
  action?: (params: MenuItemParams) => void;
  subMenu?: ContextMenuItem[];
  /** If true, renders a visual separator instead of a menu item. */
  separator?: boolean;
  cssClass?: string;
}

export interface MenuItemParams {
  node: RowNode | null;
  colId: string | null;
  value: any;
  api: GridApi;
  column: ColumnState | null;
  /** Dispatch a command on the grid's command bus. */
  dispatch: (command: string, payload?: any) => void;
}
