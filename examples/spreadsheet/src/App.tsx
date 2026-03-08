import { useState, useRef, useCallback, useMemo } from 'react';
import {
  GridStorm,
  useGridApi,
  useGridSelection,
  reactCellRenderer,
} from '@gridstorm/react';
import type {
  GridApi,
  ReactColumnDef,
  CellRendererProps,
  ContextMenuProps,
  CellEditorProps,
} from '@gridstorm/react';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { FilteringPlugin } from '@gridstorm/plugin-filtering';
import { SelectionPlugin } from '@gridstorm/plugin-selection';
import { EditingPlugin } from '@gridstorm/plugin-editing';
import { ClipboardPlugin } from '@gridstorm/plugin-clipboard';
import { ColumnResizePlugin } from '@gridstorm/plugin-column-resize';
import { ColumnPinningPlugin } from '@gridstorm/plugin-column-pinning';
import { ContextMenuPlugin } from '@gridstorm/plugin-context-menu';
import '@gridstorm/theme-default';

// ── Types ──

interface SpreadsheetRow {
  id: number;
  product: string;
  sku: string;
  category: string;
  supplier: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  total: number;
  inStock: boolean;
  reorderLevel: number;
  lastOrdered: string;
  notes: string;
  rating: number;
  status: string;
}

// ── Constants ──

const CATEGORIES = ['Electronics', 'Office', 'Clothing', 'Food', 'Tools', 'Furniture'];
const STATUSES = ['active', 'discontinued', 'pending', 'backorder'];

const PRODUCTS: Record<string, string[]> = {
  Electronics: [
    'Wireless Mouse', 'Bluetooth Keyboard', 'USB-C Hub', 'Monitor Stand', 'Webcam HD',
    'Noise-Cancelling Headphones', 'Portable Charger', 'HDMI Cable', 'LED Desk Lamp', 'Smart Speaker',
    'Laptop Stand', 'Wireless Earbuds', 'Power Strip', 'USB Flash Drive', 'External SSD',
  ],
  Office: [
    'Ballpoint Pens (12pk)', 'Legal Notepad', 'Stapler Heavy-Duty', 'File Folders (50pk)', 'Whiteboard Markers',
    'Desk Organizer', 'Paper Clips (500pk)', 'Sticky Notes', 'Binder Clips', 'Envelope Pack',
    'Label Maker', 'Correction Tape', 'Rubber Bands', 'Index Cards', 'Tape Dispenser',
  ],
  Clothing: [
    'Safety Vest', 'Work Gloves', 'Steel-Toe Boots', 'Hard Hat', 'Rain Jacket',
    'Polo Shirt', 'Cargo Pants', 'Hi-Vis Hoodie', 'Thermal Socks', 'Apron Heavy-Duty',
    'Lab Coat', 'Anti-Slip Shoes', 'Coveralls', 'Knee Pads', 'Sun Hat',
  ],
  Food: [
    'Coffee Beans (1kg)', 'Green Tea (100 bags)', 'Protein Bars (24pk)', 'Trail Mix (500g)', 'Instant Oatmeal',
    'Sparkling Water (12pk)', 'Dark Chocolate Bar', 'Almonds (1kg)', 'Energy Drink (6pk)', 'Dried Mango',
    'Granola (750g)', 'Honey Jar', 'Olive Oil (1L)', 'Rice Crackers', 'Peanut Butter',
  ],
  Tools: [
    'Cordless Drill', 'Tape Measure 25ft', 'Adjustable Wrench', 'Screwdriver Set (20pc)', 'Utility Knife',
    'Level 24-inch', 'Wire Cutters', 'Pliers Set', 'Socket Set (40pc)', 'Allen Key Set',
    'Hammer Claw', 'Hacksaw', 'Voltage Tester', 'Flashlight Rechargeable', 'Safety Glasses',
  ],
  Furniture: [
    'Ergonomic Chair', 'Standing Desk', 'Filing Cabinet 3-Drawer', 'Bookshelf 5-Tier', 'Conference Table',
    'Guest Chair', 'Desk Drawer Pedestal', 'Monitor Arm Dual', 'Keyboard Tray', 'Coat Rack',
    'Storage Locker', 'Whiteboard 4x6', 'Cork Board', 'Side Table', 'Footrest Adjustable',
  ],
};

