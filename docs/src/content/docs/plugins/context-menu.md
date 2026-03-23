---
title: Context Menu
description: Add right-click context menus with custom items, submenus, keyboard navigation, and dynamic visibility to your GridStorm data grid.
---

The Context Menu plugin provides right-click menus on grid cells and rows. It supports built-in default items, fully custom menu items with icons and keyboard shortcuts, nested submenus, conditional visibility/disabled states, and runtime item registration from other plugins.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-context-menu
```

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { ContextMenuPlugin } from '@gridstorm/plugin-context-menu';

const grid = createGrid({
  columns: [
    { colId: 'name', field: 'name', headerName: 'Name' },
    { colId: 'email', field: 'email', headerName: 'Email' },
  ],
  rowData: [],
  plugins: [
    ContextMenuPlugin({
      menuItems: [
        {
          id: 'edit-row',
          label: 'Edit Row',
          icon: '✏️',
          shortcut: 'E',
          action: (params) => console.log('Edit:', params.node?.id),
        },
        { id: 'sep', label: '', separator: true },
        {
          id: 'delete-row',
          label: 'Delete Row',
          icon: '🗑️',
          cssClass: 'text-danger',
          action: (params) => console.log('Delete:', params.node?.id),
        },
      ],
      hideDefaultItems: false,
      suppressContextMenu: false,
    }),
  ],
});
```

:::example{title="Context Menu Demo" href="/cookbook/#context-menu"}
Right-click cells to see custom menus with icons, keyboard shortcuts, submenus, and dynamic visibility based on cell context.
:::

## Plugin Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `menuItems` | `ContextMenuItem[] \| (params: MenuItemParams) => ContextMenuItem[]` | `undefined` | Static or dynamic menu items. Dynamic functions receive the click context and return items. |
| `hideDefaultItems` | `boolean` | `false` | Hide the built-in default menu items. Only your custom items will appear. |
| `suppressContextMenu` | `boolean` | `false` | Completely disable the context menu. The plugin becomes a no-op. |

## Menu Item Interface

Each menu item supports the following properties:

| Name | Type | Description |
| --- | --- | --- |
| `id` | `string` | Unique identifier for the item. |
| `label` | `string` | Display text. |
| `icon` | `string` | Icon text or emoji shown before the label. |
| `shortcut` | `string` | Keyboard shortcut hint displayed on the right (display only). |
| `disabled` | `boolean \| (params) => boolean` | Disable the item. Disabled items are visually muted and not clickable. |
| `visible` | `boolean \| (params) => boolean` | Control visibility. Items with `visible: false` are excluded. |
| `action` | `(params: MenuItemParams) => void` | Click handler. Receives the context (`node`, `colId`, `value`, `api`, `column`, `dispatch`). |
| `subMenu` | `ContextMenuItem[]` | Nested submenu items. Shows an arrow indicator and opens on hover. |
| `separator` | `boolean` | Render a visual divider instead of a clickable item. |
| `cssClass` | `string` | Additional CSS class for custom styling. |

The `MenuItemParams` object passed to actions, `disabled`, and `visible` callbacks contains:

| Name | Type | Description |
| --- | --- | --- |
| `node` | `RowNode \| null` | The row node that was right-clicked. |
| `colId` | `string \| null` | The column ID of the clicked cell. |
| `value` | `any` | The cell value at the click position. |
| `api` | `GridApi` | The grid API instance. |
| `column` | `ColumnState \| null` | The column state of the clicked cell. |
| `dispatch` | `(command, payload?) => void` | Shortcut to dispatch a command on the grid's command bus. |

## Usage Examples

### Dynamic Menu Items

Pass a function to generate items based on the click context.

```typescript title="dynamic-items.ts"
ContextMenuPlugin({
  menuItems: (params) => {
    const items = [
      { id: 'view', label: 'View Details', action: () => openDetails(params.node) },
    ];

    if (params.value != null) {
      items.push({
        id: 'copy-value',
        label: 'Copy Value',
        shortcut: 'Ctrl+C',
        action: () => navigator.clipboard.writeText(String(params.value)),
      });
    }

    return items;
  },
});
```

### Submenus

```typescript title="submenu-items.ts"
ContextMenuPlugin({
  menuItems: [
    {
      id: 'export',
      label: 'Export',
      icon: '📥',
      subMenu: [
        { id: 'csv', label: 'Export CSV', action: (p) => p.dispatch('excel:exportCsv', {}) },
        { id: 'excel', label: 'Export Excel', action: (p) => p.dispatch('excel:exportExcel', {}) },
      ],
    },
  ],
});
```

### Register Items from Other Plugins

Other plugins can add items to the context menu at runtime using the `contextMenu:registerItem` command.

```typescript title="register-item.ts"
grid.commandBus.dispatch('contextMenu:registerItem', {
  item: {
    id: 'copy-cell',
    label: 'Copy Cell',
    shortcut: 'Ctrl+C',
    action: (params) => navigator.clipboard.writeText(String(params.value)),
  },
});
```

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `contextMenu:show` | `{ x: number; y: number; node: RowNode \| null; colId: string \| null; value: any }` | Show the context menu at the given coordinates with the given context. |
| `contextMenu:hide` | `{}` | Hide the currently visible context menu and any open submenus. |
| `contextMenu:registerItem` | `{ item: ContextMenuItem }` | Register a menu item at runtime. Items persist for the plugin's lifetime. |

## Events

| Name | Payload | Description |
| --- | --- | --- |
| `contextMenu:opened` | `{ node: RowNode \| null; colId: string \| null; x: number; y: number }` | Emitted when the context menu opens. |
| `contextMenu:closed` | `{}` | Emitted when the context menu closes. |

## Keyboard Navigation

When the context menu is open, you can navigate with the keyboard:

| Key | Action |
| --- | --- |
| `ArrowDown` | Move focus to the next item. |
| `ArrowUp` | Move focus to the previous item. |
| `Home` | Focus the first item. |
| `End` | Focus the last item. |
| `Enter` / `Space` | Activate the focused item. |
| `ArrowRight` | Open a submenu on the focused item. |
| `ArrowLeft` | Close the active submenu. |
| `Escape` | Close the entire menu. |

## React Integration

```tsx title="ContextMenuGrid.tsx"
import { GridStorm, useGridApi } from '@gridstorm/react';
import { ContextMenuPlugin } from '@gridstorm/plugin-context-menu';

function ContextMenuGrid({ rowData, columns }) {
  const apiRef = useGridApi();

  return (
    <GridStorm
      rowData={rowData}
      columns={columns}
      plugins={[
        ContextMenuPlugin({
          menuItems: (params) => [
            {
              id: 'log',
              label: `Row: ${params.node?.id ?? 'none'}`,
              action: () => console.log(params.node),
            },
          ],
        }),
      ]}
    />
  );
}
```

## Next Steps

- [Selection Plugin](/plugins/selection/) -- context menus often interact with the current selection.
- [Clipboard Plugin](/plugins/clipboard/) -- add copy/paste actions to the menu.
- [Editing Plugin](/plugins/editing/) -- add inline edit triggers to the menu.
