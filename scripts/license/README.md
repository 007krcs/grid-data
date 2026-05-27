# License signing scripts

GridStorm premium license keys are signed with Ed25519 over the payload JSON.
Verification happens client-side via the public key embedded in
`packages/license/src/license-manager.ts`. Signing happens with the private
key, which must be kept offline.

## One-time setup: generate the production keypair

```sh
node scripts/license/keygen.cjs --out ./secrets/
```

Outputs `gridstorm-license.public.hex` and `gridstorm-license.private.hex`.

1. Move the **private** hex file into your secrets vault. **Never** commit it,
   never copy it to a CI runner, never ship it inside any artifact.
2. Open `packages/license/src/license-manager.ts` and replace the value of
   `PRODUCTION_PUBLIC_KEY_HEX` with the contents of the public hex file.
3. Release a new version of `@gridstorm/license`.

Re-running keygen retires every license previously issued under the old key.
Only re-key if you have reason to believe the private key has leaked.

## Minting a customer license

```sh
node scripts/license/sign.cjs \
  --key ./secrets/gridstorm-license.private.hex \
  --org "Acme Corp" \
  --tier professional \
  --plugins pivoting,grouping,aggregation \
  --expires 2027-12-31 \
  --domains acme.com \
  --license-id acme-2027-001
```

The resulting `GS2-...` string is printed to stdout. Deliver it to the customer
via your normal channel. The customer calls
`setGridStormLicense('GS2-...')` at app startup.

## What this does NOT cover (yet)

- **Online revocation.** Once a key is issued and the customer has it, you
  cannot revoke it before its `expiresAt`. Mitigation: short-lived licenses
  (issue annually with renewal) and per-domain restrictions.
- **Hardware-bound binding.** The license isn't tied to a machine. A customer
  who leaks their key string enables anyone to use it until expiry.
- **Audit log of issued licenses.** The signing script doesn't write a log
  of who got what. Wrap it in your CRM/billing flow to keep that record.

These are deliberate scope cuts. If you need them, the next iteration is to
move signing to a server-side service that records issuance and serves a
revocation list. The verification client would then poll the revocation list
periodically. That's a larger architectural change for another sprint.
