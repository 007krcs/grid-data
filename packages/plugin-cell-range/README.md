# @gridstorm/plugin-cell-range

Cell range selection with fill handle and auto-fill pattern detection

## Installation

```bash
pnpm add @gridstorm/plugin-cell-range
```

## Usage

```typescript
import { createGrid } from '@gridstorm/core';
import { cell-rangePlugin } from '@gridstorm/plugin-cell-range';

const grid = createGrid({
  columns: [{ field: 'name' }],
  rowData: [{ name: 'Example' }],
  plugins: [cell-rangePlugin()],
});
```

## License

MIT
