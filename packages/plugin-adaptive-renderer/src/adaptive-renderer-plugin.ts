// ─── Adaptive Renderer Plugin ───
// Detects device capabilities and data characteristics to recommend
// and optionally apply optimal grid layout configurations.

import type { GridPlugin, PluginContext } from '@gridstorm/core';
import type {
  DeviceClass,
  DeviceProfile,
  DataProfile,
  LayoutMode,
  LayoutRecommendation,
  AdaptiveRendererOptions,
} from './types';

// ─── Device detection (SSR-safe) ───

export function detectDevice(breakpoints?: { mobile: number; tablet: number; desktop: number }): DeviceProfile {
  const bp = {
    mobile: breakpoints?.mobile ?? 640,
    tablet: breakpoints?.tablet ?? 1024,
    desktop: breakpoints?.desktop ?? 1440,
  };

  const w = typeof window !== 'undefined' ? window : null;
  const screen = w?.screen;
  const width = screen?.width ?? 1920;
  const height = screen?.height ?? 1080;
  const pixelRatio = w?.devicePixelRatio ?? 1;
  const hasTouch = w
    ? ('ontouchstart' in w || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0))
    : false;

  const mm = w != null && typeof w.matchMedia === 'function' ? w.matchMedia.bind(w) : null;
  const prefersReducedMotion = mm?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const prefersDark = mm?.('(prefers-color-scheme: dark)').matches ?? false;
  const prefersColorScheme: 'light' | 'dark' | 'no-preference' = prefersDark ? 'dark' : 'light';
  const prefersHighContrast = mm?.('(forced-colors: active)').matches ?? false;

  // Network info (experimental)
  const nav = w
    ? (navigator as unknown as { connection?: { effectiveType?: string } })
    : null;
  const effectiveType = nav?.connection?.effectiveType ?? 'unknown';
  const connectionSpeed: DeviceProfile['connectionSpeed'] =
    effectiveType === '4g'
      ? 'fast'
      : effectiveType === '3g'
      ? 'medium'
      : effectiveType === '2g' || effectiveType === 'slow-2g'
      ? 'slow'
      : 'unknown';

  const deviceClass: DeviceClass =
    width < bp.mobile
      ? 'mobile'
      : width < bp.tablet
      ? 'tablet'
      : width < bp.desktop
      ? 'desktop'
      : 'large-screen';

  return {
    deviceClass,
    screenWidth: width,
    screenHeight: height,
    pixelRatio,
    hasTouch,
    prefersReducedMotion,
    prefersColorScheme,
    prefersHighContrast,
    connectionSpeed,
  };
}

// ─── Recommendation engine ───

export function buildRecommendation(
  device: DeviceProfile,
  data: DataProfile,
  overrides?: Partial<LayoutRecommendation>,
): LayoutRecommendation {
  let mode: LayoutMode = 'normal';
  let rowHeight = 40;
  let headerHeight = 44;
  let fontSize = 14;
  let showPagination = false;
  let pageSize = 100;
  let virtualScrollThreshold = 500;
  const reasons: string[] = [];
  const columnsToHideOnMobile: string[] = [];

  if (device.deviceClass === 'mobile') {
    mode = data.columnCount > 5 ? 'card' : 'compact';
    rowHeight = 56; // larger touch targets
    fontSize = 13;
    showPagination = data.rowCount > 50;
    pageSize = 25;
    reasons.push('Mobile device detected');
  } else if (device.deviceClass === 'tablet') {
    mode = 'compact';
    rowHeight = 44;
    showPagination = data.rowCount > 200;
    reasons.push('Tablet device detected');
  }

  if (data.rowCount > 10000) {
    virtualScrollThreshold = 500;
    showPagination = true;
    pageSize = 100;
    reasons.push(`Large dataset (${data.rowCount} rows)`);
  }

  if (device.prefersReducedMotion) {
    reasons.push('Reduced motion preference respected');
  }

  if (device.prefersHighContrast) {
    reasons.push('High contrast mode active');
  }

  if (device.pixelRatio > 2) {
    reasons.push('High pixel density display');
  }

  return {
    mode,
    rowHeight,
    headerHeight,
    fontSize,
    showPagination,
    pageSize,
    virtualScrollThreshold,
    columnsToHideOnMobile,
    reason: reasons.length > 0 ? reasons.join('; ') : 'Default layout applied',
    confidence: 0.85,
    ...overrides,
  };
}

