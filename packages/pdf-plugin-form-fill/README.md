# @gridstorm/pdf-plugin-form-fill

Smart PDF form filling with auto-detection and validation.

## Install

```bash
npm install @gridstorm/pdf-plugin-form-fill
```

## Usage

```typescript
import { FormFillPlugin } from '@gridstorm/pdf-plugin-form-fill';

const pdf = createPDFEngine({ plugins: [FormFillPlugin()] });
```

## Features

- **Auto-detect form fields**
- **Field validation**
- **Pre-fill from data objects**
- **Text, checkbox, radio, dropdown support**

## Documentation

[Full Documentation](https://gridstorm.dev) | [GitHub](https://github.com/nicktesh/gridstorm)

## License

MIT
