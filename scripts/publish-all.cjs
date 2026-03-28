#!/usr/bin/env node
/**
 * Publish all GridStorm packages to npm in dependency order.
 * Usage: node scripts/publish-all.cjs [--dry-run]
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const DRY_RUN = process.argv.includes('--dry-run');
const OTP_ARG = process.argv.find(a => a.startsWith('--otp='));
const OTP = OTP_ARG ? OTP_ARG.split('=')[1] : null;
const ROOT = path.join(__dirname, '..');

// Publish order: dependencies first, then dependents
const PUBLISH_ORDER = [
  // Layer 0: No internal deps
  'core',
  'license',
  'i18n',
  'theme-default',

  // Layer 1: Depends on core only
  'dom-renderer',
  'plugin-sorting',
  'plugin-filtering',
  'plugin-selection',
  'plugin-editing',
  'plugin-pagination',
  'plugin-column-pinning',
  'plugin-column-resize',
  'plugin-column-reorder',
  'plugin-context-menu',
  'plugin-clipboard',
  'plugin-grouping',
  'plugin-aggregation',
  'plugin-pivoting',
  'plugin-master-detail',
  'plugin-tree-data',
  'plugin-row-reorder',
  'plugin-excel-export',
  'plugin-pdf-export',
  'plugin-sparklines',
  'plugin-charts',
  'plugin-ssrm',
  'plugin-status-bar',
  'plugin-state-persistence',
  'plugin-column-autosize',
  'plugin-row-pinning',
  'plugin-conditional-formatting',
  'plugin-streaming',
  'plugin-ai',
  'plugin-a11y',
  'plugin-formula-engine',
  'plugin-clipboard-pro',

  // Layer 2: PDF subsystem
  'pdf-core',
  'pdf-renderer',
  'pdf-theme',
  'pdf-plugin-form-fill',
  'pdf-plugin-intelligence',
  'pdf-plugin-pii',
  'pdf-plugin-text',

  // Layer 3: Depends on core + pdf
  'mcp-server',
  'codemod',

  // Layer 4: Framework adapters (depend on core + dom-renderer)
  'react-adapter',
  'vue-adapter',
  'angular-adapter',
  'svelte-adapter',

  // Layer 5: Unified package (depends on everything)
  'gridstorm',
];

console.log(`\n📦 GridStorm npm publish${DRY_RUN ? ' (DRY RUN)' : ''}`);
console.log(`${'='.repeat(50)}\n`);

function sleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) { /* busy wait */ }
}

let published = 0;
let skipped = 0;
let failed = 0;

for (const dir of PUBLISH_ORDER) {
  const pkgPath = path.join(ROOT, 'packages', dir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    console.log(`⚠ Skip ${dir} (not found)`);
    skipped++;
    continue;
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  const name = pkg.name;
  const version = pkg.version;

  // Check if already published
  try {
    const info = execSync(`npm view ${name}@${version} version`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    if (info === version) {
      console.log(`✓ ${name}@${version} (already published)`);
      skipped++;
      continue;
    }
  } catch {
    // Not published yet, proceed
  }

  // Check if dist exists (skip theme-default which uses src)
  if (dir !== 'theme-default') {
    const distPath = path.join(ROOT, 'packages', dir, 'dist');
    if (!fs.existsSync(distPath)) {
      console.log(`⚠ Skip ${name} (no dist/ — run build first)`);
      skipped++;
      continue;
    }
  }

  const otpFlag = OTP ? ` --otp=${OTP}` : '';
  const cmd = DRY_RUN
    ? `npm publish --access public --no-git-checks --dry-run${otpFlag}`
    : `npm publish --access public --no-git-checks${otpFlag}`;

  // Retry up to 3 times with increasing delay for rate limits
  let retries = 0;
  const maxRetries = 3;
  let success = false;

  while (retries <= maxRetries && !success) {
    try {
      if (retries > 0) {
        const retryDelay = retries * 60;
        console.log(`   🔄 Retry ${retries}/${maxRetries} — waiting ${retryDelay}s...`);
        sleep(retryDelay * 1000);
      }
      console.log(`📤 Publishing ${name}@${version}...`);
      execSync(cmd, {
        cwd: path.join(ROOT, 'packages', dir),
        stdio: 'pipe',
        encoding: 'utf8'
      });
      console.log(`✅ ${name}@${version}`);
      published++;
      success = true;
      // Wait 30 seconds between publishes to avoid npm rate limiting (E429)
      if (!DRY_RUN) {
        console.log('   ⏳ Waiting 30s (rate limit)...');
        sleep(30000);
      }
    } catch (err) {
      const errMsg = err.stderr?.split('\n').find(l => l.includes('npm error')) || err.message;
      if (errMsg.includes('E429') && retries < maxRetries) {
        retries++;
      } else {
        console.error(`❌ ${name}@${version}: ${errMsg}`);
        failed++;
        break;
      }
    }
  }
}

console.log(`\n${'='.repeat(50)}`);
console.log(`Published: ${published} | Skipped: ${skipped} | Failed: ${failed}`);
console.log(`Total: ${PUBLISH_ORDER.length} packages\n`);

if (failed > 0) process.exit(1);
