// ─── ProductRegistry ───
// Singleton that products register with at startup.
// The platform shell reads all manifests to build nav + launcher.

import type { ProductManifest } from './types';

export class ProductRegistry {
  private _products: ProductManifest[] = [];

  /**
   * Register a product with the platform.
   * Call this once per product during application init.
   * Throws if the same id is registered twice.
   */
  register(manifest: ProductManifest): this {
    if (this._products.some(p => p.id === manifest.id)) {
      throw new Error(
        `[platform-core] Product "${manifest.id}" is already registered. ` +
        `Each product must have a unique id.`
      );
    }
    this._products.push(manifest);
    return this;
  }

  /** All registered products in registration order */
  getAll(): readonly ProductManifest[] {
    return this._products;
  }

  /** Get a single product by id, or undefined if not registered */
  get(id: string): ProductManifest | undefined {
    return this._products.find(p => p.id === id);
  }

  has(id: string): boolean {
    return this._products.some(p => p.id === id);
  }

  /** Products available for launch (not coming-soon) */
  getLaunched(): readonly ProductManifest[] {
    return this._products.filter(p => p.status !== 'coming-soon');
  }

  /** Products on the roadmap */
  getComingSoon(): readonly ProductManifest[] {
    return this._products.filter(p => p.status === 'coming-soon');
  }
}

/** Global singleton used by the platform shell and all products */
export const productRegistry = new ProductRegistry();
