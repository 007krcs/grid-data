import type { LicenseKey, LicenseInfo, LicenseValidationResult } from './types';

// Module-level license state (singleton)
let currentLicense: LicenseKey | null = null;
let licenseValid = false;

/**
 * Set the GridStorm enterprise license key.
 * Call this once at application startup before creating any grids.
 *
 * @example
 * ```ts
 * import { setGridStormLicense } from '@gridstorm/license';
 * setGridStormLicense('GS-eyJvcmciOiJBY21lIENv...');
 * ```
 */
export function setGridStormLicense(key: string): void {
  // Decode the license key (base64-encoded JSON, NOT actual JWT for simplicity)
  // In production, this would use proper JWT with signature verification
  try {
    const decoded = decodeLicenseKey(key);
    currentLicense = decoded;
    licenseValid = !isExpired(decoded);

    if (!licenseValid) {
      console.warn(
        '[GridStorm] License key has expired. Please renew at https://gridstorm.dev/pricing',
      );
    }
  } catch {
    currentLicense = null;
    licenseValid = false;
    console.warn(
      '[GridStorm] Invalid license key. Purchase at https://gridstorm.dev/pricing',
    );
  }
}

/**
 * Validate whether a specific plugin is licensed.
 * Called by enterprise plugins in their install() method.
 */
export function validateLicense(pluginId: string): LicenseValidationResult {
  const isDevelopment = isDev();

  // No license set
  if (!currentLicense) {
    return {
      valid: false,
      expired: false,
      tier: 'community',
      message: `[GridStorm] Plugin "${pluginId}" requires an enterprise license. Purchase at https://gridstorm.dev/pricing`,
      pluginLicensed: false,
      isDevelopment,
    };
  }

  // License expired
  if (isExpired(currentLicense)) {
    return {
      valid: false,
      expired: true,
      tier: currentLicense.tier,
      message: `[GridStorm] License expired on ${currentLicense.expiresAt}. Renew at https://gridstorm.dev/pricing`,
      pluginLicensed: false,
      isDevelopment,
    };
  }

  // Check if plugin is in the licensed list
  const pluginLicensed =
    currentLicense.plugins.includes(pluginId) ||
    currentLicense.plugins.includes('*');

  if (!pluginLicensed) {
    return {
      valid: true,
      expired: false,
      tier: currentLicense.tier,
      message: `[GridStorm] Plugin "${pluginId}" is not included in your ${currentLicense.tier} license. Upgrade at https://gridstorm.dev/pricing`,
      pluginLicensed: false,
      isDevelopment,
    };
  }

  // Domain check (production only)
  if (!isDevelopment && currentLicense.domains.length > 0) {
    const currentDomain =
      typeof window !== 'undefined' ? window.location.hostname : '';
    const domainAllowed = currentLicense.domains.some(
      (d) => currentDomain === d || currentDomain.endsWith('.' + d),
    );
    if (!domainAllowed) {
      return {
        valid: false,
        expired: false,
        tier: currentLicense.tier,
        message: `[GridStorm] Domain "${currentDomain}" is not authorized by your license.`,
        pluginLicensed: true,
        isDevelopment,
      };
    }
  }

  return {
    valid: true,
    expired: false,
    tier: currentLicense.tier,
    message: '',
    pluginLicensed: true,
    isDevelopment,
  };
}

/** Get public license info */
export function getLicenseInfo(): LicenseInfo {
  if (!currentLicense) {
    return {
      isValid: false,
      tier: 'community',
      org: '',
      expiresAt: null,
      licensedPlugins: [],
    };
  }

  return {
    isValid: licenseValid,
    tier: currentLicense.tier,
    org: currentLicense.org,
    expiresAt: currentLicense.expiresAt,
    licensedPlugins: [...currentLicense.plugins],
  };
}

/** Decode base64 license key */
function decodeLicenseKey(key: string): LicenseKey {
  // Strip prefix if present (e.g., "GS-")
  const raw = key.startsWith('GS-') ? key.slice(3) : key;
  const json = atob(raw);
  const parsed = JSON.parse(json);
  // Validate required fields
  if (!parsed.org || !parsed.tier || !parsed.plugins) {
    throw new Error('Invalid license key format');
  }
  return parsed as LicenseKey;
}

function isExpired(license: LicenseKey): boolean {
  return new Date(license.expiresAt) < new Date();
}

function isDev(): boolean {
  // Check common development indicators
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = globalThis as any;
    if (p.process?.env?.NODE_ENV === 'development') {
      return true;
    }
  } catch {
    // process not available
  }
  if (typeof window !== 'undefined') {
    const host = window.location?.hostname ?? '';
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
      return true;
    }
    if (host.endsWith('.local') || host.endsWith('.test')) {
      return true;
    }
  }
  return false;
}

/**
 * Reset the license state. Primarily used for testing.
 * @internal
 */
export function _resetLicenseState(): void {
  currentLicense = null;
  licenseValid = false;
}

/** LicenseManager class for advanced usage */
export class LicenseManager {
  static setLicense = setGridStormLicense;
  static validate = validateLicense;
  static getInfo = getLicenseInfo;

  /** Generate a trial license key (for demos/testing) */
  static generateTrialKey(org: string, days: number = 30): string {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const key: LicenseKey = {
      org,
      tier: 'professional',
      devCount: 1,
      expiresAt: expiresAt.toISOString(),
      plugins: ['*'],
      domains: [],
      version: 1,
      licenseId: `trial-${Date.now()}`,
    };

    return 'GS-' + btoa(JSON.stringify(key));
  }
}
