# @gridstorm/pdf-plugin-pii

PII detection and redaction for PDFs.

## Install

```bash
npm install @gridstorm/pdf-plugin-pii
```

## Usage

```typescript
import { PIIPlugin } from '@gridstorm/pdf-plugin-pii';

const pdf = createPDFEngine({ plugins: [PIIPlugin()] });
```

## Features

- **Detect SSNs, emails, phones, addresses**
- **Visual redaction overlays**
- **Configurable patterns**
- **Audit trail**

## Documentation

[Full Documentation](https://gridstorm.dev) | [GitHub](https://github.com/nicktesh/gridstorm)

## License

MIT
