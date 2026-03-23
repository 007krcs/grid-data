# @gridstorm/plugin-aggregation

Aggregate values (sum, avg, min, max, count) for grouped rows in GridStorm.

> **Enterprise Plugin** -- Requires a [GridStorm license key](https://grid-data-analytics-explorer.vercel.app//pricing).

## Install

```bash
npm install @gridstorm/plugin-aggregation @gridstorm/core @gridstorm/license
```

## Usage

```typescript
import { setLicenseKey } from '@gridstorm/license';
import { createGridEngine } from '@gridstorm/core';
import { AggregationPlugin } from '@gridstorm/plugin-aggregation';
import { GroupingPlugin } from '@gridstorm/plugin-grouping';

setLicenseKey('YOUR_LICENSE_KEY');

const engine = createGridEngine({
  columnDefs: [
    { field: 'department', enableRowGroup: true },
    { field: 'salary', aggFunc: 'sum' },
    { field: 'age', aggFunc: 'avg' },
  ],
  rowData: myData,
  plugins: [GroupingPlugin(), AggregationPlugin()],
});
```

## Features

- Built-in functions: sum, avg, min, max, count
- Custom aggregation functions
- Aggregated values displayed in group rows
- Works with the grouping plugin

## Documentation

[Aggregation Guide](https://grid-data-analytics-explorer.vercel.app//docs/aggregation) | [API Reference](https://grid-data-analytics-explorer.vercel.app//api/plugin-aggregation)

## License

Commercial -- [Enterprise License Required](https://grid-data-analytics-explorer.vercel.app//pricing)
