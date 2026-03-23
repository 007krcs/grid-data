# @gridstorm/pdf-core

Headless PDF engine with command bus, undo/redo, and plugin system.

## Install

```bash
npm install @gridstorm/pdf-core
```

## Usage

```typescript
import { createPDFEngine } from '@gridstorm/pdf-core';

const pdf = createPDFEngine({ plugins: [] });
pdf.loadDocument(arrayBuffer);
```

## Features

- **Headless PDF processing**
- **Command bus with undo/redo**
- **Plugin architecture**
- **Zero DOM dependencies**

## Documentation

[Full Documentation](https://grid-data-analytics-explorer.vercel.app/) | [GitHub](https://github.com/007krcs/grid-data)

## License

MIT
