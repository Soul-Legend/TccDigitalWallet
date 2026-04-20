const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');

const DATA_EXTRACTION_RULES_XML = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
  <cloud-backup>
    <exclude domain="sharedpref" path="wallet" />
  </cloud-backup>
  <device-transfer>
    <exclude domain="sharedpref" path="wallet" />
  </device-transfer>
</data-extraction-rules>
`;

function ensureAndroidRulesFile(projectRoot) {
  const targetDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res', 'xml');
  const targetFile = path.join(targetDir, 'data_extraction_rules.xml');

  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(targetFile, DATA_EXTRACTION_RULES_XML, 'utf8');
}

module.exports = function withDataExtractionRules(config) {
  config = withAndroidManifest(config, (modConfig) => {
    const app = modConfig.modResults?.manifest?.application?.[0];
    if (!app) {
      return modConfig;
    }

    app.$['android:usesCleartextTraffic'] = 'false';
    app.$['android:allowBackup'] = 'false';
    app.$['android:fullBackupContent'] = 'false';
    app.$['android:dataExtractionRules'] = '@xml/data_extraction_rules';

    return modConfig;
  });

  config = withDangerousMod(config, [
    'android',
    async (modConfig) => {
      ensureAndroidRulesFile(modConfig.modRequest.projectRoot);
      return modConfig;
    },
  ]);

  return config;
};
