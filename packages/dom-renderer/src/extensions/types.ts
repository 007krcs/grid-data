// ─── Renderer Extension Types ───
// Defines the interface for modular renderer features.
// Each extension can mount DOM, update on state change, and clean up.

import type { GridEngine, GridState, GridApi, ColumnState } from '@gridstorm/core';

/**
 * Shared context provided to all renderer extensions.
 * Gives extensions access to the engine, DOM elements, config, and helpers.
 */
export interface RendererContext {
  /** Grid engine instance. */
  engine: GridEngine;
  /** CSS class prefix (default: 'gs'). */
  prefix: string;
  /** The root .gs-root element. */
  root: HTMLElement;
  /** The .gs-header container element. */
  headerContainer: HTMLElement;
  /** The .gs-body-viewport element. */
  bodyViewport: HTMLElement;
  /** The wrapper element (root > wrapper). */
  wrapper: HTMLElement;
  /** Current grid state (snapshot). */
  getState: () => GridState;
  /** Grid API. */
  api: GridApi;
  /** Get visible columns for rendering (accounts for pinning + virtualization). */
  getVisibleColumns: (scrollLeft: number) => { columns: ColumnState[] };
  /** Whether checkbox selection is enabled. */
  checkboxSelection: boolean;
  /** Width of the checkbox column. */
  checkboxColumnWidth: number;
  /** Utility: create an element with class. */
  el: (tag: string, className: string) => HTMLElement;
}

/**
 * A renderer extension that adds a feature to the grid DOM.
 * Extensions are modular — each owns its DOM slice and lifecycle.
 */
export interface RendererExtension {
  /** Unique extension identifier. */
  id: string;

  /**
   * Mount the extension's DOM into the grid.
   * Called once during DomRenderer.mount().
   */
  mount(ctx: RendererContext): void;

  /**
   * Update the extension when grid state changes.
   * Called on every relevant state change.
   */
  update(ctx: RendererContext): void;

  /**
   * Clean up DOM and listeners.
   * Called during DomRenderer.destroy().
   */
  destroy(): void;
}
