# Circuit Proving Keys (.zkey)

Drop the compiled Groth16 proving keys here:

```
android/app/src/main/assets/zkeys/
  age_range_final.zkey
  status_check_final.zkey
  nullifier_final.zkey
```

These names are referenced by `CIRCUIT_ZKEYS` in
[src/services/ZKProofService.ts](../../../../../../src/services/ZKProofService.ts).

## Build-time guarantees

`android/app/build.gradle` declares `androidResources { noCompress += ['zkey'] }`,
so aapt2 packages the files unmodified — required because the native mopro
reader memory-maps the `.zkey` file and cannot read a deflate-compressed
asset.

## First-launch provisioning

On first launch, the JS layer copies bundled assets into
`RNFS.DocumentDirectoryPath/zkeys/` (where `getZkeyPath()` looks). See the
provisioning block in `src/services/ZKProofService.ts`. The copy is idempotent
and version-aware so app upgrades shipping a new `.zkey` overwrite the stale
copy.

## Trust-setup pinning

Both the Circom `.r1cs` source SHA and the Powers-of-Tau / Phase-2 transcript
hashes used to derive each `.zkey` MUST be recorded in version control. A
`.zkey` mismatched with the verifier's `vkey` silently produces unverifiable
proofs.

## Why these are not committed

`.zkey` files are typically 5–50 MB each and are produced by an out-of-band
trusted-setup ceremony. They are intentionally excluded from git via the
project `.gitignore`. Provision them per environment.
