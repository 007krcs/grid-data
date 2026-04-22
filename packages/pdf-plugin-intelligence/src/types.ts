// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
export type DocumentClass = 'invoice' | 'contract' | 'receipt' | 'letter' | 'report' | 'form' | 'legal' | 'medical' | 'financial' | 'unknown';

export interface Classification {
  documentClass: DocumentClass;
  confidence: number;
}

export interface ExtractedField {
  name: string;
  value: string;
  pageIndex: number;
  confidence: number;
}

export interface DocumentSummary {
  title: string;
  description: string;
  keyPoints: string[];
  wordCount: number;
  pageCount: number;
}

export interface DetectedTable {
  pageIndex: number;
  rows: string[][];
  headerRow: string[];
  bounds: [number, number, number, number];
  confidence: number;
}

export interface IntelligencePluginState {
  classifications: Classification[];
  extractedFields: ExtractedField[];
  summary: DocumentSummary | null;
  tables: DetectedTable[];
  lastAnalysisAt: number | null;
}
