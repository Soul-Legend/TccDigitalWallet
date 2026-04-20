const fs = require('fs');
const path = require('path');
const { withAppBuildGradle, withDangerousMod } = require('@expo/config-plugins');

function addNoCompressForZkey(contents) {
  if (contents.includes("noCompress += ['zkey']")) {
    return contents;
  }

  return contents.replace(
    /android\s*\{/,
    "android {\n    androidResources {\n        noCompress += ['zkey']\n    }"
  );
}

function copyZkeys(projectRoot) {
  const sourceDir = path.join(projectRoot, 'assets', 'zkeys');
  const destDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'assets', 'zkeys');

  if (!fs.existsSync(sourceDir)) {
    return;
  }

  fs.mkdirSync(destDir, { recursive: true });
  fs.cpSync(sourceDir, destDir, { recursive: true });
}

module.exports = function withZkeyAssetPackaging(config) {
  config = withAppBuildGradle(config, (modConfig) => {
    modConfig.modResults.contents = addNoCompressForZkey(modConfig.modResults.contents);
    return modConfig;
  });

  config = withDangerousMod(config, [
    'android',
    async (modConfig) => {
      copyZkeys(modConfig.modRequest.projectRoot);
      return modConfig;
    },
  ]);

  return config;
};
