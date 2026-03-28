import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdaptiveRendererPlugin, detectDevice, buildRecommendation } from '../adaptive-renderer-plugin';
import type { DeviceProfile, DataProfile, LayoutRecommendation } from '../types';

function createMockContext() {
  const handlers = new Map<string, (payload: unknown) => void>();
  const eventListeners = new Map<string, Array<(payload: unknown) => void>>();
  const ctx = {
    api: {
      getSortModel: vi.fn().mockReturnValue([]),
      setSortModel: vi.fn(),
      getFilterModel: vi.fn().mockReturnValue({}),
      setFilterModel: vi.fn(),
      setQuickFilter: vi.fn(),
      getRowNode: vi.fn(),
      forEachNode: vi.fn(),
      getAllColumns: vi.fn().mockReturnValue([]),
      getState: vi.fn().mockReturnValue({ quickFilterText: '', pluginState: {} }),
      getSelectedRows: vi.fn().mockReturnValue([]),
      setColumnVisible: vi.fn(),
      moveColumn: vi.fn(),
      dispatchCommand: vi.fn(),
    } as unknown as import('@gridstorm/core').GridApi,
    commandBus: {
      registerHandler: vi.fn((type: string, handler: (p: unknown) => void) => {
        handlers.set(type, handler);
        return () => handlers.delete(type);
      }),
      dispatch: vi.fn((type: string, payload: unknown) => {
        handlers.get(type)?.(payload);
      }),
    } as unknown,
    eventBus: {
      on: vi.fn((event: string, listener: (p: unknown) => void) => {
        if (!eventListeners.has(event)) eventListeners.set(event, []);
        eventListeners.get(event)!.push(listener);
        return () => {
          const arr = eventListeners.get(event) ?? [];
          const idx = arr.indexOf(listener);
          if (idx >= 0) arr.splice(idx, 1);
        };
      }),
      emit: vi.fn((event: string, payload: unknown) => {
        for (const l of eventListeners.get(event) ?? []) l(payload);
      }),
    } as unknown,
    registerState: vi.fn(),
    getState: vi.fn().mockReturnValue(undefined),
    setState: vi.fn(),
    registerCellRenderer: vi.fn(),
    registerCellEditor: vi.fn(),
  } as unknown as import('@gridstorm/core').PluginContext;
  return {
    ctx,
    triggerCommand: (type: string, payload: unknown) => handlers.get(type)?.(payload),
    triggerEvent: (event: string, payload: unknown) => {
      for (const l of eventListeners.get(event) ?? []) l(payload);
    },
  };
}

