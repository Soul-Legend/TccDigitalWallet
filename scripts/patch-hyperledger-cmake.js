/**
 * Postinstall script to patch Hyperledger native module CMakeLists.txt
 * for React Native 0.76+ compatibility.
 *
 * RN 0.76 merged native libraries into a single `ReactAndroid::reactnative`
 * prefab target. The old `ReactAndroid::reactnativejni` target no longer exists.
 * See: https://github.com/react-native-community/discussions-and-proposals/discussions/816
 */
const fs = require('fs');
const path = require('path');

const PACKAGES = [
  '@hyperledger/anoncreds-react-native',
  '@hyperledger/aries-askar-react-native',
];

const OLD_LINK_BLOCK = `if(\${REACT_NATIVE_VERSION} GREATER_EQUAL 71)
  target_link_libraries(
    \${PACKAGE_NAME}
    ReactAndroid::jsi
    ReactAndroid::reactnativejni
    fbjni::fbjni
  )`;

const NEW_LINK_BLOCK = `if(\${REACT_NATIVE_VERSION} GREATER_EQUAL 76)
  target_link_libraries(
    \${PACKAGE_NAME}
    ReactAndroid::jsi
    ReactAndroid::reactnative
    fbjni::fbjni
  )
elseif(\${REACT_NATIVE_VERSION} GREATER_EQUAL 71)
  target_link_libraries(
    \${PACKAGE_NAME}
    ReactAndroid::jsi
    ReactAndroid::reactnativejni
    fbjni::fbjni
  )`;

let patched = 0;
let skipped = 0;

for (const pkg of PACKAGES) {
  const cmakePath = path.join(
    __dirname,
    '..',
    'node_modules',
    pkg,
    'android',
    'CMakeLists.txt'
  );

  if (!fs.existsSync(cmakePath)) {
    console.log(`[patch-cmake] ${pkg}: CMakeLists.txt not found, skipping`);
    skipped++;
    continue;
  }

  let content = fs.readFileSync(cmakePath, 'utf8');

  if (content.includes('GREATER_EQUAL 76')) {
    console.log(`[patch-cmake] ${pkg}: already patched, skipping`);
    skipped++;
    continue;
  }

  if (!content.includes(OLD_LINK_BLOCK)) {
    console.warn(`[patch-cmake] ${pkg}: expected CMake block not found, skipping`);
    skipped++;
    continue;
  }

  content = content.replace(OLD_LINK_BLOCK, NEW_LINK_BLOCK);
  fs.writeFileSync(cmakePath, content, 'utf8');
  console.log(`[patch-cmake] ${pkg}: patched for RN 0.76+ compatibility`);
  patched++;
}

console.log(`[patch-cmake] Done: ${patched} patched, ${skipped} skipped`);
