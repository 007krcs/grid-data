# @gridstorm/plugin-ai

> **Deprecated.** This catch-all plugin will be removed in 0.3.0. Each feature
> has a dedicated replacement with a better implementation and a stable API:
>
> | You use `plugin-ai` for | Install instead |
> |---|---|
> | Natural-language queries, offline | `@gridstorm/plugin-nl-query` |
> | Natural-language queries, LLM-backed | `@gridstorm/plugin-ai-query` + `@gridstorm/ai-adapter` |
> | Anomaly detection | `@gridstorm/plugin-anomaly` |
> | Smart suggestions | `@gridstorm/plugin-intent-engine` |
>
> Installing this plugin logs a one-time deprecation warning.

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

[Full Documentation](https://grid-data-analytics-explorer.vercel.app/) | [GitHub](https://github.com/007krcs/grid-data)

## License

MIT
