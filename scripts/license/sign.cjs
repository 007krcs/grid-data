#!/usr/bin/env node
/**
 * Mint a signed GridStorm license key.
 *
 *   node scripts/license/sign.cjs \
 *     --key <path-to-private.hex> \
 *     --org "Acme Corp" \
 *     --tier professional \
 *     --plugins pivoting,grouping,aggregation \
 *     --expires 2027-12-31 \
 *     [--devCount 10] \
 *     [--domains acme.com,internal.acme.com] \
 *     [--license-id acme-2026-001]
 *
 * Prints the GS2-... license string to stdout. Pipe it to the customer.
 *
 * Security:
 *   - The private key file is read locally. This script never transmits it.
 *   - Do NOT run this script on shared CI runners or developer laptops with
 *     unattended sessions. Sign on a known-clean machine, then transport the
 *     resulting key string out of band.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { ed25519 } = require('@noble/curves/ed25519.js');

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--help' || a === '-h') {
      printUsage();
      process.exit(0);
    }
    if (!a.startsWith('--') || i + 1 >= args.length) continue;
    const key = a.slice(2);
    const value = args[++i];
    out[key] = value;
  }
  return out;
}

function printUsage() {
  console.log(
    'Usage: node scripts/license/sign.cjs \\\n' +
      '  --key <path-to-private.hex> \\\n' +
      '  --org "<organization>" \\\n' +
      '  --tier <community|starter|professional|enterprise> \\\n' +
      '  --plugins <comma-separated, or *> \\\n' +
      '  --expires <YYYY-MM-DD or ISO timestamp> \\\n' +
      '  [--devCount <n>] \\\n' +
      '  [--domains <comma-separated, empty = unlimited>] \\\n' +
      '  [--license-id <opaque-id>]',
  );
}

function hexToBytes(hex) {
  const clean = hex.trim();
  if (clean.length % 2 !== 0) {
    throw new Error('private key hex has odd length');
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function base64UrlEncode(bytes) {
  return Buffer.from(bytes)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function requireArg(args, name) {
  if (!args[name]) {
    console.error(`Missing required --${name}`);
    printUsage();
    process.exit(2);
  }
  return args[name];
}

function main() {
  const args = parseArgs();
  const keyPath = path.resolve(requireArg(args, 'key'));
  const org = requireArg(args, 'org');
  const tier = requireArg(args, 'tier');
  const pluginsArg = requireArg(args, 'plugins');
  const expiresArg = requireArg(args, 'expires');

  if (!['community', 'starter', 'professional', 'enterprise'].includes(tier)) {
    console.error(
      `Invalid tier '${tier}'. Use community | starter | professional | enterprise.`,
    );
    process.exit(2);
  }

  // Parse expires: accept YYYY-MM-DD or any Date-parseable ISO string. Normalize
  // to end-of-day UTC for date-only inputs to avoid surprise "expires at noon".
  let expiresAt;
  if (/^\d{4}-\d{2}-\d{2}$/.test(expiresArg)) {
    expiresAt = new Date(expiresArg + 'T23:59:59.000Z').toISOString();
  } else {
    const d = new Date(expiresArg);
    if (isNaN(d.getTime())) {
      console.error(`Invalid --expires value '${expiresArg}'`);
      process.exit(2);
    }
    expiresAt = d.toISOString();
  }

  const plugins =
    pluginsArg === '*'
      ? ['*']
      : pluginsArg.split(',').map((s) => s.trim()).filter(Boolean);
  const domains = args.domains
    ? args.domains.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const devCount = args.devCount ? parseInt(args.devCount, 10) : 1;
  const licenseId = args['license-id'] || `lic-${Date.now()}`;

  if (!fs.existsSync(keyPath)) {
    console.error(`Private key file not found: ${keyPath}`);
    process.exit(2);
  }
  const privHex = fs.readFileSync(keyPath, 'utf8');
  const priv = hexToBytes(privHex);
  if (priv.length !== 32) {
    console.error('Private key must be 32 bytes (64 hex chars).');
    process.exit(2);
  }

  const payload = {
    org,
    tier,
    devCount,
    expiresAt,
    plugins,
    domains,
    version: 1,
    licenseId,
  };

  const payloadBytes = Buffer.from(JSON.stringify(payload), 'utf8');
  const sig = ed25519.sign(payloadBytes, priv);
  const key = `GS2-${base64UrlEncode(payloadBytes)}.${base64UrlEncode(sig)}`;

  // Print to stdout. Stderr gets a summary so a human running this can see
  // what was minted without contaminating stdout (which is the key itself).
  console.error('Minted license:');
  console.error(`  org:         ${org}`);
  console.error(`  tier:        ${tier}`);
  console.error(`  plugins:     ${plugins.join(', ')}`);
  console.error(`  expires:     ${expiresAt}`);
  console.error(`  domains:     ${domains.length ? domains.join(', ') : '(unlimited)'}`);
  console.error(`  devCount:    ${devCount}`);
  console.error(`  licenseId:   ${licenseId}`);
  console.error('');
  console.log(key);
}

main();
