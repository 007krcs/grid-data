// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
import type { PiiConfig, PiiPluginState, PiiMatch } from './types';
import { detectPatterns } from './detectors/patterns';
import { detectNames } from './detectors/names';
import { detectAddresses } from './detectors/addresses';
import { deduplicateMatches, filterByThreshold } from './confidence';

// Use inline PdfPlugin type to avoid import issues with pdf-core at runtime
interface PdfPlugin {
  id: string;
  name: string;
  version: string;
  dependencies?: string[];
  install(context: PdfPluginContext): (() => void) | void;
}

interface PdfPluginContext {
  api: unknown;
  store: {
    getState(): PdfDocumentState;
    setState(
      updater: (prev: PdfDocumentState) => PdfDocumentState,
    ): void;
  };
  eventBus: {
    on(event: string, handler: (...args: unknown[]) => void): () => void;
    emit(event: string, payload: unknown): void;
  };
  commandBus: {
    registerHandler(
      cmd: string,
      handler: (...args: unknown[]) => void,
    ): () => void;
    dispatch(cmd: string, payload: unknown): void;
  };
  config: unknown;
  registerState<S>(key: string, initial: S): void;
  getState<S>(key: string): S;
  setState<S>(key: string, updater: (prev: S) => S): void;
}

interface TextLine {
  text: string;
}

interface TextContent {
  lines?: TextLine[];
}

interface PageState {
  textContent?: TextContent;
}

interface PdfDocumentState {
  pages: PageState[];
}

const DEFAULT_CONFIG: PiiConfig = {
  confidenceThreshold: 0.7,
  autoScan: false,
};

export function createPiiPlugin(config: PiiConfig = {}): PdfPlugin {
  return {
    id: 'pii',
    name: 'PII Detection & Redaction',
    version: '0.1.0',
    dependencies: ['text'],

    install(context: PdfPluginContext) {
      const mergedConfig = { ...DEFAULT_CONFIG, ...config };
      const unsubs: (() => void)[] = [];

      // Register plugin state
      const initialState: PiiPluginState = {
        matches: [],
        scanProgress: 0,
        config: mergedConfig,
        lastScanAt: null,
      };
      context.registerState('pii', initialState);

      // Scan a single page
      function scanPage(pageIndex: number, text: string): PiiMatch[] {
        const enabledTypes = mergedConfig.enabledTypes;
        const threshold = mergedConfig.confidenceThreshold ?? 0.7;

        let matches: PiiMatch[] = [
          ...detectPatterns(text, pageIndex, enabledTypes),
          ...detectNames(text, pageIndex),
          ...detectAddresses(text, pageIndex),
        ];

        // Add custom patterns (with ReDoS protection via execution timeout)
        if (mergedConfig.customPatterns) {
          for (const custom of mergedConfig.customPatterns) {
            const regex = new RegExp(custom.pattern.source, custom.pattern.flags);
            let m: RegExpExecArray | null;
            const maxMatches = 1000; // Safety cap to prevent catastrophic backtracking
            let matchCount = 0;
            const startTime = Date.now();
            const timeoutMs = 100; // Max 100ms per pattern per page
            while ((m = regex.exec(text)) !== null) {
              matchCount++;
              if (matchCount > maxMatches || Date.now() - startTime > timeoutMs) {
                // Abort: pattern is likely pathological (ReDoS) or data is too large
                break;
              }
              matches.push({
                type: custom.type,
                value: m[0],
                pageIndex,
                startIndex: m.index,
                endIndex: m.index + m[0].length,
                confidence: custom.confidence,
              });
              // Guard against zero-length matches causing infinite loops
              if (m[0].length === 0) {
                regex.lastIndex++;
              }
            }
          }
        }

        matches = deduplicateMatches(matches);
        matches = filterByThreshold(matches, threshold);

        return matches;
      }

      // Command: pii:scan -- scan a specific page
      unsubs.push(
        context.commandBus.registerHandler(
          'pii:scan',
          (_payload: unknown) => {
            const payload = _payload as { pageIndex: number };
            const state = context.store.getState();
            const page = state.pages[payload.pageIndex];
            if (!page?.textContent) return;

            const text = page.textContent.lines
              ? page.textContent.lines.map((l: TextLine) => l.text).join('\n')
              : '';

            const newMatches = scanPage(payload.pageIndex, text);

            context.setState<PiiPluginState>('pii', (prev) => {
              // Remove old matches for this page, add new ones
              const filtered = prev.matches.filter(
                (m) => m.pageIndex !== payload.pageIndex,
              );
              return {
                ...prev,
                matches: [...filtered, ...newMatches],
                lastScanAt: Date.now(),
              };
            });

            context.eventBus.emit('pii:detected', {
              pageIndex: payload.pageIndex,
              matches: newMatches,
              total: newMatches.length,
            });
          },
        ),
      );

      // Command: pii:scanAll -- scan all pages
      unsubs.push(
        context.commandBus.registerHandler('pii:scanAll', () => {
          const state = context.store.getState();
          const allMatches: PiiMatch[] = [];

          for (let i = 0; i < state.pages.length; i++) {
            const page = state.pages[i];
            if (!page?.textContent) continue;

            const text = page.textContent.lines
              ? page.textContent.lines.map((l: TextLine) => l.text).join('\n')
              : '';

            const pageMatches = scanPage(i, text);
            allMatches.push(...pageMatches);

            context.setState<PiiPluginState>('pii', (prev) => ({
              ...prev,
              scanProgress: (i + 1) / state.pages.length,
            }));
          }

          context.setState<PiiPluginState>('pii', (prev) => ({
            ...prev,
            matches: allMatches,
            scanProgress: 1,
            lastScanAt: Date.now(),
          }));

          context.eventBus.emit('pii:detected', {
            pageIndex: -1,
            matches: allMatches,
            total: allMatches.length,
          });
        }),
      );

      // Command: pii:autoRedact -- create redaction annotations for all matches
      unsubs.push(
        context.commandBus.registerHandler(
          'pii:autoRedact',
          (_payload: unknown) => {
            const payload = _payload as { types?: string[] };
            const piiState = context.getState<PiiPluginState>('pii');
            let matches = piiState.matches;

            if (payload.types && payload.types.length > 0) {
              matches = matches.filter((m) => payload.types!.includes(m.type));
            }

            for (const match of matches) {
              // Create redaction annotation
              if (match.rect) {
                context.commandBus.dispatch('redaction:mark', {
                  pageIndex: match.pageIndex,
                  rect: match.rect,
                  overlayText: `[${match.type.toUpperCase()} REDACTED]`,
                });
              }
            }

            context.eventBus.emit('pii:redacted', {
              count: matches.length,
              types: [...new Set(matches.map((m) => m.type))],
            });
          },
        ),
      );

      // Command: pii:configure -- update config
      unsubs.push(
        context.commandBus.registerHandler(
          'pii:configure',
          (_payload: unknown) => {
            const payload = _payload as Partial<PiiConfig>;
            context.setState<PiiPluginState>('pii', (prev) => ({
              ...prev,
              config: { ...prev.config, ...payload },
            }));
          },
        ),
      );

      // Auto-scan on text extraction if enabled
      if (mergedConfig.autoScan) {
        unsubs.push(
          context.eventBus.on('text:extracted', (_e: unknown) => {
            const e = _e as { pageIndex: number };
            context.commandBus.dispatch('pii:scan', {
              pageIndex: e.pageIndex,
            });
          }),
        );
      }

      return () => {
        unsubs.forEach((fn) => fn());
      };
    },
  };
}
