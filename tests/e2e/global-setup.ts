import { FullConfig } from '@playwright/test';
import { execSync } from 'node:child_process';
import path from 'node:path';

export default async function globalSetup(_config: FullConfig) {
  const repoRoot = path.resolve(__dirname, '..', '..');
  const baseEnv = {
    ...process.env,
    E2E_ADMIN_EMAIL:
      process.env.E2E_ADMIN_EMAIL ||
      process.env.SEED_ADMIN_EMAIL ||
      'seed@example.com',
    E2E_ADMIN_PASSWORD:
      process.env.E2E_ADMIN_PASSWORD ||
      process.env.SEED_ADMIN_PASSWORD ||
      'Passw0rd!',
  };

  const seedEnv = {
    ...baseEnv,
    SEED_ADMIN_EMAIL: baseEnv.E2E_ADMIN_EMAIL,
    SEED_ADMIN_PASSWORD: baseEnv.E2E_ADMIN_PASSWORD,
  };

  execSync(
    'pnpm --filter @meocrm/api prisma migrate reset --force --skip-generate --skip-seed',
    { cwd: repoRoot, stdio: 'inherit', env: seedEnv },
  );
  execSync('pnpm --filter @meocrm/api prisma migrate deploy', {
    cwd: repoRoot,
    stdio: 'inherit',
    env: seedEnv,
  });
  execSync('pnpm --filter @meocrm/api prisma db seed', {
    cwd: repoRoot,
    stdio: 'inherit',
    env: seedEnv,
  });
}
