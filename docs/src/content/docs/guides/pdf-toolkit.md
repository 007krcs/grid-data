---
title: PDF Toolkit
description: Complete guide to GridStorm's PDF engine, renderer, and plugin ecosystem for viewing, annotating, searching, and processing PDF documents.
---

GridStorm's PDF toolkit provides a headless PDF engine with a pluggable parser, a DOM-based renderer, and a rich plugin ecosystem for text extraction, form filling, document intelligence, and PII detection. The architecture mirrors the grid core -- commands for mutation, events for observation, and plugins for extension.

## Installation

Install the packages you need. The core engine is required; the renderer and plugins are optional.

```bash title="Install packages"
# Core engine (required)
pnpm add @gridstorm/pdf-core

# DOM renderer (optional -- for visual PDF viewing)
pnpm add @gridstorm/pdf-renderer

# Plugins (install only what you need)
pnpm add @gridstorm/pdf-plugin-text
pnpm add @gridstorm/pdf-plugin-form-fill
pnpm add @gridstorm/pdf-plugin-intelligence
pnpm add @gridstorm/pdf-plugin-pii
```

:::example{title="PDF Viewer Demo" href="/pdf-viewer/"}
Interactive PDF viewer with canvas rendering, text search, annotations, and theme switching. Built on @gridstorm/pdf-core.
:::

## Architecture

The PDF toolkit follows the same headless architecture as the grid:

```
PdfParser (pluggable) ──► PdfEngine ──► Store + EventBus + CommandBus
                              │
                         PdfPluginManager
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
         Text Plugin    Form Fill Plugin   PII Plugin
              │
              ▼
         PdfRenderer (DOM)
```

The `PdfParser` interface allows you to bring your own PDF parsing backend (such as pdf.js). The engine manages document state, annotations, navigation, zoom, and undo/redo. Plugins extend functionality through the same command/event pattern used by the grid.

## PdfParser Interface

The parser is a pluggable backend that handles raw PDF byte parsing. You must provide a parser implementation to load real PDF files.

```typescript title="PdfParser interface"
interface PdfParser {
  loadDocument(source: ArrayBuffer | Uint8Array): Promise<ParsedDocument>;
  getPageText(pageIndex: number): Promise<PageTextContent>;
  getPageInfo(pageIndex: number): PageInfo;
  getPageCount(): number;
  destroy(): void;
}
```

| Method | Returns | Description |
|--------|---------|-------------|
| `loadDocument` | `Promise<ParsedDocument>` | Parse raw PDF bytes into page metadata |
| `getPageText` | `Promise<PageTextContent>` | Extract text items from a specific page |
| `getPageInfo` | `PageInfo` | Get page dimensions and rotation |
| `getPageCount` | `number` | Total number of pages |
| `destroy` | `void` | Release parser resources |

## PdfEngine API

Create an engine instance with `createPdfEngine`. The returned object exposes the public API, store, event bus, command bus, and plugin manager.

```typescript title="Create the PDF engine"
import { createPdfEngine } from '@gridstorm/pdf-core';
import { createTextPlugin } from '@gridstorm/pdf-plugin-text';

const engine = createPdfEngine({
  initialZoom: 1.5,
  initialPage: 0,
  initialToolMode: 'select',
  maxHistorySize: 100,
  parser: myPdfJsParser, // your PdfParser implementation
  plugins: [createTextPlugin()],
});
```

### Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `container` | `HTMLElement \| string` | -- | Container element or CSS selector |
| `initialZoom` | `number` | `1.0` | Starting zoom level |
| `initialPage` | `number` | `0` | Starting page index (0-based) |
| `initialToolMode` | `string` | `'select'` | Starting tool mode |
| `maxHistorySize` | `number` | `50` | Maximum undo history entries |
| `plugins` | `PdfPlugin[]` | `[]` | Plugins to install |
| `enableTextLayer` | `boolean` | `true` | Enable text selection layer |
| `enableAnnotationLayer` | `boolean` | `true` | Enable annotation overlay |
| `parser` | `PdfParser` | -- | Pluggable PDF parsing backend |

