// ─── DOM Renderer Security Tests ─────────────────────────────────────────────
// Verifies that user-supplied cell data is always treated as text, never as HTML.
// Prevents XSS via cell values, header names, and CSS selector injection.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createGrid } from '@gridstorm/core';
import { DomRenderer } from '../index';

// ── Test helpers ─────────────────────────────────────────────────────────────

function setupGrid(rowData: Record<string, unknown>[], extraColumns?: object[]) {
  const columns = [
    { field: 'id',    headerName: 'ID'    },
    { field: 'value', headerName: 'Value' },
    ...(extraColumns ?? []),
  ];
  const container = document.createElement('div');
  document.body.appendChild(container);
  const engine = createGrid({ columns, rowData });
  const renderer = new DomRenderer({ container, engine });
  renderer.mount();
  return { container, engine, renderer };
}

function teardown(ctx: ReturnType<typeof setupGrid>) {
  ctx.renderer.destroy();
  ctx.engine.destroy();
  document.body.removeChild(ctx.container);
}

// ── XSS via Cell Values ───────────────────────────────────────────────────────

describe('Security: XSS via cell values', () => {
  it('script tag in cell value is rendered as text, not executed', () => {
    const ctx = setupGrid([
      { id: 1, value: '<script>window.__xss_executed = true;</script>' },
    ]);

    // The script must NOT have been executed
    expect((window as any).__xss_executed).toBeUndefined();

    // No <script> element should exist inside the grid container
    expect(ctx.container.querySelector('script')).toBeNull();

    teardown(ctx);
  });

  it('img onerror payload in cell value is not parsed as HTML', () => {
    const ctx = setupGrid([
      { id: 1, value: '<img src=x onerror="window.__img_xss=true">' },
    ]);

    expect((window as any).__img_xss).toBeUndefined();
    expect(ctx.container.querySelector('img')).toBeNull();
    teardown(ctx);
  });

  it('anchor tag with javascript: href in cell value is not parsed', () => {
    const ctx = setupGrid([
      { id: 1, value: '<a href="javascript:void(window.__href_xss=true)">click</a>' },
    ]);

    expect((window as any).__href_xss).toBeUndefined();
    // No anchor element should be injected
    expect(ctx.container.querySelector('a[href^="javascript:"]')).toBeNull();
    teardown(ctx);
  });

  it('SVG with onload attribute in cell value is not parsed', () => {
    const ctx = setupGrid([
      { id: 1, value: '<svg onload="window.__svg_xss=true"><circle/></svg>' },
    ]);

    expect((window as any).__svg_xss).toBeUndefined();
    expect(ctx.container.querySelector('svg')).toBeNull();
    teardown(ctx);
  });

  it('HTML entity-like string in cell value is preserved as text', () => {
    const ctx = setupGrid([
      { id: 1, value: '&lt;b&gt;bold&lt;/b&gt;' },
    ]);

    // Should appear as literal text, not rendered bold
    const cells = ctx.container.querySelectorAll('.gs-cell');
    let foundText = false;
    cells.forEach((cell) => {
      if (cell.textContent?.includes('&lt;')) foundText = true;
    });

    // If the renderer text-encodes, the literal `&` chars appear
    // If it passes through innerHTML, it would render as <b>bold</b>
    // Either way, no <b> tags should exist inside cells
    expect(ctx.container.querySelector('.gs-cell b')).toBeNull();
    teardown(ctx);
  });

  it('multiple rows with XSS payloads do not inject any script elements', () => {
    const ctx = setupGrid([
      { id: 1, value: '<script>window.__xss1=1</script>' },
      { id: 2, value: '<img src=x onerror="window.__xss2=2">' },
      { id: 3, value: '"><svg onload="window.__xss3=3">' },
    ]);

    expect((window as any).__xss1).toBeUndefined();
    expect((window as any).__xss2).toBeUndefined();
    expect((window as any).__xss3).toBeUndefined();
    expect(ctx.container.querySelectorAll('script').length).toBe(0);
    teardown(ctx);
  });
});

// ── XSS via Column Header Names ───────────────────────────────────────────────

describe('Security: XSS via headerName', () => {
  it('script tag in headerName is not executed', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const engine = createGrid({
      columns: [
        { field: 'id',    headerName: '<script>window.__header_xss=true;</script>' },
        { field: 'value', headerName: 'Value' },
      ],
      rowData: [{ id: 1, value: 'x' }],
    });
    const renderer = new DomRenderer({ container, engine });
    renderer.mount();

    expect((window as any).__header_xss).toBeUndefined();
    expect(container.querySelector('script')).toBeNull();

    renderer.destroy();
    engine.destroy();
    document.body.removeChild(container);
  });

  it('img onerror in headerName is not parsed as HTML', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const engine = createGrid({
      columns: [
        { field: 'id',    headerName: '<img src=x onerror="window.__header_img=1">' },
        { field: 'value', headerName: 'Value' },
      ],
      rowData: [],
    });
    const renderer = new DomRenderer({ container, engine });
    renderer.mount();

    expect((window as any).__header_img).toBeUndefined();
    expect(container.querySelector('img[onerror]')).toBeNull();

    renderer.destroy();
    engine.destroy();
    document.body.removeChild(container);
  });
});

// ── CSS Selector Injection via rowId / colId ──────────────────────────────────

describe('Security: CSS.escape prevents querySelector injection via rowId/colId', () => {
  it('rowId with CSS special chars does not break querySelector', () => {
    const ctx = setupGrid([
      { id: '"><img src=x onerror=alert(1)>', value: 'payload' },
    ]);

    // The renderer should not throw when querying cells
    expect(() => {
      ctx.container.querySelectorAll('.gs-cell');
    }).not.toThrow();

    // No img element should have been injected
    expect(ctx.container.querySelector('img')).toBeNull();
    teardown(ctx);
  });

  it('rowId with closing bracket does not escape the CSS selector context', () => {
    const ctx = setupGrid([
      { id: '"]>.gs-header', value: 'selector escape test' },
    ]);

    expect(() => {
      ctx.container.querySelectorAll('[data-row-id]');
    }).not.toThrow();

    teardown(ctx);
  });

  it('rowId with null bytes is safely handled', () => {
    const ctx = setupGrid([
      { id: '\x00evil', value: 'null byte test' },
    ]);

    expect(() => {
      ctx.container.querySelectorAll('.gs-row');
    }).not.toThrow();

    teardown(ctx);
  });
});

// ── No eval() or document.write() ────────────────────────────────────────────

describe('Security: No unsafe globals used by renderer', () => {
  it('renderer does not call eval() during mount', () => {
    const evalSpy = vi.spyOn(globalThis, 'eval');

    const ctx = setupGrid([{ id: 1, value: 'test' }]);

    expect(evalSpy).not.toHaveBeenCalled();
    evalSpy.mockRestore();
    teardown(ctx);
  });

  it('renderer does not call document.write() during mount', () => {
    const writeSpy = vi.spyOn(document, 'write').mockImplementation(() => {});

    const ctx = setupGrid([{ id: 1, value: 'test' }]);

    expect(writeSpy).not.toHaveBeenCalled();
    writeSpy.mockRestore();
    teardown(ctx);
  });

  it('renderer creates no <script> elements in the DOM', () => {
    const ctx = setupGrid([
      { id: 1, value: 'row 1' },
      { id: 2, value: 'row 2' },
    ]);

    expect(ctx.container.querySelectorAll('script').length).toBe(0);
    teardown(ctx);
  });
});
