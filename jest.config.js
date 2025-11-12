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
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '\\.e2e-spec\\.ts$'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>/apps/api'],
  setupFilesAfterEnv: ['<rootDir>/apps/api/test/setup-e2e.ts'],
  moduleNameMapper: {
    '^apps/api/(.*)$': '<rootDir>/apps/api/$1',
    '^src/(.*)$': '<rootDir>/apps/api/src/$1',
  },
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
