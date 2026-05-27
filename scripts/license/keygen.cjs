#!/usr/bin/env node
/**
 * Generate a fresh Ed25519 keypair for GridStorm license signing.
 *
 *   node scripts/license/keygen.cjs [--out <dir>]
 *
 * Output: writes `gridstorm-license.public.hex` and
 *         `gridstorm-license.private.hex` to the chosen directory (cwd by
 *         default).
 *
 * Workflow:
 *   1. Run this once. Keep the .private.hex file OFFLINE — never commit, never
 *      check into any repo, never put into a deployment artifact.
 *   2. Copy the .public.hex contents into PRODUCTION_PUBLIC_KEY_HEX inside
 *      `packages/license/src/license-manager.ts`. Publish a new version.
 *   3. Use scripts/license/sign.cjs with the .private.hex to mint license
 *      keys for customers.
 *
 * Re-keying retires every license previously issued under the old key. That's
 * by design — you only re-key if you have reason to believe the private key
 * has been compromised.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { ed25519 } = require('@noble/curves/ed25519.js');

function parseArgs() {
  const args = process.argv.slice(2);
  let out = process.cwd();
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--out' && i + 1 < args.length) {
      out = path.resolve(args[++i]);
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(
        'Usage: node scripts/license/keygen.cjs [--out <dir>]\n' +
          '  --out <dir>   Directory to write key files (default: cwd)',
      );
      process.exit(0);
    }
  }
  return { out };
}

function toHex(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) {
    s += bytes[i].toString(16).padStart(2, '0');
  }
  return s;
}

function main() {
  const { out } = parseArgs();
  if (!fs.existsSync(out)) {
    fs.mkdirSync(out, { recursive: true });
  }

  const priv = ed25519.utils.randomSecretKey();
  const pub = ed25519.getPublicKey(priv);

  const privPath = path.join(out, 'gridstorm-license.private.hex');
  const pubPath = path.join(out, 'gridstorm-license.public.hex');

  // Mode 0600 (owner read/write only). On Windows this is approximated by
  // ACLs; on POSIX it gives the obvious protection.
  fs.writeFileSync(privPath, toHex(priv) + '\n', { mode: 0o600 });
  fs.writeFileSync(pubPath, toHex(pub) + '\n', { mode: 0o644 });

  console.log('Generated Ed25519 keypair.');
  console.log('  Public key:  ' + pubPath);
  console.log('  Private key: ' + privPath + '  (PROTECT THIS FILE)');
  console.log();
  console.log('Next steps:');
  console.log('  1. Move ' + privPath + ' to your secrets vault. Never commit.');
  console.log('  2. Copy the public key hex into PRODUCTION_PUBLIC_KEY_HEX');
  console.log('     in packages/license/src/license-manager.ts.');
  console.log('  3. Use scripts/license/sign.cjs to mint customer licenses.');
}

main();
