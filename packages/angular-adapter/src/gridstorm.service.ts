// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── GridStorm Service ───
// Injectable service for managing multiple GridStorm instances.
// Allows Angular components to access grid APIs by a unique identifier,
// useful in applications with multiple grids or cross-component communication.

import { Injectable } from '@angular/core';
import type { GridApi } from '@gridstorm/core';

/**
 * Service for registering and retrieving GridStorm API instances.
 *
 * Use this service when you have multiple grids in your application
 * and need to access their APIs from different components or services.
 *
 * @example
 * ```typescript
 * // In a component that hosts the grid:
 * constructor(private gridService: GridStormService) {}
 *
 * onGridReady(api: GridApi) {
 *   this.gridService.registerApi('employees', api);
 * }
 *
 * // In another component that needs to interact with the grid:
 * constructor(private gridService: GridStormService) {}
 *
 * exportData() {
 *   const api = this.gridService.getApi('employees');
 *   if (api) {
 *     const rows = api.getSelectedRows();
 *     // ... do something with rows
 *   }
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class GridStormService {
  private apiMap = new Map<string, GridApi>();

  /**
   * Registers a GridApi instance under a unique identifier.
   *
   * Call this from the `(gridReady)` output handler of the `<gridstorm>` component.
   * If an API with the same ID already exists, it will be replaced.
   *
   * @param id - A unique string identifier for this grid instance.
   * @param api - The GridApi instance to register.
   */
  registerApi(id: string, api: GridApi): void {
    this.apiMap.set(id, api);
  }

  /**
   * Retrieves a previously registered GridApi by its identifier.
   *
   * @param id - The unique identifier used during registration.
   * @returns The GridApi instance, or `undefined` if not found.
   */
  getApi(id: string): GridApi | undefined {
    return this.apiMap.get(id);
  }

  /**
   * Removes a registered GridApi by its identifier.
   *
   * Call this when a grid component is destroyed to prevent memory leaks.
   *
   * @param id - The unique identifier of the API to remove.
   */
  removeApi(id: string): void {
    this.apiMap.delete(id);
  }

  /**
   * Returns all registered grid API identifiers.
   *
   * @returns An array of registered grid IDs.
   */
  getRegisteredIds(): string[] {
    return Array.from(this.apiMap.keys());
  }

  /**
   * Checks whether a grid API is registered under the given identifier.
   *
   * @param id - The unique identifier to check.
   * @returns `true` if an API is registered with that ID.
   */
  hasApi(id: string): boolean {
    return this.apiMap.has(id);
  }

  /**
   * Removes all registered grid APIs.
   *
   * Useful during application teardown or testing.
   */
  clear(): void {
    this.apiMap.clear();
  }
}
