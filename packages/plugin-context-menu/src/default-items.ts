// ─── Default Context Menu Items ───

import type { ContextMenuItem, MenuItemParams } from './types';

export function getDefaultItems(): ContextMenuItem[] {
  return [
    {
      id: 'copy-cell',
      label: 'Copy Cell Value',
      shortcut: 'Ctrl+C',
      action: (params: MenuItemParams) => {
        if (params.value != null) {
          navigator.clipboard.writeText(String(params.value)).catch(() => {});
        }
      },
    },
    {
      id: 'copy-row',
      label: 'Copy Row',
      action: (params: MenuItemParams) => {
        if (!params.node?.data) return;
        const text = JSON.stringify(params.node.data);
        navigator.clipboard.writeText(text).catch(() => {});
      },
    },
    { id: 'separator-1', label: '', separator: true },
    {
      id: 'export-csv',
      label: 'Export as CSV',
      action: (params: MenuItemParams) => {
        const state = params.api.getState();
        const columns = state.columns.filter((c) => !c.hide);
        const headers = columns.map((c) => c.headerName).join(',');
        const rows = state.displayedRowIds.map((id) => {
          const node = state.rowNodes.get(id);
          if (!node?.data) return '';
          return columns.map((c) => {
            const val = (node.data as any)?.[c.field ?? c.colId] ?? '';
            return String(val).includes(',') ? `"${val}"` : String(val);
          }).join(',');
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
    },
  ];
}
