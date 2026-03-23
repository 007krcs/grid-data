# @gridstorm/plugin-ai

AI-powered grid features: natural language queries, anomaly detection, and smart suggestions.

## Install

```bash
npm install @gridstorm/plugin-ai
```

## Usage

```typescript
import { AIPlugin } from '@gridstorm/plugin-ai';

const grid = createGridEngine({
  plugins: [AIPlugin({ autoDetect: true })],
});
grid.dispatch('ai:query', { text: 'sort by salary descending' });
```

## Features

- **Natural language query parser (no API needed)**
- **Anomaly detection (Z-score + IQR)**
- **Smart data suggestions**
- **Optional LLM adapter for complex queries**

## Documentation

[Full Documentation](https://gridstorm.dev) | [GitHub](https://github.com/nicktesh/gridstorm)

## License

MIT
