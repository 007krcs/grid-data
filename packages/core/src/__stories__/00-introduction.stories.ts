// © 2025 GridStorm / Tekivex — All Rights Reserved
//
// Landing page for the Storybook. Renders static HTML rather than a grid so
// first-time visitors get a tour of how the rest of the book is organized
// before they start clicking around.

import type { Meta, StoryObj } from '@storybook/html';

const INTRO_HTML = `
<div style="max-width: 760px; margin: 24px auto; padding: 0 24px; font: 16px/1.6 system-ui, -apple-system, sans-serif; color: #1e293b;">
  <h1 style="font-size: 32px; margin-bottom: 4px;">GridStorm</h1>
  <p style="color: #64748b; margin-top: 0;">A next-generation, plugin-first data grid.</p>

  <p>This Storybook is the playground. Each story below renders a live grid
  you can poke at, with a <strong>Controls</strong> panel that lets you change
  props without writing code.</p>

  <p>Most stories ship multiple variants under the same heading. The
  <em>Playground</em> variant is the one wired up to Controls; the others are
  opinionated presets that demonstrate a specific point.</p>

  <h2 style="margin-top: 32px;">How to use it</h2>
  <ol>
    <li>Pick a story from the sidebar on the left.</li>
    <li>Open the <strong>Controls</strong> tab below the canvas. Toggle props
    and watch the grid react in real time.</li>
    <li>Read the <strong>Docs</strong> tab for a prose explanation of what
    each story is teaching.</li>
  </ol>

  <h2 style="margin-top: 32px;">Story groups</h2>
  <table style="width: 100%; border-collapse: collapse;">
    <tbody>
      <tr><td style="padding: 8px 0; vertical-align: top; width: 200px;"><strong>1 · Getting Started</strong></td>
          <td style="padding: 8px 0;">The minimum viable grid. Start here.</td></tr>
      <tr><td style="padding: 8px 0; vertical-align: top;"><strong>2 · Plugins</strong></td>
          <td style="padding: 8px 0;">Sorting, Filtering, Selection, Editing &mdash; one story each, with the plugin's main config knobs surfaced to Controls.</td></tr>
      <tr><td style="padding: 8px 0; vertical-align: top;"><strong>3 · Performance</strong></td>
          <td style="padding: 8px 0;">Virtual scrolling demonstrated with 10k &rarr; 500k row datasets. Open DevTools and watch the live <code>.gs-row</code> count stay constant.</td></tr>
      <tr><td style="padding: 8px 0; vertical-align: top;"><strong>4 · Theming</strong></td>
          <td style="padding: 8px 0;">Light / dark / high-contrast themes and three density modes. No JS theme runtime &mdash; just CSS custom properties on the grid root.</td></tr>
      <tr><td style="padding: 8px 0; vertical-align: top;"><strong>5 · Playground</strong></td>
          <td style="padding: 8px 0;">Kitchen sink with six plugins enabled at once. The right place to test plugin-interaction scenarios.</td></tr>
    </tbody>
  </table>

  <h2 style="margin-top: 32px;">Architecture cheat sheet</h2>
  <p>Every story builds the grid the same way:</p>
  <pre style="background: #0f172a; color: #e2e8f0; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 13px; line-height: 1.5;">import { createGrid } from '@gridstorm/core';
import { DomRenderer } from '@gridstorm/dom-renderer';
import { SortingPlugin } from '@gridstorm/plugin-sorting';

const engine = createGrid({
  columns: [/* column defs */],
  rowData: [/* rows */],
  plugins: [SortingPlugin()],
});

new DomRenderer({ container, engine }).mount();</pre>

  <p>Framework users (React, Vue, Svelte, Angular) get this wrapped in a
  component; the engine and renderer underneath are identical.</p>

  <h2 style="margin-top: 32px;">Where to look in source</h2>
  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
    <thead><tr style="border-bottom: 1px solid #cbd5e1;"><th style="text-align: left; padding: 6px 0;">Want to read</th><th style="text-align: left; padding: 6px 0;">File</th></tr></thead>
    <tbody>
      <tr><td style="padding: 6px 0;">Grid engine</td><td><code>packages/core/src/engine/grid-engine.ts</code></td></tr>
      <tr><td style="padding: 6px 0;">Store + selectors</td><td><code>packages/core/src/state/store.ts</code></td></tr>
      <tr><td style="padding: 6px 0;">Plugin lifecycle</td><td><code>packages/core/src/plugins/plugin-manager.ts</code></td></tr>
      <tr><td style="padding: 6px 0;">Virtual scroller</td><td><code>packages/dom-renderer/src/virtual-scroll.ts</code></td></tr>
      <tr><td style="padding: 6px 0;">Theme tokens</td><td><code>packages/theme-default/src/tokens.css</code></td></tr>
      <tr><td style="padding: 6px 0;">Story sources</td><td><code>packages/core/src/__stories__/</code></td></tr>
    </tbody>
  </table>

  <p style="margin-top: 32px; padding: 12px 16px; background: #fef3c7; border-left: 4px solid #f59e0b; font-size: 14px;">
    <strong>Note:</strong> Storybook hosts the HTML-rendered core. Framework
    adapter stories (React, Vue, etc.) aren't built out here yet &mdash; for
    those, run <code>pnpm --filter feature-showcase dev</code>, which exercises
    the React adapter end-to-end.
  </p>
</div>
`;

const meta: Meta = {
  title: '0 · Introduction',
  parameters: {
    layout: 'fullscreen',
    controls: { hideNoControlsWarning: true },
    docs: {
      description: {
        component:
          'Landing page for the GridStorm Storybook. Picks up automatically as ' +
          'the first item in the sidebar so first-time visitors get oriented.',
      },
    },
  },
  render: () => {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = INTRO_HTML;
    return wrapper;
  },
};

export default meta;
type Story = StoryObj;

export const ReadMe: Story = {};
