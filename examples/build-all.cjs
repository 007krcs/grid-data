/**
 * Build all GridStorm example apps into a combined output folder.
 * Cross-platform Node.js replacement for build-all.sh.
 * Used by Vercel deployment.
 *
 * Vercel project Root Directory is set to "examples/analytics-explorer".
 * Vercel resolves outputDirectory ("dist") relative to that Root Directory,
 * so we output to examples/analytics-explorer/dist/.
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPT_DIR = __dirname; // examples/
const ROOT_DIR = path.dirname(SCRIPT_DIR); // repo root

// Vercel Root Directory = examples/analytics-explorer
// outputDirectory = "dist" resolves to examples/analytics-explorer/dist
const VERCEL_ROOT = path.join(SCRIPT_DIR, 'analytics-explorer');
const OUT_DIR = path.join(VERCEL_ROOT, 'dist');

console.log('Building GridStorm demos...');
console.log('Repo root:', ROOT_DIR);
console.log('Vercel root dir:', VERCEL_ROOT);
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
  try {
    execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production' } });
  } catch (err) {
    console.error(`\n✗ Command failed: ${cmd}`);
    console.error(`  Exit code: ${err.status}`);
    throw err;
  }
}

// Build hub (React SPA) — outputs to dist root (index.html + hub-assets/)
console.log('\n=== Building hub ===');
run(`npx vite build --outDir "${OUT_DIR}"`, path.join(SCRIPT_DIR, 'hub'));
console.log('Done: hub');

// Build each example app into dist/<app>/
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
console.log('Output directory:', OUT_DIR);
const entries = fs.readdirSync(OUT_DIR);
console.log('Output contents:', entries.join(', '));
