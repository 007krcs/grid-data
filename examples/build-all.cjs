/**
 * Build all GridStorm example apps into a combined dist/ folder.
 * Cross-platform Node.js replacement for build-all.sh.
 * Used by Vercel deployment.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPT_DIR = __dirname;
const ROOT_DIR = path.dirname(SCRIPT_DIR);
const OUT_DIR = path.join(SCRIPT_DIR, 'dist');

console.log('Building GridStorm demos...');
console.log('Root:', ROOT_DIR);
console.log('Output:', OUT_DIR);
console.log('CWD:', process.cwd());

// Clean output
if (fs.existsSync(OUT_DIR)) {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(OUT_DIR, { recursive: true });

function run(cmd, cwd) {
  console.log(`\n> ${cmd}`);
  console.log(`  cwd: ${cwd}`);
  execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });
}

// Build hub (React SPA) — outputs to dist root (index.html + hub-assets/)
console.log('\n=== Building hub ===');
run(`npx vite build --outDir "${OUT_DIR}"`, path.join(SCRIPT_DIR, 'hub'));
console.log('Done: hub');

// Build each example app
const APPS = [
  'playground',
  'react-demo',
  'financial-trading',
  'spreadsheet',
  'analytics-explorer',
  'feature-showcase',
  'pdf-viewer',
  'cookbook',
];

for (const app of APPS) {
  const appDir = path.join(SCRIPT_DIR, app);
  if (!fs.existsSync(appDir)) {
    console.log(`\n⚠ Skipping ${app} (directory not found)`);
    continue;
  }
  console.log(`\n=== Building ${app} ===`);
  const appOutDir = path.join(OUT_DIR, app);
  run(`npx vite build --outDir "${appOutDir}"`, appDir);
  console.log(`Done: ${app}`);
}

console.log('\nAll demos built successfully!');
const entries = fs.readdirSync(OUT_DIR);
console.log('Output contents:', entries.join(', '));
