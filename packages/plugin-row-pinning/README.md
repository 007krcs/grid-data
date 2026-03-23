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

[Full Documentation](https://gridstorm.dev) | [GitHub](https://github.com/nicktesh/gridstorm)

## License

MIT
