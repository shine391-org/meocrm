import { test, expect } from '@playwright/test';
import { loginViaApi, apiGet } from './utils/api';
import { loginAsAdmin } from './utils/ui-auth';

test.describe.configure({ mode: 'serial' });

test.describe('POS workspace', () => {
  test('can create a POS order', async ({ page, request }) => {
    const auth = await loginViaApi(request);
    const token = auth.accessToken;
    const branches = await apiGet<{ id: string; name: string }[]>(request, '/branches', token);
    const branch = branches[0];

    await page.goto('/login');
    await loginAsAdmin(page);
    await page.goto('/pos');

    await expect(page.getByTestId('pos-search-products')).toBeVisible();

    if (branch) {
      await page.getByTestId('pos-branch-id-input').fill(branch.id);
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
