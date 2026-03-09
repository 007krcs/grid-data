/** License tier determines which plugins are available */
export type LicenseTier = 'community' | 'starter' | 'professional' | 'enterprise';

/** Decoded license key payload */
export interface LicenseKey {
  /** Organization name */
  org: string;
  /** License tier */
  tier: LicenseTier;
  /** Licensed developer count */
  devCount: number;
  /** License expiration date (ISO string) */
  expiresAt: string;
  /** List of licensed plugin IDs */
  plugins: string[];
  /** Allowed production domains (empty = unlimited) */
  domains: string[];
  /** License version format */
  version: number;
  /** Unique license ID */
  licenseId: string;
}

/** Result of license validation */
export interface LicenseValidationResult {
  valid: boolean;
  expired: boolean;
  tier: LicenseTier;
  message: string;
  /** Whether the plugin is licensed */
  pluginLicensed: boolean;
  /** Whether we're in development mode */
  isDevelopment: boolean;
}

/** Public-facing license info */
export interface LicenseInfo {
  isValid: boolean;
  tier: LicenseTier;
  org: string;
  expiresAt: string | null;
  licensedPlugins: string[];
}
