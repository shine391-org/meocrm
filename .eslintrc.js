module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: ['plugin:@typescript-eslint/recommended', 'next/core-web-vitals'],
  root: true,
  env: { node: true, jest: true },
  settings: {
    next: {
      rootDir: ['apps/web'],
    },
  },
  ignorePatterns: [
    '.eslintrc.js',
    'dist/',
    '.next/',
    'node_modules/',
    'coverage/',
    '*.config.js',
    'apps/api/jest.setup.ts',
    'apps/api/prisma/**',
    'apps/api/test/**',
    'apps/api/src/**/*.spec.ts',
    'apps/api/srcs/**',
  ],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
  },
};
