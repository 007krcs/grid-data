// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
// ─── AG Grid → GridStorm Transform ───
// The main jscodeshift-based transform that converts AG Grid code to GridStorm.
// Handles import rewrites, component renames, prop renames, type renames,
// theme class conversions, and module-to-plugin conversion comments.

import type { API, FileInfo, JSCodeshift, Collection, ASTPath } from 'jscodeshift';
import jscodeshift from 'jscodeshift';
import {
  PACKAGE_MAP,
  NAMED_EXPORT_MAP,
  CSS_IMPORTS_TO_REMOVE,
  GRIDSTORM_THEME_IMPORT,
} from './import-map.js';
import {
  PROP_MAP,
  COLUMN_PROP_MAP,
  THEME_CLASS_MAP,
  MODULE_TO_PLUGIN_MAP,
} from './prop-map.js';

export interface TransformOutput {
  code: string;
  changes: string[];
}

/**
 * Transforms AG Grid source code to GridStorm.
 * This is the main entry point called by the CLI for each file.
 */
export function transformAgGridToGridStorm(source: string, filePath: string): TransformOutput {
  const changes: string[] = [];
  const j = jscodeshift.withParser(detectParser(filePath));
  let root: Collection;

  try {
    root = j(source);
  } catch (_err) {
    // If parsing fails, return unchanged
    return { code: source, changes: [] };
  }

  // ── 1. Rewrite import declarations ──
  rewriteImports(j, root, changes);

  // ── 2. Replace CSS imports with GridStorm theme import ──
  replaceCssImports(j, root, changes);

  // ── 3. Rename JSX component usage ──
  renameJsxComponents(j, root, changes);

  // ── 4. Rename JSX props ──
  renameJsxProps(j, root, changes);

  // ── 5. Rename type references ──
  renameTypeReferences(j, root, changes);

  // ── 6. Convert theme CSS classes to data-theme attributes ──
  convertThemeClasses(j, root, changes);

  // ── 7. Add TODO comments for modules → plugins conversion ──
  addModuleToPluginComments(j, root, changes);

  // ── 8. Rename ColDef type annotations ──
  renameColDefAnnotations(j, root, changes);

  const output = root.toSource({ quote: 'single' });
  return { code: output, changes };
}

// ── Helpers ──

function detectParser(filePath: string): string {
  if (filePath.endsWith('.tsx')) return 'tsx';
  if (filePath.endsWith('.ts')) return 'ts';
  if (filePath.endsWith('.jsx')) return 'babel';
  return 'babel';
}

/**
 * Step 1: Rewrite import package paths and named import specifiers.
 */
function rewriteImports(j: JSCodeshift, root: Collection, changes: string[]): void {
  root.find(j.ImportDeclaration).forEach((path) => {
    const sourceValue = path.node.source.value as string;

    // Rewrite package path
    if (PACKAGE_MAP[sourceValue]) {
      const newPackage = PACKAGE_MAP[sourceValue];
      changes.push(`Import: "${sourceValue}" → "${newPackage}"`);
      path.node.source = j.literal(newPackage);
    }

    // Rewrite named import specifiers
    const specifiers = path.node.specifiers;
    if (!specifiers) return;

    for (const specifier of specifiers) {
      if (specifier.type === 'ImportSpecifier' && specifier.imported) {
        const importedName = specifier.imported.type === 'Identifier'
          ? specifier.imported.name
          : undefined;

        if (importedName && NAMED_EXPORT_MAP[importedName]) {
          const mapping = NAMED_EXPORT_MAP[importedName];
          const newName = mapping.name;

          // Skip comment-style mappings (module removals)
          if (newName.startsWith('/*')) {
            continue;
          }

          if (newName !== importedName) {
            changes.push(`Import specifier: "${importedName}" → "${newName}"`);

            // If the local name was the same as the imported name, rename both
            if (specifier.local && specifier.local.name === importedName) {
              specifier.local = j.identifier(newName);
            }
            specifier.imported = j.identifier(newName);
          }

          // Update the import source to the correct package
          if (mapping.from) {
            path.node.source = j.literal(mapping.from);
          }
        }
      }
    }
  });
}

/**
 * Step 2: Replace AG Grid CSS imports with GridStorm theme import.
 */
