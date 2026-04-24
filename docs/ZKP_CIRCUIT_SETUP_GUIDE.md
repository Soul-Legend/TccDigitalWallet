# ZKP Circuit Pipeline Setup Guide (Windows)

This document explains **why** the zero-knowledge proof (ZKP) tests fail on a real device and provides a **step-by-step tutorial** to build the full Circom circuit pipeline on a Windows machine.

---

## Table of Contents

1. [Why Are the ZKP Tests Failing?](#1-why-are-the-zkp-tests-failing)
2. [Architecture Overview](#2-architecture-overview)
3. [Prerequisites](#3-prerequisites)
4. [Step 1: Install the Circom Compiler](#step-1-install-the-circom-compiler)
5. [Step 2: Install snarkjs](#step-2-install-snarkjs)
6. [Step 3: Install circomlib](#step-3-install-circomlib)
7. [Step 4: Compile the Circuits](#step-4-compile-the-circuits)
8. [Step 5: Trusted Setup (Generate .zkey Files)](#step-5-trusted-setup-generate-zkey-files)
9. [Step 6: Rebuild mopro-ffi with Custom Circuits](#step-6-rebuild-mopro-ffi-with-custom-circuits)
10. [Step 7: Bundle .zkey Files in the App](#step-7-bundle-zkey-files-in-the-app)
11. [Step 8: Wire Up App Startup](#step-8-wire-up-app-startup)
12. [Verification](#verification)
13. [Troubleshooting](#troubleshooting)

---

## 1. Why Are the ZKP Tests Failing?

All 11 failing runtime tests call `createZKPPresentation()`, which invokes `generateCircomProof()` from mopro-ffi. They fail with errors like:
- `"Falha ao gerar prova de status"` (status_check circuit)
- `"Falha ao gerar prova de faixa etária"` (age_range circuit)

**Root causes (3 layers of failure):**

### Layer 1: No `.zkey` proving key files exist

The directories `assets/zkeys/` and `android/app/src/main/assets/zkeys/` contain only placeholder READMEs. The `getZkeyPath()` method in `ZKProofService.ts` checks `RNFS.exists()` and throws `"Arquivo zkey não encontrado"` because the files are not on the device.

### Layer 2: `provisionBundledZkeys()` is never called

Even if `.zkey` files were bundled in the APK, the method that copies them from APK assets to the device's `DocumentDirectoryPath/zkeys/` is never invoked during app initialization.

### Layer 3: The native library has wrong circuits

The pre-built `libmopro_example_app.a` (shipped with the `mopro-ffi` npm package) contains witness generation code for mopro's demo circuit (`multiplier2`), **not** for our custom circuits (`age_range`, `status_check`, `nullifier`). Even with valid `.zkey` files, `generateCircomProof()` would fail because it can't compute the witness.

### The error chain:

```
getZkeyPath("status_check")
  → RNFS.exists("DocumentDirectoryPath/zkeys/status_check_final.zkey")
    → returns false
      → throws CryptoError("Arquivo zkey não encontrado: status_check_final.zkey")
        → caught and re-thrown as CryptoError("Falha ao gerar prova de status")
```

The original error is **swallowed** by the catch block, making debugging harder.

---

## 2. Architecture Overview

The Circom ZKP pipeline has compile-time and runtime components:

```
┌─────────────────────── COMPILE TIME ───────────────────────┐
│                                                             │
│  .circom files  ──[circom compiler]──▶  .wasm + .r1cs      │
│                                              │              │
│  .r1cs  ──[snarkjs trusted setup]──▶  .zkey (proving key)  │
│                                                             │
│  .wasm  ──[rust-witness transpile]──▶  Rust code            │
│              │                                              │
│  Rust code ──[cargo + NDK]──▶  libmopro_<app>.a (native)   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────── RUNTIME (on device) ─────────────────┐
│                                                              │
│  App start ──▶ provisionBundledZkeys() copies .zkey to disk  │
│                                                              │
│  generateCircomProof(zkeyPath, inputsJSON, ProofLib)         │
│    1. Load .zkey from disk                                   │
│    2. Compute witness using compiled Rust witness generator   │
│    3. Generate Groth16 proof (Arkworks prover)                │
│    4. Return { proof, publicInputs }                         │
│                                                              │
│  verifyCircomProof(zkeyPath, proofResult, ProofLib)          │
│    1. Load verification key from .zkey                       │
│    2. Verify the Groth16 proof                               │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Our 3 circuits:

| Circuit | Purpose | Private Inputs | Public Inputs |
|---------|---------|----------------|---------------|
| `status_check` | Proves `status == expected` | `status` (hash) | `expected` (hash) |
| `age_range` | Proves `age(birthdate) >= threshold` | `birthYear`, `birthMonth`, `birthDay` | `currentYear`, `currentMonth`, `currentDay`, `threshold` |
| `nullifier` | Computes `nullifier = Poseidon(secret, electionId)` | `secret`, `electionId` | (nullifier is output) |

---

## 3. Prerequisites

You will need the following tools. Install them in order.

### 3.1 Rust Toolchain

Rust is needed to compile the circom compiler and to rebuild mopro-ffi.

**Install rustup (includes `cargo` and `rustc`):**

1. Download the installer from https://rustup.rs/
2. Run `rustup-init.exe`
3. Choose the default installation (option 1)
4. Restart your terminal

Verify:
```powershell
rustc --version   # e.g., rustc 1.82.0
cargo --version   # e.g., cargo 1.82.0
```

### 3.2 Node.js (>= 20)

Already installed in the project. Verify:
```powershell
node --version    # should be >= 20
npm --version
```

### 3.3 Android SDK + NDK

Needed for rebuilding mopro-ffi for Android. Install via Android Studio:

1. Open Android Studio → SDK Manager → SDK Tools
2. Install **NDK (Side by Side)** (version 26.x recommended)
3. Set environment variables in your PowerShell profile (`$PROFILE`):

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:NDK_PATH = "$env:ANDROID_HOME\ndk\26.1.10909125"  # adjust version
```

### 3.4 Android Rust Targets

After Rust is installed, add the Android cross-compilation targets:

```powershell
rustup target add aarch64-linux-android
rustup target add armv7-linux-androideabi
rustup target add x86_64-linux-android
rustup target add i686-linux-android
```

---

## Step 1: Install the Circom Compiler

The circom compiler is written in Rust.

```powershell
# Clone the circom repository
git clone https://github.com/iden3/circom.git
cd circom

# Build and install (takes ~3 minutes)
cargo build --release
cargo install --path circom

# Verify
circom --version
# Should output: circom compiler 2.x.x
```

The binary is installed to `%USERPROFILE%\.cargo\bin\circom.exe`.

---

## Step 2: Install snarkjs

snarkjs is the JavaScript tool for trusted setup and proof generation/verification.

```powershell
npm install -g snarkjs

# Verify
snarkjs --version
# Should output: 0.7.x
```

---

## Step 3: Install circomlib

circomlib provides circuit templates (comparators, Poseidon hash) used by our circuits.

```powershell
cd c:\Sandbox\TCC\DigitalWalletExpo
npm install --save-dev circomlib
```

This installs circomlib to `node_modules/circomlib/circuits/`, where our `.circom` files reference it via `include`.

---

## Step 4: Compile the Circuits

From the project root (`c:\Sandbox\TCC\DigitalWalletExpo`):

```powershell
# Create output directory
mkdir circuits\build

# Compile status_check (simplest circuit)
circom circuits\status_check.circom --r1cs --wasm --sym -o circuits\build -l node_modules

# Compile age_range (uses circomlib comparators)
circom circuits\age_range.circom --r1cs --wasm --sym -o circuits\build -l node_modules

# Compile nullifier (uses circomlib Poseidon)
circom circuits\nullifier.circom --r1cs --wasm --sym -o circuits\build -l node_modules
```

Each circuit produces:
- `circuits/build/<name>.r1cs` — constraint system
- `circuits/build/<name>_js/<name>.wasm` — WASM witness generator
- `circuits/build/<name>.sym` — debug symbols

Verify:
```powershell
dir circuits\build\*.r1cs
# Should list: status_check.r1cs, age_range.r1cs, nullifier.r1cs
```

---

## Step 5: Trusted Setup (Generate .zkey Files)

The trusted setup creates the proving/verification keys for each circuit. We use the Groth16 protocol with the BN128 (BN254) curve.

### 5.1 Download the Powers-of-Tau file

A Powers-of-Tau ceremony file is needed as the universal component of the setup. For small circuits, `powersOfTau28_hez_final_12.ptau` (4096 constraints) is sufficient.

```powershell
# Download the ptau file (~30 MB)
curl -L -o circuits\build\pot12_final.ptau https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_12.ptau
```

> **Note:** If your circuits have more than 4096 constraints, use a larger ptau file (e.g., `_14.ptau` for 16384 constraints, `_16.ptau` for 65536). The `age_range` circuit with circomlib comparators may need a larger file — check the constraint count in the compilation output.

### 5.2 Generate .zkey files

For each circuit, run the Groth16 setup:

```powershell
cd circuits\build

# --- status_check ---
snarkjs groth16 setup status_check.r1cs pot12_final.ptau status_check_0000.zkey
# Contribute randomness (phase 2)
snarkjs zkey contribute status_check_0000.zkey status_check_final.zkey --name="TCC contribution" -v -e="random entropy string here"
# Export verification key (for smart contract or off-chain verification)
snarkjs zkey export verificationkey status_check_final.zkey status_check_vkey.json

# --- age_range ---
snarkjs groth16 setup age_range.r1cs pot12_final.ptau age_range_0000.zkey
snarkjs zkey contribute age_range_0000.zkey age_range_final.zkey --name="TCC contribution" -v -e="random entropy string for age range"
snarkjs zkey export verificationkey age_range_final.zkey age_range_vkey.json

# --- nullifier ---
snarkjs groth16 setup nullifier.r1cs pot12_final.ptau nullifier_0000.zkey
snarkjs zkey contribute nullifier_0000.zkey nullifier_final.zkey --name="TCC contribution" -v -e="random entropy string for nullifier"
snarkjs zkey export verificationkey nullifier_final.zkey nullifier_vkey.json
```

### 5.3 Copy .zkey files to the app

```powershell
# Copy to the app's assets directory
copy circuits\build\status_check_final.zkey assets\zkeys\
copy circuits\build\age_range_final.zkey assets\zkeys\
copy circuits\build\nullifier_final.zkey assets\zkeys\
```

The existing Expo plugin (`withZkeyAssetPackaging.js`) will automatically copy these into the APK's assets during `npx expo prebuild`.

---

## Step 6: Rebuild mopro-ffi with Custom Circuits

This is the most complex step. The pre-built `libmopro_example_app.a` only supports the demo `multiplier2` circuit. You need to rebuild it with your circuits' witness generators compiled in.

### 6.1 Install mopro-cli

```powershell
cargo install mopro-cli
mopro --version
```

### 6.2 Initialize a mopro project

```powershell
# Create a separate directory for the mopro build
mkdir c:\Sandbox\mopro-build
cd c:\Sandbox\mopro-build

mopro init
# When prompted:
#   Project name: digital-wallet-zkp
#   Adapters: select "circom"
```

### 6.3 Add your circuits' WASM files

Copy the compiled `.wasm` files from Step 4 into the mopro project's `test-vectors/circom/` directory:

```powershell
copy c:\Sandbox\TCC\DigitalWalletExpo\circuits\build\status_check_js\status_check.wasm c:\Sandbox\mopro-build\digital-wallet-zkp\test-vectors\circom\
copy c:\Sandbox\TCC\DigitalWalletExpo\circuits\build\age_range_js\age_range.wasm c:\Sandbox\mopro-build\digital-wallet-zkp\test-vectors\circom\
copy c:\Sandbox\TCC\DigitalWalletExpo\circuits\build\nullifier_js\nullifier.wasm c:\Sandbox\mopro-build\digital-wallet-zkp\test-vectors\circom\
```

Also copy the `.zkey` files:

```powershell
copy c:\Sandbox\TCC\DigitalWalletExpo\circuits\build\status_check_final.zkey c:\Sandbox\mopro-build\digital-wallet-zkp\test-vectors\circom\
copy c:\Sandbox\TCC\DigitalWalletExpo\circuits\build\age_range_final.zkey c:\Sandbox\mopro-build\digital-wallet-zkp\test-vectors\circom\
copy c:\Sandbox\TCC\DigitalWalletExpo\circuits\build\nullifier_final.zkey c:\Sandbox\mopro-build\digital-wallet-zkp\test-vectors\circom\
```

### 6.4 Register your circuits in `src/lib.rs`

Edit the file `c:\Sandbox\mopro-build\digital-wallet-zkp\src\lib.rs`:

```rust
use mopro_ffi::circom_prover;

// Generate Rust witness functions from WASM
mod witness {
    rust_witness::witness!(statuscheck);
    rust_witness::witness!(agerange);
    rust_witness::witness!(nullifier);
}

// Bind each .zkey to its witness generator
crate::set_circom_circuits! {
    (
        "status_check_final.zkey",
        circom_prover::witness::WitnessFn::RustWitness(witness::statuscheck_witness)
    ),
    (
        "age_range_final.zkey",
        circom_prover::witness::WitnessFn::RustWitness(witness::agerange_witness)
    ),
    (
        "nullifier_final.zkey",
        circom_prover::witness::WitnessFn::RustWitness(witness::nullifier_witness)
    )
}
```

> **Important:** The witness function name is the WASM filename in all-lowercase with special characters removed. `status_check.wasm` → `statuscheck`, `age_range.wasm` → `agerange`.

### 6.5 Build the native bindings

```powershell
cd c:\Sandbox\mopro-build\digital-wallet-zkp

# Build for Android (React Native) — release mode for performance
mopro build
# When prompted:
#   Build mode: release
#   Platform: react-native
#   Android architectures: select all 4 (arm64-v8a, armeabi-v7a, x86, x86_64)
```

This produces the `MoproReactNativeBindings/` folder containing:
- `android/src/main/jniLibs/*/libdigital_wallet_zkp.a` — compiled native libraries
- `src/generated/digital_wallet_zkp.ts` — TypeScript bindings
- `src/index.tsx` — entry point

### 6.6 Replace the mopro-ffi package

```powershell
# Remove the old package
rmdir /s /q c:\Sandbox\TCC\DigitalWalletExpo\node_modules\mopro-ffi

# Copy the new bindings into the project
xcopy /E /I c:\Sandbox\mopro-build\digital-wallet-zkp\MoproReactNativeBindings c:\Sandbox\TCC\DigitalWalletExpo\node_modules\mopro-ffi
```

> **Better approach:** Update `package.json` to point to the local bindings folder or publish to a private npm registry.

### 6.7 Update imports if needed

If the generated module name changed (e.g., from `mopro_example_app` to `digital_wallet_zkp`), you may need to update the import in `index.ts`:

```typescript
// Before (in the shipped package):
import { generateCircomProof, verifyCircomProof, ... } from 'mopro-ffi';

// This should still work — the package entry point re-exports everything.
```

---

## Step 7: Bundle .zkey Files in the App

The `.zkey` files are already in `assets/zkeys/` (from Step 5.3). The existing infrastructure handles bundling:

1. **`plugins/withZkeyAssetPackaging.js`** — Expo plugin that:
   - Adds `noCompress += ['zkey']` to `android/app/build.gradle` (prevents aapt2 from compressing)
   - Copies `assets/zkeys/*` → `android/app/src/main/assets/zkeys/` during prebuild

2. **`app.json`** already registers this plugin: `"./plugins/withZkeyAssetPackaging"`

After adding the `.zkey` files, run:

```powershell
npx expo prebuild --clean
```

---

## Step 8: Wire Up App Startup

`provisionBundledZkeys()` exists in `ZKProofService.ts` but is **never called**. Add it to the initialization flow.

Edit `src/screens/InitializationScreen.tsx` (or wherever app initialization happens):

```typescript
import { container } from '../container';
import { ZKProofService } from '../services/ZKProofService';

// During initialization:
const zkProofService = container.resolve<ZKProofService>('zkProofService');
const { provisioned, missing } = await zkProofService.provisionBundledZkeys();

if (missing.length > 0) {
  console.warn('Missing zkey files:', missing);
  // ZKP features will use fallback paths where available
}
```

This copies the `.zkey` files from the APK's `assets/` to `DocumentDirectoryPath/zkeys/` where `getZkeyPath()` looks for them.

---

## Verification

After completing all steps:

1. **Rebuild the app:**
   ```powershell
   npx expo prebuild --clean
   npx expo run:android
   ```

2. **Run the diagnostics screen:**
   - Open the "Diagnósticos" tab (visible only in `__DEV__` mode)
   - Run all tests
   - The 11 previously-failing ZKP tests should now pass

3. **Verify `.zkey` files are on device:**
   - Check the app's logs for the `zkey_provisioning_completed` event
   - The log should show all 3 circuits as `provisioned`

---

## Troubleshooting

### "Arquivo zkey não encontrado" still appearing

- Verify `.zkey` files exist in `assets/zkeys/`:
  ```powershell
  dir assets\zkeys\*.zkey
  ```
- Verify `provisionBundledZkeys()` is called before any ZKP operation
- Check device logs for provisioning errors

### "Falha ao gerar prova" after `.zkey` files are provisioned

- The native library doesn't have the witness generator for your circuit
- Ensure you completed Step 6 (mopro rebuild) with all 3 circuits registered
- The `.zkey` filename in `set_circom_circuits!` must match exactly (e.g., `status_check_final.zkey`)

### circom compilation fails with "Include not found"

- Ensure circomlib is installed: `npm install --save-dev circomlib`
- Use the `-l node_modules` flag when calling `circom`

### snarkjs setup fails with "Circuit too large for ptau"

- Download a larger Powers-of-Tau file:
  - `_14.ptau` for up to 16384 constraints
  - `_16.ptau` for up to 65536 constraints
  - `_20.ptau` for up to 1M constraints
- URL pattern: `https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_XX.ptau`

### mopro build fails on Windows

- Windows builds of mopro may have issues with path separators
- Consider using WSL2 (Windows Subsystem for Linux) for the mopro build:
  ```bash
  wsl --install
  # Then follow the Linux instructions inside WSL
  ```
- The generated bindings are cross-platform — you only need WSL for the Rust compilation

### Proof generation works but is very slow

- Ensure you built with `release` mode (not `debug`): `CONFIGURATION=release mopro build`
- Debug builds are ~10-20x slower for Groth16 proving
- Expected times for release builds on a modern phone:
  - `status_check`: ~0.5-1 second
  - `age_range`: ~1-3 seconds  
  - `nullifier`: ~1-2 seconds

---

## Quick Reference: File Locations

| File | Location | Purpose |
|------|----------|---------|
| Circom sources | `circuits/*.circom` | Circuit logic |
| Compiled R1CS | `circuits/build/*.r1cs` | Constraint systems |
| WASM witnesses | `circuits/build/*_js/*.wasm` | Witness generators |
| Proving keys | `assets/zkeys/*_final.zkey` | Groth16 proving keys |
| Verification keys | `circuits/build/*_vkey.json` | For off-chain verification |
| ZKProofService | `src/services/ZKProofService.ts` | Runtime proof generation |
| Provisioning | `ZKProofService.provisionBundledZkeys()` | Copies zkeys to device |
| Expo plugin | `plugins/withZkeyAssetPackaging.js` | Bundles zkeys in APK |
| mopro native lib | `node_modules/mopro-ffi/android/src/main/jniLibs/` | Native Groth16 prover |
