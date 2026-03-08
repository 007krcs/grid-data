---
title: Context Menu
description: Add right-click context menus to grid cells with built-in items, custom items, keyboard shortcuts, and dynamic visibility.
---

The Context Menu plugin provides right-click menus on grid cells and rows. It includes built-in default items and supports fully custom menu items with actions, keyboard shortcuts, and conditional visibility.

## Installation

```bash
npm install @gridstorm/plugin-context-menu
```

```ts title="Setup"
import { ContextMenuPlugin } from '@gridstorm/plugin-context-menu';

const engine = createGrid({
  columns: [...],
  rowData: [...],
  plugins: [ContextMenuPlugin()],
});
```

## Plugin Options

```ts title="ContextMenuPluginOptions"
interface ContextMenuPluginOptions {
  menuItems?: ContextMenuItem[] | ((params: MenuItemParams) => ContextMenuItem[]);
  hideDefaultItems?: boolean;     // Hide built-in items (default: false)
  suppressContextMenu?: boolean;  // Disable context menu entirely (default: false)
}
```

## Custom Menu Items

### Static Items

```ts title="Custom items"
ContextMenuPlugin({
  menuItems: [
    {
      id: 'edit-row',
      label: 'Edit Row',
      shortcut: 'E',
      action: (params) => {
        console.log('Edit row:', params.node?.id);
      },
    },
    { id: 'sep', label: '', separator: true },
    {
      id: 'delete-row',
      label: 'Delete Row',
      cssClass: 'text-danger',
      action: (params) => {
        console.log('Delete row:', params.node?.id);
      },
    },
  ],
})
```

### Dynamic Items

Pass a function that receives the click context and returns items:

```ts title="Dynamic items"
ContextMenuPlugin({
  menuItems: (params) => {
    const items = [
      { id: 'view', label: 'View Details', action: () => openDetails(params.node) },
    ];

    if (params.column?.editable) {
      items.push({
        id: 'edit',
        label: 'Edit Cell',
        action: () => startEditing(params),
      });
    }

    return items;
  },
})
```

## Menu Item Interface

```ts title="ContextMenuItem"
interface ContextMenuItem {
  id: string;
  label: string;
  icon?: string;                  // Icon class or URL
  shortcut?: string;              // Keyboard shortcut text (display only)
  disabled?: boolean | ((params: MenuItemParams) => boolean);
  visible?: boolean | ((params: MenuItemParams) => boolean);
  action?: (params: MenuItemParams) => void;
  subMenu?: ContextMenuItem[];    // Nested submenu
  separator?: boolean;            // Render as a divider line
  cssClass?: string;              // Additional CSS class
}

interface MenuItemParams {
  node: RowNode | null;
  colId: string | null;
  value: any;
  api: GridApi;
  column: ColumnState | null;
}
```

### Conditional Visibility and Disabled State

```ts title="Conditional items"
{
  id: 'approve',
  label: 'Approve',
  visible: (params) => params.node?.data?.status === 'pending',
  disabled: (params) => !params.node?.data?.canApprove,
  action: (params) => approve(params.node),
}
```

### Separators

Insert visual dividers between groups of items:

```ts
{ id: 'sep-1', label: '', separator: true }
```

## Registering Items from Other Plugins

Other plugins can register context menu items at runtime:

```ts title="Plugin registration"
ctx.commandBus.dispatch('contextMenu:registerItem', {
  item: {
    id: 'copy-cell',
    label: 'Copy Cell',
    shortcut: 'Ctrl+C',
    action: (params) => navigator.clipboard.writeText(String(params.value)),
  },
});
```

## Commands

| Command | Payload | Description |
|---|---|---|
| `contextMenu:show` | `{ x, y, node, colId, value }` | Show the context menu |
| `contextMenu:hide` | `{}` | Hide the context menu |
| `contextMenu:registerItem` | `{ item }` | Register a new menu item |

## Events

| Event | Payload | Description |
|---|---|---|
| `contextMenu:opened` | `{ node, colId, x, y }` | Menu was opened |
| `contextMenu:closed` | `{}` | Menu was closed |

## React Context Menu Component

In the React adapter, provide a React component as the context menu for full control over rendering:

```tsx title="React context menu"
import type { ContextMenuProps } from '@gridstorm/react';

function MyContextMenu({ node, colId, value, api, closeMenu }: ContextMenuProps) {
  return (
    <div className="my-menu">
      <button onClick={() => { api.startEditingCell({ rowIndex: node.displayIndex, colId }); closeMenu(); }}>
        Edit
      </button>
      <button onClick={closeMenu}>Cancel</button>
    </div>
  );
}

<GridStorm columns={columns} rowData={data} contextMenu={MyContextMenu} />
```

## Next Steps

- **[Selection](/plugins/selection/)** -- Context menus often interact with selection.
- **[Clipboard](/plugins/clipboard/)** -- Copy/paste from context menu.
