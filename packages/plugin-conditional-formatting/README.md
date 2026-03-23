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

[Full Documentation](https://grid-data-analytics-explorer.vercel.app/) | [GitHub](https://github.com/007krcs/grid-data)

## License

MIT