### Public API Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `loadDocument` | `(source: ArrayBuffer \| Uint8Array \| string) => Promise<void>` | Load a PDF document |
| `saveDocument` | `() => Promise<Blob>` | Save the current document as a Blob |
| `closeDocument` | `() => void` | Close the current document and reset state |
| `goToPage` | `(pageIndex: number) => void` | Navigate to a specific page |
| `getCurrentPage` | `() => number` | Get the active page index |
| `getPageCount` | `() => number` | Get total page count |
| `setZoom` | `(zoom: number) => void` | Set zoom level (0.1 to 10) |
| `getZoom` | `() => number` | Get current zoom level |
| `setToolMode` | `(mode: string) => void` | Set the active tool mode |
| `getToolMode` | `() => string` | Get current tool mode |
| `getAnnotations` | `(pageIndex?: number) => PdfAnnotation[]` | Get annotations, optionally filtered by page |
| `getAnnotation` | `(id: string) => PdfAnnotation \| undefined` | Get a single annotation by ID |
| `undo` | `() => void` | Undo the last undoable command |
| `redo` | `() => void` | Redo the last undone command |
| `canUndo` | `() => boolean` | Check if undo is available |
| `canRedo` | `() => boolean` | Check if redo is available |
| `getState` | `() => PdfDocumentState` | Get the full document state |
| `addEventListener` | `(event, listener) => () => void` | Subscribe to an event; returns unsubscribe function |
| `getPluginApi` | `(pluginId: string) => T \| undefined` | Retrieve a plugin's public API |
| `destroy` | `() => void` | Destroy the engine and release resources |

### Tool Modes

The engine supports these tool modes for user interaction:

`select`, `hand`, `text-select`, `annotation-highlight`, `annotation-underline`, `annotation-strikethrough`, `annotation-squiggle`, `annotation-circle`, `annotation-rectangle`, `annotation-polygon`, `annotation-ink`, `annotation-text`, `annotation-freetext`, `annotation-stamp`, `annotation-line`, `annotation-redaction`, `signature`

## PDF Renderer

The `PdfRenderer` class creates a scrollable, zoomable PDF viewer with text and annotation layers.

```typescript title="Mount the PDF renderer"
import { PdfRenderer } from '@gridstorm/pdf-renderer';

const renderer = new PdfRenderer({
  api: engine.api,
  container: '#pdf-viewer',
  enableToolbar: true,
  enableTextLayer: true,
  enableAnnotationLayer: true,
  devicePixelRatio: window.devicePixelRatio,
});

renderer.mount();
```

### Renderer Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `api` | `PdfApi` | required | PDF API instance from `createPdfEngine` |
| `container` | `HTMLElement \| string` | required | Container element or CSS selector |
| `classPrefix` | `string` | `'gs-pdf'` | CSS class prefix |
| `devicePixelRatio` | `number` | `window.devicePixelRatio` | Pixel ratio for canvas rendering |
| `enableToolbar` | `boolean` | `true` | Show the built-in toolbar |
| `enableTextLayer` | `boolean` | `true` | Enable text selection layer |
| `enableAnnotationLayer` | `boolean` | `true` | Enable annotation overlay |
| `extensions` | `PdfRendererExtension[]` | `[]` | Additional renderer extensions |

The renderer only renders pages that are currently visible in the viewport, recycling DOM nodes as you scroll -- the same virtual scrolling approach used by the grid.

## Text Extraction Plugin

The text plugin provides text extraction and full-text search across all pages.

```typescript title="Text extraction and search"
import { createTextPlugin } from '@gridstorm/pdf-plugin-text';

const engine = createPdfEngine({
  parser: myParser,
  plugins: [createTextPlugin()],
});

// After loading a document:
await engine.api.loadDocument(pdfBytes);

// Extract text from page 0
engine.commandBus.dispatch('text:extract', { pageIndex: 0 });

// Search across all extracted pages
engine.commandBus.dispatch('text:search', {
  query: 'invoice',
  options: { caseSensitive: false, wholeWord: true },
});

// Navigate through matches
engine.commandBus.dispatch('text:searchNext', {});
engine.commandBus.dispatch('text:searchPrev', {});
```

### Text Commands

| Command | Payload | Description |
|---------|---------|-------------|
| `text:extract` | `{ pageIndex: number }` | Extract text from a single page |
| `text:extractAll` | `{}` | Extract text from all pages |
| `text:search` | `{ query, caseSensitive?, wholeWord?, regex? }` | Search for text across pages |
| `text:searchNext` | `{}` | Navigate to the next search match |
| `text:searchPrev` | `{}` | Navigate to the previous search match |
| `text:clearSearch` | `{}` | Clear all search results |

## Form Fill Plugin

The form fill plugin detects form fields in PDFs and fills them with data. It depends on the text plugin.

```typescript title="Detect and fill form fields"
import { createTextPlugin } from '@gridstorm/pdf-plugin-text';
import { createFormFillPlugin } from '@gridstorm/pdf-plugin-form-fill';

const engine = createPdfEngine({
  parser: myParser,
  plugins: [
    createTextPlugin(),
    createFormFillPlugin({ autoDetect: true }),
  ],
});

await engine.api.loadDocument(pdfBytes);

// Manually detect fields (or use autoDetect on text extraction)
engine.commandBus.dispatch('form:detectFields', { pageIndex: 0 });

// Fill detected fields with data
engine.commandBus.dispatch('form:fill', {
  data: {
    'Full Name': 'Jane Smith',
    'Email': 'jane@example.com',
    'Phone': '555-0123',
  },
});

// Validate filled values
engine.commandBus.dispatch('form:validate', {});
```

