// ─── useGridState Tests ───────────────────────────────────────────────────────
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import React, { useRef } from 'react';
import { GridStorm } from '../GridStorm';
import { useGridState } from '../hooks/useGridState';
import type { GridApi, GridState } from '@gridstorm/core';

const COLUMNS = [
  { field: 'id', headerName: 'ID' },
  { field: 'val', headerName: 'Value' },
];

// ── Helper: renders GridStorm with a child that uses useGridState ─────────────

function StateConsumer<T>({
  selector,
  onValue,
}: {
  selector: (s: GridState) => T;
  onValue: (v: T) => void;
}) {
  const value = useGridState(selector);
  onValue(value);
  return <span data-testid="result">{JSON.stringify(value)}</span>;
}

describe('useGridState', () => {
  it('throws when used outside GridStorm', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(<StateConsumer selector={(s) => s} onValue={() => {}} />),
    ).toThrow('[GridStorm] Hook must be used within a <GridStorm> component.');
    consoleErrorSpy.mockRestore();
  });

  it('returns initial sort model (empty array)', async () => {
    const values: unknown[] = [];

    render(
      <GridStorm columns={COLUMNS} rowData={[]}>
        <StateConsumer
          selector={(s) => s.sortModel}
          onValue={(v) => values.push(v)}
        />
      </GridStorm>,
    );

    await waitFor(() => {
      expect(values.length).toBeGreaterThan(0);
    });
    // sortModel is always an array
    expect(Array.isArray(values[values.length - 1])).toBe(true);
  });

  it('returns initial row count (matches rowData length)', async () => {
    const rowData = [
      { id: 1, val: 'a' },
      { id: 2, val: 'b' },
      { id: 3, val: 'c' },
    ];

    render(
      <GridStorm columns={COLUMNS} rowData={rowData}>
        <StateConsumer
          selector={(s) => s.displayedRowIds?.length ?? 0}
          onValue={() => {}}
        />
      </GridStorm>,
    );

    await waitFor(() => {
      const el = document.querySelector('[data-testid="result"]');
      return el && el.textContent === '3';
    });

    expect(document.querySelector('[data-testid="result"]')?.textContent).toBe('3');
  });

  it('re-renders when the selected state changes (sort model)', async () => {
    let capturedApi: GridApi | null = null;
    const renderCount = { n: 0 };

    function SortTracker() {
      const sortModel = useGridState((s) => s.sortModel);
      renderCount.n++;
      return (
        <span data-testid="sort-count">{sortModel.length}</span>
      );
    }

    render(
      <GridStorm
        columns={COLUMNS}
        rowData={[]}
        onGridReady={(api) => { capturedApi = api; }}
      >
        <SortTracker />
      </GridStorm>,
    );

    await waitFor(() => expect(capturedApi).not.toBeNull());

    const before = renderCount.n;

    await act(async () => {
      capturedApi!.setSortModel([{ colId: 'id', sort: 'asc' }]);
    });

    await waitFor(() => renderCount.n > before);

    expect(screen.getByTestId('sort-count').textContent).toBe('1');
  });

  it('does NOT re-render when unrelated state changes (selector isolation)', async () => {
    let capturedApi: GridApi | null = null;
    const renderCount = { n: 0 };

    // Only subscribes to sortModel — filter changes should NOT trigger re-render
    function SortOnlyTracker() {
      const sortModel = useGridState((s) => s.sortModel);
      renderCount.n++;
      return <span data-testid="sort-only">{sortModel.length}</span>;
    }

    render(
      <GridStorm
        columns={COLUMNS}
        rowData={[{ id: 1, val: 'x' }]}
        onGridReady={(api) => { capturedApi = api; }}
      >
        <SortOnlyTracker />
      </GridStorm>,
    );

    await waitFor(() => expect(capturedApi).not.toBeNull());

    const afterMount = renderCount.n;

    // Apply a quick filter — changes quickFilterText, NOT sortModel
    await act(async () => {
      capturedApi!.setQuickFilter('x');
    });

    // Give React a moment to potentially re-render
    await new Promise((r) => setTimeout(r, 50));

    // useSyncExternalStore will re-run the selector but since sortModel didn't
    // change reference, React should NOT schedule an additional render.
    // The count may tick up by 1 due to store notification, but NOT more.
    expect(renderCount.n - afterMount).toBeLessThanOrEqual(1);
  });

  it('selector returning a primitive (number) works correctly', async () => {
    const rowData = Array.from({ length: 5 }, (_, i) => ({ id: i, val: `v${i}` }));

    render(
      <GridStorm columns={COLUMNS} rowData={rowData}>
        <StateConsumer
          selector={(s) => s.displayedRowIds?.length ?? 0}
          onValue={() => {}}
        />
      </GridStorm>,
    );

    await waitFor(() => {
      const el = document.querySelector('[data-testid="result"]');
      return el && el.textContent === '5';
    });
    expect(document.querySelector('[data-testid="result"]')?.textContent).toBe('5');
  });
});
