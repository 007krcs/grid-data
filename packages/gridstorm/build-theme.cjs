// Builds dist/theme.css for the `gridstorm/theme` export by inlining the
// @import chain of @gridstorm/theme-default's entry stylesheet. The umbrella
// package has no runtime dependencies, so the CSS must ship inside it.
// Run by tsup's onSuccess hook (see tsup.config.ts).
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '../theme-default/src/index.css');
const OUT = path.resolve(__dirname, 'dist/theme.css');

function inline(file, seen = new Set()) {
  const abs = path.resolve(file);
  if (seen.has(abs)) return '';
  seen.add(abs);
  const css = fs.readFileSync(abs, 'utf8');
  return css.replace(/@import\s+(?:url\()?['"]([^'"]+)['"]\)?\s*;/g, (_m, rel) => {
    if (/^(https?:)?\/\//.test(rel)) return _m; // leave remote imports alone
    const target = path.resolve(path.dirname(abs), rel);
    return `/* ── ${path.relative(path.dirname(SRC), target).replace(/\\/g, '/')} ── */\n` + inline(target, seen);
  });
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
const out = `/* GridStorm default theme — generated from @gridstorm/theme-default; do not edit. */\n` + inline(SRC);
fs.writeFileSync(OUT, out);
console.log(`theme.css: ${(out.length / 1024).toFixed(1)} KB written to ${path.relative(process.cwd(), OUT)}`);