const SUPPLIERS = [
  'Apex Industrial', 'BlueWave Supply Co.', 'CoreTech Distributors', 'Delta Wholesale',
  'Eagle Logistics', 'FreshPoint Trading', 'GlobalSource Inc.', 'Harbor Goods',
  'Ironclad Partners', 'JetStream Imports', 'Keystone Supplies', 'Landmark Distribution',
];

// ── Data Generator ──

function generateSpreadsheetData(count: number): SpreadsheetRow[] {
  const rows: SpreadsheetRow[] = [];
  for (let i = 0; i < count; i++) {
    const category = CATEGORIES[i % CATEGORIES.length]!;
    const productList = PRODUCTS[category]!;
    const product = productList[i % productList.length]!;
    const unitPrice = parseFloat((5 + Math.random() * 495).toFixed(2));
    const quantity = Math.floor(1 + Math.random() * 500);
    const discount = parseFloat((Math.random() * 0.3).toFixed(2));
    const total = parseFloat((unitPrice * quantity * (1 - discount)).toFixed(2));

    const skuPrefix = category.substring(0, 3).toUpperCase();
    const skuNum = String(1000 + (i % 9000)).padStart(4, '0');

    const year = 2023 + (i % 3);
    const month = 1 + (i % 12);
    const day = 1 + (i % 28);
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    rows.push({
      id: i + 1,
      product,
      sku: `${skuPrefix}-${skuNum}`,
      category,
      supplier: SUPPLIERS[i % SUPPLIERS.length]!,
      unitPrice,
      quantity,
      discount,
      total,
      inStock: Math.random() > 0.2,
      reorderLevel: Math.floor(5 + Math.random() * 95),
      lastOrdered: dateStr,
      notes: '',
      rating: Math.floor(1 + Math.random() * 5),
      status: STATUSES[i % STATUSES.length]!,
    });
  }
  return rows;
}

// ── Cell Renderers ──

function RowNumberCell({ node }: CellRendererProps<SpreadsheetRow, number>) {
  return (
    <span style={{ color: '#999', fontSize: 12, fontFamily: 'monospace' }}>
      {node.data?.id ?? ''}
    </span>
  );
}

function CurrencyCell({ value }: CellRendererProps<SpreadsheetRow, number>) {
  const formatted = value != null ? `$${Number(value).toFixed(2)}` : '';
  return (
    <span style={{ fontFamily: 'monospace', fontSize: 13 }}>
      {formatted}
    </span>
  );
}

function PercentCell({ value }: CellRendererProps<SpreadsheetRow, number>) {
  const formatted = value != null ? `${Math.round(Number(value) * 100)}%` : '';
  return (
    <span style={{ fontFamily: 'monospace', fontSize: 13 }}>
      {formatted}
    </span>
  );
}

function TotalCell({ value }: CellRendererProps<SpreadsheetRow, number>) {
  const formatted = value != null ? `$${Number(value).toFixed(2)}` : '';
  return (
    <span
      style={{
        fontFamily: 'monospace',
        fontWeight: 700,
        color: '#16a34a',
        fontSize: 13,
      }}
    >
      {formatted}
    </span>
  );
}

function CheckboxCell({ value }: CellRendererProps<SpreadsheetRow, boolean>) {
  return (
    <span
      style={{
        fontSize: 16,
        color: value ? '#16a34a' : '#dc2626',
        fontWeight: 600,
      }}
    >
      {value ? '\u2713' : '\u2717'}
    </span>
  );
}

function StarRating({ value }: CellRendererProps<SpreadsheetRow, number>) {
  const rating = Math.max(1, Math.min(5, Math.round(Number(value) || 0)));
  const stars: string[] = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(i <= rating ? '\u2605' : '\u2606');
  }
  return (
    <span style={{ color: '#f59e0b', fontSize: 14, letterSpacing: 1 }}>
      {stars.join('')}
    </span>
  );
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  active: { bg: '#dcfce7', color: '#166534' },
  discontinued: { bg: '#fef2f2', color: '#991b1b' },
  pending: { bg: '#fef9c3', color: '#854d0e' },
  backorder: { bg: '#ffedd5', color: '#9a3412' },
};

