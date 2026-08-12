import { expect, test } from '@playwright/test';

test('create, inspect, edit, archive, restore, and permanently delete an application', async ({ page, request }, testInfo) => {
  const company = `Portfolio Labs ${testInfo.project.name} ${Date.now()}`;
  let applicationId;

  try {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Turn every application/ })).toBeVisible();
    const documentOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(documentOverflow).toBeLessThanOrEqual(1);

    const createResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/applications') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Add application' }).click();
    const createDialog = page.getByRole('dialog');
    await createDialog.getByLabel(/Company/).fill(company);
    await createDialog.getByLabel(/Position/).fill('Full-stack Intern');
    await createDialog.getByRole('combobox', { name: 'Status' }).selectOption('applied');
    await createDialog.getByLabel('Applied date').fill('2026-08-08');
    await createDialog.getByLabel('Next action').fill('Send portfolio and confirm interview availability');
    await createDialog.getByLabel('Follow-up date').fill('2026-08-20');
    await createDialog.getByRole('button', { name: 'Add application' }).click();
    const createResponse = await createResponsePromise;
    applicationId = (await createResponse.json()).data.id;
    await expect(page.getByText(`${company} added.`)).toBeVisible();

    const visibleEntry = page.locator('tr:visible, article:visible').filter({ hasText: company });
    await expect(visibleEntry).toBeVisible();
    await visibleEntry.getByRole('button', { name: `View ${company} application` }).click();
    const detailDialog = page.getByRole('dialog');
    await expect(detailDialog.getByText('Send portfolio and confirm interview availability')).toBeVisible();
    await expect(detailDialog.getByRole('heading', { name: 'Status history' })).toBeVisible();

    await detailDialog.getByRole('button', { name: 'Edit' }).click();
    const editDialog = page.getByRole('dialog');
    await editDialog.getByRole('combobox', { name: 'Status' }).selectOption('interview');
    const updateResponse = page.waitForResponse((response) => response.request().method() === 'PATCH');
    await editDialog.getByRole('button', { name: 'Save changes' }).click();
    await updateResponse;
    await expect(page.getByText(`${company} updated.`)).toBeVisible();

    const searchResponse = page.waitForResponse((response) => {
      if (!response.url().includes('/api/applications?')) return false;
      return new URL(response.url()).searchParams.get('q') === company;
    });
    await page.getByRole('searchbox', { name: 'Search company or position' }).fill(company);
    await searchResponse;
    await expect(visibleEntry).toContainText('Interview');

    const archiveResponse = page.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith('/archive'));
    await visibleEntry.getByRole('button', { name: `Archive ${company} application` }).click();
    await archiveResponse;
    await expect(page.getByText(`${company} archived.`)).toBeVisible();
    await expect(visibleEntry).toHaveCount(0);

    await page.getByRole('button', { name: 'Archived' }).click();
    await expect(visibleEntry).toBeVisible();
    const restoreResponse = page.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith('/restore'));
    await visibleEntry.getByRole('button', { name: `Restore ${company} application` }).click();
    await restoreResponse;
    await expect(page.getByText(`${company} restored.`)).toBeVisible();

    await page.getByRole('button', { name: 'Active' }).click();
    await expect(visibleEntry).toBeVisible();
    const secondArchive = page.waitForResponse((response) => response.request().method() === 'POST' && response.url().endsWith('/archive'));
    await visibleEntry.getByRole('button', { name: `Archive ${company} application` }).click();
    await secondArchive;
    await page.getByRole('button', { name: 'Archived' }).click();
    await expect(visibleEntry).toBeVisible();

    await visibleEntry.getByRole('button', { name: `Delete ${company} permanently` }).click();
    const deleteDialog = page.getByRole('alertdialog');
    const deleteResponse = page.waitForResponse((response) => response.request().method() === 'DELETE');
    await deleteDialog.getByRole('button', { name: 'Delete permanently' }).click();
    await deleteResponse;
    applicationId = undefined;
    await expect(visibleEntry).toHaveCount(0);
  } finally {
    if (applicationId) {
      const found = await request.get(`/api/applications/${applicationId}`);
      if (found.ok()) {
        let application = (await found.json()).data;
        if (!application.archivedAt) {
          const archived = await request.post(`/api/applications/${applicationId}/archive`, {
            headers: { 'If-Match': `"${application.version}"` },
          });
          if (archived.ok()) application = (await archived.json()).data;
        }
        await request.delete(`/api/applications/${applicationId}`, {
          headers: { 'If-Match': `"${application.version}"` },
        });
      }
    }
  }
});
