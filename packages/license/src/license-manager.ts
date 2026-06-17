// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
//
// ─── License key verification ───
//
// License keys are signed payloads in the form:
//
//   GS2-<base64url(payload-json)>.<base64url(ed25519-signature)>
//
// The signature is Ed25519 over the UTF-8 bytes of the payload JSON, produced
// by a private key held offline by GridStorm. The corresponding public key is
// embedded in this module's source (PUBLIC_KEY_HEX below) and shipped to every
// consumer. A license is valid iff:
//
//   1. The format parses (GS2- prefix, two base64url segments split by `.`).
//   2. The signature verifies against PUBLIC_KEY_HEX.
//   3. The payload is well-formed JSON matching LicenseKey.
//   4. expiresAt has not passed.
//
// The previous format (GS- + plain base64 JSON, no signature) is rejected
// explicitly with a migration error — those keys were forgeable in seconds.

// Note the `.js` extension: @noble/curves v2 declares its sub-path exports
// with explicit extensions, so bundler/node16 resolution requires it.
import { ed25519 } from '@noble/curves/ed25519.js';
import type { LicenseKey, LicenseInfo, LicenseValidationResult } from './types';

// ─── Embedded public key ───
//
// This is a PLACEHOLDER key generated for development. Before any commercial
// release: regenerate via `node scripts/license/keygen.cjs`, store the private
// key in a secrets vault, and replace the hex below with the new public key.
// All previously-issued licenses (none in production yet) will need to be
// re-issued; that's intentional — the placeholder MUST NOT be a real
// production key.
const PRODUCTION_PUBLIC_KEY_HEX =
  '0000000000000000000000000000000000000000000000000000000000000000';

// Active public key. Defaults to the production key embedded above; tests can
// override via `_setTestPublicKey()`. All verification reads through this
// variable so the prod path and test path share a single source of truth.
let activePublicKeyHex: string = PRODUCTION_PUBLIC_KEY_HEX;

// ─── Module-level state ───
let currentLicense: LicenseKey | null = null;
let licenseValid = false;
let strictMode = false;

// Storage key for the monotonic last-seen timestamp used to detect a
// rolled-back system clock. We persist the highest Date.now() we have
// observed in any validate() call and refuse to honor a license if the
// current clock is meaningfully earlier than the last seen value (default
// allowance: 7 days, to tolerate timezone fixes and DST oddities).
const CLOCK_SKEW_STORAGE_KEY = '__gridstorm_clock_skew_v1';
const CLOCK_SKEW_ALLOWANCE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Enable strict license enforcement. When strict mode is on, premium
 * plugins **throw** during install if no valid license is set — instead of
 * the default behavior, which only emits a `console.warn` and continues.
 *
 * Recommended for production builds where the support cost of "the plugin
 * silently kept working without a license" outweighs the friction of an
 * up-front failure.
 *
 * @example
 * ```ts
 * import { setLicenseStrictMode } from '@gridstorm/license';
 * if (import.meta.env.PROD) setLicenseStrictMode(true);
 * ```
 */
export function setLicenseStrictMode(enabled: boolean): void {
  strictMode = enabled === true;
}

/** @internal — used by enterprise plugins' install() to decide whether to throw. */
export function isLicenseStrictMode(): boolean {
  return strictMode;
}

// ─── Public API ───

/**
 * Set the GridStorm enterprise license key.
 * Call this once at application startup before creating any grids.
 *
 * The key must be in signed `GS2-...` format. Legacy `GS-...` keys (base64
 * JSON without a signature) are rejected.
 *
 * @example
 * ```ts
 * import { setGridStormLicense } from '@gridstorm/license';
 * setGridStormLicense('GS2-eyJvcmciOi...XYZ.abc123...');
 * ```
 */
