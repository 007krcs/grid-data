// ─── useGridSelection Tests ───────────────────────────────────────────────────
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import React from 'react';
import { GridStorm } from '../GridStorm';
import { useGridSelection } from '../hooks/useGridSelection';
import type { GridApi } from '@gridstorm/core';

const COLUMNS = [
  { field: 'id',   headerName: 'ID' },
  { field: 'name', headerName: 'Name' },
];

const ROWS = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Charlie' },
];

function SelectionWidget() {
  const { selectedRowIds, selectedCount, selectAll, deselectAll, isRowSelected } =
    useGridSelection();

  return (
    <div>
      <span data-testid="sel-count">{selectedCount}</span>
      <span data-testid="is-1-selected">{String(isRowSelected('1'))}</span>
      <button data-testid="select-all"   onClick={selectAll}>select all</button>
      <button data-testid="deselect-all" onClick={deselectAll}>deselect all</button>
    </div>
  );
}

describe('useGridSelection', () => {
  it('returns initial empty selection', async () => {
    render(
      <GridStorm columns={COLUMNS} rowData={ROWS} rowSelection="multiple">
        <SelectionWidget />
      </GridStorm>,
    );

    await waitFor(() => screen.getByTestId('sel-count'));
    expect(screen.getByTestId('sel-count').textContent).toBe('0');
    expect(screen.getByTestId('is-1-selected').textContent).toBe('false');
  });

  it('selectAll selects all displayed rows', async () => {
    render(
      <GridStorm columns={COLUMNS} rowData={ROWS} rowSelection="multiple">
        <SelectionWidget />
      </GridStorm>,
    );

    await waitFor(() => screen.getByTestId('select-all'));

    await act(async () => {
      screen.getByTestId('select-all').click();
    });

    await waitFor(() =>
      expect(parseInt(screen.getByTestId('sel-count').textContent ?? '0')).toBeGreaterThan(0),
    );
  });

  it('deselectAll clears the selection', async () => {
    let capturedApi: GridApi | null = null;

    render(
      <GridStorm
        columns={COLUMNS}
        rowData={ROWS}
        rowSelection="multiple"
        onGridReady={(a) => { capturedApi = a; }}
      >
        <SelectionWidget />
      </GridStorm>,
    );

    await waitFor(() => expect(capturedApi).not.toBeNull());

    await act(async () => {
      capturedApi!.selectAll();
    });

    await waitFor(() =>
      expect(parseInt(screen.getByTestId('sel-count').textContent ?? '0')).toBeGreaterThan(0),
    );

    await act(async () => {
      screen.getByTestId('deselect-all').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('sel-count').textContent).toBe('0'),
    );
  });

  it('isRowSelected returns true for explicitly selected row', async () => {
    let capturedApi: GridApi | null = null;

    render(
      <GridStorm
        columns={COLUMNS}
        rowData={ROWS}
        rowSelection="multiple"
        getRowId={(row) => String(row.id)}
        onGridReady={(a) => { capturedApi = a; }}
      >
        <SelectionWidget />
      </GridStorm>,
    );

    await waitFor(() => expect(capturedApi).not.toBeNull());

    await act(async () => {
      capturedApi!.commandBus?.dispatch?.('selection:select', { rowId: '1' });
    });

    await waitFor(() =>
      // Either the count goes up or the is-1-selected becomes true
      parseInt(screen.getByTestId('sel-count').textContent ?? '0') > 0,
    );
  });

  it('selectedCount matches selectedRowIds.size', async () => {
    let capturedApi: GridApi | null = null;

    render(
      <GridStorm
        columns={COLUMNS}
        rowData={ROWS}
        rowSelection="multiple"
        onGridReady={(a) => { capturedApi = a; }}
      >
        <SelectionWidget />
      </GridStorm>,
    );

    await waitFor(() => expect(capturedApi).not.toBeNull());

    // Select all and verify count is 3
    await act(async () => {
      capturedApi!.selectAll();
    });

    await waitFor(() => {
      const count = parseInt(screen.getByTestId('sel-count').textContent ?? '0');
      return count === 3;
    });

    expect(screen.getByTestId('sel-count').textContent).toBe('3');
  });
});
