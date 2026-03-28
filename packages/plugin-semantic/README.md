# @gridstorm/plugin-semantic

Analyzes grid column values to detect semantic data types (email, URL, phone, currency, percentage, date, boolean, ID, country, IP address, UUID, and more). Also detects mathematical relationships between numeric columns.

## Installation

```bash
pnpm add @gridstorm/plugin-semantic
```

## Usage

```typescript
import { SemanticPlugin } from '@gridstorm/plugin-semantic';

const grid = createGrid({
  plugins: [
    SemanticPlugin({
      sampleSize: 200,
      minConfidence: 0.6,
      autoAnalyze: true,
      detectRelationships: true,
    }),
  ],
});
```

## Analysis Example

```typescript
// Listen for analysis results
grid.eventBus.on('semantic:column-typed', (result) => {
  console.log(`Column "${result.columnId}" detected as ${result.detectedType} (confidence: ${result.confidence})`);
});

grid.eventBus.on('semantic:relationship-detected', (rel) => {
  console.log(`Relationship: ${rel.columnA} ${rel.relationshipType} ${rel.columnB} (strength: ${rel.strength})`);
});

grid.eventBus.on('semantic:analysis-complete', (analysis) => {
  console.log(`Analyzed ${analysis.columns.length} columns, found ${analysis.relationships.length} relationships`);
});

// Trigger manual analysis
grid.commandBus.dispatch('semantic:analyze', { columnIds: ['email', 'phone'] });

// Get last analysis
grid.commandBus.dispatch('semantic:get-analysis', {});
```

## Detected Type Reference

| Type          | Example Values                                      |
|---------------|-----------------------------------------------------|
| `email`       | `user@example.com`                                  |
| `url`         | `https://example.com/path`                          |
| `phone`       | `555-123-4567`, `(555) 987-6543`                    |
| `currency`    | `$1,234.56`, `€99.99`                               |
| `percentage`  | `42%`, `-5.5%`                                      |
| `date`        | `2024-01-15`, `01/15/2024`                          |
| `datetime`    | `2024-01-15T14:30:00`                               |
| `boolean`     | `true`, `false`, `yes`, `no`, `1`, `0`              |
| `id`          | `42`, `USR001`, `ORD123`                            |
| `name`        | `John Smith`, `Jane Doe`                            |
| `country-code`| `US`, `GB`, `DEU`                                   |
| `ip-address`  | `192.168.1.1`                                       |
| `uuid`        | `550e8400-e29b-41d4-a716-446655440000`              |
| `postal-code` | `12345`, `12345-6789`, `A1B 2C3`                    |
| `integer`     | `42`, `-7`, `0`                                     |
| `decimal`     | `3.14`, `-0.5`                                      |
| `text`        | Any string with 10+ characters                     |
| `unknown`     | Fallback when no pattern matches confidently        |

## Configuration Options

| Option                | Type      | Default | Description                                      |
|-----------------------|-----------|---------|--------------------------------------------------|
| `sampleSize`          | `number`  | `200`   | Number of rows to sample per column              |
| `minConfidence`       | `number`  | `0.6`   | Minimum confidence threshold (0–1)               |
| `autoAnalyze`         | `boolean` | `true`  | Automatically analyze on `data:changed`          |
| `detectRelationships` | `boolean` | `true`  | Detect mathematical relationships between columns|

## Commands

| Command              | Payload                        | Description                        |
|----------------------|--------------------------------|------------------------------------|
| `semantic:analyze`   | `{ columnIds?: string[] }`     | Run analysis on specified columns  |
| `semantic:configure` | `Partial<SemanticPluginOptions>` | Update plugin options            |
| `semantic:get-analysis` | `{}`                        | Re-emit last (or run new) analysis |

## Events

| Event                        | Payload             | Description                         |
|------------------------------|---------------------|-------------------------------------|
| `semantic:column-typed`      | `ColumnSemantics`   | Emitted for each analyzed column    |
| `semantic:relationship-detected` | `ColumnRelationship` | Emitted for each relationship   |
| `semantic:analysis-complete` | `SemanticAnalysis`  | Emitted when full analysis is done  |
