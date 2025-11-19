import { test, expect, Route } from '@playwright/test';
import { loginAsAdmin } from './utils/ui-auth';

test.describe.configure({ mode: 'serial' });

test.describe('Customers Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await loginAsAdmin(page);

    // Wait for redirect
    await expect(page).toHaveURL(/\/$|\/dashboard/i, { timeout: 10000 });

    // Navigate to customers page via in-app navigation to preserve session state
    await page.getByRole('link', { name: /khách hàng/i }).first().click();
    await expect(page).toHaveURL(/\/customers/i, { timeout: 5000 });
  });

  test('should display customers page heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /quản lý khách hàng/i }),
    ).toBeVisible();
  });

  test('should display search input', async ({ page }) => {
    await expect(
      page.getByPlaceholder(/tìm theo tên.*sđt.*email/i),
    ).toBeVisible();
  });

  test('should display customers table or list', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const container = page.locator('[data-testid="customers-table"], [data-testid="customers-error"]');
    await expect(container.first()).toBeVisible({ timeout: 10000 });
  });

  test('should filter customers by search term', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByTestId('customers-search-input');

    // Type search term
    await searchInput.fill('test');

    // URL should update with search param after debounce
    await expect(page).toHaveURL(/search=test/i, { timeout: 1000 });
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
    const blockCustomers = (route: Route) => route.abort();
    const apiRoute = '**localhost:2003/customers**';
    await context.route(apiRoute, blockCustomers);

    try {
      await page.reload({ waitUntil: 'networkidle' });

      // Should show error message or handle gracefully
      await expect(page.getByText(/không thể tải|failed to fetch/i)).toBeVisible();
    } finally {
      await context.unroute(apiRoute, blockCustomers);
    }
  });

  test('should clear search when clicking clear button', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const searchInput = page.getByTestId('customers-search-input');

    // Type search term
    await searchInput.fill('test');
    await expect(page).toHaveURL(/search=test/i, { timeout: 1000 });

    // Clear search
    await searchInput.clear();

    // Search should be removed from URL after debounce (500ms + buffer)
    await page.waitForTimeout(700);
    await expect(page).not.toHaveURL(/search=test/i);
  });

  test('should maintain search state on page reload', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Search for something
    const searchInput = page.getByTestId('customers-search-input');
    await searchInput.fill('admin');
    await expect(page).toHaveURL(/search=admin/i, { timeout: 1000 });

    // Reload page
    await page.reload();

    // Search term should persist
    await expect(searchInput).toHaveValue('admin');
    await expect(page).toHaveURL(/search=admin/i);
  });
});
