import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@lanoleather.vn');
    await page.getByLabel(/password/i).fill('Admin@123');
    await page.getByRole('button', { name: /quản lý/i }).click();

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/$|\/dashboard/i, { timeout: 10000 });
  });

  test('should display all KPI cards', async ({ page }) => {
    // Check for KPI cards
    await expect(page.getByText(/doanh thu/i)).toBeVisible();
    await expect(page.getByText(/tồn kho|tồi hàng/i)).toBeVisible();
    await expect(page.getByText(/doanh thu thuần/i)).toBeVisible();
    await expect(page.getByText(/đơn hàng/i)).toBeVisible();
  });

  test('should display revenue chart', async ({ page }) => {
    // Check for chart component (adjust selector based on actual implementation)
    await expect(page.locator('canvas, svg').first()).toBeVisible();
  });

  test('should display top products section', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /sản phẩm bán chạy|top products/i }),
    ).toBeVisible();
  });

  test('should display top customers section', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /khách hàng tiềm năng|top customers/i }),
    ).toBeVisible();
  });

  test('should display activity feed', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /hoạt động gần đây|activity|recent/i }),
    ).toBeVisible();
  });

  test('should navigate to orders page from dashboard', async ({ page }) => {
    // Click on orders link in navigation
    await page.getByRole('link', { name: /đơn hàng|orders/i }).click();

    await expect(page).toHaveURL(/\/orders/i, { timeout: 5000 });
  });

  test('should navigate to customers page from dashboard', async ({ page }) => {
    // Click on customers link in navigation
    await page.getByRole('link', { name: /khách hàng|customers/i }).click();

    await expect(page).toHaveURL(/\/customers/i, { timeout: 5000 });
  });

  test('should navigate to products page from dashboard', async ({ page }) => {
    // Click on products link in navigation
    await page.getByRole('link', { name: /sản phẩm|products/i }).click();

    await expect(page).toHaveURL(/\/products/i, { timeout: 5000 });
  });

  test('should have responsive layout on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check that page still renders (no layout breaks)
    await expect(page.getByText(/doanh thu/i)).toBeVisible();
  });
});
