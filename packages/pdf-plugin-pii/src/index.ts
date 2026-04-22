// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
export { createPiiPlugin } from './pii-plugin';
export type {
  PiiType,
  PiiMatch,
  PiiConfig,
  CustomPattern,
  DetectionResult,
  PiiPluginState,
} from './types';
export { detectPatterns } from './detectors/patterns';
export { detectNames } from './detectors/names';
export { detectAddresses } from './detectors/addresses';
export {
  deduplicateMatches,
  filterByThreshold,
  computeOverallRisk,
} from './confidence';
