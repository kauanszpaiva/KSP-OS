import { expect, test } from '@playwright/test';

const clientEmail = process.env.CLIENT_EMAIL ?? '';
const clientPassword = process.env.CLIENT_PASSWORD ?? '';

test.skip(!clientEmail, 'Set seeded E2E credentials to run the portal collaboration tests.');

async function signIn(page: import('@playwright/test').Page, creds: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(creds.email);
  await page.getByLabel('Password').fill(creds.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL('**/home');
}

test('client can access their own project and review deliverables', async ({ page }) => {
  await signIn(page, { email: clientEmail, password: clientPassword });

  // Navigate to Projects
  await page.goto('/projects');

  // Wait for projects to load (assuming there's a link to a project)
  const projectLink = page.locator('a[href^="/projects/"]').first();
  await projectLink.click();

  // Verify Deliverable Review is visible
  await expect(page.getByText('Deliverables')).toBeVisible();
});

for (const route of ['/home', '/projects', '/files', '/requests', '/approvals', '/invoices']) {
  test(`no horizontal scroll at 375px on ${route}`, async ({ page }) => {
    await signIn(page, { email: clientEmail, password: clientPassword });
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(route);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBeFalsy();
  });
}

test('no horizontal scroll at 375px on project and invoice details', async ({ page }) => {
  await signIn(page, { email: clientEmail, password: clientPassword });
  await page.setViewportSize({ width: 375, height: 800 });

  for (const indexRoute of ['/projects', '/invoices']) {
    await page.goto(indexRoute);
    const detailLink = page.locator(`a[href^="${indexRoute}/"]`).first();
    test.skip(await detailLink.count() === 0, `Seeded portal data needs a detail link under ${indexRoute}.`);
    await detailLink.click();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBeFalsy();
  }
});
