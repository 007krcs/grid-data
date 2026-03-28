# @gridstorm/plugin-formula

Excel-like formula engine for GridStorm — cell references, 50+ functions, dependency graph

## Installation

```bash
pnpm add @gridstorm/plugin-formula
```

## Usage

```typescript
import { createGrid } from '@gridstorm/core';
import { formulaPlugin } from '@gridstorm/plugin-formula';

const grid = createGrid({
  columns: [{ field: 'name' }],
  rowData: [{ name: 'Example' }],
  plugins: [formulaPlugin()],
});
```

## License

MIT
