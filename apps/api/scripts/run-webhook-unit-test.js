const { execSync } = require('child_process');
process.env.WEBHOOK_DISABLE_RETRY = 'true';
execSync('jest --config ../../jest.config.js --runInBand --passWithNoTests --testPathPattern=src/modules/webhooks/webhooks.service.spec.ts --testPathIgnorePatterns=', {
  stdio: 'inherit',
});
