# Changesets

This project uses [Changesets](https://github.com/changesets/changesets) to manage versioning and changelogs for the `@gridstorm/*` package family.

## For Contributors

When you make a change that should be released, you need to add a changeset. A changeset describes which packages are affected and whether the change is a patch, minor, or major bump.

### Adding a changeset

```bash
pnpm changeset
```

This will walk you through an interactive prompt:

1. **Select the packages** that your change affects.
2. **Choose the bump type** for each package:
   - `patch` — Bug fixes, performance improvements, internal refactors
   - `minor` — New features, new plugin options, non-breaking API additions
   - `major` — Breaking API changes, removed features, renamed exports
3. **Write a summary** describing the change (this becomes the changelog entry).

A new markdown file will be created in the `.changeset/` directory. Commit this file along with your code changes.

### When to add a changeset

- Any user-facing change (bug fix, feature, breaking change)
- New plugin options or configuration
- Performance improvements
- Dependency updates that affect consumers

### When NOT to add a changeset

- Internal-only changes (CI, tests, dev tooling)
- Documentation-only changes
- Changes to the `@gridstorm/benchmarks` package (it is ignored)

## For Maintainers

### Versioning

```bash
pnpm version
```

This consumes all pending changesets, updates package versions, and generates/updates `CHANGELOG.md` files in each affected package.

### Publishing

```bash
pnpm publish
```

This builds all packages and publishes them to npm. All `@gridstorm/*` packages are linked, meaning a changeset affecting any one of them will bump all linked packages together.

### Alpha releases

```bash
pnpm publish:alpha
```

Publishes under the `alpha` dist-tag for pre-release testing.

## Configuration

The changeset configuration lives in `.changeset/config.json`:

- **linked**: All `@gridstorm/*` packages are linked together for consistent versioning.
- **access**: All packages are published with public access.
- **baseBranch**: `main`
- **ignore**: `@gridstorm/benchmarks` is excluded from versioning.
