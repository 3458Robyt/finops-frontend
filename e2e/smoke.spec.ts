import { expect, test } from '@playwright/test';

test('login shell renders without an API or database', { tag: '@smoke' }, async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'FinOps Inteligente' })).toBeVisible();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole('button', { name: /ingresar al panel/i })).toBeVisible();
});
