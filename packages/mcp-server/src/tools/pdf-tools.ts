import type { ToolDefinition, ToolHandler } from '../types';
import { pdfSchemas } from '../schemas';

const PDF_NOT_CONFIGURED = '[GridStorm PDF] No PDF parser configured. ' +
  'Install pdfjs-dist and pass a PdfParser to the PDF engine options. ' +
  'See documentation for setup instructions.';

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
      return {
        success: false,
        error: PDF_NOT_CONFIGURED,
        data: {
          source: input.source,
          hint: 'PDF loading requires pdf.js integration (Phase 2). Configure a PdfParser implementation to enable this feature.',
        },
      };
    },

    pdf_extract_text: (input) => {
      return {
        success: false,
        error: PDF_NOT_CONFIGURED,
        data: {
          pageIndex: input.pageIndex ?? null,
          allPages: input.allPages ?? false,
          hint: 'Text extraction requires a loaded PDF document with pdf.js parser configured.',
        },
      };
    },

    pdf_search: (input) => {
      return {
        success: false,
        error: PDF_NOT_CONFIGURED,
        data: {
          query: input.query,
          hint: 'PDF search requires a loaded PDF document with pdf.js parser configured.',
        },
      };
    },

    pdf_annotate: (input) => {
      return {
        success: false,
        error: PDF_NOT_CONFIGURED,
        data: {
          pageIndex: input.pageIndex,
          type: input.type,
          rect: input.rect,
          hint: 'Annotation support requires a loaded PDF document with pdf.js parser configured.',
        },
      };
    },

    pdf_redact: (input) => {
      return {
        success: false,
        error: PDF_NOT_CONFIGURED,
        data: {
          pageIndex: input.pageIndex,
          rect: input.rect,
          hint: 'Redaction support requires a loaded PDF document with pdf.js parser configured.',
        },
      };
    },

    pdf_save: (input) => {
      return {
        success: false,
        error: PDF_NOT_CONFIGURED,
        data: {
          fileName: input.fileName || 'output.pdf',
          hint: 'PDF save requires a loaded PDF document with pdf.js parser configured.',
        },
      };
    },

    pdf_get_metadata: () => {
      return {
        success: false,
        error: PDF_NOT_CONFIGURED,
        data: {
          hint: 'Metadata extraction requires a loaded PDF document with pdf.js parser configured.',
        },
      };
    },
  };

  return { definitions, handlers };
}
