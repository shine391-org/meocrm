import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './utils/ui-auth';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await loginAsAdmin(page);

    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/\/$|\/dashboard/i, { timeout: 10000 });
  });

  test('should display all KPI cards', async ({ page }) => {
    const kpiCards = page.getByTestId('kpi-card');
    await expect(kpiCards).toHaveCount(4);
    await expect(kpiCards.first()).toBeVisible();
  });

  test('should display revenue chart', async ({ page }) => {
    const chartSection = page.getByTestId('revenue-chart');
    await expect(chartSection).toBeVisible();

    const emptyState = chartSection.getByTestId('revenue-chart-empty');
    const errorState = chartSection.getByTestId('revenue-chart-error');

    if (await errorState.count()) {
      await expect(errorState).toBeVisible();
    } else if (await emptyState.count()) {
      await expect(emptyState).toBeVisible();
    } else {
      await expect(chartSection.locator('canvas, svg').first()).toBeVisible();
    }
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
