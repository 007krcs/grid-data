// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── @gridstorm/plugin-validation — Public API ───

export { ValidationPlugin } from './validation-plugin';
export type {
  ValidationPluginOptions,
  ValidatorType,
  ValidationRule,
  ValidationParams,
  ValidationError,
  ValidationState,
} from './types';
export {
  validateRequired,
  validateEmail,
  validatePhone,
  validateUrl,
  validateRegex,
  validateRange,
  validateList,
  validateLength,
  validateInteger,
} from './validators';
export { validateCrossCell } from './cross-cell-validator';
export { validateCell, validateRow, validateAll } from './validation-engine';