function StatusBadge({ value }: CellRendererProps<SpreadsheetRow, string>) {
  const status = String(value || 'active').toLowerCase();
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.active!;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 600,
        background: colors.bg,
        color: colors.color,
        textTransform: 'capitalize',
      }}
    >
      {status}
    </span>
  );
}

// ── Cell Editors ──

function CategoryEditor({ value, onValueChange, stopEditing, editorParams }: CellEditorProps<SpreadsheetRow, string>) {
  const values = (editorParams.values as string[]) ?? CATEGORIES;
  return (
    <select
      value={value}
      onChange={(e) => {
        onValueChange(e.target.value);
        stopEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') stopEditing(true);
      }}
      autoFocus
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        outline: 'none',
        fontSize: 13,
        padding: '0 8px',
        background: 'var(--gs-color-cell-editing-bg, #fff)',
      }}
    >
      {values.map((v) => (
        <option key={v} value={v}>{v}</option>
      ))}
    </select>
  );
}

function StatusEditor({ value, onValueChange, stopEditing, editorParams }: CellEditorProps<SpreadsheetRow, string>) {
  const values = (editorParams.values as string[]) ?? STATUSES;
  return (
    <select
      value={value}
      onChange={(e) => {
        onValueChange(e.target.value);
        stopEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') stopEditing(true);
      }}
      autoFocus
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        outline: 'none',
        fontSize: 13,
        padding: '0 8px',
        background: 'var(--gs-color-cell-editing-bg, #fff)',
      }}
    >
      {values.map((v) => (
        <option key={v} value={v}>{v}</option>
      ))}
    </select>
  );
}

// ── Validation helpers ──

function isValidPrice(val: unknown): boolean {
  const n = Number(val);
  return !isNaN(n) && n > 0;
}

function isValidQuantity(val: unknown): boolean {
  const n = Number(val);
  return !isNaN(n) && n >= 0 && Number.isInteger(n);
}

function isValidDiscount(val: unknown): boolean {
  const n = Number(val);
  return !isNaN(n) && n >= 0 && n <= 1;
}

function isValidRating(val: unknown): boolean {
  const n = Number(val);
  return !isNaN(n) && n >= 1 && n <= 5 && Number.isInteger(n);
}

// ── Context Menu ──