export function setGridStormLicense(key: string): void {
  if (typeof key !== 'string' || key.length === 0) {
    currentLicense = null;
    licenseValid = false;
    console.warn('[GridStorm] License key is empty or not a string.');
    return;
  }

  // Reject the legacy unsigned format explicitly with a migration message.
  if (key.startsWith('GS-')) {
    currentLicense = null;
    licenseValid = false;
    console.warn(
      '[GridStorm] Legacy unsigned license format (GS-) is no longer supported. ' +
        'Re-issue your key in the signed GS2- format. Contact support@gridstorm.dev ' +
        'for migration assistance.',
    );
    return;
  }

  try {
    const decoded = decodeAndVerifyLicenseKey(key);
    currentLicense = decoded;
    licenseValid = !isExpired(decoded);

    if (!licenseValid) {
      console.warn(
        '[GridStorm] License key has expired. Please renew at https://gridstorm.dev/pricing',
      );
    }
  } catch (err) {
    currentLicense = null;
    licenseValid = false;
    const reason = err instanceof Error ? err.message : String(err);
    console.warn(
      `[GridStorm] Invalid license key (${reason}). Purchase at https://gridstorm.dev/pricing`,
    );
  }
}

/**
 * Validate whether a specific plugin is licensed.
 * Called by enterprise plugins in their install() method.
 */
export function validateLicense(pluginId: string): LicenseValidationResult {
  const isDevelopment = isDev();

  // Clock-skew check: if the system clock has rolled backwards by more than
  // the allowance vs the highest timestamp we have previously observed,
  // refuse to honor the license even if expiresAt would otherwise pass.
  // This blocks the trivial "set the clock to 2023 to extend the trial"
  // bypass — it does not stop a sophisticated attacker who also wipes the
  // localStorage entry, but it makes the bypass non-trivial.
  if (!isDevelopment && hasClockRegressed()) {
    return {
      valid: false,
      expired: true,
      tier: currentLicense?.tier ?? 'community',
      message:
        '[GridStorm] System clock has regressed significantly since the last ' +
        'session. License check refused. If you believe this is in error, ' +
        'verify the device clock.',
      pluginLicensed: false,
      isDevelopment,
    };
  }
  recordCurrentTime();

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

/**
 * Strict-mode wrapper around {@link validateLicense}. Throws
 * {@link LicenseRequiredError} when no valid license covers `pluginId`
 * AND {@link setLicenseStrictMode | strict mode} is enabled. Otherwise
 * returns the validation result.
 *
 * Plugins call this in `install()` to fail loudly during production
 * startup rather than render watermarked output forever. In development
 * (no strict mode, or `isDev()` true) this is a no-op that returns the
 * result for the existing watermark fallback path.
 */
export function enforceLicense(pluginId: string): LicenseValidationResult {
  const result = validateLicense(pluginId);
  if (
    strictMode &&
    !result.isDevelopment &&
    (!result.valid || !result.pluginLicensed)
  ) {
    throw new LicenseRequiredError(pluginId, result.message);
  }
  return result;
}

/**
 * Thrown by {@link enforceLicense} when strict mode is on and the
 * required license is missing, expired, or doesn't cover the plugin.
 */
export class LicenseRequiredError extends Error {
  public readonly pluginId: string;
  constructor(pluginId: string, message: string) {
    super(message || `[GridStorm] Plugin "${pluginId}" requires a valid license.`);
    this.name = 'LicenseRequiredError';
    this.pluginId = pluginId;
  }
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

// ─── Internals ───

/**
 * Decode a signed license key and verify its Ed25519 signature against the
 * embedded public key. Throws on any failure with a specific message.
 */
function decodeAndVerifyLicenseKey(key: string): LicenseKey {
  // Strip the GS2- prefix.
  if (!key.startsWith('GS2-')) {
    throw new Error('expected GS2- prefix');
  }
  const body = key.slice(4);

  const dot = body.indexOf('.');
  if (dot < 0) {
    throw new Error('missing signature separator');
  }
  const payloadB64 = body.slice(0, dot);
  const signatureB64 = body.slice(dot + 1);
  if (!payloadB64 || !signatureB64) {
    throw new Error('empty payload or signature');
  }

  const payloadBytes = base64UrlDecode(payloadB64);
  const signatureBytes = base64UrlDecode(signatureB64);
  if (signatureBytes.length !== 64) {
    throw new Error('signature is not 64 bytes');
  }

  const publicKey = hexToBytes(activePublicKeyHex);
  let signatureValid: boolean;
  try {
    signatureValid = ed25519.verify(signatureBytes, payloadBytes, publicKey);
  } catch {
    signatureValid = false;
  }
  if (!signatureValid) {
    throw new Error('signature verification failed');
  }

  // Decode payload bytes back to JSON.
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(payloadBytes));
  } catch {
    throw new Error('payload is not valid JSON');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('payload is not an object');
  }
  const p = parsed as Partial<LicenseKey>;
  if (!p.org || !p.tier || !Array.isArray(p.plugins) || !p.expiresAt) {
    throw new Error('payload missing required fields');
  }
  return parsed as LicenseKey;
}

