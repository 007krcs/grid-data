// ─── Default Context Menu Items ───
// Rich context-aware menu items for sort, pin, group, copy, and export actions.

import type { ContextMenuItem, MenuItemParams } from './types';

export function getDefaultItems(params: MenuItemParams): ContextMenuItem[] {
  const col = params.column;
  const colId = params.colId;
  const state = params.api.getState();

  const items: ContextMenuItem[] = [];

  // ── Sort Section ──
  if (col?.sortable && colId) {
    const currentSort = state.sortModel.find((s) => s.colId === colId);

    items.push({
      id: 'sort-asc',
      label: 'Sort Ascending',
      icon: '↑',
      disabled: currentSort?.sort === 'asc',
      action: (p) => {
        p.api.setSortModel([{ colId: p.colId!, sort: 'asc' }]);
      },
    });

    items.push({
      id: 'sort-desc',
      label: 'Sort Descending',
      icon: '↓',
      disabled: currentSort?.sort === 'desc',
      action: (p) => {
        p.api.setSortModel([{ colId: p.colId!, sort: 'desc' }]);
      },
    });

    if (currentSort) {
      items.push({
        id: 'sort-clear',
        label: 'Clear Sort',
        icon: '×',
        action: (p) => {
          const model = p.api.getState().sortModel.filter((s) => s.colId !== p.colId);
          p.api.setSortModel(model);
        },
      });
    }

    items.push({ id: 'sep-sort', label: '', separator: true });
  }

  // ── Pin Section ──
  if (col && colId) {
    if (col.pinned !== 'left') {
      items.push({
        id: 'pin-left',
        label: 'Pin Left',
        icon: '◀',
        action: (p) => {
          p.dispatch('column:pin', { colId: p.colId, pinned: 'left' });
        },
      });
    }

    if (col.pinned !== 'right') {
      items.push({
        id: 'pin-right',
        label: 'Pin Right',
        icon: '▶',
        action: (p) => {
          p.dispatch('column:pin', { colId: p.colId, pinned: 'right' });
        },
      });
    }

    if (col.pinned) {
      items.push({
        id: 'unpin',
        label: 'Unpin Column',
        icon: '⊘',
        action: (p) => {
          p.dispatch('column:pin', { colId: p.colId, pinned: null });
        },
      });
    }

    items.push({ id: 'sep-pin', label: '', separator: true });
  }

  // ── Group Section ──
  if (col && colId) {
    const isGrouped = col.rowGroup;
    if (!isGrouped) {
      items.push({
        id: 'group-by',
        label: `Group by ${col.headerName}`,
        icon: '▤',
        action: (p) => {
          p.dispatch('group:addColumn', { colId: p.colId });
        },
      });
    } else {
      items.push({
        id: 'ungroup',
        label: `Ungroup ${col.headerName}`,
        icon: '▥',
        action: (p) => {
          p.dispatch('group:removeColumn', { colId: p.colId });
        },
      });
    }

    items.push({ id: 'sep-group', label: '', separator: true });
  }

  // ── Copy Section ──
  items.push({
    id: 'copy-cell',
    label: 'Copy Cell Value',
    icon: '📋',
    shortcut: 'Ctrl+C',
    disabled: params.value == null,
    action: (p) => {
      if (p.value != null) {
        navigator.clipboard.writeText(String(p.value)).catch(() => {});
      }
    },
  });

  items.push({
    id: 'copy-row',
    label: 'Copy Row',
    icon: '📄',
    disabled: !params.node?.data,
    action: (p) => {
      if (!p.node?.data) return;
      const text = JSON.stringify(p.node.data);
      navigator.clipboard.writeText(text).catch(() => {});
    },
  });

  items.push({ id: 'sep-copy', label: '', separator: true });

  // ── Export Section ──
  items.push({
    id: 'export-csv',
    label: 'Export as CSV',
    icon: '📥',
    action: (p) => {
      const s = p.api.getState();
      const columns = s.columns.filter((c) => !c.hide);
      const headers = columns.map((c) => c.headerName).join(',');
      const rows = s.displayedRowIds.map((id) => {
        const node = s.rowNodes.get(id);
        if (!node?.data) return '';
        return columns
          .map((c) => {
            const val = (node.data as any)?.[c.field ?? c.colId] ?? '';
            return String(val).includes(',') ? `"${val}"` : String(val);
          })
          .join(',');
      });
      const csv = [headers, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'grid-export.csv';
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  return items;
}
