// ─── Validation Types ───

export type ValidatorType =
  | 'required' | 'email' | 'phone' | 'url'
  | 'regex' | 'range' | 'list' | 'length'
  | 'integer' | 'custom' | 'crossCell' | 'unique';

export interface ValidationRule {
  id: string;
  colId?: string;             // Specific column, or undefined for all
  type: ValidatorType;
  params: ValidationParams;
  message?: string;           // Custom error message
  severity?: 'error' | 'warning' | 'info';  // default: 'error'
  preventSave?: boolean;      // default: true for errors, false otherwise
}

export type ValidationParams =
  | { type: 'required' }
  | { type: 'email' }
  | { type: 'phone'; countryCode?: string }
  | { type: 'url'; requireHttps?: boolean }
  | { type: 'regex'; pattern: string; flags?: string }
  | { type: 'range'; min?: number; max?: number; exclusive?: boolean }
  | { type: 'list'; values: unknown[]; caseSensitive?: boolean }
  | { type: 'length'; min?: number; max?: number }
  | { type: 'integer' }
  | { type: 'custom'; validate: (value: unknown, rowData: Record<string, unknown>) => boolean | string }
  | { type: 'crossCell'; targetField: string; operator: '<' | '>' | '<=' | '>=' | '=' | '!=' }
  | { type: 'unique' };

export interface ValidationError {
  ruleId: string;
  rowId: string;
  colId: string;
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  value: unknown;
}

export interface ValidationState {
  rules: ValidationRule[];
  errors: Map<string, ValidationError[]>;  // key = "rowId:colId"
  isValidating: boolean;
  totalErrors: number;
  totalWarnings: number;
}

export interface ValidationPluginOptions {
  rules?: ValidationRule[];
  validateOnEdit?: boolean;       // default: true
  validateOnLoad?: boolean;       // default: false
  errorCssClass?: string;         // default: 'gs-cell-invalid'
  warningCssClass?: string;       // default: 'gs-cell-warning'
}
