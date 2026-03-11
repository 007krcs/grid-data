// ─── Grid API Store ───
// Lightweight store for the current GridApi reference.
// In Svelte 5, there is no provide/inject like Vue or React context.
// Instead, this module-level store allows any component to access the
// grid API after initialization. Call setGridApi from the onReady callback
// and getGridApi from anywhere in your component tree.

import type { GridApi } from '@gridstorm/core';

/** Module-level reference to the current grid API. */
let currentApi: GridApi | null = null;

/** Set of listeners notified when the API changes. */
const listeners = new Set<(api: GridApi | null) => void>();

/**
 * Set the current grid API reference.
 *
 * Call this from the `onReady` callback of `gridstormAction` to make
 * the API available to composable helper functions.
 *
 * @param api - The grid API instance, or `null` to clear it.
 */
export function setGridApi(api: GridApi | null): void {
  currentApi = api;
  listeners.forEach((fn) => fn(api));
}

/**
 * Get the current grid API reference.
 *
 * Returns `null` if the grid has not been initialized yet or has been destroyed.
 *
 * @typeParam TData - The type of each row data object.
 * @returns The current GridApi instance, or `null`.
 */
export function getGridApi<TData = any>(): GridApi<TData> | null {
  return currentApi as GridApi<TData> | null;
}

/**
 * Register a listener that is called whenever the grid API changes.
 *
 * @param listener - Callback invoked with the new API (or `null` on destroy).
 * @returns An unsubscribe function.
 */
export function onGridApiChange(
  listener: (api: GridApi | null) => void,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
