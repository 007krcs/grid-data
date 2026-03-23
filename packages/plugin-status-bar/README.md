# @gridstorm/plugin-status-bar

Aggregation summary bar showing sum, average, min, max, and count.

## Install

```bash
npm install @gridstorm/plugin-status-bar
```

## Usage

```typescript
import { StatusBarPlugin } from '@gridstorm/plugin-status-bar';

const grid = createGridEngine({
  plugins: [StatusBarPlugin({ showOnSelection: true })],
});
```

## Features

- **Sum, avg, min, max, count**
- **Auto-recalculate on selection**
- **Configurable panels**
- **Show for all rows or selection**

## Documentation

[Full Documentation](https://gridstorm.dev) | [GitHub](https://github.com/nicktesh/gridstorm)

## License

MIT
