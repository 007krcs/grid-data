// © 2026 GridStorm Contributors — MIT License
//
// ─── License enforcement: REMOVED ──────────────────────────────────────────
//
// GridStorm is fully open-source. There is no commercial tier, no premium
// plugins, no enterprise license. The entire plugin surface is MIT.
//
// This module previously enforced Ed25519-signed license keys and refused
// to install certain plugins without one. That entire flow has been
// removed. The exports below are kept as no-op stubs so that existing
// consumer code (`setGridStormLicense(...)`, `validateLicense(...)`,
// `enforceLicense(...)`) continues to compile and behave as if a valid
// license were always set.
//
// You can safely delete every call to these functions from your code.

import type { LicenseKey, LicenseInfo, LicenseValidationResult } from './types';

const PERMISSIVE_LICENSE: LicenseKey = {
  org: 'gridstorm-open-source',
  tier: 'enterprise',
  plugins: ['*'],
  domains: [],
  expiresAt: '9999-12-31T23:59:59Z',
  devCount: Number.MAX_SAFE_INTEGER,
  version: 2,
  licenseId: 'open-source',
};

/**
 * No-op. Kept for backwards compatibility with code that called this in
 * older GridStorm versions. License keys are no longer required — every
 * plugin is free and unrestricted.
 */
export function setGridStormLicense(_key: string): void {
  // intentionally empty
}

/**
 * Always returns a permissive "valid" result. License gating has been
 * removed in this branch — every plugin is free.
 */
export function validateLicense(_pluginId: string): LicenseValidationResult {
  return {
    valid: true,
    expired: false,
    tier: 'enterprise',
    message: '',
    pluginLicensed: true,
    isDevelopment: false,
  };
}

/**
 * Always returns a permissive "valid" result, never throws. Was the
 * strict-mode gate for premium plugin install; with all plugins free,
 * there is nothing to enforce.
 */
export function enforceLicense(pluginId: string): LicenseValidationResult {
  return validateLicense(pluginId);
}

/**
 * Retained as a class for historical error-handling code. Throws nothing
 * because license requirements no longer exist.
 */
export class LicenseRequiredError extends Error {
  public readonly pluginId: string;
  constructor(pluginId: string) {
    super(`[GridStorm] (deprecated) Plugin "${pluginId}" no longer requires a license.`);
    this.name = 'LicenseRequiredError';
    this.pluginId = pluginId;
  }
}

/** Always returns the permissive enterprise-tier info. */
export function getLicenseInfo(): LicenseInfo {
  return {
    isValid: true,
    tier: PERMISSIVE_LICENSE.tier,
    org: PERMISSIVE_LICENSE.org,
    expiresAt: PERMISSIVE_LICENSE.expiresAt,
    licensedPlugins: [...PERMISSIVE_LICENSE.plugins],
  };
}

/** No-op. Strict mode no longer exists. */
export function setLicenseStrictMode(_enabled: boolean): void {
  // intentionally empty
}

/** Always returns false — strict mode no longer exists. */
export function isLicenseStrictMode(): boolean {
  return false;
}

/** No-op kept for test compatibility. */
export function _resetLicenseState(): void {
  // intentionally empty
}

/** No-op kept for test compatibility. */
export function _setTestPublicKey(_hex: string | null): void {
  // intentionally empty
}

/**
 * Compatibility class for code that imported `LicenseManager`. All
 * methods are no-ops or permissive.
 */
export class LicenseManager {
  static setLicense = setGridStormLicense;
  static validate = validateLicense;
  static getInfo = getLicenseInfo;
}
