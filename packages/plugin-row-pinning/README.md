# @gridstorm/plugin-row-pinning

Pin rows to top or bottom of the grid (floating rows).

## Install

```bash
npm install @gridstorm/plugin-row-pinning
```

## Usage

```typescript
import { RowPinningPlugin } from '@gridstorm/plugin-row-pinning';

const grid = createGridEngine({
  plugins: [RowPinningPlugin({ maxPinnedRows: 5 })],
});
grid.dispatch('rowPinning:pinTop', { rowId: 'row-1' });
```

## Features

- **Pin to top or bottom**
- **Max capacity limits**
- **Duplicate prevention**
- **Summary row data injection**

## Documentation

[Full Documentation](https://grid-data-analytics-explorer.vercel.app/) | [GitHub](https://github.com/007krcs/grid-data)

## License

MIT
