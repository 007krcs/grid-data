# @gridstorm/plugin-column-autosize

Automatically fit column widths to content.

## Install

```bash
npm install @gridstorm/plugin-column-autosize
```

## Usage

```typescript
import { ColumnAutoSizePlugin } from '@gridstorm/plugin-column-autosize';

const grid = createGridEngine({
  plugins: [ColumnAutoSizePlugin({ padding: 16 })],
});
grid.dispatch('autoSize:all', {});
```

## Features

- **Fit-to-content width calculation**
- **Character-width estimation**
- **Header text inclusion**
- **Min/max width constraints**

## Documentation

[Full Documentation](https://gridstorm.dev) | [GitHub](https://github.com/nicktesh/gridstorm)

## License

MIT
