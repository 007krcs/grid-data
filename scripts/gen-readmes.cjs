const fs = require('fs');
const path = require('path');

const readmes = {
  'mcp-server': {
    desc: 'MCP (Model Context Protocol) server for AI/LLM integration with GridStorm grids.',
    usage: `import { createMCPServer } from '@gridstorm/mcp-server';\n\nconst server = createMCPServer({ grid: engine });`,
    features: ['Natural language grid queries', 'Data exploration tools', 'Grid state inspection', 'Compatible with Claude and other LLMs']
  },
  'pdf-core': {
    desc: 'Headless PDF engine with command bus, undo/redo, and plugin system.',
    usage: `import { createPDFEngine } from '@gridstorm/pdf-core';\n\nconst pdf = createPDFEngine({ plugins: [] });\npdf.loadDocument(arrayBuffer);`,
    features: ['Headless PDF processing', 'Command bus with undo/redo', 'Plugin architecture', 'Zero DOM dependencies']
  },
  'pdf-renderer': {
    desc: 'Canvas-based PDF renderer with DOM text layer and annotation support.',
    usage: `import { PDFRenderer } from '@gridstorm/pdf-renderer';\n\nconst renderer = new PDFRenderer({ container: element });\nrenderer.render(page);`,
    features: ['Canvas rendering', 'DOM text layer for selection', 'Annotation layer', 'Zoom and pan controls']
  },
  'pdf-theme': {
    desc: 'CSS custom properties theme for the GridStorm PDF viewer.',
    usage: `import '@gridstorm/pdf-theme/dist/index.css';`,
    features: ['CSS custom properties', 'Light and dark modes', 'Customizable via CSS variables']
  },
  'pdf-plugin-form-fill': {
    desc: 'Smart PDF form filling with auto-detection and validation.',
    usage: `import { FormFillPlugin } from '@gridstorm/pdf-plugin-form-fill';\n\nconst pdf = createPDFEngine({ plugins: [FormFillPlugin()] });`,
    features: ['Auto-detect form fields', 'Field validation', 'Pre-fill from data objects', 'Text, checkbox, radio, dropdown support']
  },
  'pdf-plugin-intelligence': {
    desc: 'PDF document classification, data extraction, and summarization.',
    usage: `import { IntelligencePlugin } from '@gridstorm/pdf-plugin-intelligence';\n\nconst pdf = createPDFEngine({ plugins: [IntelligencePlugin()] });`,
    features: ['Document classification', 'Key-value extraction', 'Text summarization', 'Pattern recognition']
  },
  'pdf-plugin-pii': {
    desc: 'PII detection and redaction for PDFs.',
    usage: `import { PIIPlugin } from '@gridstorm/pdf-plugin-pii';\n\nconst pdf = createPDFEngine({ plugins: [PIIPlugin()] });`,
    features: ['Detect SSNs, emails, phones, addresses', 'Visual redaction overlays', 'Configurable patterns', 'Audit trail']
  },
  'pdf-plugin-text': {
    desc: 'PDF text extraction and full-text search.',
    usage: `import { TextPlugin } from '@gridstorm/pdf-plugin-text';\n\nconst pdf = createPDFEngine({ plugins: [TextPlugin()] });`,
    features: ['Full text extraction', 'Search with highlighting', 'Page and document-level search', 'Regex support']
  },
  'plugin-ai': {
    desc: 'AI-powered grid features: natural language queries, anomaly detection, and smart suggestions.',
    usage: `import { AIPlugin } from '@gridstorm/plugin-ai';\n\nconst grid = createGridEngine({\n  plugins: [AIPlugin({ autoDetect: true })],\n});\ngrid.dispatch('ai:query', { text: 'sort by salary descending' });`,
    features: ['Natural language query parser (no API needed)', 'Anomaly detection (Z-score + IQR)', 'Smart data suggestions', 'Optional LLM adapter for complex queries']
  },
  'plugin-charts': {
    desc: 'SVG-based inline chart renderers for grid cells.',
    usage: `import { ChartsPlugin } from '@gridstorm/plugin-charts';\n\nconst grid = createGridEngine({ plugins: [ChartsPlugin()] });`,
    features: ['Bar, line, pie, and scatter charts', 'Inline cell rendering', 'Customizable colors and sizes', 'Pure SVG']
  },
  'plugin-column-autosize': {
    desc: 'Automatically fit column widths to content.',
    usage: `import { ColumnAutoSizePlugin } from '@gridstorm/plugin-column-autosize';\n\nconst grid = createGridEngine({\n  plugins: [ColumnAutoSizePlugin({ padding: 16 })],\n});\ngrid.dispatch('autoSize:all', {});`,
    features: ['Fit-to-content width calculation', 'Character-width estimation', 'Header text inclusion', 'Min/max width constraints']
  },
  'plugin-conditional-formatting': {
    desc: 'Rule-based cell styling with 18+ condition types.',
    usage: `import { ConditionalFormattingPlugin } from '@gridstorm/plugin-conditional-formatting';\n\nconst grid = createGridEngine({\n  plugins: [ConditionalFormattingPlugin()],\n});\ngrid.dispatch('formatting:addRule', {\n  rule: { colId: 'revenue', condition: { type: 'greaterThan', value: 1000000 }, style: { backgroundColor: '#d4edda' } }\n});`,
    features: ['18 condition types', 'Color scales and data bars', 'Icon sets', 'Priority-based rule stacking']
  },
  'plugin-pdf-export': {
    desc: 'Export grid data to PDF with formatting and layout options.',
    usage: `import { PDFExportPlugin } from '@gridstorm/plugin-pdf-export';\n\nconst grid = createGridEngine({ plugins: [PDFExportPlugin()] });\ngrid.dispatch('pdfExport:export', { fileName: 'report.pdf' });`,
    features: ['Full grid export to PDF', 'Header and footer support', 'Page size and orientation', 'Style preservation']
  },
  'plugin-row-pinning': {
    desc: 'Pin rows to top or bottom of the grid (floating rows).',
    usage: `import { RowPinningPlugin } from '@gridstorm/plugin-row-pinning';\n\nconst grid = createGridEngine({\n  plugins: [RowPinningPlugin({ maxPinnedRows: 5 })],\n});\ngrid.dispatch('rowPinning:pinTop', { rowId: 'row-1' });`,
    features: ['Pin to top or bottom', 'Max capacity limits', 'Duplicate prevention', 'Summary row data injection']
  },
  'plugin-row-reorder': {
    desc: 'Drag-and-drop row reordering.',
    usage: `import { RowReorderPlugin } from '@gridstorm/plugin-row-reorder';\n\nconst grid = createGridEngine({ plugins: [RowReorderPlugin()] });`,
    features: ['Drag-and-drop reordering', 'Visual drag indicators', 'Index and ID-based move commands']
  },
  'plugin-sparklines': {
    desc: 'Inline SVG sparkline renderers for grid cells.',
    usage: `import { SparklinesPlugin } from '@gridstorm/plugin-sparklines';\n\nconst grid = createGridEngine({ plugins: [SparklinesPlugin()] });`,
    features: ['Line, bar, area, win-loss sparklines', 'Inline cell rendering', 'Customizable colors', 'Pure SVG']
  },
  'plugin-state-persistence': {
    desc: 'Save and restore grid state to localStorage or a custom adapter.',
    usage: `import { StatePersistencePlugin } from '@gridstorm/plugin-state-persistence';\n\nconst grid = createGridEngine({\n  plugins: [StatePersistencePlugin({ storageKey: 'my-grid', autoSave: true })],\n});`,
    features: ['Auto-save with debounce', 'localStorage default adapter', 'Custom storage adapters', 'Include/exclude state slices', 'JSON export/import']
  },
  'plugin-status-bar': {
    desc: 'Aggregation summary bar showing sum, average, min, max, and count.',
    usage: `import { StatusBarPlugin } from '@gridstorm/plugin-status-bar';\n\nconst grid = createGridEngine({\n  plugins: [StatusBarPlugin({ showOnSelection: true })],\n});`,
    features: ['Sum, avg, min, max, count', 'Auto-recalculate on selection', 'Configurable panels', 'Show for all rows or selection']
  },
  'plugin-streaming': {
    desc: 'Real-time live data streaming with batched updates and change tracking.',
    usage: `import { StreamingPlugin } from '@gridstorm/plugin-streaming';\n\nconst grid = createGridEngine({\n  plugins: [StreamingPlugin({ batchInterval: 100 })],\n});\ngrid.dispatch('stream:connect', { adapter: myWebSocketAdapter });`,
    features: ['Batched update processing', 'Cell change direction tracking', 'Adapter pattern (WebSocket, SSE, polling)', 'Pause/resume controls']
  },
  'svelte-adapter': {
    desc: 'Svelte 5 wrapper component for GridStorm.',
    usage: `<script>\n  import { GridStorm } from '@gridstorm/svelte';\n</script>\n\n<GridStorm columnDefs={columns} rowData={data} plugins={plugins} />`,
    features: ['Svelte 5 runes compatible', 'Reactive props', 'Auto-cleanup on destroy', 'Full TypeScript support']
  }
};

for (const [pkg, info] of Object.entries(readmes)) {
  const pkgJsonPath = path.join(__dirname, '..', 'packages', pkg, 'package.json');
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  const name = pkgJson.name;
  const license = pkgJson.license || 'MIT';
  const featureList = info.features.map(f => `- **${f}**`).join('\n');

  const content = `# ${name}

${info.desc}

## Install

\`\`\`bash
npm install ${name}
\`\`\`

## Usage

\`\`\`typescript
${info.usage}
\`\`\`

## Features

${featureList}

## Documentation

[Full Documentation](https://gridstorm.dev) | [GitHub](https://github.com/nicktesh/gridstorm)

## License

${license}
`;

  const outPath = path.join(__dirname, '..', 'packages', pkg, 'README.md');
  fs.writeFileSync(outPath, content);
  console.log('Created README for', name);
}

console.log('\nDone! Generated', Object.keys(readmes).length, 'READMEs');