function replaceCssImports(j: JSCodeshift, root: Collection, changes: string[]): void {
  let removedCss = false;

  root.find(j.ImportDeclaration).forEach((path) => {
    const sourceValue = path.node.source.value as string;

    if (CSS_IMPORTS_TO_REMOVE.includes(sourceValue)) {
      changes.push(`Removed CSS import: "${sourceValue}"`);
      j(path).remove();
      removedCss = true;
    }
  });

  // Add GridStorm theme import if we removed any AG Grid CSS
  if (removedCss) {
    // Check if the GridStorm theme import already exists
    const hasThemeImport = root
      .find(j.ImportDeclaration)
      .filter((path) => path.node.source.value === GRIDSTORM_THEME_IMPORT)
      .length > 0;

    if (!hasThemeImport) {
      const themeImport = j.importDeclaration([], j.literal(GRIDSTORM_THEME_IMPORT));
      const body = root.find(j.Program).get('body');
      const imports = root.find(j.ImportDeclaration);

      if (imports.length > 0) {
        // Add after the last import
        const lastImport = imports.at(-1);
        lastImport.insertAfter(themeImport);
      } else {
        // Add at the top
        body.unshift(themeImport);
      }

      changes.push(`Added CSS import: "${GRIDSTORM_THEME_IMPORT}"`);
    }
  }
}

/**
 * Step 3: Rename JSX component references (AgGridReact → GridStorm).
 */
function renameJsxComponents(j: JSCodeshift, root: Collection, changes: string[]): void {
  // Rename opening elements
  root.find(j.JSXIdentifier, { name: 'AgGridReact' }).forEach((path) => {
    changes.push('Component: <AgGridReact> → <GridStorm>');
    path.node.name = 'GridStorm';
  });

  // Also rename any AgGridColumn
  root.find(j.JSXIdentifier, { name: 'AgGridColumn' }).forEach((path) => {
    changes.push('Component: <AgGridColumn> → removed (use columns prop)');
    path.node.name = 'GridStorm';
  });

  // Rename regular identifiers (e.g., in variable declarations, typeof, etc.)
  root.find(j.Identifier, { name: 'AgGridReact' }).forEach((path) => {
    // Skip import specifiers (handled separately)
    if (
      path.parent.node.type === 'ImportSpecifier' ||
      path.parent.node.type === 'ImportDefaultSpecifier'
    ) {
      return;
    }
    path.node.name = 'GridStorm';
  });
}

/**
 * Step 4: Rename JSX props on the grid component.
 */
function renameJsxProps(j: JSCodeshift, root: Collection, changes: string[]): void {
  // Find JSX attributes on GridStorm (post-rename) or AgGridReact (pre-rename)
  root.find(j.JSXAttribute).forEach((path) => {
    const attrName = path.node.name;
    if (attrName.type !== 'JSXIdentifier') return;

    const propName = attrName.name;
    if (PROP_MAP[propName]) {
      const newPropName = PROP_MAP[propName];
      changes.push(`Prop: "${propName}" → "${newPropName}"`);
      attrName.name = newPropName;
    }
  });
}

/**
 * Step 5: Rename type annotation references.
 */
function renameTypeReferences(j: JSCodeshift, root: Collection, changes: string[]): void {
  // Rename TSTypeReference identifiers (e.g., ColDef → ColumnDef)
  try {
    root.find(j.TSTypeReference).forEach((path) => {
      const typeName = path.node.typeName;
      if (typeName.type === 'Identifier' && NAMED_EXPORT_MAP[typeName.name]) {
        const mapping = NAMED_EXPORT_MAP[typeName.name];
        if (!mapping.name.startsWith('/*') && mapping.name !== typeName.name) {
          changes.push(`Type: "${typeName.name}" → "${mapping.name}"`);
          typeName.name = mapping.name;
        }
      }
    });
  } catch (_err) {
    // TSTypeReference may not exist in non-TS files
  }
}

/**
 * Step 6: Convert AG Grid theme CSS classes to data-theme attributes.
 * Looks for className="ag-theme-xxx" and converts to data-theme="light|dark".
 */
