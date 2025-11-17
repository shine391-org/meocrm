import { test, expect } from '@playwright/test';

test.describe('Customers Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('admin@lanoleather.vn');
    await page.getByLabel(/password/i).fill('Admin@123');
    await page.getByRole('button', { name: /quản lý/i }).click();

    // Wait for redirect
    await expect(page).toHaveURL(/\/$|\/dashboard/i, { timeout: 10000 });

    // Navigate to customers page
    await page.goto('/customers');
  });

  test('should display customers page heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /customers|khách hàng/i }),
    ).toBeVisible();
  });

  test('should display search input', async ({ page }) => {
    await expect(
      page.getByPlaceholder(/search|tìm kiếm/i),
    ).toBeVisible();
  });

  test('should display customers table or list', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Should show either table/list or empty state
    const hasTable = await page.locator('table, [role="table"]').count();
    const hasEmptyState = await page.getByText(/chưa có khách hàng|no customers/i).count();

    expect(hasTable + hasEmptyState).toBeGreaterThan(0);
  });

  test('should filter customers by search term', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder(/search|tìm kiếm/i);

    // Type search term
    await searchInput.fill('test');

    // URL should update with search param
    await expect(page).toHaveURL(/search=test/i, { timeout: 3000 });
  });

  test('should navigate between pages with pagination', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Check if pagination exists
    const nextButton = page.getByRole('button', { name: /next|tiếp/i });

    if (await nextButton.isVisible() && !await nextButton.isDisabled()) {
      // Get current page from URL
      const currentUrl = page.url();

      // Click next page
      await nextButton.click();

      // URL should change
      await expect(page).not.toHaveURL(currentUrl, { timeout: 3000 });
    }
  });

  test('should handle API error gracefully', async ({ page, context }) => {
    // Block API requests to simulate error
    await context.route('**/customers*', (route) => route.abort());

    // Reload page
    await page.reload();

    // Should show error message or handle gracefully
    // The page should not crash
    await expect(page).toHaveURL(/\/customers/i);
  });

  test('should clear search when clicking clear button', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByPlaceholder(/search|tìm kiếm/i);

    // Type search term
    await searchInput.fill('test');
    await expect(page).toHaveURL(/search=test/i, { timeout: 3000 });

    // Clear search
    await searchInput.clear();

    // Search should be removed from URL after debounce
    await page.waitForTimeout(1000);
    await expect(page).not.toHaveURL(/search=test/i);
  });

  test('should maintain search state on page reload', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Search for something
    const searchInput = page.getByPlaceholder(/search|tìm kiếm/i);
    await searchInput.fill('admin');
    await expect(page).toHaveURL(/search=admin/i, { timeout: 3000 });

    // Reload page
    await page.reload();

    // Search term should persist
    await expect(searchInput).toHaveValue('admin');
    await expect(page).toHaveURL(/search=admin/i);
  });
});
