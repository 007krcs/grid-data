/**
 * Build all GridStorm example apps into a combined output folder.
 * Cross-platform Node.js replacement for build-all.sh.
 * Used by Vercel deployment — uses Build Output API (.vercel/output/static).
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SCRIPT_DIR = __dirname;
const ROOT_DIR = path.dirname(SCRIPT_DIR);

// Use Vercel Build Output API: .vercel/output/static/
// This bypasses outputDirectory resolution entirely
const VERCEL_OUTPUT = path.join(ROOT_DIR, '.vercel', 'output');
const OUT_DIR = path.join(VERCEL_OUTPUT, 'static');

console.log('Building GridStorm demos...');
console.log('Root:', ROOT_DIR);
console.log('Output:', OUT_DIR);
console.log('CWD:', process.cwd());

// Clean output
if (fs.existsSync(VERCEL_OUTPUT)) {
  fs.rmSync(VERCEL_OUTPUT, { recursive: true, force: true });
}
fs.mkdirSync(OUT_DIR, { recursive: true });

// Write Vercel Build Output API config
fs.writeFileSync(
  path.join(VERCEL_OUTPUT, 'config.json'),
  JSON.stringify({ version: 3, routes: [{ handle: 'filesystem' }, { src: '/(.*)', dest: '/index.html' }] }, null, 2)
);

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

// Build hub (React SPA) — outputs to static root (index.html + hub-assets/)
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
console.log('Output directory:', OUT_DIR);
const entries = fs.readdirSync(OUT_DIR);
console.log('Output contents:', entries.join(', '));
console.log('Vercel output config:', path.join(VERCEL_OUTPUT, 'config.json'));