function isExpired(license: LicenseKey): boolean {
  return new Date(license.expiresAt) < new Date();
}

function safeStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // localStorage may throw in sandboxed iframes / strict modes.
  }
  return null;
}

function hasClockRegressed(): boolean {
  const storage = safeStorage();
  if (!storage) return false;
  const raw = storage.getItem(CLOCK_SKEW_STORAGE_KEY);
  if (!raw) return false;
  const lastSeen = Number.parseInt(raw, 10);
  if (!Number.isFinite(lastSeen)) return false;
  const now = Date.now();
  return now < lastSeen - CLOCK_SKEW_ALLOWANCE_MS;
}

function recordCurrentTime(): void {
  const storage = safeStorage();
  if (!storage) return;
  try {
    const raw = storage.getItem(CLOCK_SKEW_STORAGE_KEY);
    const lastSeen = raw ? Number.parseInt(raw, 10) : 0;
    const now = Date.now();
    if (!Number.isFinite(lastSeen) || now > lastSeen) {
      storage.setItem(CLOCK_SKEW_STORAGE_KEY, String(now));
    }
  } catch {
    // Quota exhausted or storage disabled — best-effort only.
  }
}

/**
 * Detect a development environment. Used to suppress license requirements
 * while developing — NOT a production exemption.
 *
 * Hardened relative to the previous implementation:
 *   • Removed `.local` and `.test` TLD bypasses (those are routinely used for
 *     real internal apps, not just local dev).
 *   • Kept `localhost`, `127.0.0.1`, `0.0.0.0`, and `NODE_ENV=development`.
 *   • The `[::1]` IPv6 loopback is also recognized.
 *
 * Customers running on internal `.local`/`.test` domains who relied on the
 * old bypass should obtain a proper development-tier license; the previous
 * behavior amounted to "anyone hosting on `.local` skips the license check."
 */
function isDev(): boolean {
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
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '[::1]' ||
      host === '::1'
    ) {
      return true;
    }
  }
  return false;
}

// ─── Encoding helpers ───
//
// Implemented inline (rather than depending on a base64url library) because
// the license module aims for a small dependency surface. These routines
// handle both browser (atob/btoa) and Node (Buffer) without requiring either
// directly.

function base64UrlDecode(b64url: string): Uint8Array {
  // Convert URL-safe alphabet back to standard base64 and pad to multiple of 4.
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  // Node fallback.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const NodeBuffer = (globalThis as any).Buffer;
  if (NodeBuffer) {
    return new Uint8Array(NodeBuffer.from(b64, 'base64'));
  }
  throw new Error('no base64 decoder available in this environment');
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new Error('hex string has odd length');
  }
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

// ─── Test/internal helpers ───

/**
 * Reset the license state. Primarily used for testing.
 * @internal
 */
export function _resetLicenseState(): void {
  currentLicense = null;
  licenseValid = false;
}

/**
 * Test-only. Override the active public key so tests can sign with a known
 * test keypair. Pass `null` to restore the production key. Real applications
 * must not call this.
 * @internal
 */
export function _setTestPublicKey(hex: string | null): void {
  activePublicKeyHex = hex ?? PRODUCTION_PUBLIC_KEY_HEX;
}

/** LicenseManager class for advanced usage */
export class LicenseManager {
  static setLicense = setGridStormLicense;
  static validate = validateLicense;
  static getInfo = getLicenseInfo;
}
