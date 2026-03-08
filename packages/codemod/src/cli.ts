// ─── GridStorm Codemod CLI ───
// Automated migration tool for converting AG Grid codebases to GridStorm.
// Handles import rewrites, component renames, prop renames, type renames,
// and module-to-plugin conversion.

import { Command } from 'commander';
import { glob } from 'glob';
import chalk from 'chalk';
import fs from 'node:fs';
import path from 'node:path';
import { transformAgGridToGridStorm } from './transforms/ag-grid-to-gridstorm.js';

interface CliOptions {
  from: string;
  dryRun: boolean;
  verbose: boolean;
}

interface TransformResult {
  filePath: string;
  changed: boolean;
  original: string;
  transformed: string;
  changes: string[];
}

const program = new Command();

program
  .name('gridstorm-codemod')
  .description('Codemod CLI to migrate from AG Grid to GridStorm')
  .version('0.1.0')
  .argument('<path>', 'Path to source directory or file to transform')
  .option('--from <framework>', 'Source framework', 'ag-grid')
  .option('--dry-run', 'Show changes without writing files', false)
  .option('--verbose', 'Show detailed transformation logs', false)
  .action(async (targetPath: string, options: CliOptions) => {
    const resolvedPath = path.resolve(targetPath);

    if (!fs.existsSync(resolvedPath)) {
      console.error(chalk.red(`Error: Path "${resolvedPath}" does not exist.`));
      process.exit(1);
    }

    if (options.from !== 'ag-grid') {
      console.error(chalk.red(`Error: Unsupported source framework "${options.from}". Only "ag-grid" is supported.`));
      process.exit(1);
    }

    console.log(chalk.blue('\n  GridStorm Codemod'));
    console.log(chalk.blue('  ─────────────────\n'));
    console.log(`  Source:    ${chalk.cyan(options.from)}`);
    console.log(`  Path:      ${chalk.cyan(resolvedPath)}`);
    console.log(`  Dry run:   ${options.dryRun ? chalk.yellow('yes') : 'no'}`);
    console.log('');

    // Find all TypeScript/JavaScript/JSX/TSX files
    const files = await findSourceFiles(resolvedPath);

    if (files.length === 0) {
      console.log(chalk.yellow('  No source files found.'));
      process.exit(0);
    }

    console.log(`  Found ${chalk.cyan(String(files.length))} source file(s) to scan.\n`);

    let totalChanged = 0;
    let totalChanges = 0;

    for (const filePath of files) {
      const result = processFile(filePath, options);

      if (result.changed) {
        totalChanged++;
        totalChanges += result.changes.length;

        console.log(`  ${chalk.green('MODIFIED')} ${path.relative(resolvedPath, filePath)}`);

        if (options.verbose) {
          for (const change of result.changes) {
            console.log(`    ${chalk.gray('>')} ${change}`);
          }
          console.log('');
        }

        if (!options.dryRun) {
          fs.writeFileSync(filePath, result.transformed, 'utf-8');
        }
      } else if (options.verbose) {
        console.log(`  ${chalk.gray('SKIPPED')}  ${path.relative(resolvedPath, filePath)}`);
      }
    }

    console.log('');
    console.log(chalk.blue('  ─────────────────'));
    console.log(`  Files modified:  ${chalk.cyan(String(totalChanged))} / ${files.length}`);
    console.log(`  Total changes:   ${chalk.cyan(String(totalChanges))}`);

    if (options.dryRun) {
      console.log(chalk.yellow('\n  Dry run mode — no files were written.'));
      console.log(chalk.yellow('  Run without --dry-run to apply changes.\n'));
    } else {
      console.log(chalk.green('\n  Migration complete.\n'));
      console.log('  Next steps:');
      console.log('  1. Review the changes and fix any manual migration items');
      console.log('  2. Install GridStorm packages: npm install @gridstorm/core @gridstorm/react');
      console.log('  3. Install plugins you need (e.g., @gridstorm/plugin-sorting)');
      console.log('  4. Remove AG Grid packages: npm uninstall ag-grid-community ag-grid-react');
      console.log('  5. Run your test suite to verify the migration');
      console.log(`  6. See the full migration guide at ${chalk.cyan('https://gridstorm.dev/guides/migration-from-ag-grid')}\n`);
    }
  });

async function findSourceFiles(targetPath: string): Promise<string[]> {
  const stat = fs.statSync(targetPath);

  if (stat.isFile()) {
    return [targetPath];
  }

  const pattern = '**/*.{ts,tsx,js,jsx,mjs,cjs}';
  const files = await glob(pattern, {
    cwd: targetPath,
    absolute: true,
    ignore: [
      '**/node_modules/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/.nuxt/**',
      '**/coverage/**',
    ],
  });

  return files.sort();
}

function processFile(filePath: string, options: CliOptions): TransformResult {
  const original = fs.readFileSync(filePath, 'utf-8');

  // Quick check: skip files that do not reference AG Grid at all
  if (!hasAgGridReferences(original)) {
    return {
      filePath,
      changed: false,
      original,
      transformed: original,
      changes: [],
    };
  }

  const { code: transformed, changes } = transformAgGridToGridStorm(original, filePath);

  return {
    filePath,
    changed: transformed !== original,
    original,
    transformed,
    changes,
  };
}

function hasAgGridReferences(source: string): boolean {
  return (
    source.includes('ag-grid') ||
    source.includes('AgGridReact') ||
    source.includes('@ag-grid') ||
    source.includes('ag-theme-')
  );
}

program.parse();
