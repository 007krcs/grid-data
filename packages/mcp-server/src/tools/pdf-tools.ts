import type { ToolDefinition, ToolHandler } from '../types';
import { pdfSchemas } from '../schemas';

export function createPdfTools(): { definitions: ToolDefinition[]; handlers: Record<string, ToolHandler> } {
  const definitions: ToolDefinition[] = [
    { name: 'pdf_load', description: 'Load a PDF document from a file path or URL', inputSchema: pdfSchemas.pdf_load },
    { name: 'pdf_extract_text', description: 'Extract text content from PDF pages', inputSchema: pdfSchemas.pdf_extract_text },
    { name: 'pdf_search', description: 'Search for text within the loaded PDF', inputSchema: pdfSchemas.pdf_search },
    { name: 'pdf_annotate', description: 'Add annotations (highlight, underline, text, etc.) to a PDF page', inputSchema: pdfSchemas.pdf_annotate },
    { name: 'pdf_redact', description: 'Redact sensitive content from a PDF region', inputSchema: pdfSchemas.pdf_redact },
    { name: 'pdf_save', description: 'Save the current PDF document to a file', inputSchema: pdfSchemas.pdf_save },
    { name: 'pdf_get_metadata', description: 'Get metadata (title, author, pages, etc.) from the loaded PDF', inputSchema: pdfSchemas.pdf_get_metadata },
  ];

  const handlers: Record<string, ToolHandler> = {
    pdf_load: (input) => {
      return { success: true, data: { message: 'PDF loaded', source: input.source } };
    },
    pdf_extract_text: (input) => {
      return { success: true, data: { text: '', pageIndex: input.pageIndex ?? null, allPages: input.allPages ?? false } };
    },
    pdf_search: (input) => {
      return { success: true, data: { query: input.query, matches: [], totalMatches: 0 } };
    },
    pdf_annotate: (input) => {
      return { success: true, data: { message: 'Annotation added', pageIndex: input.pageIndex, type: input.type, rect: input.rect } };
    },
    pdf_redact: (input) => {
      return { success: true, data: { message: 'Redaction applied', pageIndex: input.pageIndex, rect: input.rect } };
    },
    pdf_save: (input) => {
      return { success: true, data: { message: 'PDF saved', fileName: input.fileName || 'output.pdf' } };
    },
    pdf_get_metadata: () => {
      return { success: true, data: { title: '', author: '', pages: 0, createdAt: null, modifiedAt: null } };
    },
  };

  return { definitions, handlers };
}
