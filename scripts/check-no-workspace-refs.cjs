#!/usr/bin/env node
/**
 * CI guard: verify no `workspace:*` references survive into published tarballs.
 *
 * Two publish paths exist in this repo:
 *   1. `pnpm changeset publish` (release.yml) — pnpm rewrites workspace: refs.
 *   2. `scripts/publish-all.cjs` — uses raw `npm publish`, which does NOT.
 *
 * Either path can silently ship a broken package if `publishConfig` is missing
 * or if a package opts out. Rather than trust the toolchain, we pack each
 * package the way it would be published, then read the resulting tarball's
 * inner package.json and assert no dep value still starts with "workspace:".
 *
 * Usage:
 *   node scripts/check-no-workspace-refs.cjs            # pack via pnpm (recommended)
 *   node scripts/check-no-workspace-refs.cjs --npm      # pack via npm (catches publish-all.cjs path)
 *   node scripts/check-no-workspace-refs.cjs --both     # run both, fail if either fails
 *
 * Exit codes:
 *   0 — clean
 *   1 — at least one tarball contained a workspace: reference
 *   2 — script error (couldn't pack, couldn't read, etc.)
 */
'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const PACKAGES_DIR = path.join(REPO_ROOT, 'packages');

const args = new Set(process.argv.slice(2));
const useNpm = args.has('--npm') || args.has('--both');
const usePnpm = args.has('--both') || !args.has('--npm'); // default: pnpm
const verbose = args.has('--verbose') || args.has('-v');

const DEP_FIELDS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];

/** Run a command, return stdout, throw on non-zero exit. */
function run(cmd, cwd) {
  return execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

/** List packages/ entries that contain a package.json. */
function listPackages() {
  return fs
    .readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => path.join(PACKAGES_DIR, e.name))
    .filter((dir) => fs.existsSync(path.join(dir, 'package.json')));
}

/** Pack a package and return the absolute path of the produced tarball. */
function packPackage(pkgDir, tool, tmpDir) {
  if (tool === 'pnpm') {
    // pnpm pack writes a `<name>-<version>.tgz` into pack-destination.
    const out = run(`pnpm pack --pack-destination "${tmpDir}"`, pkgDir).trim();
    // Last non-empty line of pnpm output is the tarball path.
    const lines = out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const last = lines[lines.length - 1];
    if (last && fs.existsSync(last)) return last;
    // Fallback: find the newest tgz in tmpDir.
    return newestTgz(tmpDir);
  }
  if (tool === 'npm') {
    // `npm pack --pack-destination <dir>` was added in npm 7. Print the path so we can capture it.
    const out = run(`npm pack --pack-destination "${tmpDir}" --silent`, pkgDir).trim();
    const lines = out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const last = lines[lines.length - 1];
    if (last) {
      // npm prints either an absolute path or just the filename.
      const abs = path.isAbsolute(last) ? last : path.join(tmpDir, last);
      if (fs.existsSync(abs)) return abs;
    }
    return newestTgz(tmpDir);
  }
  throw new Error(`Unknown pack tool: ${tool}`);
}

function newestTgz(dir) {
  const tgzs = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.tgz'))
    .map((f) => ({ f, mtime: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  if (tgzs.length === 0) throw new Error(`No .tgz produced in ${dir}`);
  return path.join(dir, tgzs[0].f);
}

/**
 * Extract the `package/package.json` entry from a tarball without shelling out.
 * The npm tarball layout always puts package.json directly under `package/`.
 * We read the gzipped tar, walk entries, and stop at the first match.
 */
function readPkgJsonFromTarball(tgzPath) {
  const zlib = require('zlib');
  const buf = zlib.gunzipSync(fs.readFileSync(tgzPath));
  // Tar block layout: 512-byte header, then file content padded to 512.
  let offset = 0;
  while (offset + 512 <= buf.length) {
    const header = buf.slice(offset, offset + 512);
    const name = header.slice(0, 100).toString('utf8').replace(/\0.*$/, '');
    if (!name) {
      // Two consecutive zero blocks mark end of archive.
      offset += 512;
      continue;
    }
    const sizeOctal = header.slice(124, 136).toString('utf8').replace(/\0.*$/, '').trim();
    const size = parseInt(sizeOctal, 8) || 0;
    const dataStart = offset + 512;
    const dataEnd = dataStart + size;
    if (name === 'package/package.json') {
      return JSON.parse(buf.slice(dataStart, dataEnd).toString('utf8'));
    }
    // Advance past data, rounded up to 512.
    offset = dataEnd + (512 - (size % 512)) % 512;
  }
  throw new Error(`package.json not found inside ${tgzPath}`);
}

function findWorkspaceRefs(pkgJson) {
  const refs = [];
  for (const field of DEP_FIELDS) {
    const deps = pkgJson[field];
    if (!deps || typeof deps !== 'object') continue;
    for (const [name, spec] of Object.entries(deps)) {
      if (typeof spec === 'string' && spec.startsWith('workspace:')) {
        refs.push({ field, name, spec });
      }
    }
  }
  return refs;
}

function checkPackages(tool) {
  const pkgs = listPackages();
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `gs-workspace-check-${tool}-`));
  const failures = [];
  let checked = 0;
  let skipped = 0;

  try {
    for (const pkgDir of pkgs) {
      const pkgName = path.basename(pkgDir);
      const pkgJson = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'));

      // Honor `private: true` — these won't publish, no reason to pack.
      if (pkgJson.private === true) {
        if (verbose) console.log(`  - ${pkgName}: skipped (private)`);
        skipped++;
        continue;
      }

      let tarball;
      try {
        tarball = packPackage(pkgDir, tool, tmpDir);
      } catch (err) {
        const msg = (err.stderr && err.stderr.toString()) || err.message;
        failures.push({ pkg: pkgName, reason: `pack failed: ${msg.trim().split(/\r?\n/).pop()}` });
        continue;
      }

      let inner;
      try {
        inner = readPkgJsonFromTarball(tarball);
      } catch (err) {
        failures.push({ pkg: pkgName, reason: `tarball read failed: ${err.message}` });
        continue;
      }

      const refs = findWorkspaceRefs(inner);
      if (refs.length > 0) {
        failures.push({
          pkg: pkgName,
          reason: `tarball still contains workspace: refs:\n${refs
            .map((r) => `      ${r.field}.${r.name} = "${r.spec}"`)
            .join('\n')}`,
        });
      } else if (verbose) {
        console.log(`  - ${pkgName}: clean`);
      }
      checked++;
    }
  } finally {
    // Best-effort tmp cleanup.
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch (_) { /* ignore */ }
  }

  return { checked, skipped, failures };
}

function main() {
  const tools = [];
  if (usePnpm) tools.push('pnpm');
  if (useNpm) tools.push('npm');

  let totalFailures = 0;

  for (const tool of tools) {
    console.log(`\nPacking with ${tool}...`);
    let result;
    try {
      result = checkPackages(tool);
    } catch (err) {
      console.error(`[${tool}] script error: ${err.message}`);
      process.exit(2);
    }
    console.log(
      `[${tool}] checked ${result.checked} package(s), skipped ${result.skipped} private, ${result.failures.length} failure(s)`,
    );
    for (const f of result.failures) {
      console.error(`\n  ✗ ${f.pkg}\n    ${f.reason}`);
    }
    totalFailures += result.failures.length;
  }

  if (totalFailures > 0) {
    console.error(`\nFAIL: ${totalFailures} package(s) would publish with unresolved workspace: refs.`);
    process.exit(1);
  }
  console.log('\nOK: no workspace: refs survive into published tarballs.');
}

main();
