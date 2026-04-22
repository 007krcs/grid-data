// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Zoom Manager ───

import { clampZoom } from './viewport';

/** Configuration for the zoom manager. */
export interface ZoomManagerConfig {
  /** The element to listen for wheel events on. */
  viewport: HTMLElement;
  /** Callback when zoom changes. */
  onZoomChange: (zoom: number) => void;
  /** Get the current zoom level. */
  getZoom: () => number;
  /** Zoom step for discrete zoom changes. */
  zoomStep?: number;
  /** Whether Ctrl+wheel zooming is enabled. */
  enableWheelZoom?: boolean;
}

/** Preset zoom levels for step-based zooming. */
export const ZOOM_PRESETS = [
  0.25, 0.33, 0.5, 0.67, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0,
  2.5, 3.0, 4.0, 5.0,
];

/** Manages zoom interactions for the PDF viewer. */
export class ZoomManager {
  private viewport: HTMLElement;
  private onZoomChange: (zoom: number) => void;
  private getZoom: () => number;
  private enableWheelZoom: boolean;
  private handleWheelBound: (e: WheelEvent) => void;

  constructor(config: ZoomManagerConfig) {
    this.viewport = config.viewport;
    this.onZoomChange = config.onZoomChange;
    this.getZoom = config.getZoom;
    this.enableWheelZoom = config.enableWheelZoom ?? true;

    this.handleWheelBound = this.handleWheel.bind(this);
    if (this.enableWheelZoom) {
      this.viewport.addEventListener('wheel', this.handleWheelBound, {
        passive: false,
      });
    }
  }

  /** Zoom in to next preset level. */
  zoomIn(): void {
    const current = this.getZoom();
    const next = ZOOM_PRESETS.find((z) => z > current + 0.001);
    this.onZoomChange(clampZoom(next ?? current * 1.25));
  }

  /** Zoom out to previous preset level. */
  zoomOut(): void {
    const current = this.getZoom();
    const prev = [...ZOOM_PRESETS].reverse().find((z) => z < current - 0.001);
    this.onZoomChange(clampZoom(prev ?? current * 0.8));
  }

  /** Zoom to fit page width within container. */
  zoomToFitWidth(pageWidth: number, containerWidth: number): void {
    const cssUnits = 96 / 72;
    const zoom = containerWidth / (pageWidth * cssUnits);
    this.onZoomChange(clampZoom(zoom));
  }

  /** Zoom to fit full page within container. */
  zoomToFitPage(
    pageWidth: number,
    pageHeight: number,
    containerWidth: number,
    containerHeight: number,
  ): void {
    const cssUnits = 96 / 72;
    const zoomW = containerWidth / (pageWidth * cssUnits);
    const zoomH = containerHeight / (pageHeight * cssUnits);
    this.onZoomChange(clampZoom(Math.min(zoomW, zoomH)));
  }

  /** Set exact zoom level. */
  setZoom(zoom: number): void {
    this.onZoomChange(clampZoom(zoom));
  }

  private handleWheel(e: WheelEvent): void {
    if (!e.ctrlKey && !e.metaKey) return;

    e.preventDefault();
    const current = this.getZoom();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = clampZoom(current + delta * current);
    this.onZoomChange(newZoom);
  }

  destroy(): void {
    this.viewport.removeEventListener('wheel', this.handleWheelBound);
  }
}
