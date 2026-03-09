import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  setGridStormLicense,
  validateLicense,
  getLicenseInfo,
  LicenseManager,
  _resetLicenseState,
} from '../license-manager';
import type { LicenseKey } from '../types';

/** Helper: create a valid license key object */
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

/** Helper: encode a license key to base64 with optional GS- prefix */
function encodeLicenseKey(key: LicenseKey, prefix = true): string {
  const base64 = btoa(JSON.stringify(key));
  return prefix ? `GS-${base64}` : base64;
}

describe('License Manager', () => {
  beforeEach(() => {
    _resetLicenseState();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    _resetLicenseState();
  });

  describe('setGridStormLicense', () => {
    it('should set a valid license key correctly', () => {
      const key = makeLicenseKey();
      const encoded = encodeLicenseKey(key);

      setGridStormLicense(encoded);

      const info = getLicenseInfo();
      expect(info.isValid).toBe(true);
      expect(info.tier).toBe('professional');
      expect(info.org).toBe('Acme Corp');
      expect(info.licensedPlugins).toEqual(['pivoting', 'grouping', 'aggregation']);
    });

    it('should accept license key without GS- prefix', () => {
      const key = makeLicenseKey();
      const encoded = encodeLicenseKey(key, false);

      setGridStormLicense(encoded);

      const info = getLicenseInfo();
      expect(info.isValid).toBe(true);
      expect(info.org).toBe('Acme Corp');
    });

    it('should warn and set invalid on invalid base64 input', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      setGridStormLicense('not-valid-base64!!!');

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid license key'),
      );

      const info = getLicenseInfo();
      expect(info.isValid).toBe(false);
      expect(info.tier).toBe('community');
    });

    it('should warn and set invalid when required fields are missing', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const badKey = btoa(JSON.stringify({ foo: 'bar' }));

      setGridStormLicense(badKey);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid license key'),
      );

      const info = getLicenseInfo();
      expect(info.isValid).toBe(false);
    });

    it('should warn when license key is expired', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const past = new Date('2020-01-01T00:00:00.000Z');
      const key = makeLicenseKey({ expiresAt: past.toISOString() });
      const encoded = encodeLicenseKey(key);

      setGridStormLicense(encoded);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('License key has expired'),
      );

      const info = getLicenseInfo();
      expect(info.isValid).toBe(false);
      // The license is still decoded, so org and tier are available
      expect(info.org).toBe('Acme Corp');
      expect(info.tier).toBe('professional');
    });
  });

  describe('validateLicense', () => {
    it('should return community tier when no license is set', () => {
      const result = validateLicense('pivoting');

      expect(result.valid).toBe(false);
      expect(result.expired).toBe(false);
      expect(result.tier).toBe('community');
      expect(result.pluginLicensed).toBe(false);
      expect(result.message).toContain('requires an enterprise license');
    });

    it('should return expired when license is expired', () => {
      const past = new Date('2020-01-01T00:00:00.000Z');
      const key = makeLicenseKey({ expiresAt: past.toISOString() });
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      setGridStormLicense(encodeLicenseKey(key));

      const result = validateLicense('pivoting');

      expect(result.valid).toBe(false);
      expect(result.expired).toBe(true);
      expect(result.pluginLicensed).toBe(false);
      expect(result.message).toContain('License expired');
      expect(result.message).toContain('2020-01-01');
    });

    it('should report expired license tier correctly', () => {
      const past = new Date('2020-01-01T00:00:00.000Z');
      const key = makeLicenseKey({
        expiresAt: past.toISOString(),
        tier: 'enterprise',
      });
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      setGridStormLicense(encodeLicenseKey(key));

      const result = validateLicense('pivoting');

      expect(result.tier).toBe('enterprise');
      expect(result.expired).toBe(true);
    });

    it('should return pluginLicensed=false when plugin is not in the list', () => {
      const key = makeLicenseKey({ plugins: ['sorting', 'filtering'] });
      setGridStormLicense(encodeLicenseKey(key));

      const result = validateLicense('pivoting');

      expect(result.valid).toBe(true);
      expect(result.pluginLicensed).toBe(false);
      expect(result.message).toContain('not included in your professional license');
    });

    it('should return valid when plugin is in the licensed list', () => {
      const key = makeLicenseKey({ plugins: ['pivoting', 'grouping'] });
      setGridStormLicense(encodeLicenseKey(key));

      const result = validateLicense('pivoting');

      expect(result.valid).toBe(true);
      expect(result.pluginLicensed).toBe(true);
      expect(result.expired).toBe(false);
      expect(result.message).toBe('');
    });

    it('should license all plugins with wildcard (*)', () => {
      const key = makeLicenseKey({ plugins: ['*'] });
      setGridStormLicense(encodeLicenseKey(key));

      const result1 = validateLicense('pivoting');
      expect(result1.valid).toBe(true);
      expect(result1.pluginLicensed).toBe(true);

      const result2 = validateLicense('some-random-plugin');
      expect(result2.valid).toBe(true);
      expect(result2.pluginLicensed).toBe(true);

      const result3 = validateLicense('aggregation');
      expect(result3.valid).toBe(true);
      expect(result3.pluginLicensed).toBe(true);
    });

    it('should detect development mode on localhost', () => {
      // jsdom sets location.hostname to 'localhost' by default
      const key = makeLicenseKey({ plugins: ['pivoting'] });
      setGridStormLicense(encodeLicenseKey(key));

      const result = validateLicense('pivoting');

      expect(result.isDevelopment).toBe(true);
    });

    it('should perform domain validation in production (non-dev)', () => {
      // We need to simulate a non-development environment with domain restrictions
      // Override window.location.hostname to a production domain
      const originalHostname = window.location.hostname;

      // Use Object.defineProperty to mock hostname
      Object.defineProperty(window, 'location', {
        value: { ...window.location, hostname: 'app.example.com' },
        writable: true,
        configurable: true,
      });

      const key = makeLicenseKey({
        plugins: ['pivoting'],
        domains: ['example.com'],
      });
      setGridStormLicense(encodeLicenseKey(key));

      const result = validateLicense('pivoting');

      // Domain matches (app.example.com ends with .example.com)
      expect(result.valid).toBe(true);
      expect(result.pluginLicensed).toBe(true);

      // Restore
      Object.defineProperty(window, 'location', {
        value: { ...window.location, hostname: originalHostname },
        writable: true,
        configurable: true,
      });
    });

    it('should reject unauthorized domains in production', () => {
      Object.defineProperty(window, 'location', {
        value: { ...window.location, hostname: 'evil.example.org' },
        writable: true,
        configurable: true,
      });

      const key = makeLicenseKey({
        plugins: ['pivoting'],
        domains: ['example.com'],
      });
      setGridStormLicense(encodeLicenseKey(key));

      const result = validateLicense('pivoting');

      expect(result.valid).toBe(false);
      expect(result.pluginLicensed).toBe(true); // plugin IS licensed, domain is not
      expect(result.message).toContain('not authorized');

      // Restore to localhost for other tests
      Object.defineProperty(window, 'location', {
        value: { ...window.location, hostname: 'localhost' },
        writable: true,
        configurable: true,
      });
    });

    it('should skip domain check when domains list is empty', () => {
      Object.defineProperty(window, 'location', {
        value: { ...window.location, hostname: 'anything.example.org' },
        writable: true,
        configurable: true,
      });

      const key = makeLicenseKey({
        plugins: ['pivoting'],
        domains: [], // empty = unlimited
      });
      setGridStormLicense(encodeLicenseKey(key));

      const result = validateLicense('pivoting');

      expect(result.valid).toBe(true);
      expect(result.pluginLicensed).toBe(true);

      // Restore
      Object.defineProperty(window, 'location', {
        value: { ...window.location, hostname: 'localhost' },
        writable: true,
        configurable: true,
      });
    });
  });

  describe('getLicenseInfo', () => {
    it('should return default community info when no license is set', () => {
      const info = getLicenseInfo();

      expect(info.isValid).toBe(false);
      expect(info.tier).toBe('community');
      expect(info.org).toBe('');
      expect(info.expiresAt).toBeNull();
      expect(info.licensedPlugins).toEqual([]);
    });

    it('should return correct info for a valid license', () => {
      const key = makeLicenseKey({
        org: 'Test Org',
        tier: 'enterprise',
        plugins: ['pivoting', 'aggregation'],
        expiresAt: '2030-12-31T23:59:59.000Z',
      });
      setGridStormLicense(encodeLicenseKey(key));

      const info = getLicenseInfo();

      expect(info.isValid).toBe(true);
      expect(info.tier).toBe('enterprise');
      expect(info.org).toBe('Test Org');
      expect(info.expiresAt).toBe('2030-12-31T23:59:59.000Z');
      expect(info.licensedPlugins).toEqual(['pivoting', 'aggregation']);
    });

    it('should return a copy of the plugins array (not mutable reference)', () => {
      const key = makeLicenseKey({ plugins: ['pivoting'] });
      setGridStormLicense(encodeLicenseKey(key));

      const info1 = getLicenseInfo();
      info1.licensedPlugins.push('hacked-plugin');

      const info2 = getLicenseInfo();
      expect(info2.licensedPlugins).toEqual(['pivoting']);
    });
  });

  describe('LicenseManager', () => {
    it('should have static methods matching module functions', () => {
      expect(LicenseManager.setLicense).toBe(setGridStormLicense);
      expect(LicenseManager.validate).toBe(validateLicense);
      expect(LicenseManager.getInfo).toBe(getLicenseInfo);
    });

    it('should generate a valid trial key', () => {
      const trialKey = LicenseManager.generateTrialKey('Trial Org', 14);

      expect(trialKey).toMatch(/^GS-/);

      // Set the trial key and verify it works
      setGridStormLicense(trialKey);

      const info = getLicenseInfo();
      expect(info.isValid).toBe(true);
      expect(info.tier).toBe('professional');
      expect(info.org).toBe('Trial Org');
      expect(info.licensedPlugins).toEqual(['*']);

      // Verify the expiration is roughly 14 days from now
      const expiresAt = new Date(info.expiresAt!);
      const now = new Date();
      const diffDays = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(13);
      expect(diffDays).toBeLessThan(15);
    });

    it('should generate trial key with default 30 days', () => {
      const trialKey = LicenseManager.generateTrialKey('Default Trial');
      setGridStormLicense(trialKey);

      const info = getLicenseInfo();
      const expiresAt = new Date(info.expiresAt!);
      const now = new Date();
      const diffDays = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(29);
      expect(diffDays).toBeLessThan(31);
    });

    it('should validate all plugins with trial key wildcard', () => {
      const trialKey = LicenseManager.generateTrialKey('Trial Org');
      setGridStormLicense(trialKey);

      expect(validateLicense('pivoting').pluginLicensed).toBe(true);
      expect(validateLicense('grouping').pluginLicensed).toBe(true);
      expect(validateLicense('any-plugin').pluginLicensed).toBe(true);
    });
  });
});
