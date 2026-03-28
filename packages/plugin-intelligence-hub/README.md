# @gridstorm/plugin-intelligence-hub

Aggregates behavioral patterns (column usage, filter patterns, sort preferences) across multiple GridStorm instances within an organization. Uses an in-memory hub (replaceable with a server relay) to share and receive insights. Implements differential privacy via Laplace noise injection to protect individual user data.

## Installation

```bash
pnpm add @gridstorm/plugin-intelligence-hub
```

## Usage

```typescript
import { IntelligenceHubPlugin } from '@gridstorm/plugin-intelligence-hub';

const grid = createGrid({
  plugins: [
    IntelligenceHubPlugin({
      gridId: 'my-grid-instance',
      shareColumnRankings: true,
      shareFilterPatterns: true,
      shareSortPatterns: true,
      onInsight: (insight) => {
        console.log(`Received insight: ${insight.type} (confidence: ${insight.confidence})`);
      },
    }),
  ],
});

// Connect to the hub
grid.commandBus.dispatch('hub:connect', {});
```

## Multi-Grid Setup Example

Multiple grids in the same JavaScript context automatically share data through the static `InMemoryHubTransport`:

```typescript
import { IntelligenceHubPlugin, createInMemoryHubTransport } from '@gridstorm/plugin-intelligence-hub';

// Both grids share the same transport (in-memory singleton)
const gridA = createGrid({
  plugins: [IntelligenceHubPlugin({ gridId: 'sales-grid' })],
});

const gridB = createGrid({
  plugins: [IntelligenceHubPlugin({ gridId: 'inventory-grid' })],
});

gridA.commandBus.dispatch('hub:connect', {});
gridB.commandBus.dispatch('hub:connect', {});

// As both grids generate similar sort/filter patterns, insights are computed
// and broadcast to all connected grids
gridB.eventBus.on('hub:insight-received', (insight) => {
  console.log(`Insight from ${insight.sourceCount} grids: ${JSON.stringify(insight.data)}`);
});
```

## Privacy Budget Explanation

The plugin uses the **Laplace mechanism** for differential privacy. The `epsilon` parameter controls the privacy/utility trade-off:

- **Low epsilon** (e.g., `0.1`): High privacy, more noise added — patterns are harder to distinguish
- **High epsilon** (e.g., `10.0`): Low privacy (more utility), less noise — patterns are clearer

```typescript
IntelligenceHubPlugin({
  privacyBudget: {
    epsilon: 1.0,    // default — balanced privacy/utility
    noiseScale: 1.0, // Laplace scale = sensitivity / epsilon
  },
});
```

Laplace noise formula:
```
noise = -sign(u) * (sensitivity/epsilon) * log(1 - 2|u|)
where u ~ Uniform(-0.5, 0.5)
```

You can use the exported utility directly:
```typescript
import { addLaplaceNoise } from '@gridstorm/plugin-intelligence-hub';

const noisyValue = addLaplaceNoise(
  originalValue,   // true value
  1,               // sensitivity (L1 sensitivity of the query)
  0.5              // epsilon (privacy budget)
);
```

## Custom Transport for Production WebSocket Relay

Replace the in-memory transport with a WebSocket relay for cross-browser/cross-server sharing:

```typescript
import type { HubTransport, BehaviorSample, HubInsight } from '@gridstorm/plugin-intelligence-hub';

function createWebSocketTransport(url: string): HubTransport {
  const ws = new WebSocket(url);
  const subscribers: Array<(insight: HubInsight) => void> = [];
  const cache: HubInsight[] = [];

  ws.onmessage = (event) => {
    const insight = JSON.parse(event.data) as HubInsight;
    cache.push(insight);
    for (const sub of subscribers) sub(insight);
  };

  return {
    publish(sample: BehaviorSample) {
      ws.send(JSON.stringify(sample));
    },
    subscribe(handler) {
      subscribers.push(handler);
      return () => {
        const i = subscribers.indexOf(handler);
        if (i >= 0) subscribers.splice(i, 1);
      };
    },
    getInsights(type?) {
      return type ? cache.filter((i) => i.type === type) : [...cache];
    },
  };
}

// Use it in the plugin
IntelligenceHubPlugin({
  transport: createWebSocketTransport('wss://your-relay.example.com/hub'),
});
```

## Commands

| Command               | Payload                          | Description                                   |
|-----------------------|----------------------------------|-----------------------------------------------|
| `hub:connect`         | `{}`                             | Start participating in the hub                |
| `hub:disconnect`      | `{}`                             | Stop participating                            |
| `hub:publish-sample`  | `BehaviorSample`                 | Manually publish a behavior sample            |
| `hub:get-insights`    | `{ type?: InsightType }`         | Emit `hub:insights-listed` with results       |
| `hub:apply-insight`   | `{ insightId: string }`          | Apply an insight to the current grid          |
| `hub:reset`           | `{}`                             | Clear the hub store (useful for testing)      |

## Events

| Event                   | Payload                        |
|-------------------------|-------------------------------|
| `hub:connected`         | `{ gridId: string }`          |
| `hub:disconnected`      | `{ gridId: string }`          |
| `hub:insight-received`  | `HubInsight`                  |
| `hub:insights-listed`   | `{ insights: HubInsight[] }`  |
| `hub:sample-published`  | `BehaviorSample`              |
