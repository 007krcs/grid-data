// ─── @gridstorm/platform-core ───
// Integration contract for the NexaForge platform.
//
// HOW TO INTEGRATE A NEW PRODUCT:
//
//   import { productRegistry } from '@gridstorm/platform-core';
//   import type { ProductManifest } from '@gridstorm/platform-core';
//
//   const myManifest: ProductManifest = {
//     id: 'my-product',
//     name: 'My Product',
//     tagline: 'What it does in 5 words',
//     // ... see ProductManifest interface
//   };
//
//   productRegistry.register(myManifest);
//
// The platform shell (examples/hub) reads productRegistry.getAll()
// and automatically renders the product in:
//   - Platform launcher (/)
//   - Product switcher nav
//   - Route: #/product/my-product
//

export type {
  ProductManifest,
  ProductStatus,
  ProductTier,
  ProductStat,
  ProductQuickLink,
  PlatformConfig,
  PlatformContextValue,
  PlatformEvent,
  PlatformEventType,
  PlatformEventHandler,
} from './types';

export { ProductRegistry, productRegistry } from './registry';
export { platformEventBus } from './events';