function SpreadsheetContextMenu({ node, colId, value, closeMenu, api }: ContextMenuProps<SpreadsheetRow>) {
  const menuStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: 8,
    boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
    padding: '4px 0',
    minWidth: 200,
    fontSize: 13,
  };
  const itemStyle: React.CSSProperties = {
    padding: '7px 16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  };
  const separatorStyle: React.CSSProperties = {
    borderTop: '1px solid #e5e7eb',
    margin: '4px 0',
  };

  const onHover = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.background = '#f3f4f6';
  };
  const onLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.background = 'transparent';
  };

  const handleInsertRow = (offset: number) => {
    const currentData = api.getSelectedRows();
    const state = api.getState();
    const allIds = state.displayedRowIds;
    const nodeIndex = allIds.indexOf(node.id);
    const insertAt = Math.max(0, nodeIndex + offset);

    // Build a new empty row
    const maxId = allIds.reduce((max, id) => {
      const rn = state.rowNodes.get(id);
      const rid = rn?.data?.id ?? 0;
      return Math.max(max, rid);
    }, 0);

    const newRow: SpreadsheetRow = {
      id: maxId + 1,
      product: '',
      sku: '',
      category: 'Electronics',
      supplier: '',
      unitPrice: 0,
      quantity: 0,
      discount: 0,
      total: 0,
      inStock: true,
      reorderLevel: 10,
      lastOrdered: new Date().toISOString().split('T')[0]!,
      notes: '',
      rating: 3,
      status: 'active',
    };

    // Rebuild row data with insertion
    const existingData: SpreadsheetRow[] = [];
    allIds.forEach((id) => {
      const rn = state.rowNodes.get(id);
      if (rn?.data) existingData.push(rn.data);
    });
    existingData.splice(insertAt, 0, newRow);
    api.setRowData(existingData);
    closeMenu();
    void currentData; // suppress unused
  };

  const handleDeleteRow = () => {
    const state = api.getState();
    const allIds = state.displayedRowIds;
    const newData: SpreadsheetRow[] = [];
    allIds.forEach((id) => {
      if (id !== node.id) {
        const rn = state.rowNodes.get(id);
        if (rn?.data) newData.push(rn.data);
      }
    });
    api.setRowData(newData);
    closeMenu();
  };

  return (
    <div style={menuStyle}>
      <div style={itemStyle} onMouseEnter={onHover} onMouseLeave={onLeave}
        onClick={() => { navigator.clipboard.writeText(String(value ?? '')); closeMenu(); }}>
        <span style={{ width: 20, textAlign: 'center' }}>&#128203;</span>
        Copy Cell Value
      </div>
      <div style={itemStyle} onMouseEnter={onHover} onMouseLeave={onLeave}
        onClick={() => { navigator.clipboard.writeText(String(value ?? '')); closeMenu(); }}>
        <span style={{ width: 20, textAlign: 'center' }}>&#9986;</span>
        Cut
      </div>
      <div style={itemStyle} onMouseEnter={onHover} onMouseLeave={onLeave}
        onClick={() => { closeMenu(); }}>
        <span style={{ width: 20, textAlign: 'center' }}>&#128203;</span>
        Paste
      </div>

      <div style={separatorStyle} />

      <div style={itemStyle} onMouseEnter={onHover} onMouseLeave={onLeave}
        onClick={() => handleInsertRow(0)}>
        <span style={{ width: 20, textAlign: 'center' }}>&#8593;</span>
        Insert Row Above
      </div>
      <div style={itemStyle} onMouseEnter={onHover} onMouseLeave={onLeave}
        onClick={() => handleInsertRow(1)}>
        <span style={{ width: 20, textAlign: 'center' }}>&#8595;</span>
        Insert Row Below
      </div>
      <div style={itemStyle} onMouseEnter={onHover} onMouseLeave={onLeave}
        onClick={handleDeleteRow}>
        <span style={{ width: 20, textAlign: 'center', color: '#dc2626' }}>&#128465;</span>
        <span style={{ color: '#dc2626' }}>Delete Row</span>
      </div>

      <div style={separatorStyle} />

      <div style={itemStyle} onMouseEnter={onHover} onMouseLeave={onLeave}
        onClick={() => { api.setSortModel([{ colId, sort: 'asc' }]); closeMenu(); }}>
        <span style={{ width: 20, textAlign: 'center' }}>&#9650;</span>
        Sort Ascending
      </div>
      <div style={itemStyle} onMouseEnter={onHover} onMouseLeave={onLeave}
        onClick={() => { api.setSortModel([{ colId, sort: 'desc' }]); closeMenu(); }}>
        <span style={{ width: 20, textAlign: 'center' }}>&#9660;</span>
        Sort Descending
      </div>

      <div style={separatorStyle} />

      <div style={{ ...itemStyle, color: '#999', fontSize: 11, cursor: 'default' }}>
        Row #{node.data?.id} &middot; {colId}
      </div>
    </div>
  );
}

// ── Formula Bar (child using hooks) ──

function FormulaBar({
  focusedCellInfo,
  isEditing,
  rowCount,
  editCount,
}: {
  focusedCellInfo: string;
  isEditing: boolean;
  rowCount: number;
  editCount: number;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '6px 16px',
        background: '#f8f9fa',
        borderBottom: '1px solid #e0e0e0',
        fontFamily: "'Consolas', 'SF Mono', 'Fira Code', monospace",
        fontSize: 13,
        minHeight: 36,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '2px 10px',
          background: '#fff',
          border: '1px solid #d0d5dd',
          borderRadius: 4,
          minWidth: 60,
          fontWeight: 600,
          color: '#374151',
        }}
      >
        fx
      </span>
      <span style={{ flex: 1, color: '#374151' }}>
        {focusedCellInfo || 'Click a cell to view details'}
      </span>
      {isEditing && (
        <span
          style={{
            padding: '2px 8px',
            background: '#dbeafe',
            color: '#1d4ed8',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          EDITING
        </span>
      )}
      <span style={{ color: '#9ca3af', fontSize: 12, fontFamily: 'inherit' }}>
        {rowCount} rows &middot; {editCount} edits
      </span>
    </div>
  );
}

