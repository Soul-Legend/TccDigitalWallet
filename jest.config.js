module.exports = {
  preset: 'jest-expo',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|zustand|@noble|@credo-ts|@hyperledger|mopro-ffi|uniffi-bindgen-react-native|@openwallet-foundation)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/docs/libs_Docs/',
  ],
  verbose: false,
  silent: false,
  errorOnDeprecated: false,
  reporters: [
    'default',
    '<rootDir>/jest-custom-reporter.js',
  ],
  bail: false,
  maxWorkers: '50%',
};
