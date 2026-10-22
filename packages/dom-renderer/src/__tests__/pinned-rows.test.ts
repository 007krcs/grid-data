// ─── Pinned row rendering ───
// The row-pinning plugin keeps pinned rows in plugin state; the renderer must
// draw them in non-scrolling areas above/below the body viewport.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createGrid } from '@gridstorm/core';
import type { GridEngine } from '@gridstorm/core';
import { DomRenderer } from '../renderer';
import { SelectionPlugin } from '../../../plugin-selection/src/selection-plugin';
import { RowPinningPlugin } from '../../../plugin-row-pinning/src/row-pinning-plugin';

interface Row {
  id: string;
  name: string;
  salary: number;
}

const COLUMNS = [
  { field: 'name' as const, headerName: 'Name', width: 150 },
  { field: 'salary' as const, headerName: 'Salary', width: 100 },
];

const DATA: Row[] = [
  { id: 'r1', name: 'Alice', salary: 100 },
  { id: 'r2', name: 'Bob', salary: 200 },
  { id: 'r3', name: 'Cara', salary: 300 },
];

const flush = () => new Promise<void>((r) => queueMicrotask(r));

describe('DomRenderer pinned rows', () => {
  let container: HTMLElement;
  let engine: GridEngine<Row>;
  let renderer: DomRenderer;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    engine = createGrid<Row>({
      columns: COLUMNS,
      rowData: DATA,
      getRowId: (p) => p.data.id,
      plugins: [
        SelectionPlugin({ mode: 'multiple' }),
        RowPinningPlugin({
          pinnedTopRowData: [{ id: 'totals', name: 'TOTALS', salary: 600 }],
        }),
      ],
    });
    renderer = new DomRenderer({ container, engine });
    renderer.mount();
  });

  afterEach(() => {
    renderer.destroy();
    engine.destroy();
    container.remove();
  });

  it('renders declarative pinnedTopRowData outside the scroll viewport', () => {
    const top = container.querySelector('.gs-pinned-top') as HTMLElement;
    expect(top).not.toBeNull();
    expect(top.style.display).not.toBe('none');
    expect(top.getAttribute('role')).toBe('rowgroup');

    const rows = top.querySelectorAll('[role="row"]');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.getAttribute('data-row-pinned')).toBe('top');
    expect(rows[0]!.classList.contains('gs-row-pinned')).toBe(true);
    expect(rows[0]!.textContent).toContain('TOTALS');
    expect(rows[0]!.textContent).toContain('600');

    // Not inside the scrolling body, and the body still shows the 3 data rows.
    expect(container.querySelector('.gs-body-viewport .gs-row-pinned')).toBeNull();
    expect(container.querySelectorAll('.gs-body [role="row"][data-row-id]')).toHaveLength(3);
    // Bottom area is hidden when empty.
    expect((container.querySelector('.gs-pinned-bottom') as HTMLElement).style.display).toBe('none');
  });

  it('renders rows pinned by command to the bottom area and removes them on unpinAll', async () => {
    engine.commandBus.dispatch('rowPinning:pinBottom', { rowIds: ['r2'] });
    await flush();

    const bottom = container.querySelector('.gs-pinned-bottom') as HTMLElement;
    expect(bottom.style.display).not.toBe('none');
    const rows = bottom.querySelectorAll('[role="row"]');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.getAttribute('data-row-id')).toBe('r2');
    expect(rows[0]!.textContent).toContain('Bob');

    engine.commandBus.dispatch('rowPinning:unpinAll', {});
    await flush();
    expect(bottom.querySelectorAll('[role="row"]')).toHaveLength(0);
    expect(bottom.style.display).toBe('none');
    expect((container.querySelector('.gs-pinned-top') as HTMLElement).querySelectorAll('[role="row"]')).toHaveLength(0);
  });

  it('keeps pinned rows in place while the body sorts', async () => {
    engine.api.setSortModel([{ colId: 'name', sort: 'desc' }]);
    await flush();
    const top = container.querySelector('.gs-pinned-top') as HTMLElement;
    expect(top.querySelectorAll('[role="row"]')).toHaveLength(1);
    expect(top.textContent).toContain('TOTALS');
    // Body rows are absolutely positioned and recycled in place, so DOM order
    // is not display order: the topmost row is the one at top: 0px.
    const bodyRows = [...container.querySelectorAll<HTMLElement>('.gs-body [role="row"][data-row-id]')];
    const topmost = bodyRows.find((r) => r.style.top === '0px');
    expect(topmost?.textContent).toContain('Cara');
  });
});