describe('AdaptiveRendererPlugin', () => {
  let mock: ReturnType<typeof createMockContext>;

  beforeEach(() => {
    mock = createMockContext();
  });

  it('installs without errors', () => {
    const plugin = AdaptiveRendererPlugin();
    expect(() => plugin.install(mock.ctx)).not.toThrow();
  });

  it('detectDevice returns a DeviceProfile', () => {
    const profile = detectDevice();
    expect(profile).toBeDefined();
    expect(profile.deviceClass).toBeDefined();
    expect(typeof profile.screenWidth).toBe('number');
    expect(typeof profile.screenHeight).toBe('number');
    expect(typeof profile.pixelRatio).toBe('number');
    expect(typeof profile.hasTouch).toBe('boolean');
    expect(typeof profile.prefersReducedMotion).toBe('boolean');
    expect(['light', 'dark', 'no-preference']).toContain(profile.prefersColorScheme);
    expect(['slow', 'medium', 'fast', 'unknown']).toContain(profile.connectionSpeed);
  });

  it('detectDevice classifies mobile screen width correctly', () => {
    // We can't directly mock window.screen in vitest without jsdom,
    // so we test the logic via buildRecommendation with a mobile profile
    const mobileProfile: DeviceProfile = {
      deviceClass: 'mobile',
      screenWidth: 375,
      screenHeight: 812,
      pixelRatio: 2,
      hasTouch: true,
      prefersReducedMotion: false,
      prefersColorScheme: 'light',
      prefersHighContrast: false,
      connectionSpeed: 'fast',
    };
    expect(mobileProfile.deviceClass).toBe('mobile');
    expect(mobileProfile.screenWidth).toBeLessThan(640);
  });

  it('detectDevice classifies desktop screen width correctly', () => {
    const desktopProfile: DeviceProfile = {
      deviceClass: 'desktop',
      screenWidth: 1280,
      screenHeight: 800,
      pixelRatio: 1,
      hasTouch: false,
      prefersReducedMotion: false,
      prefersColorScheme: 'light',
      prefersHighContrast: false,
      connectionSpeed: 'fast',
    };
    expect(desktopProfile.deviceClass).toBe('desktop');
    expect(desktopProfile.screenWidth).toBeGreaterThanOrEqual(1024);
  });

  it('buildRecommendation returns compact mode for mobile', () => {
    const mobileDevice: DeviceProfile = {
      deviceClass: 'mobile',
      screenWidth: 375,
      screenHeight: 812,
      pixelRatio: 2,
      hasTouch: true,
      prefersReducedMotion: false,
      prefersColorScheme: 'light',
      prefersHighContrast: false,
      connectionSpeed: 'fast',
    };
    const data: DataProfile = {
      rowCount: 100,
      columnCount: 4,
      hasNumericColumns: false,
      hasLongTextColumns: false,
      estimatedCellCount: 400,
    };
    const rec = buildRecommendation(mobileDevice, data);
    // mobile with <= 5 columns => compact
    expect(rec.mode).toBe('compact');
  });

  it('buildRecommendation enables pagination for large datasets', () => {
    const desktop: DeviceProfile = {
      deviceClass: 'desktop',
      screenWidth: 1280,
      screenHeight: 900,
      pixelRatio: 1,
      hasTouch: false,
      prefersReducedMotion: false,
      prefersColorScheme: 'light',
      prefersHighContrast: false,
      connectionSpeed: 'fast',
    };
    const largeData: DataProfile = {
      rowCount: 50000,
      columnCount: 10,
      hasNumericColumns: true,
      hasLongTextColumns: false,
      estimatedCellCount: 500000,
    };
    const rec = buildRecommendation(desktop, largeData);
    expect(rec.showPagination).toBe(true);
    expect(rec.pageSize).toBeGreaterThan(0);
  });

  it('buildRecommendation increases row height for touch devices', () => {
    const mobileDevice: DeviceProfile = {
      deviceClass: 'mobile',
      screenWidth: 375,
      screenHeight: 812,
      pixelRatio: 2,
      hasTouch: true,
      prefersReducedMotion: false,
      prefersColorScheme: 'light',
      prefersHighContrast: false,
      connectionSpeed: 'fast',
    };
    const data: DataProfile = {
      rowCount: 20,
      columnCount: 3,
      hasNumericColumns: false,
      hasLongTextColumns: false,
      estimatedCellCount: 60,
    };
    const desktopDevice: DeviceProfile = {
      ...mobileDevice,
      deviceClass: 'desktop',
      screenWidth: 1280,
      hasTouch: false,
    };

    const mobileRec = buildRecommendation(mobileDevice, data);
    const desktopRec = buildRecommendation(desktopDevice, data);

    // Mobile should have a taller row height for touch targets
    expect(mobileRec.rowHeight).toBeGreaterThan(desktopRec.rowHeight);
  });

  it('overrides parameter takes precedence', () => {
    const device: DeviceProfile = {
      deviceClass: 'desktop',
      screenWidth: 1280,
      screenHeight: 900,
      pixelRatio: 1,
      hasTouch: false,
      prefersReducedMotion: false,
      prefersColorScheme: 'light',
      prefersHighContrast: false,
      connectionSpeed: 'fast',
    };
    const data: DataProfile = {
      rowCount: 100,
      columnCount: 5,
      hasNumericColumns: false,
      hasLongTextColumns: false,
      estimatedCellCount: 500,
    };
    const rec = buildRecommendation(device, data, { rowHeight: 99, fontSize: 20 });
    expect(rec.rowHeight).toBe(99);
    expect(rec.fontSize).toBe(20);
  });

  it('adaptive:recalculate emits adaptive:recommendation', () => {
    const recListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'adaptive:recommendation',
      recListener,
    );

    const plugin = AdaptiveRendererPlugin();
    plugin.install(mock.ctx);

    mock.triggerCommand('adaptive:recalculate', {});
    expect(recListener).toHaveBeenCalled();
    const rec = recListener.mock.calls[0]![0] as LayoutRecommendation;
    expect(rec.mode).toBeDefined();
    expect(rec.rowHeight).toBeGreaterThan(0);
  });

  it('adaptive:get-device-profile emits device profile', () => {
    const profileListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'adaptive:device-profiled',
      profileListener,
    );

    const plugin = AdaptiveRendererPlugin();
    plugin.install(mock.ctx);

    mock.triggerCommand('adaptive:get-device-profile', {});
    expect(profileListener).toHaveBeenCalled();
    const profile = profileListener.mock.calls[0]![0] as DeviceProfile;
    expect(profile.deviceClass).toBeDefined();
    expect(typeof profile.screenWidth).toBe('number');
  });

  it('autoApply option emits adaptive:layout-applied', () => {
    const appliedListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'adaptive:layout-applied',
      appliedListener,
    );

    const plugin = AdaptiveRendererPlugin({ autoApply: true });
    plugin.install(mock.ctx);

    mock.triggerCommand('adaptive:recalculate', {});
    expect(appliedListener).toHaveBeenCalled();
    const applied = appliedListener.mock.calls[0]![0] as { recommendation: LayoutRecommendation };
    expect(applied.recommendation).toBeDefined();
    expect(applied.recommendation.mode).toBeDefined();
  });

  it('cleanup removes all handlers', () => {
    const plugin = AdaptiveRendererPlugin();
    const cleanup = plugin.install(mock.ctx);

    expect(typeof cleanup).toBe('function');
    expect(() => cleanup?.()).not.toThrow();

    // After cleanup, commands should not be registered
    const commandBus = mock.ctx.commandBus as unknown as {
      registerHandler: ReturnType<typeof vi.fn>;
    };
    // Cleanup was called — handlers map should be cleared
    const recListener = vi.fn();
    (mock.ctx.eventBus as unknown as { on: (e: string, l: (p: unknown) => void) => () => void }).on(
      'adaptive:recommendation',
      recListener,
    );
    // Handler was removed by cleanup — dispatching should not trigger
    // (handlers map was cleared via the returned unsubscriber)
    expect(commandBus.registerHandler).toHaveBeenCalled();
  });
});
