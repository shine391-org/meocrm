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
    await expect(page.getByText(/doanh thu/i).first()).toBeVisible();
    await expect(page.getByText(/tồn kho|tồi hàng/i).first()).toBeVisible();
    await expect(page.getByText(/doanh thu thuần/i).first()).toBeVisible();
    await expect(page.getByText(/đơn hàng/i).first()).toBeVisible();
  });

  test('should display revenue chart', async ({ page }) => {
    // Check for chart component (adjust selector based on actual implementation)
    await expect(page.locator('canvas, svg').first()).toBeVisible();
  });

  test('should display top products section', async ({ page }) => {
    await expect(
      page.getByText(/top 10 hàng bán chạy/i),
    ).toBeVisible();
  });

  test('should display top customers section', async ({ page }) => {
    await expect(
      page.getByText(/top 10 khách mua nhiều nhất/i),
    ).toBeVisible();
  });

  test('should display activity feed', async ({ page }) => {
    await expect(page.getByText(/hoạt động gần đây/i)).toBeVisible();
  });

  test('should navigate to orders page from dashboard', async ({ page }) => {
    // Click on orders link in navigation
    await page.getByRole('link', { name: /đơn hàng|orders/i }).first().click();

    await expect(page).toHaveURL(/\/orders/i, { timeout: 5000 });
  });

  test('should navigate to customers page from dashboard', async ({ page }) => {
    // Click on customers link in navigation
    await page.getByRole('link', { name: /khách hàng|customers/i }).first().click();

    await expect(page).toHaveURL(/\/customers/i, { timeout: 5000 });
  });

  test('should navigate to products page from dashboard', async ({ page }) => {
    // Click on products link in navigation
    await page.getByRole('link', { name: /hàng hóa/i }).first().click();

    await expect(page).toHaveURL(/\/products/i, { timeout: 5000 });
  });

  test('should have responsive layout on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Check that page still renders (no layout breaks)
    await expect(page.getByText(/doanh thu/i).first()).toBeVisible();
  });
});
