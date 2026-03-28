import React, { useState } from 'react';

const REACT_CODE = `import { GridStorm } from '@gridstorm/react';
import { SortingPlugin } from '@gridstorm/plugin-sorting';
import { FilteringPlugin } from '@gridstorm/plugin-filtering';

const columns = [
  { field: 'id',     headerName: 'ID',     width: 80  },
  { field: 'name',   headerName: 'Name',   flex: 1    },
  { field: 'status', headerName: 'Status', width: 120 },
  { field: 'amount', headerName: 'Amount', width: 140 },
];

export function App() {
  return (
    <GridStorm
      columns={columns}
      rowData={data}
      plugins={[SortingPlugin(), FilteringPlugin()]}
      rowSelection="multiple"
      height={500}
    />
  );
}`;

const VUE_CODE = `<script setup lang="ts">
import { GridStorm } from '@gridstorm/vue';
import { SortingPlugin } from '@gridstorm/plugin-sorting';

const columns = [
  { field: 'id',     headerName: 'ID',   width: 80 },
  { field: 'name',   headerName: 'Name', flex: 1   },
  { field: 'amount', headerName: 'Amount', width: 140 },
];
const plugins = [SortingPlugin()];
<\/script>

<template>
  <GridStorm
    :columns="columns"
    :rowData="data"
    :plugins="plugins"
    rowSelection="multiple"
    :height="500"
  />
</template>`;

const VANILLA_CODE = `import { createGrid } from '@gridstorm/core';
import { DomRenderer } from '@gridstorm/dom-renderer';
import { SortingPlugin } from '@gridstorm/plugin-sorting';

const engine = createGrid({
  columns: [
    { field: 'id',     headerName: 'ID',     width: 80  },
    { field: 'name',   headerName: 'Name',   flex: 1    },
    { field: 'amount', headerName: 'Amount', width: 140 },
  ],
  rowData: data,
  plugins: [SortingPlugin()],
});

const renderer = new DomRenderer({
  container: document.getElementById('grid')!,
  engine,
});
renderer.mount();`;

const tabs = [
  { label: 'React', code: REACT_CODE, lang: 'tsx' },
  { label: 'Vue',   code: VUE_CODE,   lang: 'vue' },
  { label: 'Vanilla / Node', code: VANILLA_CODE, lang: 'ts' },
];

function Token({ text, type }: { text: string; type: string }) {
  const colors: Record<string, string> = {
    keyword:  '#cba6f7',
    string:   '#a6e3a1',
    comment:  '#6c7086',
    type:     '#f9e2af',
    fn:       '#89b4fa',
    prop:     '#89dceb',
    tag:      '#94e2d5',
    plain:    '#cdd6f4',
    jsx:      '#f38ba8',
    attr:     '#89b4fa',
    number:   '#fab387',
  };
  return <span style={{ color: colors[type] ?? colors.plain }}>{text}</span>;
}

function CodePreview({ code }: { code: string }) {
  // Very lightweight syntax highlight pass (no runtime dependency)
  const lines = code.split('\n');
  return (
    <pre className="qs-code">
      <code>
        {lines.map((line, i) => (
          <span key={i} className="code-line">
            <span className="code-ln">{String(i + 1).padStart(2, ' ')}</span>
            <SimpleLine line={line} />
            {'\n'}
          </span>
        ))}
      </code>
    </pre>
  );
}

function SimpleLine({ line }: { line: string }) {
  // Tokenize just enough for visual appeal
  const parts: React.ReactNode[] = [];
  let rest = line;
  let key = 0;

  const push = (text: string, type: string) => {
    parts.push(<Token key={key++} text={text} type={type} />);
  };

  // leading whitespace
  const indent = rest.match(/^(\s+)/)?.[1] ?? '';
  if (indent) { push(indent, 'plain'); rest = rest.slice(indent.length); }

  // comment
  if (rest.startsWith('//')) { push(rest, 'comment'); return <>{parts}</>; }

  // import / export / const / function keywords
  const kw = rest.match(/^(import|export|from|const|function|return|default|type|interface|async|await)\b/);
  if (kw) { push(kw[1], 'keyword'); rest = rest.slice(kw[1].length); }

  // JSX closing or opening tags <GridStorm, </
  const tagMatch = rest.match(/^(<\/?)([A-Z]\w*)/);
  if (tagMatch) {
    push(tagMatch[1], 'plain');
    push(tagMatch[2], 'tag');
    rest = rest.slice(tagMatch[0].length);
  }

  // strings
  const strMatch = rest.match(/^('[^']*'|"[^"]*"|`[^`]*`)/);
  if (strMatch) { push(strMatch[1], 'string'); rest = rest.slice(strMatch[1].length); }

  // identifier
  const identMatch = rest.match(/^([A-Za-z_$][\w$]*)/);
  if (identMatch) {
    const id = identMatch[1];
    const isType = /^[A-Z]/.test(id);
    push(id, isType ? 'type' : 'plain');
    rest = rest.slice(id.length);
  }

  if (rest) push(rest, 'plain');
  return <>{parts}</>;
}

export function QuickStart() {
  const [active, setActive] = useState(0);

  return (
    <section className="qs-section">
      <div className="qs-label">Quick Start</div>
      <h2 className="qs-title">
        Up and running in <span className="qs-title-accent">minutes</span>
      </h2>
      <p className="qs-sub">
        Install once, render anywhere. The same headless engine powers React,
        Vue, Angular, Svelte, and plain JavaScript.
      </p>

      <div className="qs-install">
        <code className="qs-install-code">
          <span className="qs-prompt">$</span>
          {' '}pnpm add @gridstorm/react @gridstorm/plugin-sorting
        </code>
        <button
          className="qs-copy"
          onClick={() => navigator.clipboard?.writeText('pnpm add @gridstorm/react @gridstorm/plugin-sorting')}
          title="Copy install command"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </button>
      </div>

      <div className="qs-editor">
        <div className="qs-tabs">
          {tabs.map((t, i) => (
            <button
              key={t.label}
              className={`qs-tab${active === i ? ' qs-tab-active' : ''}`}
              onClick={() => setActive(i)}
            >
              {t.label}
            </button>
          ))}
          <div className="qs-tabs-spacer" />
          <span className="qs-file-badge">{['GridStorm.tsx', 'GridStorm.vue', 'main.ts'][active]}</span>
        </div>
        <CodePreview code={tabs[active].code} />
      </div>

      <div className="qs-actions">
        <a href="#/docs/getting-started/quick-start" className="btn-primary">
          Full Quick Start Guide
        </a>
        <a href="#/demos" className="btn-secondary">
          Explore Live Demos
        </a>
      </div>
    </section>
  );
}
