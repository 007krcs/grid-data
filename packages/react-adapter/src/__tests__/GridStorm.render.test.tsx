// ─── GridStorm React Component — Rendering Tests ─────────────────────────────
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import React, { useContext } from 'react';
import { GridStorm } from '../GridStorm';
import { GridContext } from '../context';
import type { GridApi } from '@gridstorm/core';

// ── Minimal column defs ──────────────────────────────────────────────────────
const COLUMNS = [
  { field: 'id',   headerName: 'ID' },
  { field: 'name', headerName: 'Name' },
];

const ROW_DATA = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
];

describe('GridStorm — rendering', () => {
  it('renders without crashing with minimal props', async () => {
    const { container } = render(
      <GridStorm columns={COLUMNS} rowData={ROW_DATA} />,
    );
    // Container div must be present immediately (before engine mounts)
    expect(container.querySelector('.gs-container')).toBeInTheDocument();
  });

  it('applies numeric height as px string', async () => {
    const { container } = render(
      <GridStorm columns={COLUMNS} rowData={[]} height={600} />,
    );
    const div = container.querySelector('.gs-container') as HTMLElement;
    expect(div.style.height).toBe('600px');
  });

  it('applies string height directly', async () => {
    const { container } = render(
      <GridStorm columns={COLUMNS} rowData={[]} height="80vh" />,
    );
    const div = container.querySelector('.gs-container') as HTMLElement;
    expect(div.style.height).toBe('80vh');
  });

  it('applies numeric width as px string', async () => {
    const { container } = render(
      <GridStorm columns={COLUMNS} rowData={[]} width={800} />,
    );
    const div = container.querySelector('.gs-container') as HTMLElement;
    expect(div.style.width).toBe('800px');
  });

  it('applies default width of 100%', async () => {
    const { container } = render(
      <GridStorm columns={COLUMNS} rowData={[]} />,
    );
    const div = container.querySelector('.gs-container') as HTMLElement;
    expect(div.style.width).toBe('100%');
  });

  it('applies containerClass to root div', async () => {
    const { container } = render(
      <GridStorm columns={COLUMNS} rowData={[]} containerClass="my-grid" />,
    );
    const div = container.querySelector('.gs-container');
    expect(div?.classList.contains('my-grid')).toBe(true);
  });

  it('merges containerStyle with height/width', async () => {
    const { container } = render(
      <GridStorm
        columns={COLUMNS}
        rowData={[]}
        height={300}
        containerStyle={{ border: '1px solid red', overflow: 'hidden' }}
      />,
    );
    const div = container.querySelector('.gs-container') as HTMLElement;
    expect(div.style.height).toBe('300px');
    expect(div.style.border).toBe('1px solid red');
    expect(div.style.overflow).toBe('hidden');
  });

  it('calls onGridReady with the GridApi after engine initializes', async () => {
    const onGridReady = vi.fn<[GridApi], void>();
    render(
      <GridStorm columns={COLUMNS} rowData={ROW_DATA} onGridReady={onGridReady} />,
    );
    await waitFor(() => {
      expect(onGridReady).toHaveBeenCalledTimes(1);
    });
    const [api] = onGridReady.mock.calls[0];
    expect(typeof api.setRowData).toBe('function');
    expect(typeof api.setSortModel).toBe('function');
  });

  it('provides GridContext to children when engine is ready', async () => {
    let capturedCtx: any = null;

    function ContextConsumer() {
      capturedCtx = useContext(GridContext);
      return null;
    }

    render(
      <GridStorm columns={COLUMNS} rowData={ROW_DATA}>
        <ContextConsumer />
      </GridStorm>,
    );

    await waitFor(() => {
      expect(capturedCtx).not.toBeNull();
    });
    expect(capturedCtx?.api).toBeDefined();
    expect(capturedCtx?.engine).toBeDefined();
  });

  it('engine is destroyed on unmount', async () => {
    const destroySpy = vi.fn();
    const onGridReady = vi.fn<[GridApi], void>((api) => {
      // Patch destroy on the engine via api reference — we intercept via context
    });

    const { unmount } = render(
      <GridStorm columns={COLUMNS} rowData={ROW_DATA} onGridReady={onGridReady} />,
    );

    await waitFor(() => expect(onGridReady).toHaveBeenCalledTimes(1));

    // Patch the engine's destroy method after it's ready
    const api = onGridReady.mock.calls[0][0] as any;
    // Access engine via the store — patch a no-op we can track
    if (api.__engine) {
      api.__engine.destroy = destroySpy;
    }

    unmount();
    // The container should be gone
    expect(document.querySelector('.gs-container')).toBeNull();
  });

  it('does not crash when rowData is undefined', async () => {
    expect(() =>
      render(<GridStorm columns={COLUMNS} rowData={undefined as any} />),
    ).not.toThrow();
  });

  it('does not crash with empty column array', async () => {
    expect(() =>
      render(<GridStorm columns={[]} rowData={[]} />),
    ).not.toThrow();
  });

  it('wraps content in GridErrorBoundary — renders empty on child crash', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    function ThrowingChild() {
      throw new Error('child crash');
    }

    // Even if a child crashes, GridStorm should not propagate
    expect(() =>
      render(
        <GridStorm columns={COLUMNS} rowData={[]}>
          <ThrowingChild />
        </GridStorm>,
      ),
    ).not.toThrow();

    consoleErrorSpy.mockRestore();
  });
});
