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

[Full Documentation](https://gridstorm.dev) | [GitHub](https://github.com/nicktesh/gridstorm)

## License

MIT
