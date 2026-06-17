// © 2026 GridStorm Contributors — MIT License
//
// ─── Watermarks: REMOVED ───────────────────────────────────────────────────
//
// `createWatermark` and `removeWatermark` are kept as no-op stubs so that
// existing call sites in the open-source plugins (which used to inject a
// "GRIDSTORM UNLICENSED" overlay when a premium plugin loaded without a
// license) continue to compile and behave benignly.
//
// There is no commercial GridStorm tier. Every plugin is MIT.

/** No-op. Watermarks have been removed from the open-source build. */
export function createWatermark(_container: HTMLElement): void {
  // intentionally empty
}

/** No-op. Watermarks have been removed from the open-source build. */
export function removeWatermark(_container: HTMLElement): void {
  // intentionally empty
}
