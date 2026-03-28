# @gridstorm/plugin-intent-engine

Tracks user interactions with the grid and builds a frequency+recency scoring model to suggest and apply optimal column ordering.

## Install

```sh
pnpm add @gridstorm/plugin-intent-engine
```

## Quick Usage

```typescript
import { createGrid } from '@gridstorm/core';
import { IntentEnginePlugin } from '@gridstorm/plugin-intent-engine';

const grid = createGrid({
  columns: [{ field: 'name' }, { field: 'age' }, { field: 'city' }],
  rowData: [...],
  plugins: [
    IntentEnginePlugin({
      maxRecords: 200,
      halfLifeMs: 12 * 60 * 60 * 1000, // 12h half-life
      autoTrack: true,
    }),
  ],
});

// Manually record an interaction
grid.commandBus.dispatch('intent:record', { columnId: 'name', action: 'sort' });

// Apply the computed ranking to reorder columns
grid.commandBus.dispatch('intent:apply-ranking', undefined);

// Listen for ranking updates
grid.eventBus.on('intent:ranking-updated', ({ ranking }) => {
  console.log('Top column:', ranking[0]?.columnId);
});
```

## Commands

| Command | Payload | Description |
|---|---|---|
| `intent:record` | `{ columnId: string; action: IntentAction }` | Manually record a user interaction for a column |
| `intent:reset` | `undefined` | Clear all recorded interactions and ranking |
| `intent:apply-ranking` | `undefined` | Reorder grid columns based on the current score ranking |

## Events

| Event | Payload | Description |
|---|---|---|
| `intent:ranking-updated` | `{ ranking: ColumnScore[] }` | Emitted after any interaction is recorded and ranking is rebuilt |
