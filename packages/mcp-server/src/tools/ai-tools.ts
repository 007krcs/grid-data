// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
import type { ToolDefinition, ToolHandler } from '../types';
import { aiSchemas } from '../schemas';

const AI_NOT_CONFIGURED = '[GridStorm AI] AI-powered PDF analysis requires both a configured PDF parser (pdfjs-dist) ' +
  'and an AI/ML backend. See documentation for setup instructions.';

export function createAiTools(): { definitions: ToolDefinition[]; handlers: Record<string, ToolHandler> } {
  const definitions: ToolDefinition[] = [
    { name: 'pdf_detect_pii', description: 'Detect personally identifiable information (PII) in PDF pages', inputSchema: aiSchemas.pdf_detect_pii },
    { name: 'pdf_classify', description: 'Classify the PDF document type and content category', inputSchema: aiSchemas.pdf_classify },
    { name: 'pdf_summarize', description: 'Generate a summary of the PDF document content', inputSchema: aiSchemas.pdf_summarize },
    { name: 'pdf_extract_fields', description: 'Extract structured field values from the PDF document', inputSchema: aiSchemas.pdf_extract_fields },
  ];

  const handlers: Record<string, ToolHandler> = {
    pdf_detect_pii: (input) => {
      return {
        success: false,
        error: AI_NOT_CONFIGURED,
        data: {
          pageIndex: input.pageIndex ?? null,
          types: input.types ?? [],
          threshold: input.threshold ?? 0.8,
          hint: 'PII detection requires a loaded PDF with text extraction and an AI/ML backend for entity recognition.',
        },
      };
    },

    pdf_classify: (input) => {
      return {
        success: false,
        error: AI_NOT_CONFIGURED,
        data: {
          topN: input.topN ?? 3,
          hint: 'Document classification requires a loaded PDF with text extraction and an AI/ML classification model.',
        },
      };
    },

    pdf_summarize: (input) => {
      return {
        success: false,
        error: AI_NOT_CONFIGURED,
        data: {
          maxLength: input.maxLength ?? 500,
          hint: 'Document summarization requires a loaded PDF with text extraction and an AI/ML summarization model.',
        },
      };
    },

    pdf_extract_fields: (input) => {
      return {
        success: false,
        error: AI_NOT_CONFIGURED,
        data: {
          fields: input.fields ?? [],
          hint: 'Field extraction requires a loaded PDF with text extraction and an AI/ML extraction model.',
        },
      };
    },
  };

  return { definitions, handlers };
}