// ─── Plugin factory ───

export function AdaptiveRendererPlugin(options: AdaptiveRendererOptions = {}): GridPlugin {
  return {
    id: 'adaptive-renderer',
    name: 'Adaptive Renderer',
    version: '0.1.0',

    install(ctx: PluginContext) {
      const unsubscribers: Array<() => void> = [];

      const bus = ctx.eventBus as unknown as {
        emit: (event: string, payload: unknown) => void;
        on: (event: string, listener: (p: unknown) => void) => () => void;
      };

      let currentOptions: Required<Omit<AdaptiveRendererOptions, 'onRecommendation' | 'overrides'>> & {
        onRecommendation?: AdaptiveRendererOptions['onRecommendation'];
        overrides?: AdaptiveRendererOptions['overrides'];
      } = {
        autoApply: options.autoApply ?? false,
        breakpoints: options.breakpoints ?? { mobile: 640, tablet: 1024, desktop: 1440 },
        onRecommendation: options.onRecommendation,
        overrides: options.overrides,
      };

      let currentRecommendation: LayoutRecommendation | null = null;

      // ─── Helper: build data profile from API ───
      function buildDataProfile(): DataProfile {
        let rowCount = 0;
        ctx.api.forEachNode(() => { rowCount++; });
        const allColumns = ctx.api.getAllColumns();
        const columnCount = allColumns.length;
        return {
          rowCount,
          columnCount,
          hasNumericColumns: false,
          hasLongTextColumns: false,
          estimatedCellCount: rowCount * columnCount,
        };
      }

      // ─── Helper: run recalculation ───
      function recalculate(): void {
        const device = detectDevice(currentOptions.breakpoints);
        const data = buildDataProfile();
        const rec = buildRecommendation(device, data, currentOptions.overrides);
        currentRecommendation = rec;

        currentOptions.onRecommendation?.(rec);
        bus.emit('adaptive:recommendation', rec);

        if (currentOptions.autoApply) {
          bus.emit('adaptive:layout-applied', { recommendation: rec });
        }
      }

      // ─── adaptive:recalculate ───
      unsubscribers.push(
        ctx.commandBus.registerHandler('adaptive:recalculate', () => {
          recalculate();
        }),
      );

      // ─── adaptive:configure ───
      unsubscribers.push(
        ctx.commandBus.registerHandler('adaptive:configure', (payload: unknown) => {
          const p = payload as Partial<AdaptiveRendererOptions>;
          if (p.autoApply !== undefined) currentOptions.autoApply = p.autoApply;
          if (p.breakpoints) currentOptions.breakpoints = { ...currentOptions.breakpoints, ...p.breakpoints };
          if (p.onRecommendation) currentOptions.onRecommendation = p.onRecommendation;
          if (p.overrides) currentOptions.overrides = { ...currentOptions.overrides, ...p.overrides };
        }),
      );

      // ─── adaptive:get-device-profile ───
      unsubscribers.push(
        ctx.commandBus.registerHandler('adaptive:get-device-profile', () => {
          const device = detectDevice(currentOptions.breakpoints);
          bus.emit('adaptive:device-profiled', device);
        }),
      );

      // ─── adaptive:get-recommendation ───
      unsubscribers.push(
        ctx.commandBus.registerHandler('adaptive:get-recommendation', () => {
          if (currentRecommendation) {
            bus.emit('adaptive:recommendation', currentRecommendation);
          } else {
            recalculate();
          }
        }),
      );

      // ─── Window resize listener ───
      let resizeHandler: (() => void) | null = null;
      if (typeof window !== 'undefined') {
        resizeHandler = () => { recalculate(); };
        window.addEventListener('resize', resizeHandler);
      }

      return () => {
        for (const u of unsubscribers) u();
        if (resizeHandler && typeof window !== 'undefined') {
          window.removeEventListener('resize', resizeHandler);
        }
      };
    },
  };
}
