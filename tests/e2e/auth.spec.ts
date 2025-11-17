import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page before each test
    await page.goto('/login');
  });

  test('should display login page with correct elements', async ({ page }) => {
    // Check page title
    await expect(page).toHaveTitle(/MeoCRM/i);

    // Check form elements exist
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    // Check for "Quản lý" button (management login)
    await expect(page.getByRole('button', { name: /quản lý/i })).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    // Click login button without filling form
    await page.getByRole('button', { name: /quản lý/i }).click();

    // Should show validation errors via toast
    await expect(page.getByText(/vui lòng nhập đầy đủ thông tin/i)).toBeVisible({ timeout: 3000 });
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Fill in invalid credentials
    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');

    // Submit form
    await page.getByRole('button', { name: /quản lý/i }).click();

    // Should show error message (toast notification)
    await expect(page.getByText(/sai email hoặc mật khẩu|đăng nhập thất bại/i)).toBeVisible({
      timeout: 5000,
    });
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    // Fill in valid credentials from seed data
    await page.getByLabel(/email/i).fill('admin@lanoleather.vn');
    await page.getByLabel(/password/i).fill('Admin@123');

    // Submit form
    await page.getByRole('button', { name: /quản lý/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/$|\/dashboard/i, { timeout: 10000 });

    // Should show user info or dashboard elements
    await expect(
      page.getByText(/admin|dashboard|trang chủ/i).first(),
    ).toBeVisible();
  });

  test('should persist session after page reload', async ({ page }) => {
    // Login first
    await page.getByLabel(/email/i).fill('admin@lanoleather.vn');
    await page.getByLabel(/password/i).fill('Admin@123');
    await page.getByRole('button', { name: /quản lý/i }).click();

    // Wait for redirect
    await expect(page).toHaveURL(/\/$|\/dashboard/i, { timeout: 10000 });

    // Reload page
    await page.reload();

    // Should still be logged in (not redirected to login)
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.getByLabel(/email/i).fill('admin@lanoleather.vn');
    await page.getByLabel(/password/i).fill('Admin@123');
    await page.getByRole('button', { name: /quản lý/i }).click();

    // Wait for redirect
    await expect(page).toHaveURL(/\/$|\/dashboard/i, { timeout: 10000 });

    // Find and click logout button (adjust selector based on UI)
    // This might be in a dropdown menu or header
    const logoutButton = page.getByRole('button', { name: /logout|đăng xuất/i });
    if (await logoutButton.isVisible()) {
      await logoutButton.click();
    } else {
      // Try finding in dropdown menu
      await page.getByRole('button', { name: /user|account|tài khoản/i }).click();
      await page.getByRole('menuitem', { name: /logout|đăng xuất/i }).click();
    }

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('should not access protected pages when logged out', async ({ page }) => {
    // Try to navigate to dashboard without login
    await page.goto('/');

    // Should redirect to login page
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test('should have no accessibility violations on login page', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Tab through form elements
    await page.keyboard.press('Tab'); // Focus email
    await expect(page.getByLabel(/email/i)).toBeFocused();

    await page.keyboard.press('Tab'); // Focus password
    await expect(page.getByLabel(/password/i)).toBeFocused();

    await page.keyboard.press('Tab'); // Focus submit button
    await expect(page.getByRole('button', { name: /quản lý/i })).toBeFocused();
  });

  test('should show loading state during login', async ({ page }) => {
    // Fill in credentials
    await page.getByLabel(/email/i).fill('admin@lanoleather.vn');
    await page.getByLabel(/password/i).fill('Admin@123');

    // Submit form
    const submitButton = page.getByRole('button', { name: /quản lý/i });
    await submitButton.click();

    // Should show loading text
    await expect(page.getByText(/đang đăng nhập/i)).toBeVisible({ timeout: 2000 });
  });

  test('should handle network errors gracefully', async ({ page, context }) => {
    // Block API requests to simulate network error
    await context.route('**/auth/login', (route) => route.abort());

    // Fill in credentials
    await page.getByLabel(/email/i).fill('admin@lanoleather.vn');
    await page.getByLabel(/password/i).fill('Admin@123');

    // Submit form
    await page.getByRole('button', { name: /quản lý/i }).click();

    // Should show error message (looking for first match since toast has title and description)
    await expect(
      page.getByText(/đăng nhập thất bại/i).first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test('should set authentication cookie on successful login', async ({ page, context }) => {
    // Login
    await page.getByLabel(/email/i).fill('admin@lanoleather.vn');
    await page.getByLabel(/password/i).fill('Admin@123');
    await page.getByRole('button', { name: /quản lý/i }).click();

    // Wait for redirect
    await expect(page).toHaveURL(/\/$|\/dashboard/i, { timeout: 10000 });

    // Check that cookies are set
    const cookies = await context.cookies();
    const hasMeoCRMCookie = cookies.some(
      (cookie) =>
        cookie.name.includes('meocrm') ||
        cookie.name.includes('token') ||
        cookie.name.includes('auth')
    );

    expect(hasMeoCRMCookie).toBeTruthy();
  });
});
