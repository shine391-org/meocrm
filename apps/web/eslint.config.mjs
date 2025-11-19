import nextConfig from 'eslint-config-next';

export default [
  ...nextConfig,
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'import/no-anonymous-default-export': 'off',
    },
  },
  {
    ignores: ['node_modules', '.next', 'out', 'dist', 'coverage', 'build'],
  },
];
