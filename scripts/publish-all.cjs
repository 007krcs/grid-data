#!/usr/bin/env node
/**
 * Publish ALL Tekivex packages to npm in dependency order.
 * Covers: GridStorm, DataFlow, Analytics Studio (analytix)
 * Usage: node scripts/publish-all.cjs [--dry-run]
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const DRY_RUN = process.argv.includes('--dry-run');
const OTP_ARG = process.argv.find(a => a.startsWith('--otp='));
const OTP = OTP_ARG ? OTP_ARG.split('=')[1] : null;

const GS_ROOT  = path.join(__dirname, '..');
const DF_ROOT  = path.join(GS_ROOT, '..', 'dataflow');
const ANX_ROOT = path.join(GS_ROOT, '..', 'analytics-builder');

// Each entry: { root, dir } where pkgPath = root/packages/dir/package.json
// OR { absPath } for absolute path to folder containing package.json
const PUBLISH_ORDER = [
  // ── GridStorm ────────────────────────────────────────────────────────────
  // Layer 0: No internal deps
  { root: GS_ROOT, dir: 'core' },
  { root: GS_ROOT, dir: 'license' },
  { root: GS_ROOT, dir: 'i18n' },
  { root: GS_ROOT, dir: 'theme-default' },

  // Layer 1: Depends on core only
  { root: GS_ROOT, dir: 'dom-renderer' },
  { root: GS_ROOT, dir: 'plugin-sorting' },
  { root: GS_ROOT, dir: 'plugin-filtering' },
  { root: GS_ROOT, dir: 'plugin-selection' },
  { root: GS_ROOT, dir: 'plugin-editing' },
  { root: GS_ROOT, dir: 'plugin-pagination' },
  { root: GS_ROOT, dir: 'plugin-column-pinning' },
  { root: GS_ROOT, dir: 'plugin-column-resize' },
  { root: GS_ROOT, dir: 'plugin-column-reorder' },
  { root: GS_ROOT, dir: 'plugin-context-menu' },
  { root: GS_ROOT, dir: 'plugin-clipboard' },
  { root: GS_ROOT, dir: 'plugin-grouping' },
  { root: GS_ROOT, dir: 'plugin-aggregation' },
  { root: GS_ROOT, dir: 'plugin-pivoting' },
  { root: GS_ROOT, dir: 'plugin-master-detail' },
  { root: GS_ROOT, dir: 'plugin-tree-data' },
  { root: GS_ROOT, dir: 'plugin-row-reorder' },
  { root: GS_ROOT, dir: 'plugin-excel-export' },
  { root: GS_ROOT, dir: 'plugin-pdf-export' },
  { root: GS_ROOT, dir: 'plugin-sparklines' },
  { root: GS_ROOT, dir: 'plugin-charts' },
  { root: GS_ROOT, dir: 'plugin-ssrm' },
  { root: GS_ROOT, dir: 'plugin-status-bar' },
  { root: GS_ROOT, dir: 'plugin-state-persistence' },
  { root: GS_ROOT, dir: 'plugin-column-autosize' },
  { root: GS_ROOT, dir: 'plugin-row-pinning' },
  { root: GS_ROOT, dir: 'plugin-conditional-formatting' },
  { root: GS_ROOT, dir: 'plugin-streaming' },
  { root: GS_ROOT, dir: 'plugin-ai' },
  { root: GS_ROOT, dir: 'plugin-a11y' },
  { root: GS_ROOT, dir: 'plugin-formula-engine' },
  { root: GS_ROOT, dir: 'plugin-clipboard-pro' },

  // Layer 2: PDF subsystem
  { root: GS_ROOT, dir: 'pdf-core' },
  { root: GS_ROOT, dir: 'pdf-renderer' },
  { root: GS_ROOT, dir: 'pdf-theme' },
  { root: GS_ROOT, dir: 'pdf-plugin-form-fill' },
  { root: GS_ROOT, dir: 'pdf-plugin-intelligence' },
  { root: GS_ROOT, dir: 'pdf-plugin-pii' },
  { root: GS_ROOT, dir: 'pdf-plugin-text' },

  // Layer 3
  { root: GS_ROOT, dir: 'mcp-server' },
  { root: GS_ROOT, dir: 'codemod' },

  // Layer 4: Framework adapters
  { root: GS_ROOT, dir: 'react-adapter' },
  { root: GS_ROOT, dir: 'vue-adapter' },
  { root: GS_ROOT, dir: 'angular-adapter' },
  { root: GS_ROOT, dir: 'svelte-adapter' },

  // Layer 5: Unified meta-package
  { root: GS_ROOT, dir: 'gridstorm' },

  // ── DataFlow ─────────────────────────────────────────────────────────────
  { root: DF_ROOT, dir: 'core' },
  { root: DF_ROOT, dir: 'react' },
  { root: DF_ROOT, dir: 'svelte' },
  { root: DF_ROOT, dir: 'vue' },

  // ── Analytics Studio (analytix) ──────────────────────────────────────────
  // Layer 0: no internal deps
  { root: ANX_ROOT, dir: 'core' },
  // Layer 1: depend on core
  { root: ANX_ROOT, dir: 'canvas-layout' },
  { root: ANX_ROOT, dir: 'chart-engine' },
  { root: ANX_ROOT, dir: 'crossfilter' },
  { root: ANX_ROOT, dir: 'data-connector' },
  { root: ANX_ROOT, dir: 'insight-engine' },
  { root: ANX_ROOT, dir: 'kpi-engine' },
  { root: ANX_ROOT, dir: 'pivot-engine' },
  { root: ANX_ROOT, dir: 'report-builder' },
  { root: ANX_ROOT, dir: 'sql-connector' },
  // Layer 2: framework adapters
  { root: ANX_ROOT, dir: 'svelte-adapter' },
  { root: ANX_ROOT, dir: 'vue-adapter' },
  { root: ANX_ROOT, dir: 'react' },
  // Note: @tekivex/ai-support is excluded from publishing
];

console.log(`\n📦 Tekivex npm publish${DRY_RUN ? ' (DRY RUN)' : ''}`);
console.log(`${'='.repeat(50)}\n`);

function sleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) { /* busy wait */ }
}

let published = 0;
let skipped = 0;
let failed = 0;

for (const entry of PUBLISH_ORDER) {
  const pkgDir = path.join(entry.root, 'packages', entry.dir);
  const pkgPath = path.join(pkgDir, 'package.json');

  if (!fs.existsSync(pkgPath)) {
    console.log(`⚠ Skip ${entry.dir} (not found at ${pkgPath})`);
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

  // Check dist exists (skip theme-default which uses src)
  if (entry.dir !== 'theme-default') {
    const distPath = path.join(pkgDir, 'dist');
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
        cwd: pkgDir,
        stdio: 'pipe',
        encoding: 'utf8'
      });
      console.log(`✅ ${name}@${version}`);
      published++;
      success = true;
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