function convertThemeClasses(j: JSCodeshift, root: Collection, changes: string[]): void {
  root.find(j.JSXAttribute, { name: { name: 'className' } }).forEach((path) => {
    const value = path.node.value;
    if (!value) return;

    // Handle string literal className
    if (value.type === 'StringLiteral' || (value.type === 'Literal' && typeof (value as any).value === 'string')) {
      const classValue = (value as any).value as string;

      for (const [agClass, gsTheme] of Object.entries(THEME_CLASS_MAP)) {
        if (classValue.includes(agClass)) {
          // Replace the className with data-theme
          const remainingClasses = classValue
            .replace(agClass, '')
            .trim()
            .replace(/\s+/g, ' ');

          changes.push(`Theme: className="${agClass}" → data-theme="${gsTheme}"`);

          if (remainingClasses) {
            // Keep the remaining classes, add data-theme as a sibling attribute
            (value as any).value = remainingClasses;

            // Add data-theme attribute to the parent element
            const parentAttrs = (path.parent.node as any).attributes;
            if (parentAttrs && Array.isArray(parentAttrs)) {
              parentAttrs.push(
                j.jsxAttribute(
                  j.jsxIdentifier('data-theme'),
                  j.literal(gsTheme),
                ),
              );
            }
          } else {
            // No remaining classes — replace className with data-theme
            path.node.name = j.jsxIdentifier('data-theme');
            (value as any).value = gsTheme;
          }
          break;
        }
      }
    }

    // Handle template literal className
    if (value.type === 'JSXExpressionContainer') {
      const expr = value.expression;
      if (expr.type === 'TemplateLiteral') {
        for (const quasi of expr.quasis) {
          const raw = quasi.value.raw;
          for (const [agClass, gsTheme] of Object.entries(THEME_CLASS_MAP)) {
            if (raw.includes(agClass)) {
              changes.push(`Theme: template className containing "${agClass}" — manual conversion needed to data-theme="${gsTheme}"`);
              quasi.value.raw = raw.replace(agClass, `/* TODO: use data-theme="${gsTheme}" instead */`);
              quasi.value.cooked = quasi.value.raw;
              break;
            }
          }
        }
      }
    }
  });
}

/**
 * Step 7: Add TODO comments for module → plugin conversions.
 * When we see AG Grid module references in arrays, add comments about the plugin equivalent.
 */
function addModuleToPluginComments(j: JSCodeshift, root: Collection, changes: string[]): void {
  // Find identifiers that match known AG Grid module names
  for (const [moduleName, pluginInfo] of Object.entries(MODULE_TO_PLUGIN_MAP)) {
    root.find(j.Identifier, { name: moduleName }).forEach((path) => {
      // Skip import specifiers
      if (
        path.parent.node.type === 'ImportSpecifier' ||
        path.parent.node.type === 'ImportDefaultSpecifier'
      ) {
        return;
      }

      if (pluginInfo.plugin) {
        changes.push(
          `Module → Plugin: ${moduleName} → ${pluginInfo.plugin}() from "${pluginInfo.package}" (${pluginInfo.note})`,
        );
      } else {
        changes.push(
          `Module removal: ${moduleName} — ${pluginInfo.note}`,
        );
      }

      // Add a comment to the identifier
      if (!path.node.comments) {
        path.node.comments = [];
      }
      path.node.comments.push(
        j.commentLine(
          ` TODO [gridstorm-codemod]: ${pluginInfo.plugin ? `Replace with ${pluginInfo.plugin}() from "${pluginInfo.package}"` : pluginInfo.note}`,
          false,
          true,
        ),
      );
    });
  }
}

/**
 * Step 8: Rename ColDef type annotations in variable declarations.
 * Handles patterns like: const cols: ColDef[] = [...]
 */
function renameColDefAnnotations(j: JSCodeshift, root: Collection, changes: string[]): void {
  // Handle `ColDef` identifiers used as type parameters (e.g., useState<ColDef[]>)
  try {
    root.find(j.Identifier, { name: 'ColDef' }).forEach((path) => {
      // Skip import specifiers (already handled)
      if (
        path.parent.node.type === 'ImportSpecifier' ||
        path.parent.node.type === 'ImportDefaultSpecifier'
      ) {
        return;
      }

      // Rename if it is used in a type context (TSTypeReference covers most,
      // but some usages may be plain identifiers in type position)
      if (
        path.parent.node.type === 'TSTypeReference' ||
        path.parent.node.type === 'TSQualifiedName'
      ) {
        // Already handled by renameTypeReferences
        return;
      }

      // If it is a standalone identifier in a type annotation context, rename it
      path.node.name = 'ColumnDef';
      changes.push('Type reference: "ColDef" → "ColumnDef"');
    });
  } catch (_err) {
    // May not have TS node types in JS files
  }

  // Handle `ColGroupDef`
  try {
    root.find(j.Identifier, { name: 'ColGroupDef' }).forEach((path) => {
      if (
        path.parent.node.type === 'ImportSpecifier' ||
        path.parent.node.type === 'ImportDefaultSpecifier'
      ) {
        return;
      }

      path.node.name = 'ColumnDef';
      changes.push('Type reference: "ColGroupDef" → "ColumnDef"');
    });
  } catch (_err) {
    // May not have TS node types in JS files
  }
}

/**
 * jscodeshift transform function (for use with jscodeshift CLI directly).
 * This is the standard export signature expected by jscodeshift.
 */
export default function transform(fileInfo: FileInfo, api: API): string {
  const { code } = transformAgGridToGridStorm(fileInfo.source, fileInfo.path);
  return code;
}
