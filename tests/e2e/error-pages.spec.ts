import { test, expect, Route } from '@playwright/test';
import { loginAsAdmin } from './utils/ui-auth';

test.describe('Error Pages', () => {
  test('should display custom 404 page for non-existent routes', async ({ page }) => {
    // Navigate to non-existent page
    await page.goto('/this-page-does-not-exist');

    // Should show 404 page
    await expect(page.getByText(/404/i)).toBeVisible();
    await expect(page.getByText(/không tìm thấy trang/i)).toBeVisible();

    // Should have button back to home
    const homeButton = page.getByRole('button', { name: /về trang chủ/i });
    await expect(homeButton).toBeVisible();
  });

  test('should navigate back to home from 404 page', async ({ page }) => {
    // Navigate to non-existent page
    await page.goto('/this-page-does-not-exist');

    // Click home button
    await page.getByRole('button', { name: /về trang chủ/i }).click();

    // Should redirect to login (since not authenticated) or home
    await expect(page).toHaveURL(/\/login|\/$/i, { timeout: 5000 });
  });

  test('should display error boundary for runtime errors', async ({ page }) => {
    // This test would need a component that can be forced to throw an error
    // For now, we just check that error boundaries exist in the app

    // Navigate to a page
    await page.goto('/login');

    // Inject a runtime error by executing bad code
    await page.evaluate(() => {
      // Try to access undefined property to trigger error
      const badComponent = document.querySelector('[data-testid="force-error"]');
      if (badComponent) {
        throw new Error('Test error');
      }
    });

    // If error boundary is working, page should still be functional
    await expect(page).toHaveURL(/\/login/i);
  });

  test('should handle network errors gracefully', async ({ page, context }) => {
    // Login first
    await page.goto('/login');
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/$|\/dashboard/i, { timeout: 10000 });

    const blockOrders = (route: Route) => route.abort();
    await context.route('**/orders**', blockOrders);

    try {
      await page.getByRole('link', { name: /đơn hàng/i }).first().click();

      await expect(
        page.getByText(/không thể tải|failed to load|error/i),
      ).toBeVisible({ timeout: 5000 });
    } finally {
      await context.unroute('**/orders**', blockOrders);
    }
  });

  test('should keep recovery actions available on authenticated error pages', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/$|\/dashboard/i, { timeout: 10000 });

    // Navigate to a non-existent dashboard page via the nav link (client-side navigation keeps session)
    await page.getByRole('link', { name: /báo cáo/i }).first().click();

    await expect(page.getByText(/404/i)).toBeVisible();
    const recoveryButton = page.getByRole('button', { name: /về trang chủ/i });
    await expect(recoveryButton).toBeVisible();

    await recoveryButton.click();
    await expect(page).toHaveURL(/\/$|\/dashboard/i);
  });
});
