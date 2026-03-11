import type { ToolDefinition, ToolHandler } from '../types';
import { aiSchemas } from '../schemas';

export function createAiTools(): { definitions: ToolDefinition[]; handlers: Record<string, ToolHandler> } {
  const definitions: ToolDefinition[] = [
    { name: 'pdf_detect_pii', description: 'Detect personally identifiable information (PII) in PDF pages', inputSchema: aiSchemas.pdf_detect_pii },
    { name: 'pdf_classify', description: 'Classify the PDF document type and content category', inputSchema: aiSchemas.pdf_classify },
    { name: 'pdf_summarize', description: 'Generate a summary of the PDF document content', inputSchema: aiSchemas.pdf_summarize },
    { name: 'pdf_extract_fields', description: 'Extract structured field values from the PDF document', inputSchema: aiSchemas.pdf_extract_fields },
  ];

  const handlers: Record<string, ToolHandler> = {
    pdf_detect_pii: (input) => {
      return { success: true, data: { detections: [], pageIndex: input.pageIndex ?? null, types: input.types ?? [], threshold: input.threshold ?? 0.8 } };
    },
    pdf_classify: (input) => {
      return { success: true, data: { classifications: [], topN: input.topN ?? 3 } };
    },
    pdf_summarize: (input) => {
      return { success: true, data: { summary: '', maxLength: input.maxLength ?? 500 } };
    },
    pdf_extract_fields: (input) => {
      return { success: true, data: { fields: input.fields ?? [], extracted: {} } };
    },
  };

  return { definitions, handlers };
}
