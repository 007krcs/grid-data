// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// Tests for the signed-license-key flow.
//
// The production embedded public key is a placeholder; we override it with a
// test keypair generated at suite startup, then sign license payloads with
// the matching private key. This lets us exercise verification end-to-end
// without leaking a real production key into the test fixtures.

import { describe, it, expect, beforeAll, beforeEach, vi, afterEach } from 'vitest';
import { ed25519 } from '@noble/curves/ed25519.js';
import {
  setGridStormLicense,
  validateLicense,
  getLicenseInfo,
  LicenseManager,
  _resetLicenseState,
  _setTestPublicKey,
} from '../license-manager';
import type { LicenseKey } from '../types';

// ─── Test keypair, generated once for the suite ───
let testPrivateKey: Uint8Array;
let testPublicKeyHex: string;

beforeAll(() => {
  testPrivateKey = ed25519.utils.randomSecretKey();
  const pub = ed25519.getPublicKey(testPrivateKey);
  testPublicKeyHex = bytesToHex(pub);
  _setTestPublicKey(testPublicKeyHex);
});

function bytesToHex(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i]!.toString(16).padStart(2, '0');
  }
  return s;
}

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(b64url: string): Uint8Array {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Build a license payload with sensible defaults. */
function makeLicenseKey(overrides: Partial<LicenseKey> = {}): LicenseKey {
  const future = new Date();
  future.setFullYear(future.getFullYear() + 1);
  return {
    org: 'Acme Corp',
    tier: 'professional',
    devCount: 5,
    expiresAt: future.toISOString(),
    plugins: ['pivoting', 'grouping', 'aggregation'],
    domains: [],
    version: 1,
    licenseId: 'test-license-001',
    ...overrides,
  };
}

/** Sign a payload with the test private key and assemble the GS2- key. */
function signLicense(payload: LicenseKey, privateKey = testPrivateKey): string {
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const sig = ed25519.sign(payloadBytes, privateKey);
  return `GS2-${base64UrlEncode(payloadBytes)}.${base64UrlEncode(sig)}`;
}

describe('License Manager (signed Ed25519 keys)', () => {
  beforeEach(() => {
    _resetLicenseState();
    vi.restoreAllMocks();
  });
  afterEach(() => {
    _resetLicenseState();
  });

  describe('setGridStormLicense — happy path', () => {
    it('accepts a valid signed license', () => {
      const key = signLicense(makeLicenseKey());
      setGridStormLicense(key);

      const info = getLicenseInfo();
      expect(info.isValid).toBe(true);
      expect(info.tier).toBe('professional');
      expect(info.org).toBe('Acme Corp');
      expect(info.licensedPlugins).toEqual(['pivoting', 'grouping', 'aggregation']);
    });
  });

  describe('setGridStormLicense — rejection paths', () => {
    it('rejects the empty string', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      setGridStormLicense('');
      expect(warnSpy).toHaveBeenCalled();
      expect(getLicenseInfo().isValid).toBe(false);
    });

    it('rejects legacy GS- keys with a migration hint', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      // Build something that would have been valid under the old format.
      const legacy = 'GS-' + btoa(JSON.stringify(makeLicenseKey()));
      setGridStormLicense(legacy);

      expect(warnSpy).toHaveBeenCalled();
      const msg = warnSpy.mock.calls[0]![0] as string;
      expect(msg).toMatch(/Legacy unsigned license format/);
      expect(msg).toMatch(/GS2-/);
      expect(getLicenseInfo().isValid).toBe(false);
    });

    it('rejects a key whose payload was tampered after signing', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const original = makeLicenseKey({ tier: 'starter' });
      const validKey = signLicense(original);

      // Tamper: swap the payload for a "tier: enterprise" one but keep the
      // signature from the starter payload. Strip the GS2- prefix via slice(4)
      // (not split('-'), since base64url uses '-' as a valid character).
      const body = validKey.slice(4);
      const [, sig] = body.split('.');
      const upgraded = JSON.stringify({ ...original, tier: 'enterprise' });
      const upgradedB64 = base64UrlEncode(new TextEncoder().encode(upgraded));
      const tampered = `GS2-${upgradedB64}.${sig}`;

      setGridStormLicense(tampered);
      expect(warnSpy).toHaveBeenCalled();
      expect((warnSpy.mock.calls[0]![0] as string)).toMatch(/signature verification failed/);
      expect(getLicenseInfo().isValid).toBe(false);
    });

    it('rejects a key whose signature was tampered', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const validKey = signLicense(makeLicenseKey());
      const body = validKey.slice(4);
      const [payload, sig] = body.split('.');

      // Flip a single byte in the signature.
      const sigBytes = base64UrlDecode(sig!);
      sigBytes[0] = sigBytes[0]! ^ 0x01;
      const tamperedSig = base64UrlEncode(sigBytes);
      const tampered = `GS2-${payload}.${tamperedSig}`;

      setGridStormLicense(tampered);
      expect(warnSpy).toHaveBeenCalled();
      expect((warnSpy.mock.calls[0]![0] as string)).toMatch(/signature verification failed/);
      expect(getLicenseInfo().isValid).toBe(false);
    });

    it('rejects a key signed by an unrelated keypair', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const otherPriv = ed25519.utils.randomSecretKey();
      const key = signLicense(makeLicenseKey(), otherPriv);

      setGridStormLicense(key);
      expect(warnSpy).toHaveBeenCalled();
      expect((warnSpy.mock.calls[0]![0] as string)).toMatch(/signature verification failed/);
      expect(getLicenseInfo().isValid).toBe(false);
    });

    it('rejects keys missing required payload fields', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const bogus = { foo: 'bar' };
      const payloadBytes = new TextEncoder().encode(JSON.stringify(bogus));
      const sig = ed25519.sign(payloadBytes, testPrivateKey);
      const key = `GS2-${base64UrlEncode(payloadBytes)}.${base64UrlEncode(sig)}`;

      setGridStormLicense(key);
      expect(warnSpy).toHaveBeenCalled();
      expect((warnSpy.mock.calls[0]![0] as string)).toMatch(/missing required fields/);
    });

    it('rejects malformed (no dot separator) keys', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      setGridStormLicense('GS2-nopaylodordotneeded');
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe('expiry behavior', () => {
    it('reports expired licenses as not valid but still decoded', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const past = new Date('2020-01-01T00:00:00.000Z').toISOString();
      const key = signLicense(makeLicenseKey({ expiresAt: past }));

      setGridStormLicense(key);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('expired'));
      const info = getLicenseInfo();
      expect(info.isValid).toBe(false);
      // Payload still decoded (so UI can show "renew your X license"):
      expect(info.org).toBe('Acme Corp');
    });

    it('validateLicense marks an expired key as expired and unlicensed', () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const past = new Date('2020-01-01T00:00:00.000Z').toISOString();
      setGridStormLicense(signLicense(makeLicenseKey({ expiresAt: past })));

      const r = validateLicense('pivoting');
      expect(r.valid).toBe(false);
      expect(r.expired).toBe(true);
      expect(r.pluginLicensed).toBe(false);
      expect(r.message).toMatch(/expired/i);
    });
  });

  describe('plugin-level licensing', () => {
    it('returns community when no license is set', () => {
      const r = validateLicense('pivoting');
      expect(r.valid).toBe(false);
      expect(r.tier).toBe('community');
      expect(r.pluginLicensed).toBe(false);
    });

    it('licenses only listed plugins', () => {
      setGridStormLicense(signLicense(makeLicenseKey({ plugins: ['sorting', 'filtering'] })));
      expect(validateLicense('sorting').pluginLicensed).toBe(true);
      expect(validateLicense('pivoting').pluginLicensed).toBe(false);
    });

    it('wildcard "*" licenses every plugin', () => {
      setGridStormLicense(signLicense(makeLicenseKey({ plugins: ['*'] })));
      expect(validateLicense('pivoting').pluginLicensed).toBe(true);
      expect(validateLicense('anything').pluginLicensed).toBe(true);
    });
  });

  describe('isDev() bypass scope (hardened)', () => {
    // The previous implementation treated *.local and *.test as development.
    // The new implementation does NOT — those are routinely used for real
    // internal apps. Only localhost / 127.0.0.1 / 0.0.0.0 / [::1] count.

    function withHostname<T>(host: string, fn: () => T): T {
      const restore = window.location.hostname;
      Object.defineProperty(window, 'location', {
        value: { ...window.location, hostname: host },
        writable: true,
        configurable: true,
      });
      try {
        return fn();
      } finally {
        Object.defineProperty(window, 'location', {
          value: { ...window.location, hostname: restore },
          writable: true,
          configurable: true,
        });
      }
    }

    it('treats localhost as development', () => {
      setGridStormLicense(signLicense(makeLicenseKey({ plugins: ['x'] })));
      withHostname('localhost', () => {
        expect(validateLicense('x').isDevelopment).toBe(true);
      });
    });

    it('treats [::1] as development', () => {
      setGridStormLicense(signLicense(makeLicenseKey({ plugins: ['x'] })));
      withHostname('[::1]', () => {
        expect(validateLicense('x').isDevelopment).toBe(true);
      });
    });

    it('does NOT treat *.local as development (previous bypass closed)', () => {
      setGridStormLicense(signLicense(makeLicenseKey({ plugins: ['x'], domains: ['example.com'] })));
      withHostname('myapp.local', () => {
        const r = validateLicense('x');
        expect(r.isDevelopment).toBe(false);
        // myapp.local does not match example.com → domain check fires.
        expect(r.valid).toBe(false);
        expect(r.message).toMatch(/not authorized/);
      });
    });

    it('does NOT treat *.test as development (previous bypass closed)', () => {
      setGridStormLicense(signLicense(makeLicenseKey({ plugins: ['x'], domains: ['example.com'] })));
      withHostname('staging.test', () => {
        const r = validateLicense('x');
        expect(r.isDevelopment).toBe(false);
        expect(r.valid).toBe(false);
      });
    });
  });

  describe('domain checks (unchanged from prior behavior)', () => {
    function withHostname<T>(host: string, fn: () => T): T {
      const restore = window.location.hostname;
      Object.defineProperty(window, 'location', {
        value: { ...window.location, hostname: host },
        writable: true,
        configurable: true,
      });
      try {
        return fn();
      } finally {
        Object.defineProperty(window, 'location', {
          value: { ...window.location, hostname: restore },
          writable: true,
          configurable: true,
        });
      }
    }

    it('allows subdomain matches', () => {
      setGridStormLicense(signLicense(makeLicenseKey({ plugins: ['x'], domains: ['example.com'] })));
      withHostname('app.example.com', () => {
        expect(validateLicense('x').valid).toBe(true);
      });
    });

    it('rejects unauthorized domains', () => {
      setGridStormLicense(signLicense(makeLicenseKey({ plugins: ['x'], domains: ['example.com'] })));
      withHostname('evil.example.org', () => {
        const r = validateLicense('x');
        expect(r.valid).toBe(false);
        expect(r.pluginLicensed).toBe(true); // plugin licensed, domain isn't
      });
    });

    it('empty domains list = unlimited domains', () => {
      setGridStormLicense(signLicense(makeLicenseKey({ plugins: ['x'], domains: [] })));
      withHostname('anything.example.org', () => {
        expect(validateLicense('x').valid).toBe(true);
      });
    });
  });

  describe('LicenseManager class shim', () => {
    it('static methods alias the module functions', () => {
      expect(LicenseManager.setLicense).toBe(setGridStormLicense);
      expect(LicenseManager.validate).toBe(validateLicense);
      expect(LicenseManager.getInfo).toBe(getLicenseInfo);
    });

    it('no longer exposes generateTrialKey (clients cannot sign)', () => {
      // Trial-key generation must move server-side now that keys require a
      // signature from the offline private key. The static was removed.
      expect((LicenseManager as unknown as Record<string, unknown>).generateTrialKey).toBeUndefined();
    });
  });
});
