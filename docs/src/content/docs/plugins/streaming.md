---
title: Streaming
description: Real-time live data updates with batched processing, cell flash, and adapter pattern.
---

The Streaming plugin enables real-time data feeds into your grid. It batches incoming updates to maintain smooth rendering performance, provides cell flash animations to highlight changes, and supports a pluggable adapter pattern for connecting to WebSockets, SSE, or custom data sources.

## Installation

```bash title="Terminal"
npm install @gridstorm/plugin-streaming
```

## Setup

```typescript title="setup.ts"
import { createGrid } from '@gridstorm/core';
import { StreamingPlugin } from '@gridstorm/plugin-streaming';

const grid = createGrid({
  columns: [
    { colId: 'symbol', field: 'symbol', headerName: 'Symbol' },
    { colId: 'price', field: 'price', headerName: 'Price' },
    { colId: 'change', field: 'change', headerName: 'Change' },
  ],
  rowData: [],
  plugins: [
    StreamingPlugin({
      batchInterval: 250,
      maxBatchSize: 500,
      flashDuration: 400,
      enableFlash: true,
      adapter: {
        connect: (onData) => {
          const ws = new WebSocket('wss://feed.example.com/prices');
          ws.onmessage = (e) => onData(JSON.parse(e.data));
          return ws;
        },
        disconnect: (ws) => ws.close(),
      },
    }),
  ],
});
```

:::example{title="Live Streaming Demo" href="/cookbook/#streaming-basic"}
Watch real-time price data flowing into the grid with cell flash animations highlighting changes.
:::

## Plugin Options

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `batchInterval` | `number` | `250` | Milliseconds between processing batched updates. Lower values give faster visual updates but higher CPU cost. |
| `maxBatchSize` | `number` | `1000` | Maximum number of row updates to process in a single batch. Excess updates carry over to the next cycle. |
| `flashDuration` | `number` | `400` | Duration in milliseconds for the cell flash animation after a value change. |
| `enableFlash` | `boolean` | `true` | Enable or disable the cell flash animation on value changes. |
| `adapter` | `StreamAdapter` | `undefined` | Pluggable data source adapter with `connect` and `disconnect` methods. |

## Commands

| Name | Payload | Description |
| --- | --- | --- |
| `stream:connect` | `{ adapter?: StreamAdapter }` | Start the data stream. Uses the configured adapter or an override. |
| `stream:disconnect` | `{}` | Stop the active data stream and clean up resources. |
| `stream:push` | `{ updates: RowUpdate[] }` | Manually push row updates into the batch queue without an adapter. |
| `stream:pause` | `{}` | Pause batch processing. Incoming data is still queued but not rendered. |
| `stream:resume` | `{}` | Resume batch processing and flush any queued updates. |

## Events

| Name | Payload | Description |
| --- | --- | --- |
| `stream:batch:applied` | `{ count: number; elapsed: number }` | Emitted after each batch of updates is applied to the grid. |
| `stream:connected` | `{}` | Emitted when the adapter successfully connects. |
| `stream:disconnected` | `{}` | Emitted when the stream is disconnected. |

## Usage Examples

### WebSocket Adapter

Connect to a live WebSocket feed for stock price updates.

```typescript title="websocket-stream.ts"
grid.commandBus.dispatch('stream:connect', {
  adapter: {
    connect: (onData) => {
      const ws = new WebSocket('wss://market.example.com/live');
      ws.onmessage = (event) => {
        const updates = JSON.parse(event.data);
        onData(updates);
      };
      return ws;
    },
    disconnect: (ws) => ws.close(),
  },
});
```

### Manual Push

Push updates directly without an adapter, useful for polling or server-sent events.

```typescript title="manual-push.ts"
// Push a batch of row updates
grid.commandBus.dispatch('stream:push', {
  updates: [
    { rowId: 'AAPL', data: { price: 178.52, change: 1.23 } },
    { rowId: 'GOOGL', data: { price: 141.80, change: -0.45 } },
  ],
});
```

### Pause and Resume

Temporarily freeze the display while keeping the data queue active.

```typescript title="pause-resume.ts"
// Pause during user interaction
grid.commandBus.dispatch('stream:pause', {});

// Resume when ready
grid.commandBus.dispatch('stream:resume', {});

// Disconnect entirely
grid.commandBus.dispatch('stream:disconnect', {});
```

## Next Steps

- [Sorting Plugin](/plugins/sorting/) -- streaming updates maintain the active sort order.
- [Conditional Formatting Plugin](/plugins/conditional-formatting/) -- apply visual rules to live data.
- [Sparklines Plugin](/plugins/sparklines/) -- visualize streaming trends inline.
