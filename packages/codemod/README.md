# @gridstorm/codemod

CLI tool to automatically migrate your codebase from AG Grid to GridStorm.

## Install

```bash
npm install -g @gridstorm/codemod
```

## Usage

```bash
# Migrate a directory
gridstorm-codemod ./src

# Dry run (preview changes without writing)
gridstorm-codemod ./src --dry-run

# Target specific file patterns
gridstorm-codemod ./src --include "**/*.tsx"
```

## What It Transforms

- AG Grid import paths to GridStorm equivalents
- Component props and configuration options
- Column definition API differences
- Event handler signatures

## Documentation

[Migration Guide](https://grid-data-analytics-explorer.vercel.app//docs/migration) | [Codemod Reference](https://grid-data-analytics-explorer.vercel.app//docs/codemod)

## License

MIT