### Form Fill Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `autoDetect` | `boolean` | `false` | Automatically detect fields when text is extracted |
| `validationRules` | `Record<FieldType, RegExp>` | -- | Custom validation patterns per field type |

### Field Types

`text`, `date`, `email`, `phone`, `address`, `name`, `number`, `checkbox`, `signature`, `custom`

### Form Commands

| Command | Payload | Description |
|---------|---------|-------------|
| `form:detectFields` | `{ pageIndex?: number }` | Detect form fields on a page or all pages |
| `form:fill` | `{ data: Record<string, string> }` | Fill detected fields with key-value data |
| `form:validate` | `{}` | Validate all field values |
| `form:clear` | `{}` | Clear all filled values |

## Intelligence Plugin

The intelligence plugin provides document classification, field extraction, summarization, and table detection. It depends on the text plugin.

```typescript title="Document intelligence"
import { createTextPlugin } from '@gridstorm/pdf-plugin-text';
import { createIntelligencePlugin } from '@gridstorm/pdf-plugin-intelligence';

const engine = createPdfEngine({
  parser: myParser,
  plugins: [
    createTextPlugin(),
    createIntelligencePlugin(),
  ],
});

await engine.api.loadDocument(pdfBytes);

// Classify the document type
engine.commandBus.dispatch('intel:classify', { topN: 3 });

// Extract structured fields
engine.commandBus.dispatch('intel:extract', {
  fields: ['Invoice Number', 'Total Amount', 'Due Date'],
});

// Generate a summary
engine.commandBus.dispatch('intel:summarize', { maxLength: 500 });

// Detect tables
engine.commandBus.dispatch('intel:detectTables', {});
```

### Document Classes

`invoice`, `contract`, `receipt`, `letter`, `report`, `form`, `legal`, `medical`, `financial`, `unknown`

### Intelligence Commands

| Command | Payload | Description |
|---------|---------|-------------|
| `intel:classify` | `{ topN?: number }` | Classify document type (default top 3) |
| `intel:extract` | `{ fields?: string[] }` | Extract named fields from text |
| `intel:summarize` | `{ maxLength?: number }` | Generate a document summary |
| `intel:detectTables` | `{}` | Detect tabular data across all pages |

## PII Detection Plugin

The PII plugin scans extracted text for personally identifiable information and can auto-create redaction annotations. It depends on the text plugin.

```typescript title="PII detection and redaction"
import { createTextPlugin } from '@gridstorm/pdf-plugin-text';
import { createPiiPlugin } from '@gridstorm/pdf-plugin-pii';

const engine = createPdfEngine({
  parser: myParser,
  plugins: [
    createTextPlugin(),
    createPiiPlugin({
      confidenceThreshold: 0.8,
      autoScan: true, // scan pages automatically after text extraction
      enabledTypes: ['email', 'ssn', 'phone', 'credit-card'],
    }),
  ],
});

await engine.api.loadDocument(pdfBytes);

// Manually scan a specific page
engine.commandBus.dispatch('pii:scan', { pageIndex: 0 });

// Scan all pages
engine.commandBus.dispatch('pii:scanAll', {});

// Auto-redact all detected PII
engine.commandBus.dispatch('pii:autoRedact', {
  types: ['ssn', 'credit-card'],
});
```

### PII Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabledTypes` | `PiiType[]` | all types | PII types to detect |
| `confidenceThreshold` | `number` | `0.7` | Minimum confidence score (0-1) |
| `customPatterns` | `CustomPattern[]` | `[]` | Custom regex patterns for detection |
| `autoScan` | `boolean` | `false` | Scan automatically after text extraction |

### PII Types

`email`, `phone`, `ssn`, `credit-card`, `date-of-birth`, `address`, `name`, `passport`, `ip-address`, `custom`

### PII Commands

| Command | Payload | Description |
|---------|---------|-------------|
| `pii:scan` | `{ pageIndex: number }` | Scan a single page for PII |
| `pii:scanAll` | `{}` | Scan all pages |
| `pii:autoRedact` | `{ types?: string[] }` | Create redaction annotations for matches |
| `pii:configure` | `Partial<PiiConfig>` | Update PII configuration at runtime |

## Commands Reference

All core PDF commands available on the command bus:

