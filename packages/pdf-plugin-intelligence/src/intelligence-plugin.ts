import type { IntelligencePluginState, ExtractedField, DetectedTable } from './types';
import { classifyDocument } from './classifier';
import { extractFields } from './extractor';
import { summarizeDocument } from './summarizer';
import { detectTables } from './table-detector';

interface PdfPlugin {
  id: string;
  name: string;
  version: string;
  dependencies?: string[];
  install(context: any): (() => void) | void;
}

export function createIntelligencePlugin(): PdfPlugin {
  return {
    id: 'intelligence',
    name: 'Document Intelligence',
    version: '0.1.0',
    dependencies: ['text'],

    install(context: any) {
      const unsubs: (() => void)[] = [];

      const initialState: IntelligencePluginState = {
        classifications: [],
        extractedFields: [],
        summary: null,
        tables: [],
        lastAnalysisAt: null,
      };
      context.registerState('intelligence', initialState);

      // Helper: get all text from document
      function getAllText(): string {
        const state = context.store.getState();
        const texts: string[] = [];
        for (const page of state.pages) {
          if (page?.textContent?.lines) {
            texts.push(page.textContent.lines.map((l: any) => l.text).join('\n'));
          }
        }
        return texts.join('\n\n');
      }

      // Command: intel:classify
      unsubs.push(context.commandBus.registerHandler('intel:classify', (payload: { topN?: number }) => {
        const text = getAllText();
        let classifications = classifyDocument(text);

        const topN = payload.topN || 3;
        classifications = classifications.slice(0, topN);

        context.setState('intelligence', (prev: IntelligencePluginState) => ({
          ...prev,
          classifications,
          lastAnalysisAt: Date.now(),
        }));

        context.eventBus.emit('intel:classified', { classifications });
      }));

      // Command: intel:extract
      unsubs.push(context.commandBus.registerHandler('intel:extract', (payload: { fields?: string[] }) => {
        const state = context.store.getState();
        let allFields: ExtractedField[] = [];

        for (let i = 0; i < state.pages.length; i++) {
          const page = state.pages[i];
          if (!page?.textContent?.lines) continue;
          const text = page.textContent.lines.map((l: any) => l.text).join('\n');
          const fields = extractFields(text, i);
          allFields.push(...fields);
        }

        // Filter to requested fields if specified
        if (payload.fields && payload.fields.length > 0) {
          const requested = new Set(payload.fields.map((f: string) => f.toLowerCase()));
          allFields = allFields.filter((f) => requested.has(f.name.toLowerCase()));
        }

        context.setState('intelligence', (prev: IntelligencePluginState) => ({
          ...prev,
          extractedFields: allFields,
          lastAnalysisAt: Date.now(),
        }));

        context.eventBus.emit('intel:extracted', { fields: allFields, count: allFields.length });
      }));

      // Command: intel:summarize
      unsubs.push(context.commandBus.registerHandler('intel:summarize', (payload: { maxLength?: number }) => {
        const text = getAllText();
        const state = context.store.getState();
        const summary = summarizeDocument(text, state.pages.length, payload.maxLength);

        context.setState('intelligence', (prev: IntelligencePluginState) => ({
          ...prev,
          summary,
          lastAnalysisAt: Date.now(),
        }));

        context.eventBus.emit('intel:summarized', { summary });
      }));

      // Command: intel:detectTables
      unsubs.push(context.commandBus.registerHandler('intel:detectTables', () => {
        const state = context.store.getState();
        const allTables: DetectedTable[] = [];

        for (const page of state.pages) {
          if (!page?.textContent?.lines) continue;
          const lines = page.textContent.lines.map((l: any) => ({
            text: l.text,
            rect: l.rect as [number, number, number, number],
          }));
          const tables = detectTables(lines, page.index);
          allTables.push(...tables);
        }

        context.setState('intelligence', (prev: IntelligencePluginState) => ({
          ...prev,
          tables: allTables,
          lastAnalysisAt: Date.now(),
        }));

        context.eventBus.emit('intel:tablesDetected', { tables: allTables, count: allTables.length });
      }));

      return () => unsubs.forEach((fn) => fn());
    },
  };
}
