module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', // New feature
        'fix', // Bug fix
        'docs', // Documentation
        'style', // Code style changes
        'refactor', // Code refactoring
        'test', // Tests
        'chore', // Maintenance
      ],
    ],
    'scope-enum': [
      2,
      'always',
      [
        'auth',
        'products',
        'customers',
        'suppliers',
        'orders',
        'inventory',
        'shipping',
        'pos',
        'reports',
        'api',
        'web',
        'docs',
      ],
    ],
  },
};