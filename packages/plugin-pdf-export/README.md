# @gridstorm/plugin-pdf-export

Export grid data to PDF with formatting and layout options.

## Install

```bash
npm install @gridstorm/plugin-pdf-export
```

## Usage

```typescript
import { PDFExportPlugin } from '@gridstorm/plugin-pdf-export';

const grid = createGridEngine({ plugins: [PDFExportPlugin()] });
grid.dispatch('pdfExport:export', { fileName: 'report.pdf' });
```

## Features

- **Full grid export to PDF**
- **Header and footer support**
- **Page size and orientation**
- **Style preservation**

## Documentation

[Full Documentation](https://grid-data-analytics-explorer.vercel.app/) | [GitHub](https://github.com/007krcs/grid-data)

## License

MIT
