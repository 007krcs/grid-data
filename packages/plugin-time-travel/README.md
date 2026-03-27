# @gridstorm/plugin-time-travel

Git-for-grids: full state history with undo/redo, snapshots, diffs, and branches

## Installation

```bash
pnpm add @gridstorm/plugin-time-travel
```

## Usage

```typescript
import { createGrid } from '@gridstorm/core';
import { time-travelPlugin } from '@gridstorm/plugin-time-travel';

const grid = createGrid({
  columns: [{ field: 'name' }],
  rowData: [{ name: 'Example' }],
  plugins: [time-travelPlugin()],
});
```

## License

MIT
