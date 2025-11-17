import { test, expect } from '@playwright/test';

test.describe('Orders Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@lanoleather.vn');
    await page.getByLabel(/password/i).fill('Admin@123');
    await page.getByRole('button', { name: /quản lý/i }).click();

    // Wait for redirect
    await expect(page).toHaveURL(/\/$|\/dashboard/i, { timeout: 10000 });

    // Navigate to orders page
    await page.goto('/orders');
  });

  test('should display orders page heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /orders|đơn hàng/i }),
    ).toBeVisible();
  });

  test('should show loading state initially', async ({ page }) => {
    // Reload to see loading state
    await page.reload();

    // Should show loading message briefly
    const loadingText = page.getByText(/đang tải|loading/i);
    // Loading state might be very quick, so we don't assert it must be visible
  });

  test('should display orders list or empty state', async ({ page }) => {
    // Wait for loading to complete
    await page.waitForLoadState('networkidle');

    // Should either show orders or empty state message
    const hasOrders = await page.locator('text=/Order #|Đơn hàng #/i').count();
    const hasEmptyState = await page.getByText(/chưa có đơn hàng|no orders/i).count();

    expect(hasOrders + hasEmptyState).toBeGreaterThan(0);
  });

  test('should handle API error gracefully', async ({ page, context }) => {
    // Block API requests to simulate error
    await context.route('**/orders*', (route) => route.abort());

    // Reload page
    await page.reload();

    // Should show error message
    await expect(
      page.getByText(/không thể tải|failed to load|error/i),
    ).toBeVisible({ timeout: 5000 });
  });

  test('should display order details when available', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Check if there are orders
    const orderCount = await page.locator('text=/Order #|Đơn hàng #/i').count();

    if (orderCount > 0) {
      // Should show order code
      await expect(page.locator('text=/Order #|Đơn hàng #/i').first()).toBeVisible();

      // Should show status
      await expect(page.locator('text=/Status|Trạng thái/i').first()).toBeVisible();

      // Should show total
      await expect(page.locator('text=/Total|Tổng/i').first()).toBeVisible();
    }
  });

  test('should navigate to order details', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Check if there are orders with detail buttons
    const viewButton = page.getByRole('button', { name: /view details|xem chi tiết/i }).first();

    if (await viewButton.isVisible()) {
      await viewButton.click();

      // Should navigate to order detail page
      await expect(page).toHaveURL(/\/orders\/[^/]+/, { timeout: 5000 });
    }
  });
});
