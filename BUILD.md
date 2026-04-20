# DigitalWalletExpo Build and Validation Guide

This document describes how to build, test, and validate the Expo migration of the Digital Wallet project.

## 1) Prerequisites

- Node.js 18+
- npm 9+
- Java 17 (for Android builds)
- Android Studio with SDK/NDK installed
- (Optional) EAS CLI: `npm i -g eas-cli`

## 2) Install dependencies

```bash
npm install
```

## 3) Verify project health

Run these checks after every dependency change:

```bash
npm run doctor
npm run typecheck
npm test
```

Expected baseline after migration:

- Typecheck: no errors
- Tests: all passing

## 4) Native generation (Continuous Native Generation)

This project uses Expo prebuild to generate Android/iOS projects when needed.

```bash
npm run prebuild:clean
```

Generated native folders are ignored by git (`/android`, `/ios`) and can be regenerated at any time.

## 5) Android security and zkey provisioning

Two local config plugins are applied in `app.json`:

- `./plugins/withZkeyAssetPackaging`
  - Copies `assets/zkeys/*` into `android/app/src/main/assets/zkeys`
  - Adds `androidResources { noCompress += ['zkey'] }` in `android/app/build.gradle`

- `./plugins/withDataExtractionRules`
  - Creates `android/app/src/main/res/xml/data_extraction_rules.xml`
  - Sets manifest attributes on `<application>`:
    - `android:usesCleartextTraffic="false"`
    - `android:allowBackup="false"`
    - `android:fullBackupContent="false"`
    - `android:dataExtractionRules="@xml/data_extraction_rules"`

## 6) Run Android locally

Start with an emulator/device ready:

```bash
npm run android
```

If autolinking has issues for third-party native libraries, try:

```bash
EXPO_USE_COMMUNITY_AUTOLINKING=1 npm run prebuild:clean
```

## 7) EAS builds

Profiles are configured in `eas.json`:

- `development`: dev client APK
- `preview`: internal APK
- `production`: AAB

Example commands:

```bash
eas build --platform android --profile development
eas build --platform android --profile preview
eas build --platform android --profile production
```

For production signing, configure Android credentials in EAS (recommended) instead of hardcoding keystore paths in Gradle.

## 8) Routing architecture

Navigation uses `expo-router` file-based routes:

- `app/_layout.tsx` defines shared stack options and titles
- `app/index.tsx` is initialization route (`/`)
- module routes:
  - `/home`
  - `/emissor`
  - `/titular`
  - `/verificador`
  - `/logs`
  - `/glossario`

Shared route constants live in `src/utils/routes.ts`.

## 9) Integrity checklist before release

Run in order:

```bash
npm run doctor
npm run typecheck
npm test
npm run prebuild:clean
```

Then verify generated Android output contains:

- `android/app/src/main/assets/zkeys/`
- `android/app/src/main/res/xml/data_extraction_rules.xml`
- `android:usesCleartextTraffic="false"` in manifest
- `androidResources { noCompress += ['zkey'] }` in app `build.gradle`
