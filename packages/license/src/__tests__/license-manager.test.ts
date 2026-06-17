// © 2026 GridStorm Contributors — MIT License
//
// License enforcement was removed; these tests pin the new permissive
// contract so a future change can't silently re-introduce gating.

import { describe, it, expect } from 'vitest';
import {
  setGridStormLicense,
  validateLicense,
  enforceLicense,
  getLicenseInfo,
  setLicenseStrictMode,
  isLicenseStrictMode,
  LicenseRequiredError,
} from '../license-manager';

describe('open-source license stubs', () => {
  it('validateLicense always returns valid for any plugin id', () => {
    const r = validateLicense('any-plugin-id');
    expect(r.valid).toBe(true);
    expect(r.expired).toBe(false);
    expect(r.pluginLicensed).toBe(true);
    expect(r.tier).toBe('enterprise');
  });

  it('enforceLicense never throws and returns the same permissive result', () => {
    expect(() => enforceLicense('ssrm')).not.toThrow();
    const r = enforceLicense('ssrm');
    expect(r.valid).toBe(true);
    expect(r.pluginLicensed).toBe(true);
  });

  it('setGridStormLicense is a no-op (accepts any input, no throw)', () => {
    expect(() => setGridStormLicense('')).not.toThrow();
    expect(() => setGridStormLicense('GS-totally-bogus')).not.toThrow();
    expect(() => setGridStormLicense('GS2-anything.signature')).not.toThrow();
    expect(validateLicense('x').valid).toBe(true);
  });

  it('strict-mode toggle is a no-op and never gates anything', () => {
    setLicenseStrictMode(true);
    expect(isLicenseStrictMode()).toBe(false);
    expect(() => enforceLicense('excel-export')).not.toThrow();
    setLicenseStrictMode(false);
    expect(isLicenseStrictMode()).toBe(false);
  });

  it('getLicenseInfo reports the permissive open-source license', () => {
    const info = getLicenseInfo();
    expect(info.isValid).toBe(true);
    expect(info.tier).toBe('enterprise');
    expect(info.licensedPlugins).toContain('*');
  });

  it('LicenseRequiredError class still exists for error-handling compatibility', () => {
    const e = new LicenseRequiredError('ssrm');
    expect(e).toBeInstanceOf(Error);
    expect(e.pluginId).toBe('ssrm');
  });
});
