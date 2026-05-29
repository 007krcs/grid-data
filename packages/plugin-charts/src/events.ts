// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// Declaration-merging augmentation for `@gridstorm/core`'s `GridEventMap`.
// Importing this file (which the plugin entry point does automatically)
// registers the plugin's custom event names + payload shapes with the
// global event-map type so `eventBus.emit('charts:rendered', …)` and
// `api.addEventListener('charts:rendered', …)` are both fully typed.

import '@gridstorm/core';

declare module '@gridstorm/core' {
  interface GridEventMap<TData> {
    /** Fired after a chart is created or re-rendered via `charts:create`. */
    'charts:rendered': { chartId: string };
  }
}

export {};
