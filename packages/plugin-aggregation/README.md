# @gridstorm/plugin-aggregation

Aggregate values (sum, avg, min, max, count) for grouped rows in GridStorm.

> **Enterprise Plugin** -- Requires a [GridStorm license key](https://gridstorm.dev/pricing).

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

[Aggregation Guide](https://gridstorm.dev/docs/aggregation) | [API Reference](https://gridstorm.dev/api/plugin-aggregation)

## License

Commercial -- [Enterprise License Required](https://gridstorm.dev/pricing)
