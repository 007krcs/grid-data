// ─── Text Plugin ───
//
// GridStorm PDF plugin for text extraction and search.

import type {
  PdfPlugin,
  PdfPluginContext,
  PdfPluginDisposer,
} from '@gridstorm/pdf-core';
import { TextExtractor } from './text-extractor';
import { SearchEngine } from './search-engine';
import type { SearchOptions, SearchResult, SearchMatch } from './search-engine';

/** Plugin state for text operations. */
export interface TextPluginState {
  /** Current search query. */
  searchQuery: string;
  /** Search options. */
  searchOptions: SearchOptions;
  /** Last search result. */
  searchResult: SearchResult | null;
  /** Active search match. */
  activeMatch: SearchMatch | null;
}

/** Public API exposed by the text plugin. */
export interface TextPluginApi {
  /** Extract text from a specific page. */
  extractPageText(pageIndex: number): void;
  /** Extract text from all pages. */
  extractAllText(): void;
  /** Search for text across all pages. */
  search(query: string, options?: SearchOptions): SearchResult;
  /** Navigate to next search match. */
  searchNext(): SearchMatch | null;
  /** Navigate to previous search match. */
  searchPrev(): SearchMatch | null;
  /** Clear search results. */
  clearSearch(): void;
  /** Get the text extractor instance. */
  getExtractor(): TextExtractor;
  /** Get the search engine instance. */
  getSearchEngine(): SearchEngine;
}

const INITIAL_STATE: TextPluginState = {
  searchQuery: '',
  searchOptions: {},
  searchResult: null,
  activeMatch: null,
};

/** Create the text extraction and search plugin. */
export function createTextPlugin(): PdfPlugin {
  return {
    id: 'text',
    name: 'Text Extraction & Search',
    version: '0.1.0',

    install(context: PdfPluginContext): PdfPluginDisposer {
      const extractor = new TextExtractor();
      const searchEngine = new SearchEngine();

      // Register plugin state
      context.registerState<TextPluginState>('text', { ...INITIAL_STATE });

      // ─── Command Handlers ───

      const unsubExtract = context.commandBus.registerHandler(
        'text:extract',
        (payload: { pageIndex: number }) => {
          const state = context.store.getState();
          const page = state.pages[payload.pageIndex];
          if (!page) return;

          // In Phase 1, use placeholder chars; Phase 2 will use pdf.js
          const chars = extractor.buildCharsFromString(
            `Sample text for page ${payload.pageIndex + 1}`,
            72, // 1 inch margin
            72,
            12,
          );

          const textContent = extractor.extract(chars, page);

          // Update page state with extracted text
          context.store.setState((prev) => {
            const pages = [...prev.pages];
            const existing = pages[payload.pageIndex];
            if (existing) {
              pages[payload.pageIndex] = { ...existing, textContent };
            }
            return { ...prev, pages };
          });

          // Feed text to search engine
          searchEngine.setPageTextContent(payload.pageIndex, textContent);

          context.eventBus.emit('text:extracted', {
            pageIndex: payload.pageIndex,
            textContent,
          });
        },
      );

      const unsubSearch = context.commandBus.registerHandler(
        'text:search',
        (payload: { query: string; options?: SearchOptions }) => {
          const result = searchEngine.search(payload.query, payload.options);

          context.setState<TextPluginState>('text', (prev) => ({
            ...prev,
            searchQuery: payload.query,
            searchOptions: payload.options ?? {},
            searchResult: result,
            activeMatch: searchEngine.getActiveMatch(),
          }));

          context.eventBus.emit('search:found', {
            query: payload.query,
            matches: result.matches,
            total: result.totalCount,
          });
        },
      );

      const unsubSearchNext = context.commandBus.registerHandler(
        'text:searchNext',
        () => {
          const match = searchEngine.nextMatch();
          context.setState<TextPluginState>('text', (prev) => ({
            ...prev,
            activeMatch: match,
            searchResult: searchEngine.getLastResult(),
          }));

          if (match) {
            // Navigate to the match page
            context.api.goToPage(match.pageIndex);
          }
        },
      );

      const unsubSearchPrev = context.commandBus.registerHandler(
        'text:searchPrev',
        () => {
          const match = searchEngine.prevMatch();
          context.setState<TextPluginState>('text', (prev) => ({
            ...prev,
            activeMatch: match,
            searchResult: searchEngine.getLastResult(),
          }));

          if (match) {
            context.api.goToPage(match.pageIndex);
          }
        },
      );

      // ─── Plugin API ───

      const pluginApi: TextPluginApi = {
        extractPageText(pageIndex: number) {
          context.commandBus.dispatch('text:extract', { pageIndex });
        },
        extractAllText() {
          const state = context.store.getState();
          for (let i = 0; i < state.pages.length; i++) {
            context.commandBus.dispatch('text:extract', { pageIndex: i });
          }
        },
        search(query: string, options?: SearchOptions) {
          context.commandBus.dispatch('text:search', { query, options });
          return searchEngine.getLastResult();
        },
        searchNext() {
          context.commandBus.dispatch('text:searchNext', {});
          return searchEngine.getActiveMatch();
        },
        searchPrev() {
          context.commandBus.dispatch('text:searchPrev', {});
          return searchEngine.getActiveMatch();
        },
        clearSearch() {
          searchEngine.clearAll();
          context.setState<TextPluginState>('text', () => ({
            ...INITIAL_STATE,
          }));
        },
        getExtractor() {
          return extractor;
        },
        getSearchEngine() {
          return searchEngine;
        },
      };

      // Expose API via plugin context (can be retrieved via api.getPluginApi('text'))
      (context as any)._pluginApi = pluginApi;

      return () => {
        unsubExtract();
        unsubSearch();
        unsubSearchNext();
        unsubSearchPrev();
        searchEngine.clearAll();
      };
    },
  };
}
