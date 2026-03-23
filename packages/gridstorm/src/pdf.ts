/**
 * GridStorm PDF Toolkit — Complete PDF processing
 *
 * ```ts
 * import { createTextPlugin, PageRenderer } from 'gridstorm/pdf';
 * ```
 *
 * @module gridstorm/pdf
 */

// Core first — establishes base types
export * from '../../pdf-core/src/index';
export * from '../../pdf-renderer/src/index';
export * from '../../pdf-theme/src/index';
export * from '../../pdf-plugin-form-fill/src/index';
export * from '../../pdf-plugin-intelligence/src/index';
export * from '../../pdf-plugin-pii/src/index';

// Text plugin has SearchMatch conflict with pdf-core — export selectively
export {
  createTextPlugin,
  TextExtractor,
  SearchEngine,
  type TextPluginState,
  type TextPluginApi,
  type TextExtractorConfig,
} from '../../pdf-plugin-text/src/index';
