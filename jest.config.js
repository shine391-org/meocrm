const includeE2E = process.env.RUN_E2E === 'true';

const testPathIgnorePatterns = ['/node_modules/', '/dist/', '/test/webhooks/', 'apps/api/src/modules/webhooks/webhooks.service.spec.ts', 'apps/api/test/webhooks/'];

if (!includeE2E) {
  testPathIgnorePatterns.push('.*\\.e2e-spec\\.ts$');
}

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'apps/api/src/refunds/**/*.ts',
    'apps/api/src/modules/webhooks/**/*.ts',
    'apps/api/src/modules/cron/**/*.ts',
    'apps/api/src/modules/reports/**/*.ts',
    'apps/api/src/audit-log/**/*.ts',
    'apps/api/src/modules/notifications/**/*.ts',
    'apps/api/src/orders/pricing.service.ts',
    'apps/api/src/users/users.service.ts',
    'apps/api/src/categories/categories.service.ts',
    'apps/api/src/common/crypto/**/*.ts',
    '!apps/api/src/**/*.spec.ts',
    '!apps/api/src/**/*.e2e-spec.ts',
    '!apps/api/src/**/dto/**',
    '!apps/api/src/**/entities/**',
  ],
  testPathIgnorePatterns,
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>/apps/api'],
  setupFilesAfterEnv: ['<rootDir>/apps/api/test/setup-e2e.ts'],
  moduleNameMapper: {
    '^apps/api/(.*)$': '<rootDir>/apps/api/$1',
    '^src/(.*)$': '<rootDir>/apps/api/src/$1',
  },
  globalTeardown: '<rootDir>/apps/api/test/global-teardown.ts',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/apps/api/tsconfig.json',
    },
  },
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
};