// ── Toolbar (child using hooks) ──

function Toolbar({
  rowCount,
  editCount,
  theme,
  onThemeChange,
  onAddRow,
  onDeleteSelected,
}: {
  rowCount: number;
  editCount: number;
  theme: string;
  onThemeChange: (t: string) => void;
  onAddRow: () => void;
  onDeleteSelected: () => void;
}) {
  const api = useGridApi<SpreadsheetRow>();
  const { selectedCount, deselectAll } = useGridSelection<SpreadsheetRow>();

  return (
    <div
      style={{
        padding: '8px 16px',
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        borderBottom: '1px solid #e0e0e0',
        background: '#fafafa',
        flexWrap: 'wrap',
        fontSize: 13,
      }}
    >
      {/* Title */}
      <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>
        &#128202; GridStorm Spreadsheet
      </span>
      <span style={{ color: '#9ca3af' }}>|</span>
      <span style={{ color: '#6b7280' }}>{rowCount} rows</span>
      <span style={{ color: '#9ca3af' }}>|</span>
      <span style={{ color: '#6b7280' }}>Edits: {editCount}</span>

      <span style={{ color: '#d1d5db' }}>|</span>

      {/* Action buttons */}
      <button onClick={onAddRow} style={btnStyle}>+ Add Row</button>
      <button
        onClick={onDeleteSelected}
        style={{ ...btnStyle, ...(selectedCount === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
        disabled={selectedCount === 0}
      >
        Delete Selected
      </button>
      <button onClick={() => { /* undo placeholder */ }} style={{ ...btnStyle, opacity: 0.5 }}>
        Undo
      </button>
      <button onClick={() => { /* redo placeholder */ }} style={{ ...btnStyle, opacity: 0.5 }}>
        Redo
      </button>

      <span style={{ color: '#d1d5db' }}>|</span>

      <button
        onClick={() => {
          try { navigator.clipboard.readText(); } catch { /* noop */ }
        }}
        style={btnStyle}
      >
        Copy
      </button>
      <button style={btnStyle}>Cut</button>
      <button style={btnStyle}>Paste</button>

      {selectedCount > 0 && (
        <>
          <span style={{ color: '#d1d5db' }}>|</span>
          <span style={{ color: '#2563eb', fontWeight: 600 }}>
            Selected: {selectedCount} rows
          </span>
          <button onClick={deselectAll} style={btnStyle}>Clear</button>
        </>
      )}

      <div style={{ flex: 1 }} />

      {/* Theme selector */}
      <span style={{ color: '#6b7280', fontSize: 12 }}>Theme:</span>
      <select
        value={theme}
        onChange={(e) => onThemeChange(e.target.value)}
        style={{ ...btnStyle, cursor: 'pointer' }}
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="high-contrast">High Contrast</option>
      </select>

      {/* suppress unused api warning */}
      {false && api}
    </div>
  );
}

// ── Plugins ──

const plugins = [
  SortingPlugin({ multiSort: true }),
  FilteringPlugin(),
  SelectionPlugin({ mode: 'multiple' }),
  EditingPlugin({ undoRedo: false }),
  ClipboardPlugin({ copyHeaders: true }),
  ColumnResizePlugin(),
  ColumnPinningPlugin(),
  ContextMenuPlugin(),
];

// ── App ──

export function App() {
  const [rowData, setRowData] = useState<SpreadsheetRow[]>(() => generateSpreadsheetData(500));
  const [theme, setTheme] = useState('light');
  const [editCount, setEditCount] = useState(0);
  const [focusedCellInfo, setFocusedCellInfo] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const apiRef = useRef<GridApi<SpreadsheetRow> | null>(null);

  const handleGridReady = useCallback((api: GridApi<SpreadsheetRow>) => {
    apiRef.current = api;
  }, []);

  const handleAddRow = useCallback(() => {
    setRowData((prev) => {
      const maxId = prev.reduce((m, r) => Math.max(m, r.id), 0);
      const newRow: SpreadsheetRow = {
        id: maxId + 1,
        product: '',
        sku: '',
        category: 'Electronics',
        supplier: '',
        unitPrice: 0,
        quantity: 0,
        discount: 0,
        total: 0,
        inStock: true,
        reorderLevel: 10,
        lastOrdered: new Date().toISOString().split('T')[0]!,
        notes: '',
        rating: 3,
        status: 'active',
      };
      return [...prev, newRow];
    });
  }, []);

  const handleDeleteSelected = useCallback(() => {
    if (!apiRef.current) return;
    const selected = apiRef.current.getSelectedNodes();
    if (selected.length === 0) return;
    const selectedIds = new Set(selected.map((n) => n.id));
    setRowData((prev) => prev.filter((r) => !selectedIds.has(String(r.id))));
    apiRef.current.deselectAll();
  }, []);

  // Build column definitions
  const columns = useMemo<ReactColumnDef<SpreadsheetRow>[]>(
    () => [
      // Row #
      {
        colId: 'rowNum',
        headerName: '#',
        width: 50,
        pinned: 'left' as const,
        sortable: false,
        resizable: false,
        editable: false,
        cellRenderer: reactCellRenderer(RowNumberCell),
        cellStyle: {
          background: '#f9fafb',
          textAlign: 'center',
          borderRight: '1px solid #e5e7eb',
        },
      },
      // Product
      {
        field: 'product' as keyof SpreadsheetRow & string,
        headerName: 'Product',
        width: 200,
        sortable: true,
        resizable: true,
        editable: true,
        cellEditor: 'text',
        cellStyle: { borderLeft: '2px solid #bfdbfe' },
      },
      // SKU
      {
        field: 'sku' as keyof SpreadsheetRow & string,
        headerName: 'SKU',
        width: 120,
        sortable: true,
        resizable: true,
        editable: true,
        cellEditor: 'text',
        cellStyle: {
          fontFamily: "'Consolas', monospace",
          fontSize: '12px',
          borderLeft: '2px solid #bfdbfe',
        },
      },
      // Category
      {
        field: 'category' as keyof SpreadsheetRow & string,
        headerName: 'Category',
        width: 130,
        sortable: true,
        filterable: true,
        resizable: true,
        editable: true,
        cellEditor: 'select',
        cellEditorParams: { values: CATEGORIES },
        cellEditorComponent: CategoryEditor,
        cellStyle: { borderLeft: '2px solid #bfdbfe' },
      },
      // Supplier
      {
        field: 'supplier' as keyof SpreadsheetRow & string,
        headerName: 'Supplier',
        width: 150,
        sortable: true,
        resizable: true,
        editable: true,
        cellEditor: 'text',
        cellStyle: { borderLeft: '2px solid #bfdbfe' },
      },
      // Unit Price
      {
        field: 'unitPrice' as keyof SpreadsheetRow & string,
        headerName: 'Unit Price',
        width: 110,
        sortable: true,
        resizable: true,
        editable: true,
        cellEditor: 'number',
        cellRenderer: reactCellRenderer(CurrencyCell),
        cellStyle: (params) => ({
          borderLeft: '2px solid #bfdbfe',
          ...(params.value != null && !isValidPrice(params.value)
            ? { background: '#fef2f2', borderColor: '#ef4444' }
            : {}),
        }),
        valueFormatter: (params) =>
          params.value != null ? `$${Number(params.value).toFixed(2)}` : '',
      },
      // Quantity
      {
        field: 'quantity' as keyof SpreadsheetRow & string,
        headerName: 'Qty',
        width: 90,
        sortable: true,
        resizable: true,
        editable: true,
        cellEditor: 'number',
        cellStyle: (params) => ({
          borderLeft: '2px solid #bfdbfe',
          fontFamily: "'Consolas', monospace",
          ...(params.value != null && !isValidQuantity(params.value)
            ? { background: '#fef2f2', borderColor: '#ef4444' }
            : {}),
        }),
      },
      // Discount
      {
        field: 'discount' as keyof SpreadsheetRow & string,
        headerName: 'Discount',
        width: 90,
        sortable: true,
        resizable: true,
        editable: true,
        cellEditor: 'number',
        cellRenderer: reactCellRenderer(PercentCell),
        cellStyle: (params) => ({
          borderLeft: '2px solid #bfdbfe',
          ...(params.value != null && !isValidDiscount(params.value)
            ? { background: '#fef2f2', borderColor: '#ef4444' }
            : {}),
        }),
        valueFormatter: (params) =>
          params.value != null ? `${Math.round(Number(params.value) * 100)}%` : '',
      },
      // Total (calculated, NOT editable)
      {
        field: 'total' as keyof SpreadsheetRow & string,
        headerName: 'Total',
        width: 120,
        sortable: true,
        resizable: true,
        editable: false,
        cellRenderer: reactCellRenderer(TotalCell),
        cellStyle: {
          background: '#fefce8',
          fontFamily: "'Consolas', monospace",
          fontWeight: '700',
        },
        valueGetter: (params) => {
          if (!params.data) return 0;
          const price = params.data.unitPrice ?? 0;
          const qty = params.data.quantity ?? 0;
          const disc = params.data.discount ?? 0;
          return parseFloat((price * qty * (1 - disc)).toFixed(2));
        },
        valueFormatter: (params) =>
          params.value != null ? `$${Number(params.value).toFixed(2)}` : '',
      },
      // In Stock
      {
        field: 'inStock' as keyof SpreadsheetRow & string,
        headerName: 'In Stock',
        width: 90,
        sortable: true,
        resizable: true,
        editable: true,
        cellRenderer: reactCellRenderer(CheckboxCell),
        cellStyle: { textAlign: 'center', borderLeft: '2px solid #bfdbfe' },
      },
      // Reorder Level
      {
        field: 'reorderLevel' as keyof SpreadsheetRow & string,
        headerName: 'Reorder Lvl',
        width: 100,
        sortable: true,
        resizable: true,
        editable: true,
        cellEditor: 'number',
        cellStyle: {
          borderLeft: '2px solid #bfdbfe',
          fontFamily: "'Consolas', monospace",
        },
      },
      // Last Ordered
      {
        field: 'lastOrdered' as keyof SpreadsheetRow & string,
        headerName: 'Last Ordered',
        width: 120,
        sortable: true,
        resizable: true,
        editable: false,
        cellStyle: {
          fontFamily: "'Consolas', monospace",
          fontSize: '12px',
          color: '#6b7280',
        },
      },
      // Rating
      {
        field: 'rating' as keyof SpreadsheetRow & string,
        headerName: 'Rating',
        width: 90,
        sortable: true,
        resizable: true,
        editable: true,
        cellEditor: 'number',
        cellRenderer: reactCellRenderer(StarRating),
        cellStyle: (params) => ({
          textAlign: 'center',
          borderLeft: '2px solid #bfdbfe',
          ...(params.value != null && !isValidRating(params.value)
            ? { background: '#fef2f2', borderColor: '#ef4444' }
            : {}),
        }),
      },
      // Status
      {
        field: 'status' as keyof SpreadsheetRow & string,
        headerName: 'Status',
        width: 110,
        sortable: true,
        filterable: true,
        resizable: true,
        editable: true,
        cellEditor: 'select',
        cellEditorParams: { values: STATUSES },
        cellEditorComponent: StatusEditor,
        cellRenderer: reactCellRenderer(StatusBadge),
        cellStyle: { borderLeft: '2px solid #bfdbfe' },
      },
      // Notes
      {
        field: 'notes' as keyof SpreadsheetRow & string,
        headerName: 'Notes',
        width: 200,
        sortable: false,
        resizable: true,
        editable: true,
        cellEditor: 'text',
        cellStyle: {
          borderLeft: '2px solid #bfdbfe',
          color: '#6b7280',
          fontStyle: 'italic',
        },
      },
    ],
    [],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Grid Container */}
      <div style={{ flex: 1 }} data-theme={theme}>
        <GridStorm<SpreadsheetRow>
          columns={columns}
          rowData={rowData}
          plugins={plugins}
          rowHeight={32}
          headerHeight={36}
          height="100%"
          rowSelection="multiple"
          ariaLabel="GridStorm Spreadsheet Demo — 500 Rows"
          onGridReady={handleGridReady}
          contextMenu={SpreadsheetContextMenu}
          onCellValueChanged={(e) => {
            setEditCount((c) => c + 1);

            // Recalculate total when price, quantity, or discount changes
            if (
              e.colId === 'unitPrice' ||
              e.colId === 'quantity' ||
              e.colId === 'discount'
            ) {
              const data = e.node.data;
              if (data) {
                const price = data.unitPrice ?? 0;
                const qty = data.quantity ?? 0;
                const disc = data.discount ?? 0;
                (data as any).total = parseFloat(
                  (price * qty * (1 - disc)).toFixed(2),
                );
              }
            }
          }}
          onCellClicked={(e) => {
            const col = e.colId;
            const val = e.node.data ? (e.node.data as any)[col] : undefined;
            const colState = apiRef.current?.getColumn(col);
            const displayName = colState?.headerName ?? col;
            const rowIdx = e.node.displayIndex + 1;
            let formattedVal = String(val ?? '');

            if (col === 'unitPrice' || col === 'total') {
              formattedVal = val != null ? `$${Number(val).toFixed(2)}` : '';
            } else if (col === 'discount') {
              formattedVal =
                val != null ? `${Math.round(Number(val) * 100)}%` : '';
            } else if (col === 'inStock') {
              formattedVal = val ? 'Yes' : 'No';
            } else if (col === 'rating') {
              formattedVal = val != null ? `${val}/5` : '';
            }

            setFocusedCellInfo(
              `${String.fromCharCode(65 + (e.node.displayIndex % 26))}${rowIdx}: ${displayName} = ${formattedVal}`,
            );
          }}
          onCellEditingStarted={() => setIsEditing(true)}
          onCellEditingStopped={() => setIsEditing(false)}
          containerStyle={{
            fontSize: 13,
          }}
        >
          <Toolbar
            rowCount={rowData.length}
            editCount={editCount}
            theme={theme}
            onThemeChange={setTheme}
            onAddRow={handleAddRow}
            onDeleteSelected={handleDeleteSelected}
          />
        </GridStorm>
      </div>

      {/* Formula Bar at bottom */}
      <FormulaBar
        focusedCellInfo={focusedCellInfo}
        isEditing={isEditing}
        rowCount={rowData.length}
        editCount={editCount}
      />

      {/* Global spreadsheet styles */}
      <style>{`
        /* Spreadsheet grid lines */
        .gs-cell {
          border-right: 1px solid #e5e7eb !important;
          border-bottom: 1px solid #e5e7eb !important;
        }
        .gs-header-cell {
          border-right: 1px solid #d1d5db !important;
          font-weight: 600 !important;
          font-size: 12px !important;
          text-transform: uppercase !important;
          letter-spacing: 0.3px !important;
          color: #374151 !important;
          background: #f3f4f6 !important;
        }
        /* Alternating rows */
        .gs-row:nth-child(even) .gs-cell {
          background-color: #fafbfc;
        }
        .gs-row:nth-child(odd) .gs-cell {
          background-color: #ffffff;
        }
        /* Compact row sizing */
        .gs-row {
          font-size: 13px;
        }
        /* Total column yellow tint */
        .gs-cell[data-col-id="total"] {
          background-color: #fefce8 !important;
        }
        /* Selection highlight */
        .gs-row.gs-row--selected .gs-cell {
          background-color: #eff6ff !important;
        }
        /* Focus ring on cells */
        .gs-cell:focus {
          outline: 2px solid #3b82f6;
          outline-offset: -2px;
          z-index: 1;
        }
        /* Dark theme overrides */
        [data-theme="dark"] .gs-header-cell {
          background: #1f2937 !important;
          color: #e5e7eb !important;
          border-color: #374151 !important;
        }
        [data-theme="dark"] .gs-cell {
          border-color: #374151 !important;
        }
        [data-theme="dark"] .gs-row:nth-child(even) .gs-cell {
          background-color: #111827;
        }
        [data-theme="dark"] .gs-row:nth-child(odd) .gs-cell {
          background-color: #1a1a2e;
        }
        [data-theme="dark"] .gs-row.gs-row--selected .gs-cell {
          background-color: #1e3a5f !important;
        }
      `}</style>
    </div>
  );
}

// ── Shared styles ──

const btnStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: 12,
  border: '1px solid #d1d5db',
  borderRadius: 4,
  background: '#fff',
  cursor: 'pointer',
  color: '#374151',
  fontWeight: 500,
};
