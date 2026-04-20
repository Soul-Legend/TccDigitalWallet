/**
 * Postinstall script to patch Hyperledger native module CMakeLists.txt
 * for React Native 0.76+ compatibility.
 *
 * Fixes applied:
 * 1. RN 0.76 merged native libraries into `ReactAndroid::reactnative`.
 *    The old `ReactAndroid::reactnativejni` prefab target no longer exists.
 *    See: https://github.com/react-native-community/discussions-and-proposals/discussions/816
 * 2. RN 0.76 headers use C++17 syntax (nested namespaces). The Hyperledger
 *    packages compile with `-std=c++1y` (C++14), causing warnings. Upgrade to C++17.
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
    // Link block already patched; still check C++ standard
    let changed = false;
    if (content.includes('"-std=c++1y"')) {
      content = content.replace(/"-std=c\+\+1y"/g, '"-std=c++17"');
      changed = true;
    }
    if (content.includes('set(CMAKE_CXX_STANDARD 14)')) {
      content = content.replace('set(CMAKE_CXX_STANDARD 14)', 'set(CMAKE_CXX_STANDARD 17)');
      changed = true;
    }
    if (changed) {
      fs.writeFileSync(cmakePath, content, 'utf8');
      console.log(`[patch-cmake] ${pkg}: upgraded C++ standard to C++17`);
      patched++;
    } else {
      console.log(`[patch-cmake] ${pkg}: already patched, skipping`);
      skipped++;
    }
    continue;
  }

  if (!content.includes(OLD_LINK_BLOCK)) {
    console.warn(`[patch-cmake] ${pkg}: expected CMake block not found, skipping`);
    skipped++;
    continue;
  }

  content = content.replace(OLD_LINK_BLOCK, NEW_LINK_BLOCK);
  // Also upgrade C++ standard from C++14 to C++17 to match RN 0.76 headers
  content = content.replace(/"-std=c\+\+1y"/g, '"-std=c++17"');
  if (content.includes('set(CMAKE_CXX_STANDARD 14)')) {
    content = content.replace('set(CMAKE_CXX_STANDARD 14)', 'set(CMAKE_CXX_STANDARD 17)');
  }
  fs.writeFileSync(cmakePath, content, 'utf8');
  console.log(`[patch-cmake] ${pkg}: patched for RN 0.76+ compatibility`);
  patched++;
}

console.log(`[patch-cmake] Done: ${patched} patched, ${skipped} skipped`);

// Also patch build.gradle C++ flags for consistency
for (const pkg of PACKAGES) {
  const gradlePath = path.join(
    __dirname, '..', 'node_modules', pkg, 'android', 'build.gradle'
  );
  if (!fs.existsSync(gradlePath)) continue;
  let gradle = fs.readFileSync(gradlePath, 'utf8');
  if (gradle.includes('-std=c++1y')) {
    gradle = gradle.replace(/-std=c\+\+1y/g, '-std=c++17');
    fs.writeFileSync(gradlePath, gradle, 'utf8');
    console.log(`[patch-gradle] ${pkg}: upgraded cppFlags to C++17`);
  }
}
