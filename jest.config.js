module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.(spec|e2e-spec)\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'apps/api/src/auth/auth.service.ts',
    'apps/api/src/customers/customers.service.ts',
    'apps/api/src/products/products.controller.ts',
    'apps/api/src/products/products.service.ts',
    'apps/api/src/suppliers/suppliers.service.ts',
  ],
  coverageDirectory: 'coverage',
  testEnvironment: 'node',
  roots: ['<rootDir>/apps/'],
  moduleNameMapper: {
    '^apps/api/(.*)$': '<rootDir>/apps/api/$1',
  },
  globals: {
    'ts-jest': {
      tsconfig: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
      },
    },
  },
};
