# @gridstorm/plugin-pivoting

Pivot row data into dynamic columns in GridStorm.

> **Enterprise Plugin** -- Requires a [GridStorm license key](https://grid-data-analytics-explorer.vercel.app//pricing).

## Install

```bash
npm install @gridstorm/plugin-pivoting @gridstorm/core @gridstorm/license
```

## Usage

```typescript
import { setLicenseKey } from '@gridstorm/license';
import { createGridEngine } from '@gridstorm/core';
import { PivotingPlugin } from '@gridstorm/plugin-pivoting';
import { GroupingPlugin } from '@gridstorm/plugin-grouping';

setLicenseKey('YOUR_LICENSE_KEY');

const engine = createGridEngine({
  columnDefs: [
    { field: 'region', enableRowGroup: true },
    { field: 'quarter', enablePivot: true },
    { field: 'revenue', aggFunc: 'sum' },
  ],
  rowData: salesData,
  plugins: [GroupingPlugin(), PivotingPlugin()],
});
```

## Features

- Pivot row values into dynamically generated columns
- Combined with grouping and aggregation
- Pivot column header customization
- Programmatic pivot API

## Documentation

[Pivoting Guide](https://grid-data-analytics-explorer.vercel.app//docs/pivoting) | [API Reference](https://grid-data-analytics-explorer.vercel.app//api/plugin-pivoting)

## License

Commercial -- [Enterprise License Required](https://grid-data-analytics-explorer.vercel.app//pricing)
