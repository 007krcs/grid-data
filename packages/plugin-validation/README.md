# @gridstorm/plugin-validation

Data validation with 10+ built-in validators, cross-cell rules, and editing integration

## Installation

```bash
pnpm add @gridstorm/plugin-validation
```

## Usage

```typescript
import { createGrid } from '@gridstorm/core';
import { validationPlugin } from '@gridstorm/plugin-validation';

const grid = createGrid({
  columns: [{ field: 'name' }],
  rowData: [{ name: 'Example' }],
  plugins: [validationPlugin()],
});
```

## License

MIT
