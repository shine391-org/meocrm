import { test, expect } from '@playwright/test';
import { getTestCredentials } from './utils/credentials';

test('Debug login flow', async ({ page }) => {
  const consoleMessages: string[] = [];
  const errors: string[] = [];

  // Listen to console
  page.on('console', (msg) => {
    const text = msg.text();
    consoleMessages.push(`[${msg.type()}] ${text}`);
    console.log(`Browser console [${msg.type()}]: ${text}`);
  });

  // Listen to page errors
  page.on('pageerror', (error) => {
    errors.push(error.message);
    console.log(`Page error: ${error.message}`);
  });

  // Listen to network requests
  page.on('request', (request) => {
    if (request.url().includes('/auth/')) {
      console.log(`→ ${request.method()} ${request.url()}`);
    }
  });

  page.on('response', async (response) => {
    if (response.url().includes('/auth/')) {
      console.log(`← ${response.status()} ${response.url()}`);
      try {
        const body = await response.text();
        console.log(`  Body: ${body.substring(0, 200)}`);
      } catch (e) {
        // ignore
      }
    }
  });

  // Navigate to login
  await page.goto('/login');
  console.log('Navigated to login page');

  // Fill in credentials
  const creds = getTestCredentials();
  await page.getByLabel(/email/i).fill(creds.email);
  await page.getByLabel(/password/i).fill(creds.password);
  console.log('Filled credentials');

  // Wait a bit before clicking
  await page.waitForTimeout(1000);

  // Click login
  console.log('Clicking login button');
  await page.getByRole('button', { name: /quản lý/i }).click();

  // Wait to see what happens
  await page.waitForTimeout(5000);

  console.log('\n=== Final State ===');
  console.log(`URL: ${page.url()}`);
  console.log(`Console messages: ${consoleMessages.length}`);
  console.log(`Errors: ${errors.length}`);
  console.log('\n=== Console Messages ===');
  consoleMessages.forEach((msg) => console.log(msg));
  console.log('\n=== Errors ===');
  errors.forEach((err) => console.log(err));
});
