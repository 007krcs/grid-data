# @gridstorm/plugin-state-persistence

Save and restore grid state to localStorage or a custom adapter.

## Install

```bash
npm install @gridstorm/plugin-state-persistence
```

## Usage

```typescript
import { StatePersistencePlugin } from '@gridstorm/plugin-state-persistence';

const grid = createGridEngine({
  plugins: [StatePersistencePlugin({ storageKey: 'my-grid', autoSave: true })],
});
```

## Features

- **Auto-save with debounce**
- **localStorage default adapter**
- **Custom storage adapters**
- **Include/exclude state slices**
- **JSON export/import**

## Documentation

[Full Documentation](https://grid-data-analytics-explorer.vercel.app/) | [GitHub](https://github.com/007krcs/grid-data)

## License

MIT
