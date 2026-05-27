// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// Streaming story. Wires up a mock adapter that pushes randomized ticker-style
// price updates on a timer; cells flash up/down/neutral as values change.
// Start/Pause buttons drive the stream lifecycle so visitors can feel the
// difference between active and idle states.

import type { Meta, StoryObj } from '@storybook/html';
import { StreamingPlugin, type StreamAdapter, type StreamHandlers, type RowUpdate } from '@gridstorm/plugin-streaming';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { mountGridStory, formatCurrency } from './_helpers';

interface Ticker {
  symbol: string;
  price: number;
  volume: number;
  change: number;
  bid: number;
  ask: number;
}

const SYMBOLS = ['AAPL', 'MSFT', 'GOOG', 'AMZN', 'META', 'NVDA', 'TSLA', 'JPM', 'V', 'WMT', 'PG', 'JNJ'];

function makeTickers(): Ticker[] {
  return SYMBOLS.map((symbol) => {
    const price = Math.round(50 + Math.random() * 450);
    return {
      symbol,
      price,
      volume: Math.floor(100_000 + Math.random() * 900_000),
      change: 0,
      bid: price - 0.05,
      ask: price + 0.05,
    };
  });
}

/** Mock adapter that emits randomized price updates on an interval. */
function createMockAdapter(intervalMs: number): StreamAdapter & { stop: () => void } {
  let timer: ReturnType<typeof setInterval> | null = null;
  let handlers: StreamHandlers | null = null;
  return {
    connect(h: StreamHandlers): void {
      handlers = h;
      handlers.onConnectionChange(true);
      timer = setInterval(() => {
        if (!handlers) return;
        // Pick 1–4 random symbols and walk their price ±0.5% to ±2%.
        const count = 1 + Math.floor(Math.random() * 4);
        const updates: RowUpdate[] = [];
        for (let i = 0; i < count; i++) {
          const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]!;
          const drift = (Math.random() - 0.5) * 0.04; // ±2%
          updates.push({
            id: symbol,
            data: {
              // The adapter doesn't know the prior price, so it emits a
              // signed delta and lets the plugin compute the new value via
              // its dedupe-within-batch logic. For demo purposes we just
              // emit a fresh randomized snapshot; the plugin flashes
              // up/down by comparing against the row's previous value.
              symbol,
              priceMultiplier: 1 + drift, // consumed by the engine below
            },
          });
        }
        handlers.onData(updates);
      }, intervalMs);
    },
    disconnect(): void {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      handlers?.onConnectionChange(false);
      handlers = null;
    },
    stop(): void {
      this.disconnect();
    },
  };
}

interface Args {
  tickIntervalMs: number;
  batchIntervalMs: number;
  enableFlash: boolean;
}

