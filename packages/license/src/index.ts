// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
export {
  LicenseManager,
  setGridStormLicense,
  validateLicense,
  enforceLicense,
  LicenseRequiredError,
  getLicenseInfo,
  setLicenseStrictMode,
  isLicenseStrictMode,
} from './license-manager';
export type {
  LicenseKey,
  LicenseInfo,
  LicenseValidationResult,
  LicenseTier,
} from './types';
export { createWatermark, removeWatermark } from './watermark';
