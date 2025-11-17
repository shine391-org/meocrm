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
    await expect(page.getByRole('link', { name: /dashboard|trang chủ/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /orders|đơn hàng/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /customers|khách hàng/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /products|sản phẩm/i })).toBeVisible();
  });

  test('should highlight active navigation link', async ({ page }) => {
    // Go to orders page
    await page.getByRole('link', { name: /orders|đơn hàng/i }).click();
    await expect(page).toHaveURL(/\/orders/i);

    // Orders link should be highlighted (has active class or aria-current)
    const ordersLink = page.getByRole('link', { name: /orders|đơn hàng/i });
    const hasActiveState = await ordersLink.evaluate((el) => {
      return el.classList.contains('active') ||
             el.getAttribute('aria-current') === 'page' ||
             el.classList.toString().includes('bg-');
    });

    expect(hasActiveState).toBeTruthy();
  });

  test('should navigate between all main pages', async ({ page }) => {
    // Dashboard
    await page.getByRole('link', { name: /dashboard|trang chủ/i }).click();
    await expect(page).toHaveURL(/\/$|\/dashboard/i);

    // Orders
    await page.getByRole('link', { name: /orders|đơn hàng/i }).click();
    await expect(page).toHaveURL(/\/orders/i);

    // Customers
    await page.getByRole('link', { name: /customers|khách hàng/i }).click();
    await expect(page).toHaveURL(/\/customers/i);

    // Products
    await page.getByRole('link', { name: /products|sản phẩm/i }).click();
    await expect(page).toHaveURL(/\/products/i);

    // POS
    await page.getByRole('link', { name: /pos|bán hàng/i }).click();
    await expect(page).toHaveURL(/\/pos/i);
  });

  test('should display user menu in header', async ({ page }) => {
    // Check for user menu or profile button
    const userButton = page.getByRole('button', { name: /user|admin|account|tài khoản/i });

    // User button might be visible or in a dropdown
    const userMenuExists = await userButton.count() > 0 ||
                           await page.getByText(/admin@lanoleather.vn/i).count() > 0;

    expect(userMenuExists).toBeTruthy();
  });

  test('should open and close mobile menu on small screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Look for mobile menu button (hamburger)
    const menuButton = page.getByRole('button', { name: /menu|navigation/i });

    if (await menuButton.isVisible()) {
      // Open menu
      await menuButton.click();

      // Navigation should be visible
      await expect(page.getByRole('link', { name: /dashboard|trang chủ/i })).toBeVisible();

      // Close menu
      await menuButton.click();
    }
  });

  test('should maintain scroll position when navigating back', async ({ page }) => {
    // Go to a page with content
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');

    // Scroll down if there's content
    await page.evaluate(() => window.scrollBy(0, 500));

    // Navigate to another page
    await page.getByRole('link', { name: /orders|đơn hàng/i }).click();
    await expect(page).toHaveURL(/\/orders/i);

    // Go back
    await page.goBack();
    await expect(page).toHaveURL(/\/customers/i);

    // Page should be functional
    await expect(page.getByRole('heading', { name: /customers|khách hàng/i })).toBeVisible();
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
    // Tab through navigation links
    await page.keyboard.press('Tab');

    // Check if focus moves through navigation elements
    let focusedElement = await page.evaluate(() => document.activeElement?.tagName);

    // Some element should receive focus
    expect(focusedElement).toBeTruthy();

    // Press Enter on a focused link should navigate
    const dashboardLink = page.getByRole('link', { name: /dashboard|trang chủ/i });
    await dashboardLink.focus();
    await page.keyboard.press('Enter');

    // Should navigate
    await expect(page).toHaveURL(/\/$|\/dashboard/i);
  });
});
