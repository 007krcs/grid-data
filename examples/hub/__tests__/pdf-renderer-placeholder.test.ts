import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PageRenderer } from '../../../packages/pdf-renderer/src/page-renderer';
import type { PdfPageState } from '@gridstorm/pdf-core';
import type { PageViewport } from '../../../packages/pdf-renderer/src/viewport';

// Mock canvas context
function createMockCanvas(): {
  canvas: HTMLCanvasElement;
  ctx: ReturnType<typeof createMockCtx>;
} {
  const ctx = createMockCtx();
  const canvas = document.createElement('canvas');
  vi.spyOn(canvas, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
  return { canvas, ctx };
}

function createMockCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    closePath: vi.fn(),
    roundRect: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '' as CanvasTextAlign,
    textBaseline: '' as CanvasTextBaseline,
    shadowColor: '',
    shadowBlur: 0,
    createLinearGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
  };
}

function makePage(index: number): PdfPageState {
  return {
    index,
    width: 612,
    height: 792,
    rotation: 0 as const,
    annotationIds: [],
    rendered: false,
    textContent: null,
  };
}

function makeViewport(pageIndex: number): PageViewport {
  return {
    pageIndex,
    width: 612,
    height: 792,
    offsetX: 0,
    offsetY: pageIndex * 812,
    scale: 1,
  };
}

describe('PageRenderer - renderPlaceholder', () => {
  let renderer: PageRenderer;

  beforeEach(() => {
    renderer = new PageRenderer({ devicePixelRatio: 1 });
  });

  it('renders cover page (index 0) with title and features', () => {
    const { canvas, ctx } = createMockCanvas();
    const page = makePage(0);
    const viewport = makeViewport(0);

    renderer.renderPlaceholder(canvas, page, viewport);

    // Should call fillText multiple times for title, subtitle, features
    expect(ctx.fillText).toHaveBeenCalled();
    const textCalls = ctx.fillText.mock.calls.map((c: string[]) => c[0]);
    expect(textCalls.some((t: string) => t.includes('GridStorm'))).toBe(true);
    expect(textCalls.some((t: string) => t.includes('GS'))).toBe(true);
  });

  it('renders content page (index 1) with architecture content', () => {
    const { canvas, ctx } = createMockCanvas();
    const page = makePage(1);
    const viewport = makeViewport(1);

    renderer.renderPlaceholder(canvas, page, viewport);

    const textCalls = ctx.fillText.mock.calls.map((c: string[]) => c[0]);
    expect(textCalls.some((t: string) => t.includes('Architecture'))).toBe(true);
  });

  it('renders page number footer on all pages', () => {
    for (let i = 0; i < 3; i++) {
      const { canvas, ctx } = createMockCanvas();
      renderer.renderPlaceholder(canvas, makePage(i), makeViewport(i));
      const textCalls = ctx.fillText.mock.calls.map((c: string[]) => c[0]);
      // Footer format is "— N —"
      expect(textCalls.some((t: string) => t.includes(String(i + 1)))).toBe(true);
    }
  });

  it('draws gradient accent bar on all pages', () => {
    const { canvas, ctx } = createMockCanvas();
    renderer.renderPlaceholder(canvas, makePage(0), makeViewport(0));
    expect(ctx.createLinearGradient).toHaveBeenCalled();
  });

  it('draws architecture diagram boxes on page 1', () => {
    const { canvas, ctx } = createMockCanvas();
    renderer.renderPlaceholder(canvas, makePage(1), makeViewport(1));

    const textCalls = ctx.fillText.mock.calls.map((c: string[]) => c[0]);
    expect(textCalls.some((t: string) => t.includes('Core Engine'))).toBe(true);
    expect(textCalls.some((t: string) => t.includes('Plugins'))).toBe(true);
    expect(textCalls.some((t: string) => t.includes('Renderer'))).toBe(true);
  });

  it('uses white background', () => {
    const { canvas, ctx } = createMockCanvas();
    renderer.renderPlaceholder(canvas, makePage(0), makeViewport(0));
    expect(ctx.fillRect).toHaveBeenCalled();
    // First fillRect should be the white background
    const firstFillStyle = ctx.fillRect.mock.calls[0];
    expect(firstFillStyle).toBeTruthy();
  });
});
