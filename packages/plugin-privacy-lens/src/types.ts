// ─── @gridstorm/plugin-privacy-lens — Types ───

export type PiiCategory =
  | 'email' | 'phone' | 'ssn' | 'credit-card' | 'ip-address'
  | 'full-name' | 'address' | 'iban' | 'passport' | 'date-of-birth'
  | 'national-id' | 'medical-record';

export type RevealPolicy = 'never' | 'on-hover' | 'on-click' | 'always';

export interface PrivacyColumnConfig {
  columnId: string;
  piiCategories: PiiCategory[];
  masked: boolean;
  revealPolicy: RevealPolicy;
  maskChar?: string;    // default '*'
  maskLength?: number;  // show first N chars, default 0
}

export interface PrivacyAuditEntry {
  userId?: string;
  columnId: string;
  rowId: string;
  action: 'revealed' | 'masked' | 'exported';
  timestamp: number;
}

export interface PrivacyDataMap {
  columns: Array<{
    columnId: string;
    piiCategories: PiiCategory[];
    rowCount: number;
    masked: boolean;
    revealPolicy: RevealPolicy;
  }>;
  generatedAt: number;
  totalPiiColumns: number;
  totalPiiCells: number;
}

export interface PrivacyLensOptions {
  autoDetect?: boolean;           // scan columns on data load, default true
  defaultRevealPolicy?: RevealPolicy; // default 'on-click'
  defaultMaskChar?: string;       // default '*'
  auditLog?: boolean;             // log reveal events, default true
  onReveal?: (entry: PrivacyAuditEntry) => void;
  columns?: PrivacyColumnConfig[];
}
