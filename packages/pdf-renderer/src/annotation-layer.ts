// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Annotation Layer ───
//
// DOM overlay layer for rendering interactive annotations.
// Annotation renderers will be provided by @gridstorm/pdf-plugin-annotations.

import type { PdfAnnotation, PdfRect } from '@gridstorm/pdf-core';
import type { PageViewport } from './viewport';

/** Annotation renderer callback registered by annotation plugins. */
export type AnnotationRendererFn = (
  annotation: PdfAnnotation,
  container: HTMLElement,
  viewport: PageViewport,
) => HTMLElement | null;

/** Manages the annotation overlay layer for a single page. */
export class AnnotationLayer {
  private classPrefix: string;
  private renderers = new Map<string, AnnotationRendererFn>();
  private elements = new Map<string, HTMLElement>();

  constructor(classPrefix = 'gs-pdf') {
    this.classPrefix = classPrefix;
  }

  /** Register a renderer for an annotation type. */
  registerRenderer(type: string, renderer: AnnotationRendererFn): void {
    this.renderers.set(type, renderer);
  }

  /** Render annotations into the layer container. */
  render(
    container: HTMLDivElement,
    annotations: PdfAnnotation[],
    viewport: PageViewport,
    selectedIds: string[],
  ): void {
    // Remove annotations that no longer exist
    for (const [id, el] of this.elements) {
      if (!annotations.find((a) => a.id === id)) {
        el.remove();
        this.elements.delete(id);
      }
    }

    for (const annotation of annotations) {
      const renderer = this.renderers.get(annotation.type);

      // Remove old element if exists
      const existing = this.elements.get(annotation.id);
      if (existing) {
        existing.remove();
        this.elements.delete(annotation.id);
      }

      if (renderer) {
        // Delegate to plugin renderer
        const el = renderer(annotation, container, viewport);
        if (el) {
          if (selectedIds.includes(annotation.id)) {
            el.classList.add(`${this.classPrefix}-annotation-selected`);
          }
          this.elements.set(annotation.id, el);
        }
      } else {
        // Default: simple rectangle outline
        const el = this.renderDefault(annotation, viewport);
        if (selectedIds.includes(annotation.id)) {
          el.classList.add(`${this.classPrefix}-annotation-selected`);
        }
        container.appendChild(el);
        this.elements.set(annotation.id, el);
      }
    }
  }

  /** Clear all rendered annotations. */
  clear(): void {
    for (const el of this.elements.values()) {
      el.remove();
    }
    this.elements.clear();
  }

  /** Default annotation renderer: colored rectangle. */
  private renderDefault(
    annotation: PdfAnnotation,
    viewport: PageViewport,
  ): HTMLElement {
    const el = document.createElement('div');
    el.className = `${this.classPrefix}-annotation ${this.classPrefix}-annotation-${annotation.type}`;
    el.dataset.annotationId = annotation.id;

    this.positionElement(el, annotation.rect, viewport);

    const { r, g, b, a } = annotation.color;
    el.style.borderColor = `rgba(${r}, ${g}, ${b}, ${a})`;
    el.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${a * 0.2})`;
    el.style.borderWidth = `${annotation.borderWidth}px`;
    el.style.borderStyle = 'solid';
    el.style.opacity = String(annotation.opacity);
    el.style.cursor = 'pointer';
    el.style.boxSizing = 'border-box';

    return el;
  }

  private positionElement(
    el: HTMLElement,
    rect: PdfRect,
    viewport: PageViewport,
  ): void {
    const cssUnits = 96 / 72;
    const zoom = viewport.scale / (typeof window !== 'undefined' ? window.devicePixelRatio : 1) / cssUnits;

    const [x1, y1, x2, y2] = rect;
    el.style.position = 'absolute';
    el.style.left = `${x1 * zoom * cssUnits}px`;
    el.style.top = `${y1 * zoom * cssUnits}px`;
    el.style.width = `${(x2 - x1) * zoom * cssUnits}px`;
    el.style.height = `${(y2 - y1) * zoom * cssUnits}px`;
  }

  destroy(): void {
    this.clear();
    this.renderers.clear();
  }
}
