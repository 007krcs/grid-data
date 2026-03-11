// ─── @gridstorm/pdf-plugin-text ───
//
// Text extraction and search plugin for GridStorm PDF.

export { createTextPlugin } from './text-plugin';
export type { TextPluginState, TextPluginApi } from './text-plugin';

export { TextExtractor } from './text-extractor';
export type { TextExtractorConfig } from './text-extractor';

export { SearchEngine } from './search-engine';
export type {
  SearchOptions,
  SearchMatch,
  SearchResult,
} from './search-engine';
