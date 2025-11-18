import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

async function login(page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('admin@lanoleather.vn');
  await page.getByLabel(/password/i).fill('Admin@123');
  await page.getByRole('button', { name: /quản lý/i }).click();
  await expect(page).toHaveURL(/dashboard|\/$/i, { timeout: 10000 });
}

test.describe('POS workspace', () => {
  test('can create a POS order', async ({ page }) => {
    await login(page);
    await page.goto('/pos');

    await expect(page.getByTestId('pos-search-products')).toBeVisible();

    const branchSelect = page.getByTestId('pos-branch-select');
    if (await branchSelect.isEnabled()) {
      await branchSelect.click();
      const option = page.getByRole('option').first();
      if (await option.isVisible()) {
        await option.click();
      }
    } else {
      await page.getByTestId('pos-branch-id-input').fill('manual-branch');
      await page.getByRole('button', { name: /lưu chi nhánh/i }).click();
    }

    const productCard = page.getByTestId('pos-product-card').first();
    await productCard.click();
    await expect(page.getByTestId('pos-cart-line')).toHaveCount(1);

    const customerInput = page.getByTestId('pos-customer-search');
    await customerInput.click();
    await expect(page.getByTestId('pos-customer-suggestions')).toBeVisible();
    await page.getByTestId('pos-customer-suggestion').first().click();

    await page.getByTestId('pos-checkout-button').click();
    await expect(page.getByText(/đã tạo đơn pos/i)).toBeVisible({
      timeout: 10000,
    });

    await expect(page.getByTestId('pos-cart-line')).toHaveCount(0);
  });
});
