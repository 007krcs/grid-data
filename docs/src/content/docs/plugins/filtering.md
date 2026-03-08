---
title: Filtering
description: Configure column filters, quick filter, built-in filter types, and custom filter predicates.
---

The Filtering plugin provides column-level filtering and a global quick filter. It manages the filter model state and integrates with the core row processing pipeline.

## Installation

```bash
npm install @gridstorm/plugin-filtering
```

```ts title="Setup"
import { FilteringPlugin } from '@gridstorm/plugin-filtering';

const engine = createGrid({
  columns: [
    { field: 'name', filterable: true },
    { field: 'age', filterable: true },
    { field: 'status', filterable: true },
  ],
  rowData: [...],
  plugins: [FilteringPlugin()],
});
```

## Plugin Options

```ts title="FilteringPluginOptions"
interface FilteringPluginOptions {
  quickFilterDebounce?: number;         // Debounce delay in ms (default: 300)
  keepFilterOnColumnsChange?: boolean;  // Preserve filters on column change (default: true)
  caseSensitive?: boolean;              // Case-sensitive filtering (default: false)
}
```

## Filter Model

The filter model is a record keyed by column ID. Each entry describes the filter applied to that column:

```ts title="FilterModel"
interface FilterModel {
  filterType: 'text' | 'number' | 'date' | 'set' | 'custom';
  type?: FilterOperator;
  filter?: string | number | null;
  filterTo?: string | number | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  values?: any[];
  operator?: 'AND' | 'OR';
  conditions?: FilterModel[];
}
```

### Filter Operators

| Operator | Applies to | Description |
|---|---|---|
| `equals` | text, number | Exact match |
| `notEqual` | text, number | Not equal |
| `contains` | text | Substring match |
| `notContains` | text | Excludes substring |
| `startsWith` | text | Starts with string |
| `endsWith` | text | Ends with string |
| `lessThan` | number, date | Less than value |
| `lessThanOrEqual` | number, date | Less than or equal |
| `greaterThan` | number, date | Greater than value |
| `greaterThanOrEqual` | number, date | Greater than or equal |
| `inRange` | number, date | Between two values |
| `blank` | all | Is null/undefined/empty |
| `notBlank` | all | Is not null/undefined/empty |

## Setting Filters Programmatically

### Set the Full Filter Model

```ts title="Set all filters"
api.setFilterModel({
  name: {
    filterType: 'text',
    type: 'contains',
    filter: 'john',
  },
  age: {
    filterType: 'number',
    type: 'greaterThan',
    filter: 25,
  },
});
```

### Set a Single Column Filter

Via command:

```ts title="Per-column filter"
engine.commandBus.dispatch('filter:setColumn', {
  colId: 'status',
  model: { filterType: 'text', type: 'equals', filter: 'active' },
});
```

### Remove a Column Filter

```ts
engine.commandBus.dispatch('filter:removeColumn', { colId: 'status' });
```

### Clear All Filters

```ts
api.setFilterModel({});
```

Or via command:

```ts
engine.commandBus.dispatch('filter:clear', {});
```

## Quick Filter

The quick filter searches across all columns:

```ts title="Quick filter"
api.setQuickFilter('search term');
```

Via command:

```ts
engine.commandBus.dispatch('filter:quickFilter', { text: 'search term' });
```

Clear the quick filter:

```ts
api.setQuickFilter('');
```

## Combined Conditions

Use the `conditions` array with an `operator` for AND/OR logic on a single column:

```ts title="Combined conditions"
api.setFilterModel({
  salary: {
    filterType: 'number',
    operator: 'AND',
    conditions: [
      { filterType: 'number', type: 'greaterThan', filter: 50000 },
      { filterType: 'number', type: 'lessThan', filter: 100000 },
    ],
  },
});
```

## Check Filter State

```ts
const isFiltered = api.isAnyFilterPresent();
const model = api.getFilterModel();
```

## Commands

| Command | Payload | Description |
|---|---|---|
| `filter:set` | `{ colId, model }` | Set filter on a column |
| `filter:clear` | `{}` | Clear all filters |
| `filter:quickFilter` | `{ text }` | Set quick filter text |
| `filter:setColumn` | `{ colId, model }` | Set filter for one column |
| `filter:removeColumn` | `{ colId }` | Remove filter from one column |

## Events

| Event | Payload | Description |
|---|---|---|
| `filter:changed` | `{ filterModel }` | Column filter model changed |
| `quickFilter:changed` | `{ text }` | Quick filter text changed |

## React Integration

Use the `useGridFilter` hook:

```tsx title="useGridFilter"
import { useGridFilter } from '@gridstorm/react';

function FilterControls() {
  const { isFiltered, filterModel, setQuickFilter, clearFilters } = useGridFilter();

  return (
    <div>
      <input
        placeholder="Search..."
        onChange={(e) => setQuickFilter(e.target.value)}
      />
      {isFiltered && <button onClick={clearFilters}>Clear Filters</button>}
    </div>
  );
}
```

## Next Steps

- **[Selection](/plugins/selection/)** -- Row selection modes and API.
- **[Sorting](/plugins/sorting/)** -- Column sorting.
