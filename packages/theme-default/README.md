# @gridstorm/theme-default

Default theme for GridStorm using CSS custom properties. Includes light, dark, and high-contrast modes with three density levels.

## Install

```bash
npm install @gridstorm/theme-default
```

## Usage

```typescript
// Import the full theme (includes light mode)
import '@gridstorm/theme-default';

// Or import specific variants
import '@gridstorm/theme-default/dark';
import '@gridstorm/theme-default/high-contrast';

// Density modes
import '@gridstorm/theme-default/compact';
import '@gridstorm/theme-default/comfortable';
import '@gridstorm/theme-default/spacious';
```

## Theme Modes

| Import Path | Description |
|-------------|-------------|
| `@gridstorm/theme-default` | Light mode (default) |
| `@gridstorm/theme-default/dark` | Dark mode |
| `@gridstorm/theme-default/high-contrast` | High contrast for accessibility |
| `@gridstorm/theme-default/compact` | Compact row density |
| `@gridstorm/theme-default/comfortable` | Comfortable row density (default) |
| `@gridstorm/theme-default/spacious` | Spacious row density |

## Documentation

[Theming Guide](https://gridstorm.dev/docs/theming) | [Custom Theme Tutorial](https://gridstorm.dev/docs/custom-themes)

## License

MIT
