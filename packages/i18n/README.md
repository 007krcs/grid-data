# @gridstorm/i18n

Internationalization and RTL support for GridStorm.

## Install

```bash
npm install @gridstorm/i18n
```

## Usage

```typescript
import { createGridEngine } from '@gridstorm/core';
import { I18nPlugin, localeDE } from '@gridstorm/i18n';

const engine = createGridEngine({
  columnDefs: columns,
  rowData: data,
  plugins: [I18nPlugin({ locale: localeDE })],
});
```

## Features

- Locale-aware text for built-in UI elements (pagination, filters, menus)
- Right-to-left (RTL) layout support
- Custom locale definitions
- Runtime locale switching

## Documentation

[Internationalization Guide](https://gridstorm.dev/docs/i18n) | [RTL Support](https://gridstorm.dev/docs/rtl)

## License

MIT
