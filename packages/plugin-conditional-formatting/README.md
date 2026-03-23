# @gridstorm/plugin-conditional-formatting

Rule-based cell styling with 18+ condition types.

## Install

```bash
npm install @gridstorm/plugin-conditional-formatting
```

## Usage

```typescript
import { ConditionalFormattingPlugin } from '@gridstorm/plugin-conditional-formatting';

const grid = createGridEngine({
  plugins: [ConditionalFormattingPlugin()],
});
grid.dispatch('formatting:addRule', {
  rule: { colId: 'revenue', condition: { type: 'greaterThan', value: 1000000 }, style: { backgroundColor: '#d4edda' } }
});
```

## Features

- **18 condition types**
- **Color scales and data bars**
- **Icon sets**
- **Priority-based rule stacking**

## Documentation

[Full Documentation](https://gridstorm.dev) | [GitHub](https://github.com/nicktesh/gridstorm)

## License

MIT
