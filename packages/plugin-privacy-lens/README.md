# @gridstorm/plugin-privacy-lens

Scans grid cell values for PII (Personally Identifiable Information) using pattern recognition. Masks sensitive values with configurable reveal policies. Generates a GDPR/CCPA data map showing which columns contain which PII categories.

## Installation

```bash
pnpm add @gridstorm/plugin-privacy-lens
```

## Usage

```typescript
import { PrivacyLensPlugin } from '@gridstorm/plugin-privacy-lens';

const grid = createGrid({
  plugins: [
    PrivacyLensPlugin({
      autoDetect: true,
      defaultRevealPolicy: 'on-click',
      defaultMaskChar: '*',
      auditLog: true,
      onReveal: (entry) => {
        console.log(`User ${entry.userId} revealed ${entry.columnId} for row ${entry.rowId}`);
      },
    }),
  ],
});
```

## GDPR Compliance Example

```typescript
// Export a data map for GDPR documentation
grid.commandBus.dispatch('privacy:export-map', {});

grid.eventBus.on('privacy:map-exported', (dataMap) => {
  console.log(`Found ${dataMap.totalPiiColumns} PII columns across ${dataMap.totalPiiCells} cells`);

  for (const col of dataMap.columns) {
    console.log(`  ${col.columnId}: ${col.piiCategories.join(', ')}`);
  }
});

// Get the full audit trail
grid.commandBus.dispatch('privacy:get-audit', {});

grid.eventBus.on('privacy:audit-listed', ({ entries }) => {
  // Export audit log to your compliance system
  sendToComplianceSystem(entries);
});
```

## Custom Reveal Policy Guide

Each column can have its own reveal policy:

```typescript
// Configure a column with custom masking
grid.commandBus.dispatch('privacy:configure', {
  columnId: 'ssn',
  piiCategories: ['ssn'],
  masked: true,
  revealPolicy: 'on-click',  // 'never' | 'on-hover' | 'on-click' | 'always'
  maskChar: '*',
  maskLength: 3,  // show first 3 chars: "123-**-****"
});

// Programmatically mask/unmask a column
grid.commandBus.dispatch('privacy:mask', { columnId: 'email' });
grid.commandBus.dispatch('privacy:unmask', { columnId: 'email' });

// Log a cell reveal action to the audit log
grid.commandBus.dispatch('privacy:reveal-cell', {
  columnId: 'ssn',
  rowId: 'row-42',
  userId: 'admin@company.com',
});
```

## Data Map Export

```typescript
// Scan a specific column for PII
grid.commandBus.dispatch('privacy:scan-column', { columnId: 'contact_info' });

grid.eventBus.on('privacy:pii-detected', ({ columnId, piiCategories, confidence }) => {
  console.log(`${columnId} contains: ${piiCategories.join(', ')} (confidence: ${confidence})`);
});
```

## Supported PII Categories

| Category         | Pattern Example                        |
|------------------|----------------------------------------|
| `email`          | `user@example.com`                     |
| `phone`          | `555-123-4567`, `(555) 987-6543`       |
| `ssn`            | `123-45-6789`                          |
| `credit-card`    | Visa/MC/Amex card numbers              |
| `ip-address`     | `192.168.1.1`                          |
| `full-name`      | `John Smith`, `Jane A. Doe`            |
| `address`        | `123 Main St`, `456 Oak Ave`           |
| `iban`           | `GB29NWBK60161331926819`               |
| `passport`       | `A12345678`                            |
| `date-of-birth`  | `1990-01-15`, `01/15/1990`             |
| `national-id`    | `12345678901`                          |
| `medical-record` | `MRN-1234567`, `MED-9876543`           |

## Events

| Event                    | Payload                                                      |
|--------------------------|--------------------------------------------------------------|
| `privacy:pii-detected`   | `{ columnId, piiCategories, confidence }`                   |
| `privacy:cell-revealed`  | `PrivacyAuditEntry`                                          |
| `privacy:map-exported`   | `PrivacyDataMap`                                             |
| `privacy:audit-listed`   | `{ entries: PrivacyAuditEntry[] }`                          |
| `privacy:column-masked`  | `{ columnId: string }`                                       |
| `privacy:column-unmasked`| `{ columnId: string }`                                       |
