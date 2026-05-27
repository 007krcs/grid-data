// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// Error boundary story. A React cell renderer is deliberately wired to throw
// on certain values; without the boundary, that throw kills the whole tree.
// Wrapped in GridErrorBoundary, only the offending grid is replaced by a
// fallback UI while the rest of the page stays alive.

import type { Meta, StoryObj } from '@storybook/react';
import { useMemo, useState } from 'react';
import { GridStorm, GridErrorBoundary, reactCellRenderer } from '@gridstorm/react';
import type { ReactColumnDef } from '@gridstorm/react';
import { makeEmployees, formatCurrency, type Employee } from './_helpers';

interface Args {
  rowCount: number;
  triggerError: boolean;
}

const meta: Meta<Args> = {
  title: '1 · React/Error Boundary',
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'The `GridErrorBoundary` catches render-time exceptions from cell ' +
          "renderers and shows a fallback instead of crashing the parent app. " +
          'Toggle **triggerError** to inject a renderer that throws on every ' +
          "row with `rating > 4`. With the boundary on, you see the fallback; " +
          'without it (commented-out variant in the story source), the entire ' +
          'page would white-screen.',
      },
    },
  },
  argTypes: {
    rowCount: { control: { type: 'range', min: 5, max: 200, step: 5 } },
    triggerError: { control: 'boolean' },
  },
  args: { rowCount: 30, triggerError: false },
};

export default meta;
type Story = StoryObj<Args>;

function ExplodingRating({ value }: { value: unknown; node: unknown; column: unknown }) {
  if (typeof value === 'number' && value > 4) {
    throw new Error(`Pretend this renderer crashed on rating ${value}`);
  }
  return <span>{value as number}</span>;
}

function FallbackUI({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ padding: 24, background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8 }}>
      <h3 style={{ margin: '0 0 8px', color: '#991b1b' }}>Cell renderer crashed</h3>
      <p style={{ margin: '0 0 12px', color: '#7f1d1d', fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 12 }}>
        {error.message}
      </p>
      <button
        onClick={reset}
        style={{ padding: '6px 12px', borderRadius: 4, border: '1px solid #ef4444', background: '#fff', color: '#991b1b', cursor: 'pointer' }}
      >
        Reset and retry
      </button>
    </div>
  );
}

function Demo({ rowCount, triggerError }: Args) {
  // The boundary remounts the grid each time the bumpKey changes (after a Reset).
  const [bumpKey, setBumpKey] = useState(0);

  const columns = useMemo<ReactColumnDef<Employee>[]>(() => {
    const cols: ReactColumnDef<Employee>[] = [
      { field: 'name', headerName: 'Name', width: 180, sortable: true },
      { field: 'role', headerName: 'Role', width: 160, sortable: true },
      { field: 'department', headerName: 'Department', width: 160 },
      { field: 'salary', headerName: 'Salary', width: 130, sortable: true, valueFormatter: formatCurrency },
    ];
    if (triggerError) {
      cols.push({
        field: 'rating',
        headerName: 'Rating (explodes > 4)',
        width: 180,
        sortable: true,
        cellRenderer: reactCellRenderer(ExplodingRating),
      });
    } else {
      cols.push({ field: 'rating', headerName: 'Rating', width: 100, sortable: true });
    }
    return cols;
  }, [triggerError]);

  const data = useMemo(() => makeEmployees(rowCount), [rowCount]);

  return (
    <div style={{ padding: 16 }}>
      <p style={{ marginBottom: 12, color: '#475569' }}>
        Outer app content stays alive even when the grid crashes inside the boundary.
      </p>
      <GridErrorBoundary fallback={(error, reset) => <FallbackUI error={error} reset={() => { reset(); setBumpKey((k) => k + 1); }} />}>
        <GridStorm
          key={bumpKey}
          columns={columns}
          rowData={data}
          height={420}
        />
      </GridErrorBoundary>
    </div>
  );
}

export const Playground: Story = { render: (args) => <Demo {...args} /> };

export const ErrorTriggered: Story = {
  name: 'Trigger the crash (renderer throws on rating > 4)',
  args: { triggerError: true },
  render: (args) => <Demo {...args} />,
  parameters: {
    docs: {
      description: {
        story:
          'The exploding cell renderer fires. The boundary catches it and ' +
          'renders the fallback UI. Click **Reset and retry** to remount the ' +
          "grid (the data will still contain rating>4 rows, so you'll see " +
          'the boundary catch again — toggle **triggerError** off to recover).',
      },
    },
  },
};
