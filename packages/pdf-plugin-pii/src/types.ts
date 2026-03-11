export type PiiType =
  | 'email'
  | 'phone'
  | 'ssn'
  | 'credit-card'
  | 'date-of-birth'
  | 'address'
  | 'name'
  | 'passport'
  | 'ip-address'
  | 'custom';

export interface PiiMatch {
  type: PiiType;
  value: string;
  pageIndex: number;
  startIndex: number;
  endIndex: number;
  confidence: number; // 0-1
  rect?: [number, number, number, number];
}

export interface PiiConfig {
  enabledTypes?: PiiType[];
  confidenceThreshold?: number; // default 0.7
  customPatterns?: CustomPattern[];
  autoScan?: boolean;
}

export interface CustomPattern {
  name: string;
  type: PiiType;
  pattern: RegExp;
  confidence: number;
}

export interface DetectionResult {
  pageIndex: number;
  matches: PiiMatch[];
  scannedAt: number;
}

export interface PiiPluginState {
  matches: PiiMatch[];
  scanProgress: number; // 0-1
  config: PiiConfig;
  lastScanAt: number | null;
}
