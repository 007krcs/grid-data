---
title: AI
description: Natural language querying, anomaly detection, and smart suggestions for your data grid.
---

The AI plugin adds intelligent data interaction to GridStorm. It includes a natural language query parser that converts plain English into filter/sort operations (regex-based, no API key required), statistical anomaly detection using Z-score and IQR methods, and context-aware suggestions for data exploration. An optional LLM adapter enables advanced queries through external models.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-ai
```

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { AIPlugin } from '@gridstorm/plugin-ai';

const grid = createGrid({
  columns: [
    { colId: 'product', field: 'product', headerName: 'Product' },
    { colId: 'revenue', field: 'revenue', headerName: 'Revenue' },
    { colId: 'region', field: 'region', headerName: 'Region' },
  ],
  rowData: [],
  plugins: [
    AIPlugin({
      anomalyThreshold: 2.5,
      autoDetect: true,
      customPatterns: [
        { pattern: /top sellers/i, action: { sort: 'revenue', direction: 'desc', limit: 10 } },
      ],
    }),
  ],
});
```

:::example{title="Live AI Demo" href="/cookbook/#ai-basic"}
Type natural language queries like "show top 5 by revenue" or "find outliers in sales" and watch the grid respond.
:::

## Plugin Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `customPatterns` | `QueryPattern[]` | `[]` | Custom regex patterns mapped to grid actions. Extends the built-in NL parser. |
| `anomalyThreshold` | `number` | `2.0` | Z-score threshold for flagging values as anomalies. Higher values catch fewer, more extreme outliers. |
| `autoDetect` | `boolean` | `false` | Automatically run anomaly detection when data changes. |
| `llmAdapter` | `LLMAdapter` | `undefined` | Optional adapter for external LLM queries. Receives the user query and column schema, returns grid operations. |

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `ai:query` | `{ text: string }` | Parse a natural language query and apply the resulting filters, sorts, or aggregations. |
| `ai:detectAnomalies` | `{ colIds?: string[] }` | Run anomaly detection on specified columns, or all numeric columns if omitted. |
| `ai:getSuggestions` | `{}` | Generate context-aware suggestions based on current data distribution and user activity. |
| `ai:clearAnomalies` | `{}` | Remove all anomaly highlights and reset detection state. |

## Events

| Name | Payload | Description |
| --- | --- | --- |
| `ai:query:parsed` | `{ text: string; operations: GridOperation[] }` | Emitted after a natural language query is parsed into grid operations. |
| `ai:anomalies:detected` | `{ anomalies: Anomaly[] }` | Emitted when anomaly detection completes with results. |

## Usage Examples

### Natural Language Queries

The built-in parser handles common data exploration phrases without any API calls.

```typescript title="nl-query.ts"
// Filter and sort with plain English
grid.commandBus.dispatch('ai:query', {
  text: 'show products with revenue above 50000 sorted by revenue descending',
});

// Top N queries
grid.commandBus.dispatch('ai:query', {
  text: 'top 10 by revenue',
});

// Region-based filtering
grid.commandBus.dispatch('ai:query', {
  text: 'sales in North America last quarter',
});
```

### Anomaly Detection

Identify statistical outliers across numeric columns using Z-score and IQR methods.

```typescript title="anomaly-detection.ts"
// Detect anomalies in specific columns
grid.commandBus.dispatch('ai:detectAnomalies', {
  colIds: ['revenue', 'growth'],
});

// Listen for results
grid.eventBus.on('ai:anomalies:detected', (event) => {
  console.log(`Found ${event.anomalies.length} outliers`);
});

// Clear anomaly highlights
grid.commandBus.dispatch('ai:clearAnomalies', {});
```

### LLM Adapter

Connect an external language model for advanced query understanding.

```typescript title="llm-adapter.ts"
AIPlugin({
  llmAdapter: {
    async parse(query, schema) {
      const response = await fetch('/api/grid-query', {
        method: 'POST',
        body: JSON.stringify({ query, columns: schema }),
      });
      return response.json(); // returns GridOperation[]
    },
  },
});
```

## Next Steps

- [Filtering Plugin](/plugins/filtering/) -- AI queries generate filter operations under the hood.
- [Sorting Plugin](/plugins/sorting/) -- natural language sorts map to sort model updates.
- [Conditional Formatting Plugin](/plugins/conditional-formatting/) -- anomaly detection can drive visual highlighting.
