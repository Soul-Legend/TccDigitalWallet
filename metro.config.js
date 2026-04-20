// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Match RN-CLI source extension order so .ts/.tsx still resolve cleanly.
config.resolver.sourceExts = Array.from(
  new Set([...(config.resolver.sourceExts || []), 'ts', 'tsx', 'cjs']),
);

module.exports = config;
