module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'apps/**/*.{ts,js}',
    '!**/*.spec.ts',
    '!**/*.e2e-spec.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/prisma/**',
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
};
