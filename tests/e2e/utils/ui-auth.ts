import { Page } from '@playwright/test';
import { getTestCredentials } from './credentials';

export async function fillLoginForm(page: Page) {
  const credentials = getTestCredentials();
  await page.getByLabel(/email/i).fill(credentials.email);
  await page.getByLabel(/password/i).fill(credentials.password);
}

export async function loginAsAdmin(page: Page, buttonLabel: RegExp | string = /quản lý/i) {
  await fillLoginForm(page);
  await page.getByRole('button', { name: buttonLabel }).click();
}
