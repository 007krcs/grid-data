# @gridstorm/plugin-anomaly

Statistical anomaly detection plugin for GridStorm. Maintains a rolling baseline (mean, standard deviation) per numeric column using a sliding window. Detects cells that deviate beyond configurable z-score thresholds and emits structured anomaly events.

## Installation

```bash
pnpm add @gridstorm/plugin-anomaly
```

## Usage

```typescript
import { createGrid } from '@gridstorm/core';
import { AnomalyPlugin } from '@gridstorm/plugin-anomaly';

const grid = createGrid({
  columns: [
    { field: 'price' },
    { field: 'quantity' },
    { field: 'revenue' },
  ],
  rowData: [...],
  plugins: [
    AnomalyPlugin({
      columns: [
        {
          columnId: 'price',
          watchThreshold: 2.0,     // z-score to trigger 'watch'
          warningThreshold: 2.5,   // z-score to trigger 'warning'
          criticalThreshold: 3.0,  // z-score to trigger 'critical'
          windowSize: 100,         // rolling window of last 100 values
        },
        {
          columnId: 'revenue',
          windowSize: 50,
        },
      ],
      onAnomaly: (event) => {
        console.log(`Anomaly in ${event.columnId}: z=${event.zscore.toFixed(2)} [${event.severity}]`);
      },
    }),
  ],
});
```

## Feeding Data

The plugin automatically processes values when listening to `rows:updated` and `data:changed` events. You can also feed values manually for testing:

```typescript
grid.commandBus.dispatch('anomaly:feed', {
  rowId: 'row-42',
  columnId: 'price',
  value: 9999.99,
});
```

## Handling Anomaly Events

```typescript
grid.eventBus.on('anomaly:detected', (event) => {
  const { rowId, columnId, value, zscore, severity, baseline } = event;
  console.log(
    `[${severity.toUpperCase()}] Row ${rowId}, col ${columnId}: ` +
    `value=${value}, z=${zscore.toFixed(2)}, ` +
    `baseline mean=${baseline.mean.toFixed(2)} ±${baseline.stdDev.toFixed(2)}`
  );

  // Acknowledge the anomaly once handled
  grid.commandBus.dispatch('anomaly:acknowledge', { id: event.id });
});
```

## Building a Heatmap Overlay

```typescript
// Get all current column stats
grid.commandBus.dispatch('anomaly:get-stats', {});
grid.eventBus.on('anomaly:stats-updated', ({ stats }) => {
  for (const s of stats) {
    // Use s.mean, s.stdDev to shade cells
    // Color intensity = clamp((value - mean) / stdDev / 3, 0, 1)
  }
});

// Get active (unacknowledged) anomalies
grid.commandBus.dispatch('anomaly:get-active', {});
grid.eventBus.on('anomaly:active-listed', ({ anomalies }) => {
  for (const a of anomalies) {
    const color =
      a.severity === 'critical' ? '#ff0000' :
      a.severity === 'warning'  ? '#ff8800' :
                                  '#ffdd00';
    highlightCell(a.rowId, a.columnId, color);
  }
});
```

## Commands

| Command | Payload | Description |
|---|---|---|
| `anomaly:configure` | `ColumnAnomalyConfig` | Add or update a column watch |
| `anomaly:remove` | `{ columnId: string }` | Stop watching a column |
| `anomaly:acknowledge` | `{ id: string }` | Mark anomaly as acknowledged |
| `anomaly:feed` | `{ rowId, columnId, value }` | Manually feed a data point |
| `anomaly:get-stats` | — | Emit current stats for all watched columns |
| `anomaly:get-active` | — | Emit all unacknowledged anomalies |

## Events

| Event | Payload | Description |
|---|---|---|
| `anomaly:detected` | `AnomalyEvent` | Fired when a value exceeds a threshold |
| `anomaly:cleared` | `{ id, columnId, rowId }` | Fired when column is removed with active anomalies |
| `anomaly:stats-updated` | `{ stats: ColumnStats[] }` | Response to `anomaly:get-stats` |
| `anomaly:active-listed` | `{ anomalies: AnomalyEvent[] }` | Response to `anomaly:get-active` |

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `columns` | `ColumnAnomalyConfig[]` | `[]` | Initial column configurations |
| `autoWatch` | `boolean` | `false` | Auto-detect and watch numeric columns |
| `onAnomaly` | `(event: AnomalyEvent) => void` | — | Direct callback for anomaly events |

## Severity Levels

| Severity | Default Z-Score | Description |
|---|---|---|
| `watch` | ≥ 2.0 | Mild deviation, worth monitoring |
| `warning` | ≥ 2.5 | Significant deviation |
| `critical` | ≥ 3.0 | Extreme deviation requiring immediate attention |

The rolling window ensures the baseline adapts over time. With `windowSize: 100`, only the 100 most recent values influence the mean and standard deviation.
