// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── Grid Event Subscription ───
// Provides a helper to subscribe to grid events from Svelte components.

import type { GridEventMap } from '@gridstorm/core';
import { getGridApi } from './useGridApi';

/**
 * Subscribe to a grid event by name.
 *
 * Returns an unsubscribe function. If the grid has not been initialized yet,
 * returns a no-op unsubscribe function.
 *
 * In Svelte 5, call this inside `$effect` or `onMount` and clean up
 * the subscription in the effect's cleanup or `onDestroy`.
 *
 * @typeParam K - The event key from GridEventMap.
 * @param event - The event name to listen for.
 * @param callback - Callback invoked when the event fires.
 * @returns An unsubscribe function.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { onMount, onDestroy } from 'svelte';
 *   import { subscribeToGridEvent } from '@gridstorm/svelte';
 *
 *   let unsub: () => void;
 *   onMount(() => {
 *     unsub = subscribeToGridEvent('selection:changed', (e) => {
 *       console.log('Selection changed:', e);
 *     });
 *   });
 *   onDestroy(() => unsub?.());
 * </script>
 * ```
 */
export function subscribeToGridEvent<K extends string & keyof GridEventMap>(
  event: K,
  callback: (payload: GridEventMap[K]) => void,
): () => void {
  const api = getGridApi();
  if (!api) return () => {};

  // Access the engine's event bus through the API's addEventListener
  api.addEventListener(event as any, callback as any);

  return () => {
    api.removeEventListener(event as any, callback as any);
  };
}
