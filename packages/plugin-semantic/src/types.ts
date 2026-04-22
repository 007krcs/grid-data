// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── @gridstorm/plugin-semantic — Types ───

export type SemanticType =
  | 'email' | 'url' | 'phone' | 'currency' | 'percentage'
  | 'date' | 'datetime' | 'boolean' | 'id' | 'name'
  | 'country-code' | 'ip-address' | 'uuid' | 'postal-code'
  | 'integer' | 'decimal' | 'text' | 'unknown';

export interface SemanticDetectionResult {
  type: SemanticType;
  confidence: number; // 0-1
  sampleMatches: number;
  sampleTotal: number;
}

export interface ColumnSemantics {
  columnId: string;
  detectedType: SemanticType;
  confidence: number;
  alternativeTypes: SemanticDetectionResult[];
  statistics: {
    cardinality: number;       // unique value count
    nullCount: number;
    sampleSize: number;
    isMonotonic?: boolean;     // always increasing (for IDs, dates)
    numericRange?: { min: number; max: number };
  };
  analyzedAt: number;
}

export interface ColumnRelationship {
  columnA: string;
  columnB: string;
  relationshipType: 'derived' | 'correlated' | 'inverse' | 'categorical-key';
  strength: number; // 0-1
  description: string;
}

export interface SemanticAnalysis {
  columns: ColumnSemantics[];
  relationships: ColumnRelationship[];
  analyzedAt: number;
}

export interface SemanticPluginOptions {
  sampleSize?: number;           // rows to sample per column, default 200
  minConfidence?: number;        // minimum confidence to report, default 0.6
  autoAnalyze?: boolean;         // analyze on data load, default true
  detectRelationships?: boolean; // detect column relationships, default true
}
