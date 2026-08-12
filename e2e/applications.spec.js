import { expect, test } from '@playwright/test';

test('create, edit, search, and delete an application', async ({ page, request }, testInfo) => {
  const company = `Portfolio Labs ${testInfo.project.name} ${Date.now()}`;
  let applicationId;

  try {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Turn every application/ })).toBeVisible();

    const createResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/applications') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Add application' }).click();
    const createDialog = page.getByRole('dialog');
    await createDialog.getByLabel(/Company/).fill(company);
    await createDialog.getByLabel(/Position/).fill('Full-stack Intern');
    await createDialog.getByRole('combobox', { name: 'Status' }).selectOption('applied');
    await createDialog.getByLabel('Applied date').fill('2026-08-08');
    await createDialog.getByRole('button', { name: 'Add application' }).click();
    const createResponse = await createResponsePromise;
    applicationId = (await createResponse.json()).data.id;

    const visibleEntry = page.locator('tr:visible, article:visible').filter({ hasText: company });
    await expect(visibleEntry).toBeVisible();
    await visibleEntry.getByRole('button', { name: `Edit ${company} application` }).click();
    const editDialog = page.getByRole('dialog');
    await editDialog.getByRole('combobox', { name: 'Status' }).selectOption('interview');
    const updateResponse = page.waitForResponse((response) => response.request().method() === 'PATCH');
    await editDialog.getByRole('button', { name: 'Save changes' }).click();
    await updateResponse;

    const searchResponse = page.waitForResponse((response) => {
      if (!response.url().includes('/api/applications?')) return false;
      return new URL(response.url()).searchParams.get('q') === company;
    });
    await page.getByRole('searchbox', { name: 'Search company or position' }).fill(company);
    await searchResponse;
    await expect(visibleEntry).toContainText('Interview');

    await visibleEntry.getByRole('button', { name: `Delete ${company} application` }).click();
    const deleteDialog = page.getByRole('alertdialog');
    const deleteResponse = page.waitForResponse((response) => response.request().method() === 'DELETE');
    await deleteDialog.getByRole('button', { name: 'Delete', exact: true }).click();
    await deleteResponse;
    applicationId = undefined;
    await expect(visibleEntry).toHaveCount(0);
  } finally {
    if (applicationId) await request.delete(`/api/applications/${applicationId}`);
  }
});
