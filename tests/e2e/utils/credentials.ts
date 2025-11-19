export type TestCredentials = {
  email: string;
  password: string;
};

const FALLBACK_EMAIL = 'seed@example.com';
const FALLBACK_PASSWORD = 'Passw0rd!';

export function getTestCredentials(): TestCredentials {
  return {
    email:
      process.env.E2E_ADMIN_EMAIL ||
      process.env.SEED_ADMIN_EMAIL ||
      FALLBACK_EMAIL,
    password:
      process.env.E2E_ADMIN_PASSWORD ||
      process.env.SEED_ADMIN_PASSWORD ||
      FALLBACK_PASSWORD,
  };
}

export function getApiBaseUrl(): string {
  return (
    process.env.E2E_API_URL ||
    process.env.PLAYWRIGHT_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:2003'
  ).replace(/\/$/, '');
}
