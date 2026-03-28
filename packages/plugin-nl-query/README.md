# @gridstorm/plugin-nl-query

Natural language query plugin for GridStorm. Parse human-readable query strings into structured filter, sort, group, and quick-filter operations using deterministic regex pattern matching — no LLM required.

## Installation

```bash
pnpm add @gridstorm/plugin-nl-query
```

## Usage

```typescript
import { createGrid } from '@gridstorm/core';
import { NlQueryPlugin } from '@gridstorm/plugin-nl-query';

const grid = createGrid({
  columns: [
    { field: 'name' },
    { field: 'status' },
    { field: 'revenue' },
    { field: 'country' },
  ],
  rowData: [...],
  plugins: [
    NlQueryPlugin({
      columnAliases: {
        // Map friendly names to actual column IDs
        revenue: 'annual_revenue_usd',
        rev: 'annual_revenue_usd',
      },
      maxHistory: 50,
    }),
  ],
});

// Execute a natural language query
grid.commandBus.dispatch('nlquery:execute', { query: 'sort by name' });
grid.commandBus.dispatch('nlquery:execute', { query: 'filter status equals active' });
grid.commandBus.dispatch('nlquery:execute', { query: 'show alice' });

// Listen for results
grid.eventBus.on('nlquery:applied', ({ query, operationsApplied }) => {
  console.log(`Applied ${operationsApplied} operations from: "${query.original}"`);
});

grid.eventBus.on('nlquery:failed', ({ query, reason }) => {
  console.warn(`Query failed: ${reason}`);
});

// Get query history
grid.commandBus.dispatch('nlquery:history', {});
grid.eventBus.on('nlquery:history-listed', ({ history }) => {
  console.log('Past queries:', history.map(h => h.query));
});

// Get suggestions (recent successful queries)
grid.commandBus.dispatch('nlquery:suggestions', {});
grid.eventBus.on('nlquery:suggestions-listed', ({ suggestions }) => {
  console.log('Suggestions:', suggestions);
});
```

## Supported Query Patterns

| Natural Language | Operation | Notes |
|---|---|---|
| `sort by {col}` | Sort ascending | Default direction is asc |
| `sort {col} asc` | Sort ascending | |
| `sort {col} desc` | Sort descending | |
| `sort {col} ascending` | Sort ascending | |
| `sort {col} descending` | Sort descending | |
| `order by {col} asc` | Sort ascending | |
| `order by {col} desc` | Sort descending | |
| `filter {col} = {val}` | Filter equals | |
| `filter {col} equals {val}` | Filter equals | |
| `filter {col} is {val}` | Filter equals | |
| `where {col} equals {val}` | Filter equals | |
| `filter {col} > {val}` | Filter greaterThan | Numeric comparison |
| `where {col} greater than {val}` | Filter greaterThan | |
| `filter {col} < {val}` | Filter lessThan | Numeric comparison |
| `where {col} less than {val}` | Filter lessThan | |
| `filter {col} contains {val}` | Filter contains | Substring match |
| `where {col} like {val}` | Filter contains | |
| `filter {col} starts with {val}` | Filter startsWith | |
| `where {col} begins with {val}` | Filter startsWith | |
| `show {text}` | Quick filter | Searches all columns |
| `search {text}` | Quick filter | |
| `find {text}` | Quick filter | |
| `group by {col}` | Group by column | |
| `clear filters` | Clear all filters | |
| `remove filters` | Clear all filters | |
| `reset filters` | Clear all filters | |
| `clear sort` | Clear sort model | |
| `remove sort` | Clear sort model | |
| `reset sort` | Clear sort model | |

## Commands

| Command | Payload | Description |
|---|---|---|
| `nlquery:execute` | `{ query: string }` | Parse and apply a natural language query |
| `nlquery:clear` | — | Reset all filters and sorts |
| `nlquery:history` | — | Emit history of past queries |
| `nlquery:suggestions` | — | Emit recent successful queries as suggestions |

## Events

| Event | Payload | Description |
|---|---|---|
| `nlquery:parsed` | `{ query: ParsedQuery }` | Fired after parsing (before apply) |
| `nlquery:applied` | `{ query: ParsedQuery; operationsApplied: number }` | Fired after successful application |
| `nlquery:failed` | `{ query: string; reason: string }` | Fired when no operations are recognized |
| `nlquery:history-listed` | `{ history: QueryHistoryEntry[] }` | Response to `nlquery:history` |
| `nlquery:suggestions-listed` | `{ suggestions: string[] }` | Response to `nlquery:suggestions` |

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `columnAliases` | `Record<string, string>` | `{}` | Map friendly names to column IDs |
| `maxHistory` | `number` | `50` | Maximum query history entries to retain |
| `caseSensitive` | `boolean` | `false` | Whether pattern matching is case-sensitive |

## Using `parseQuery` Directly

```typescript
import { parseQuery } from '@gridstorm/plugin-nl-query';

const parsed = parseQuery(
  'filter revenue greater than 50000',
  { revenue: 'annual_revenue_usd' }, // aliases
  ['name', 'status', 'annual_revenue_usd'], // known columns
);
// parsed.operations[0] → { type: 'filter', columnId: 'annual_revenue_usd', operator: 'greaterThan', value: 50000 }
// parsed.confidence → 0.9
```
