# @gridstorm/plugin-ssrm

Server-side row model with lazy loading and block-based caching for GridStorm.

> **Enterprise Plugin** -- Requires a [GridStorm license key](https://gridstorm.dev/pricing).

## Install

```bash
npm install @gridstorm/plugin-ssrm @gridstorm/core @gridstorm/license
```

## Usage

```typescript
import { setLicenseKey } from '@gridstorm/license';
import { createGridEngine } from '@gridstorm/core';
import { SSRMPlugin } from '@gridstorm/plugin-ssrm';

setLicenseKey('YOUR_LICENSE_KEY');

const engine = createGridEngine({
  columnDefs: columns,
  rowData: [],
  plugins: [
    SSRMPlugin({
      datasource: {
        getRows: async (params) => {
          const response = await fetch(`/api/rows?start=${params.startRow}&end=${params.endRow}`);
          const data = await response.json();
          return { rows: data.rows, totalRowCount: data.total };
        },
      },
      blockSize: 100,
    }),
  ],
});
```

## Features

- Lazy loading of rows from a server datasource
- Block-based caching for fast scroll performance
- Automatic fetch on scroll
- Server-side sorting and filtering support
- Configurable block size and cache limits

## Documentation

[Server-Side Row Model Guide](https://gridstorm.dev/docs/ssrm) | [API Reference](https://gridstorm.dev/api/plugin-ssrm)

## License

Commercial -- [Enterprise License Required](https://gridstorm.dev/pricing)
