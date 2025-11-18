const path = require('path');
const baseConfig = require('../../jest.config');

module.exports = {
  ...baseConfig,
  rootDir: path.resolve(__dirname, '..', '..'),
  testPathIgnorePatterns: (baseConfig.testPathIgnorePatterns || []).filter(
    (pattern) => !pattern.includes('test/webhooks'),
  ),
};
