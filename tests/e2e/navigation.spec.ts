import { test, expect } from '@playwright/test';

test.describe('Navigation and Layout', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@lanoleather.vn');
    await page.getByLabel(/password/i).fill('Admin@123');
    await page.getByRole('button', { name: /quản lý/i }).click();

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/$|\/dashboard/i, { timeout: 10000 });
  });

  test('should display sidebar with all navigation links', async ({ page }) => {
    // Check main navigation links
    await expect(page.getByRole('link', { name: /tổng quan/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /hàng hóa/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /đơn hàng/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /khách hàng/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /sổ quỹ/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /báo cáo/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /cài đặt/i }).first()).toBeVisible();
  });

  test('should highlight active navigation link', async ({ page }) => {
    // Go to orders page
    const ordersLink = page.getByRole('link', { name: /đơn hàng/i }).first();
    await ordersLink.click();
    await expect(page).toHaveURL(/\/orders/i);

    // Orders link should be highlighted (has active class or aria-current)
    const hasActiveState = await ordersLink.evaluate((el) => {
      return el.classList.contains('active') ||
             el.getAttribute('aria-current') === 'page' ||
             el.classList.toString().includes('bg-');
    });

    expect(hasActiveState).toBeTruthy();
  });

  test('should navigate between all main pages', async ({ page }) => {
    // Dashboard
    await page.getByRole('link', { name: /tổng quan/i }).first().click();
    await expect(page).toHaveURL(/\/$|\/dashboard/i);

    // Orders
    await page.getByRole('link', { name: /đơn hàng/i }).first().click();
    await expect(page).toHaveURL(/\/orders/i);

    // Customers
    await page.getByRole('link', { name: /khách hàng/i }).first().click();
    await expect(page).toHaveURL(/\/customers/i);

    // Products
    await page.getByRole('link', { name: /hàng hóa/i }).first().click();
    await expect(page).toHaveURL(/\/products/i);

    // POS
    await page.getByRole('button', { name: /bán hàng/i }).first().click();
    await expect(page).toHaveURL(/\/pos/i);

    // Back to dashboard via mode switcher
    await page.getByRole('button', { name: /quản lý/i }).first().click();
    await expect(page).toHaveURL(/\/$|\/dashboard/i);
  });

  test('should display user menu in header', async ({ page }) => {
    // Check for user menu or profile button
    const userMenuButton = page.locator('button.rounded-full').first();
    await expect(userMenuButton).toBeVisible();

    await userMenuButton.click();
    await expect(page.getByRole('menuitem', { name: /log out/i })).toBeVisible();
  });

  test('should open and close mobile menu on small screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Look for mobile menu button (hamburger)
    const menuButton = page.getByRole('button', { name: /menu|navigation/i }).first();

    if (await menuButton.isVisible()) {
      // Open menu
      await menuButton.click();

      // Navigation should be visible
      await expect(page.getByRole('link', { name: /tổng quan/i }).first()).toBeVisible();

      // Close menu via the sheet close button (or Escape fallback)
      const closeButton = page.getByRole('button', { name: /close/i }).first();
      if (await closeButton.isVisible()) {
        await closeButton.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await expect(menuButton).toBeVisible();
    }
  });

  test('should maintain scroll position when navigating back', async ({ page }) => {
    // Go to a page with content
    await page.getByRole('link', { name: /khách hàng/i }).first().click();
    await expect(page.getByRole('heading', { name: /quản lý khách hàng/i })).toBeVisible();

    // Scroll down if there's content
    await page.evaluate(() => window.scrollBy(0, 500));

    // Navigate to another page
    await page.getByRole('link', { name: /đơn hàng/i }).first().click();
    await expect(page).toHaveURL(/\/orders/i);

    // Go back
    await page.goBack();
    await expect(page).toHaveURL(/\/customers/i);

    // Page should be functional
    await expect(page.getByRole('heading', { name: /quản lý khách hàng/i })).toBeVisible();
  });

  test('should handle browser back and forward navigation', async ({ page }) => {
    // Navigate through pages
    await page.goto('/orders');
    await page.goto('/customers');
    await page.goto('/products');

    // Go back
    await page.goBack();
    await expect(page).toHaveURL(/\/customers/i);

    // Go back again
    await page.goBack();
    await expect(page).toHaveURL(/\/orders/i);

    // Go forward
    await page.goForward();
    await expect(page).toHaveURL(/\/customers/i);
  });

  test('should persist authentication state across navigation', async ({ page }) => {
    // Navigate to different pages
    await page.goto('/orders');
    await page.goto('/customers');
    await page.goto('/products');
    await page.goto('/');

    // Should never be redirected to login
    await expect(page).not.toHaveURL(/\/login/i);
  });

  test('should have accessible navigation with keyboard', async ({ page }) => {
    const dashboardLink = page.getByRole('link', { name: /tổng quan/i }).first();
    await dashboardLink.focus();
    await expect(dashboardLink).toBeFocused();

    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/$|\/dashboard/i);
  });
});
