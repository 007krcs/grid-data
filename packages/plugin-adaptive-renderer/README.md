# @gridstorm/plugin-adaptive-renderer

Detects device capabilities (mobile/tablet/desktop, screen size, pixel density, OS preferences like `prefers-reduced-motion` and `prefers-color-scheme`) and data characteristics (row count, column count, data density) to recommend and optionally apply optimal grid layout configurations.

## Installation

```bash
pnpm add @gridstorm/plugin-adaptive-renderer
```

## Usage

```typescript
import { AdaptiveRendererPlugin } from '@gridstorm/plugin-adaptive-renderer';

const grid = createGrid({
  plugins: [
    AdaptiveRendererPlugin({
      autoApply: false,
      onRecommendation: (rec) => {
        console.log(`Recommended layout: ${rec.mode} (${rec.reason})`);
      },
    }),
  ],
});
```

## Device Profile Example

```typescript
import { detectDevice } from '@gridstorm/plugin-adaptive-renderer';

const profile = detectDevice();
// {
//   deviceClass: 'desktop',
//   screenWidth: 1920,
//   screenHeight: 1080,
//   pixelRatio: 1,
//   hasTouch: false,
//   prefersReducedMotion: false,
//   prefersColorScheme: 'light',
//   prefersHighContrast: false,
//   connectionSpeed: 'fast'
// }
```

## Recommendation Structure

```typescript
// Listen for layout recommendations
grid.eventBus.on('adaptive:recommendation', (rec) => {
  console.log(rec);
  // {
  //   mode: 'compact',          // 'normal' | 'compact' | 'card' | 'minimal' | 'print'
  //   rowHeight: 44,
  //   headerHeight: 44,
  //   fontSize: 14,
  //   showPagination: true,
  //   pageSize: 100,
  //   virtualScrollThreshold: 500,
  //   columnsToHideOnMobile: [],
  //   reason: 'Tablet device detected',
  //   confidence: 0.85
  // }
});

// Trigger recalculation
grid.commandBus.dispatch('adaptive:recalculate', {});

// Get current device profile
grid.commandBus.dispatch('adaptive:get-device-profile', {});
grid.eventBus.on('adaptive:device-profiled', (profile) => {
  console.log('Device:', profile.deviceClass);
});
```

## Custom Breakpoint Configuration

```typescript
AdaptiveRendererPlugin({
  breakpoints: {
    mobile: 480,   // custom mobile breakpoint (default: 640)
    tablet: 768,   // custom tablet breakpoint (default: 1024)
    desktop: 1200, // custom desktop breakpoint (default: 1440)
  },
  // Override specific recommendation values
  overrides: {
    rowHeight: 48,
    pageSize: 50,
  },
});
```

## Auto-Apply Mode

When `autoApply: true`, the plugin automatically emits `adaptive:layout-applied` with the recommendation every time the screen size changes or recalculation is triggered:

```typescript
grid.eventBus.on('adaptive:layout-applied', ({ recommendation }) => {
  // Apply recommendation to your grid UI
  applyGridLayout(recommendation);
});
```

## Configuration Options

| Option              | Type      | Default    | Description                                              |
|---------------------|-----------|------------|----------------------------------------------------------|
| `autoApply`         | `boolean` | `false`    | Emit `adaptive:layout-applied` on each recommendation   |
| `breakpoints.mobile` | `number` | `640`      | Screen width threshold for mobile classification        |
| `breakpoints.tablet` | `number` | `1024`     | Screen width threshold for tablet classification        |
| `breakpoints.desktop`| `number` | `1440`     | Screen width threshold for desktop classification       |
| `onRecommendation`  | `function`| —          | Callback invoked on each new recommendation             |
| `overrides`         | `object`  | —          | Partial overrides that take priority over computed values|

## Events

| Event                      | Payload                                     |
|----------------------------|---------------------------------------------|
| `adaptive:device-profiled` | `DeviceProfile`                             |
| `adaptive:recommendation`  | `LayoutRecommendation`                      |
| `adaptive:layout-applied`  | `{ recommendation: LayoutRecommendation }`  |