const meta: Meta<Args> = {
  title: '5 · Enterprise Features/Streaming',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Live data via the StreamingPlugin. A mock adapter emits randomized ' +
          'price ticks on a timer; the plugin batches them, dedupes per cell ' +
          '(see the streaming test suite), and emits flash classes that the ' +
          'theme renders as colored cell pulses. Use the Start/Pause buttons ' +
          "above the grid to drive the stream. The CSS animations are in " +
          '`theme-default/src/index.css` under `.gs-cell-flash-*`.',
      },
    },
  },
  argTypes: {
    tickIntervalMs: { control: { type: 'range', min: 50, max: 2000, step: 50 }, description: 'How often the adapter emits a batch of updates.' },
    batchIntervalMs: { control: { type: 'range', min: 50, max: 1000, step: 50 }, description: 'How often the plugin flushes its pending queue to the grid.' },
    enableFlash: { control: 'boolean' },
  },
  args: { tickIntervalMs: 250, batchIntervalMs: 100, enableFlash: true },
  render: (args: Args) => {
    const tickers = makeTickers();
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.gap = '8px';

    const toolbar = document.createElement('div');
    toolbar.style.display = 'flex';
    toolbar.style.gap = '8px';
    toolbar.style.alignItems = 'center';

    const startBtn = document.createElement('button');
    startBtn.textContent = '▶ Start stream';
    startBtn.style.cssText = 'padding: 6px 12px; border-radius: 6px; border: 1px solid #cbd5e1; background: #fff; cursor: pointer; font: inherit;';

    const pauseBtn = document.createElement('button');
    pauseBtn.textContent = '⏸ Pause';
    pauseBtn.style.cssText = startBtn.style.cssText;
    pauseBtn.disabled = true;

    const status = document.createElement('span');
    status.style.fontFamily = 'ui-monospace, SFMono-Regular, monospace';
    status.style.fontSize = '12px';
    status.textContent = 'idle';

    toolbar.appendChild(startBtn);
    toolbar.appendChild(pauseBtn);
    toolbar.appendChild(status);
    wrapper.appendChild(toolbar);

    const adapter = createMockAdapter(args.tickIntervalMs);

    const gridContainer = mountGridStory<Ticker>({
      config: {
        columns: [
          { field: 'symbol', headerName: 'Symbol', width: 100, sortable: true },
          { field: 'price', headerName: 'Price', width: 110, sortable: true, valueFormatter: formatCurrency },
          { field: 'bid', headerName: 'Bid', width: 110, valueFormatter: formatCurrency },
          { field: 'ask', headerName: 'Ask', width: 110, valueFormatter: formatCurrency },
          { field: 'volume', headerName: 'Volume', width: 120, sortable: true, valueFormatter: (p) => Number(p.value ?? 0).toLocaleString() },
        ],
        rowData: tickers,
        getRowId: ({ data }) => (data as Ticker).symbol,
        plugins: [
          SortingPlugin(),
          StreamingPlugin({
            adapter,
            batchInterval: args.batchIntervalMs,
            enableFlash: args.enableFlash,
          }),
        ],
      },
      height: '460px',
      onReady: (engine) => {
        let connected = false;
        let updateCount = 0;

        // Intercept the adapter's onData callback to (1) translate price
        // multipliers into absolute prices the grid will store, and (2) keep
        // a UI counter ticking. The adapter emits `priceMultiplier`; we read
        // the current row, multiply through, and re-dispatch a clean update.
        engine.eventBus.on('rowData:changed' as never, () => {
          updateCount++;
          status.textContent = connected ? `live · ${updateCount} updates` : 'idle';
        });

        // Decorate the streamHandlers.onData path: when the adapter calls
        // ctx-internal onData (via our stream:push command), we translate
        // priceMultiplier into a concrete price BEFORE the plugin batches
        // it. Easiest path: subscribe to a custom command we dispatch.
        const originalHandler = (adapter as any).__origConnect;
        void originalHandler;

        startBtn.addEventListener('click', () => {
          // Translate priceMultiplier into absolute price updates by reading
          // current state, then dispatch stream:push directly.
          if (connected) return;
          connected = true;
          startBtn.disabled = true;
          pauseBtn.disabled = false;
          status.textContent = 'connecting…';

          // Use our own driver instead of adapter.connect, so we can do
          // the priceMultiplier → absolute price translation inline.
          const driver = setInterval(() => {
            const state = engine.store.getState();
            const count = 1 + Math.floor(Math.random() * 4);
            const updates: RowUpdate[] = [];
            for (let i = 0; i < count; i++) {
              const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]!;
              const node = state.rowNodes.get(symbol);
              if (!node || !node.data) continue;
              const prev = (node.data as Ticker).price;
              const drift = (Math.random() - 0.5) * 0.04;
              const next = Math.max(1, Math.round((prev * (1 + drift)) * 100) / 100);
              updates.push({
                id: symbol,
                data: {
                  ...node.data,
                  price: next,
                  bid: Math.round((next - 0.05) * 100) / 100,
                  ask: Math.round((next + 0.05) * 100) / 100,
                  change: Math.round((next - prev) * 100) / 100,
                  volume: (node.data as Ticker).volume + Math.floor(Math.random() * 2000),
                },
              });
            }
            if (updates.length > 0) {
              engine.commandBus.dispatch('stream:push' as any, { updates } as any);
            }
          }, args.tickIntervalMs);

          // Park the cleanup on a property so Pause can find it.
          (engine as any).__streamingDriver = driver;
          // We still need the streaming plugin to start its batch timer.
          // Dispatch stream:connect via the no-op adapter we passed in.
          engine.commandBus.dispatchAsync('stream:connect' as any, {} as any);
          status.textContent = 'live · 0 updates';
        });

        pauseBtn.addEventListener('click', () => {
          if (!connected) return;
          connected = false;
          startBtn.disabled = false;
          pauseBtn.disabled = true;
          const driver = (engine as any).__streamingDriver;
          if (driver) clearInterval(driver);
          engine.commandBus.dispatchAsync('stream:disconnect' as any, {} as any);
          status.textContent = 'idle';
        });
      },
    });
    wrapper.appendChild(gridContainer);
    return wrapper;
  },
};

export default meta;
type Story = StoryObj<Args>;

export const Playground: Story = {};

export const SlowStream: Story = {
  name: 'Slow stream (1 update/sec)',
  args: { tickIntervalMs: 1000 },
  parameters: {
    docs: { description: { story: 'A leisurely tick rate so you can read individual flashes. Good for understanding the up/down direction logic.' } },
  },
};

export const HighFrequency: Story = {
  name: 'High frequency (4 batches/sec)',
  args: { tickIntervalMs: 100, batchIntervalMs: 50 },
  parameters: {
    docs: {
      description: {
        story:
          'Hammer the grid at 40+ updates/sec. The dedupe-within-batch logic ' +
          'in the streaming plugin ensures one flash per cell per batch, no ' +
          'matter how many raw updates land for the same cell.',
      },
    },
  },
};
