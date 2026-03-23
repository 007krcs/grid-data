# @gridstorm/plugin-streaming

Real-time live data streaming with batched updates and change tracking.

## Install

```bash
npm install @gridstorm/plugin-streaming
```

## Usage

```typescript
import { StreamingPlugin } from '@gridstorm/plugin-streaming';

const grid = createGridEngine({
  plugins: [StreamingPlugin({ batchInterval: 100 })],
});
grid.dispatch('stream:connect', { adapter: myWebSocketAdapter });
```

## Features

- **Batched update processing**
- **Cell change direction tracking**
- **Adapter pattern (WebSocket, SSE, polling)**
- **Pause/resume controls**

## Documentation

[Full Documentation](https://gridstorm.dev) | [GitHub](https://github.com/nicktesh/gridstorm)

## License

MIT