| Command | Payload | Description |
|---------|---------|-------------|
| `page:goTo` | `{ pageIndex }` | Navigate to page |
| `zoom:set` | `{ zoom }` | Set zoom level (0.1 - 10) |
| `zoom:fitWidth` | `{ containerWidth? }` | Fit page width to container |
| `zoom:fitPage` | `{ containerWidth?, containerHeight? }` | Fit full page to container |
| `scroll:to` | `{ x, y }` | Set scroll position |
| `tool:set` | `{ mode }` | Set tool mode |
| `annotation:create` | `{ annotation }` | Create a new annotation |
| `annotation:update` | `{ annotationId, changes }` | Update annotation properties |
| `annotation:delete` | `{ annotationId }` | Delete an annotation |
| `annotation:select` | `{ annotationIds }` | Select annotations |
| `annotation:deselect` | `{}` | Deselect all annotations |
| `annotation:move` | `{ annotationId, deltaX, deltaY }` | Move an annotation |
| `annotation:resize` | `{ annotationId, newRect }` | Resize an annotation |
| `redaction:mark` | `{ pageIndex, rect, overlayText? }` | Mark a region for redaction |
| `redaction:apply` | `{ annotationIds }` | Apply specific redactions |
| `redaction:applyAll` | `{}` | Apply all pending redactions |
| `history:clear` | `{}` | Clear undo/redo history |

## Events Reference

| Event | Payload | Description |
|-------|---------|-------------|
| `document:loaded` | `{ pageCount, metadata }` | Document loaded successfully |
| `document:closed` | `{}` | Document closed |
| `document:saved` | `{ blob }` | Document saved |
| `document:error` | `{ error, source }` | An error occurred |
| `page:changed` | `{ pageIndex }` | Active page changed |
| `page:rendered` | `{ pageIndex }` | Page rendered to canvas |
| `zoom:changed` | `{ zoom }` | Zoom level changed |
| `scroll:changed` | `{ x, y }` | Scroll position changed |
| `tool:changed` | `{ mode }` | Tool mode changed |
| `annotation:created` | `{ annotation }` | Annotation created |
| `annotation:updated` | `{ annotation, changes }` | Annotation updated |
| `annotation:deleted` | `{ annotationId }` | Annotation deleted |
| `annotation:selected` | `{ annotationIds }` | Annotations selected |
| `text:extracted` | `{ pageIndex, textContent }` | Text extracted from page |
| `search:found` | `{ query, matches, total }` | Search results found |
| `history:changed` | `{ canUndo, canRedo }` | History state changed |

## Full Working Example

```typescript title="Complete PDF viewer with all plugins"
import { createPdfEngine } from '@gridstorm/pdf-core';
import { PdfRenderer } from '@gridstorm/pdf-renderer';
import { createTextPlugin } from '@gridstorm/pdf-plugin-text';
import { createFormFillPlugin } from '@gridstorm/pdf-plugin-form-fill';
import { createIntelligencePlugin } from '@gridstorm/pdf-plugin-intelligence';
import { createPiiPlugin } from '@gridstorm/pdf-plugin-pii';

// 1. Create the engine with plugins
const engine = createPdfEngine({
  parser: myPdfJsParser,
  initialZoom: 1.0,
  maxHistorySize: 100,
  plugins: [
    createTextPlugin(),
    createFormFillPlugin({ autoDetect: true }),
    createIntelligencePlugin(),
    createPiiPlugin({
      confidenceThreshold: 0.8,
      autoScan: true,
    }),
  ],
});

// 2. Mount the renderer
const renderer = new PdfRenderer({
  api: engine.api,
  container: '#pdf-viewer',
  enableToolbar: true,
});
renderer.mount();

// 3. Load a document
const response = await fetch('/documents/sample.pdf');
const bytes = await response.arrayBuffer();
await engine.api.loadDocument(bytes);

// 4. Listen for events
engine.api.addEventListener('document:loaded', ({ pageCount }) => {
  console.log(`Loaded ${pageCount} pages`);
});

engine.api.addEventListener('pii:detected', (event) => {
  console.log(`Found ${event.total} PII matches`);
});

// 5. Interact with the document
engine.api.setZoom(1.5);
engine.api.goToPage(2);

engine.commandBus.dispatch('text:search', {
  query: 'confidential',
});

// 6. Save the modified document
const blob = await engine.api.saveDocument();
const url = URL.createObjectURL(blob);

// 7. Cleanup
renderer.destroy();
engine.destroy();
```

## Next Steps

- [Custom Plugins](/guides/custom-plugins) -- Build your own PDF plugins using the same PdfPlugin interface
- [MCP Server](/guides/mcp-server) -- Use PDF tools via AI agents through the Model Context Protocol
- [Integration Guide](/guides/integration-guide) -- Add the PDF toolkit to your existing project
